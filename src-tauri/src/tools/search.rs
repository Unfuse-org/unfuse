use super::{
    guardrails::{validate_path, Access},
    mutation,
};
use globset::{GlobBuilder, GlobMatcher};
use ignore::WalkBuilder;
use regex::RegexBuilder;
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    io::Read,
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant},
};

const MAX_OUTPUT: usize = 64 * 1024;
const MAX_FILE: u64 = 10 * 1024 * 1024;
const MAX_ENTRIES: usize = 100_000;
const DEADLINE: Duration = Duration::from_secs(15);

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SearchArgs {
    pattern: String,
    #[serde(default = "default_path")]
    path: String,
    #[serde(default = "default_limit")]
    limit: usize,
    #[serde(default = "default_offset")]
    offset: usize,
    glob: Option<String>,
    #[serde(default)]
    literal: bool,
    #[serde(default)]
    ignore_case: bool,
}
fn default_path() -> String {
    ".".into()
}
fn default_limit() -> usize {
    100
}
fn default_offset() -> usize {
    1
}

pub fn definitions() -> Vec<Value> {
    let common = json!({"path":{"type":"string","description":"File or directory within the workspace, default '.'"},"limit":{"type":"integer","minimum":1,"maximum":1000,"description":"Maximum results, default 100"},"offset":{"type":"integer","minimum":1,"description":"1-based result offset, default 1. Pagination assumes files stay unchanged."}});
    let mut glob = common.clone();
    glob["pattern"] = json!({"type":"string","description":"File glob relative to path, e.g. '**/*.rs'. A pattern without '/' matches file names at any depth."});
    let mut grep = common;
    grep["pattern"] = json!({"type":"string","description":"Rust regular expression, or literal text when literal=true. Matching is per line."});
    grep["glob"] = json!({"type":"string","description":"Optional file glob, e.g. '**/*.ts'"});
    grep["literal"] =
        json!({"type":"boolean","description":"Treat pattern as exact text, default false"});
    grep["ignore_case"] =
        json!({"type":"boolean","description":"Case-insensitive matching, default false"});
    [("glob","Find regular files by glob. Respects project ignore files and excludes protected paths, symlinks, .git and .unfuse. Results are sorted by path, bounded, and include continuation or incomplete-search notices.",glob),
     ("grep","Search UTF-8 file contents with paths and 1-based line numbers. Respects project ignore files and protected paths. Skips binary/non-UTF-8 files and files larger than 10 MiB, reporting skips. Results are bounded; read_file is still required before editing.",grep)]
        .into_iter().map(|(name,description,properties)|json!({"type":"function","function":{"name":name,"description":description,"parameters":{"type":"object","properties":properties,"required":["pattern"],"additionalProperties":false}}})).collect()
}

fn parse(name: &str, args: &Value) -> Result<SearchArgs, String> {
    if name == "glob"
        && args.as_object().is_some_and(|a| {
            a.keys()
                .any(|k| matches!(k.as_str(), "glob" | "literal" | "ignore_case"))
        })
    {
        return Err("glob accepts only pattern, path, limit and offset".into());
    }
    let args: SearchArgs = serde_json::from_value(args.clone())
        .map_err(|e| format!("Invalid {name} arguments: {e}"))?;
    if args.pattern.is_empty()
        || args.pattern.len() > 4096
        || args.path.trim().is_empty()
        || !(1..=1000).contains(&args.limit)
        || args.offset == 0
    {
        return Err(
            "Supply a nonempty pattern (maximum 4096 bytes), path, limit 1..1000 and offset >= 1"
                .into(),
        );
    }
    Ok(args)
}
fn matcher(pattern: &str) -> Result<GlobMatcher, String> {
    if pattern.len() > 4096
        || Path::new(pattern).is_absolute()
        || pattern.split(['/', '\\']).any(|s| s == "..")
    {
        return Err(
            "Glob must be a relative pattern without parent traversal, at most 4096 bytes".into(),
        );
    }
    GlobBuilder::new(pattern)
        .literal_separator(true)
        .build()
        .map(|g| g.compile_matcher())
        .map_err(|e| format!("Invalid glob: {e}"))
}
pub fn validate(name: &str, args: &Value) -> Result<(), String> {
    let args = parse(name, args)?;
    if name == "glob" {
        matcher(&args.pattern)?;
    } else {
        if let Some(glob) = &args.glob {
            matcher(glob)?;
        }
        RegexBuilder::new(&if args.literal {
            regex::escape(&args.pattern)
        } else {
            args.pattern
        })
        .case_insensitive(args.ignore_case)
        .size_limit(2 * 1024 * 1024)
        .build()
        .map_err(|e| format!("Invalid search expression: {e}"))?;
    }
    Ok(())
}
fn matches_glob(matcher: &GlobMatcher, pattern: &str, path: &Path) -> bool {
    matcher.is_match(path)
        || (!pattern.contains('/')
            && path
                .file_name()
                .is_some_and(|name| matcher.is_match(Path::new(name))))
}

pub fn execute(
    root: &Path,
    name: &str,
    args: &Value,
    cancelled: Option<&AtomicBool>,
) -> Result<String, String> {
    validate(name, args)?;
    let args = parse(name, args)?;
    let start = validate_path(root, &args.path, Access::Read)?;
    if !start.exists() {
        return Err("Search path does not exist".into());
    }
    let base = if start.is_dir() {
        start.as_path()
    } else {
        start.parent().ok_or("Search path has no parent")?
    };
    let filter_pattern = if name == "glob" {
        Some(args.pattern.as_str())
    } else {
        args.glob.as_deref()
    };
    let filter = filter_pattern.map(matcher).transpose()?;
    let regex = if name == "grep" {
        Some(
            RegexBuilder::new(&if args.literal {
                regex::escape(&args.pattern)
            } else {
                args.pattern.clone()
            })
            .case_insensitive(args.ignore_case)
            .size_limit(2 * 1024 * 1024)
            .build()
            .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };
    let canonical_root = root.canonicalize().map_err(|e| e.to_string())?;
    let root_owned = root.to_path_buf();
    let mut builder = WalkBuilder::new(&start);
    builder
        .hidden(false)
        .parents(false)
        .git_global(false)
        .require_git(false)
        .follow_links(false)
        .sort_by_file_path(|a, b| a.cmp(b))
        .filter_entry(move |entry| {
            let name = entry.file_name();
            name != ".git"
                && name != ".unfuse"
                && validate_path(&root_owned, &entry.path().to_string_lossy(), Access::Read).is_ok()
        });
    let deadline = Instant::now() + DEADLINE;
    let mut rows = Vec::new();
    let mut size = 0;
    let mut seen = 0;
    let mut skipped = 0;
    let mut incomplete = None;
    let mut next = None;
    for (visited, entry) in builder.build().enumerate() {
        if cancelled.is_some_and(|flag| flag.load(Ordering::SeqCst)) {
            return Err("Search cancelled".into());
        }
        if visited >= MAX_ENTRIES || Instant::now() >= deadline {
            incomplete = Some("Traversal limit reached; narrow path or pattern");
            break;
        }
        let entry = match entry {
            Ok(e) => e,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };
        if !entry.file_type().is_some_and(|t| t.is_file()) {
            continue;
        }
        let target = match validate_path(root, &entry.path().to_string_lossy(), Access::Read) {
            Ok(p) => p,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };
        let relative = target
            .strip_prefix(base)
            .map_err(|_| "Search entry escaped its directory")?;
        if filter
            .as_ref()
            .zip(filter_pattern)
            .is_some_and(|(filter, pattern)| !matches_glob(filter, pattern, relative))
        {
            continue;
        }
        let path = target
            .strip_prefix(&canonical_root)
            .map_err(|_| "Search entry escaped workspace")?
            .to_string_lossy()
            .replace('\\', "/");
        let mut emit = |row: String| {
            seen += 1;
            if seen < args.offset {
                return true;
            }
            if rows.len() == args.limit || size + row.len() + 1 > MAX_OUTPUT {
                next = Some(seen);
                return false;
            }
            size += row.len() + 1;
            rows.push(row);
            true
        };
        if let Some(regex) = &regex {
            let file = match mutation::open_regular(&target) {
                Ok(f) => f,
                Err(_) => {
                    skipped += 1;
                    continue;
                }
            };
            if file.metadata().map_err(|e| e.to_string())?.len() > MAX_FILE {
                skipped += 1;
                continue;
            }
            let mut bytes = Vec::new();
            if file.take(MAX_FILE + 1).read_to_end(&mut bytes).is_err()
                || bytes.len() as u64 > MAX_FILE
                || bytes.contains(&0)
            {
                skipped += 1;
                continue;
            }
            let text = match std::str::from_utf8(&bytes) {
                Ok(t) => t,
                Err(_) => {
                    skipped += 1;
                    continue;
                }
            };
            for (index, line) in text.lines().enumerate() {
                if cancelled.is_some_and(|flag| flag.load(Ordering::SeqCst)) {
                    return Err("Search cancelled".into());
                }
                if Instant::now() >= deadline {
                    incomplete = Some("Time limit reached; narrow path or pattern");
                    break;
                }
                if regex.is_match(line) {
                    let preview: String = line.chars().take(2000).collect();
                    if !emit(format!(
                        "{path}:{}: {preview}{}",
                        index + 1,
                        if preview.len() < line.len() {
                            " [line preview truncated]"
                        } else {
                            ""
                        }
                    )) {
                        break;
                    }
                }
            }
        } else {
            emit(path);
        }
        if next.is_some() || incomplete.is_some() {
            break;
        }
    }
    let mut output = if rows.is_empty() {
        "No results in searched files.".into()
    } else {
        rows.join("\n")
    };
    if let Some(offset) = next {
        output.push_str(&format!("\n[Result/output limit; continue with offset={offset}. Pagination assumes unchanged files.]"));
    }
    if let Some(reason) = incomplete {
        output.push_str(&format!("\n[Incomplete search: {reason}]"));
    }
    if skipped > 0 {
        output.push_str(&format!("\n[Skipped {skipped} files/entries: unreadable, binary, non-UTF-8 or over 10 MiB. Protected paths and symlinks are excluded.]"));
    }
    Ok(output)
}
