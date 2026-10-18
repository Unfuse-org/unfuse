use super::*;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
static NEXT: AtomicU64 = AtomicU64::new(0);
struct Workspace(PathBuf);
impl Workspace {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!(
            "unfuse-core-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&path).unwrap();
        Self(path)
    }
    fn call(&self, session: &str, name: &str, args: Value) -> Result<String, String> {
        execute_tool_with_context(
            &self.0,
            Some(session),
            name,
            &args.to_string(),
            None::<fn(u32)>,
        )
    }
    fn read(&self, session: &str) {
        self.call(session, "read_file", json!({"path":"file.txt"}))
            .unwrap();
    }
}
impl Drop for Workspace {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn create_read_and_replace() {
    let ws = Workspace::new();
    ws.call(
        "one",
        "write_file",
        json!({"path":"nested/file.txt", "content":"hello\nworld\n"}),
    )
    .unwrap();
    let result = ws
        .call(
            "two",
            "read_file",
            json!({"path":"nested/file.txt", "offset":2,"limit":1}),
        )
        .unwrap();
    assert!(result.contains("2: world"));
    ws.call(
        "two",
        "write_file",
        json!({"path":"nested/file.txt", "content":"updated"}),
    )
    .unwrap();
    assert_eq!(
        fs::read_to_string(ws.0.join("nested/file.txt")).unwrap(),
        "updated"
    );
}

#[test]
fn mutation_requires_same_session_read_and_rejects_stale_content() {
    let ws = Workspace::new();
    fs::write(ws.0.join("file.txt"), "before").unwrap();
    assert!(ws
        .call(
            "one",
            "write_file",
            json!({"path":"file.txt", "content":"after"})
        )
        .is_err());
    ws.read("one");
    assert!(ws
        .call(
            "two",
            "edit_file",
            json!({"path":"file.txt","old_text":"before","new_text":"after"})
        )
        .is_err());
    fs::write(ws.0.join("file.txt"), "external").unwrap();
    assert!(ws
        .call(
            "one",
            "write_file",
            json!({"path":"file.txt","content":"lost"})
        )
        .unwrap_err()
        .contains("changed"));
    assert_eq!(
        fs::read_to_string(ws.0.join("file.txt")).unwrap(),
        "external"
    );
}

#[test]
fn batch_edit_is_all_or_nothing_and_preserves_unaffected_bytes() {
    let ws = Workspace::new();
    let original = "\u{feff}first\r\nsecond\nthird\r\n";
    fs::write(ws.0.join("file.txt"), original).unwrap();
    ws.read("one");
    let result = ws.call("one", "edit_file", json!({"path":"file.txt","edits":[{"old_text":"first","new_text":"FIRST"},{"old_text":"missing","new_text":"x"}]}));
    assert!(result.is_err());
    assert_eq!(fs::read_to_string(ws.0.join("file.txt")).unwrap(), original);
    ws.call("one", "edit_file", json!({"path":"file.txt","edits":[{"old_text":"first","new_text":"FIRST"},{"old_text":"third","new_text":"THIRD"}]})).unwrap();
    assert_eq!(
        fs::read_to_string(ws.0.join("file.txt")).unwrap(),
        "\u{feff}FIRST\r\nsecond\nTHIRD\r\n"
    );
}

#[test]
fn ambiguous_overlapping_and_noop_edits_do_not_write() {
    let ws = Workspace::new();
    fs::write(ws.0.join("file.txt"), "abc abc").unwrap();
    ws.read("one");
    for args in [
        json!({"old_text":"abc","new_text":"xyz"}),
        json!({"old_text":"abc abc","new_text":"abc abc"}),
        json!({"edits":[{"old_text":"abc abc","new_text":"xyz"},{"old_text":"bc abc","new_text":"q"}]}),
    ] {
        let mut args = args;
        args["path"] = json!("file.txt");
        assert!(ws.call("one", "edit_file", args).is_err());
        assert_eq!(
            fs::read_to_string(ws.0.join("file.txt")).unwrap(),
            "abc abc"
        );
    }
}

#[test]
fn read_long_line_keeps_line_numbers_and_rejects_invalid_encoding() {
    let ws = Workspace::new();
    fs::write(
        ws.0.join("file.txt"),
        format!("{}\nnext\n", "é".repeat(20000)),
    )
    .unwrap();
    let output = ws
        .call("one", "read_file", json!({"path":"file.txt","limit":2}))
        .unwrap();
    assert!(output.contains("line preview truncated"));
    assert!(output.contains("2: next"));
    assert!(!output.contains("3: next"));
    fs::write(ws.0.join("file.txt"), [0xff, 0xfe]).unwrap();
    assert!(ws
        .call("one", "read_file", json!({"path":"file.txt"}))
        .is_err());
    fs::write(ws.0.join("file.txt"), b"a\0b").unwrap();
    assert!(ws
        .call("one", "read_file", json!({"path":"file.txt"}))
        .is_err());
}

#[test]
fn read_pagination_and_empty_files() {
    let ws = Workspace::new();
    fs::write(ws.0.join("file.txt"), "one\ntwo\nthree\n").unwrap();
    let output = ws
        .call("one", "read_file", json!({"path":"file.txt","limit":1}))
        .unwrap();
    assert!(output.contains("offset=2"));
    assert!(ws
        .call("one", "read_file", json!({"path":"file.txt","offset":4}))
        .is_err());
    fs::write(ws.0.join("file.txt"), "").unwrap();
    assert!(ws
        .call("one", "read_file", json!({"path":"file.txt"}))
        .unwrap()
        .contains("Empty file"));
}

#[test]
fn invalid_parameters_fail_before_execution() {
    let ws = Workspace::new();
    for args in [
        json!({"path":"file.txt","offset":0}),
        json!({"path":"file.txt","limit":-1}),
        json!({"path":"file.txt","limit":"2"}),
        json!({"path":"file.txt","limit":2001}),
    ] {
        assert!(ws.call("one", "read_file", args).is_err());
    }
    assert!(ws
        .call(
            "one",
            "bash",
            json!({"command":"echo unwanted","timeout_secs":0})
        )
        .is_err());
    assert!(ws
        .call(
            "one",
            "edit_file",
            json!({"path":"file.txt","edits":[],"old_text":"a","new_text":"b"})
        )
        .is_err());
}

#[test]
fn protected_paths_and_symlinks_are_still_blocked() {
    let ws = Workspace::new();
    for path in ["../outside.txt", ".git/config", ".env"] {
        assert!(ws
            .call(
                "one",
                "write_file",
                json!({"path":path,"content":"blocked"})
            )
            .is_err());
    }
    #[cfg(unix)]
    {
        let outside = Workspace::new();
        fs::write(outside.0.join("data"), "outside").unwrap();
        std::os::unix::fs::symlink(outside.0.join("data"), ws.0.join("link")).unwrap();
        assert!(ws.call("one", "read_file", json!({"path":"link"})).is_err());
    }
}

#[test]
fn stale_commit_leaves_original_and_removes_temp_file() {
    let ws = Workspace::new();
    let target = ws.0.join("file.txt");
    fs::write(&target, "original").unwrap();
    let hash = mutation::digest(&target).unwrap();
    fs::write(&target, "external").unwrap();
    assert!(
        mutation::commit(&ws.0, "file.txt", &target, Some(hash), b"replacement", None).is_err()
    );
    assert_eq!(fs::read_to_string(target).unwrap(), "external");
    assert_eq!(fs::read_dir(&ws.0).unwrap().count(), 1);
}

#[test]
fn shell_reports_nonzero_exit_as_tool_error() {
    let ws = Workspace::new();
    let error = ws
        .call("one", "bash", json!({"command":"exit 42"}))
        .unwrap_err();
    assert!(error.contains("exit code: 42"));
}

#[cfg(unix)]
#[test]
fn large_shell_output_is_truncated_without_killing_successful_command() {
    let ws = Workspace::new();
    let result = ws
        .call(
            "one",
            "bash",
            json!({"command":"head -c 100000 /dev/zero | tr '\\0' x; printf done > marker"}),
        )
        .unwrap();
    assert!(result.contains("Showing the last"));
    assert!(ws.0.join("marker").exists());
    let logs = fs::read_dir(ws.0.join(".unfuse/tool-output"))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].metadata().unwrap().len(), 100000);
}

#[cfg(unix)]
#[test]
fn timeout_preserves_output_and_kills_child() {
    let ws = Workspace::new();
    let start = std::time::Instant::now();
    let error = ws
        .call(
            "one",
            "bash",
            json!({"command":"printf before; sleep 3; touch marker","timeout_secs":1}),
        )
        .unwrap_err();
    assert!(error.contains("before"));
    assert!(error.contains("timed out"));
    assert!(start.elapsed() < std::time::Duration::from_secs(3));
    std::thread::sleep(std::time::Duration::from_millis(2300));
    assert!(!ws.0.join("marker").exists());
}

#[cfg(unix)]
#[test]
fn replacement_preserves_executable_permissions() {
    use std::os::unix::fs::PermissionsExt;
    let ws = Workspace::new();
    let target = ws.0.join("file.txt");
    fs::write(&target, "old").unwrap();
    fs::set_permissions(&target, fs::Permissions::from_mode(0o755)).unwrap();
    ws.read("one");
    ws.call(
        "one",
        "write_file",
        json!({"path":"file.txt","content":"new"}),
    )
    .unwrap();
    assert_eq!(
        fs::metadata(target).unwrap().permissions().mode() & 0o777,
        0o755
    );
}

#[test]
fn cancelled_session_cannot_create_files() {
    let ws = Workspace::new();
    let id = "core_cancelled_mutation";
    crate::agent::get_or_create_session(id)
        .lock()
        .unwrap()
        .cancelled
        .store(true, Ordering::SeqCst);
    assert!(ws
        .call(id, "write_file", json!({"path":"file.txt","content":"no"}))
        .unwrap_err()
        .contains("cancelled"));
    assert!(!ws.0.join("file.txt").exists());
    crate::agent::remove_session(id);
}

#[test]
fn repeated_overlapping_matches_are_ambiguous() {
    let ws = Workspace::new();
    fs::write(ws.0.join("file.txt"), "aaa").unwrap();
    ws.read("one");
    assert!(ws
        .call(
            "one",
            "edit_file",
            json!({"path":"file.txt","old_text":"aa","new_text":"x"})
        )
        .unwrap_err()
        .contains("multiple"));
    assert_eq!(fs::read_to_string(ws.0.join("file.txt")).unwrap(), "aaa");
}

#[test]
fn shell_workdir_is_validated_and_stream_callback_receives_output() {
    let ws = Workspace::new();
    fs::create_dir(ws.0.join("nested")).unwrap();
    let mut streamed = String::new();
    let result = execute_tool_with_context_and_output(
        &ws.0,
        None,
        "bash",
        &json!({"command":"echo streaming","workdir":"nested"}).to_string(),
        None::<fn(u32)>,
        Some(&mut |text| streamed.push_str(text)),
    )
    .unwrap();
    assert!(result.contains("streaming"));
    assert!(streamed.contains("streaming"));
    assert!(ws
        .call("one", "bash", json!({"command":"echo no","workdir":".."}))
        .is_err());
    assert!(ws
        .call("one", "bash", json!({"command":"echo no","workdir":4}))
        .is_err());
}

#[cfg(unix)]
#[test]
fn special_files_are_rejected_without_blocking() {
    use std::os::unix::ffi::OsStrExt;
    let ws = Workspace::new();
    let path = std::ffi::CString::new(ws.0.join("pipe").as_os_str().as_bytes()).unwrap();
    assert_eq!(unsafe { libc::mkfifo(path.as_ptr(), 0o600) }, 0);
    assert!(ws.call("one", "read_file", json!({"path":"pipe"})).is_err());
}

#[test]
fn bash_timeout_schema_and_validation_agree() {
    assert!(super::validate_core_arguments("bash", &json!({"command":"true", "timeout_secs":1800})).is_ok());
    assert!(super::validate_core_arguments("bash", &json!({"command":"true", "timeout_secs":1801})).is_err());
}

#[test]
fn glob_and_grep_respect_ignores_protected_paths_and_report_real_locations() {
    let ws = Workspace::new();
    fs::create_dir_all(ws.0.join("src/nested")).unwrap();
    fs::create_dir_all(ws.0.join("ignored")).unwrap();
    fs::create_dir_all(ws.0.join(".git")).unwrap();
    fs::write(ws.0.join(".gitignore"), "ignored/\n*.generated.rs\n").unwrap();
    fs::write(ws.0.join("src/main.rs"), "fn main() {}\nHello 世界\n").unwrap();
    fs::write(ws.0.join("src/nested/lib.rs"), "hello 世界\n").unwrap();
    fs::write(ws.0.join("ignored/a.rs"), "hello should be ignored").unwrap();
    fs::write(ws.0.join("src/secret.generated.rs"), "hello ignored").unwrap();
    fs::write(ws.0.join(".env"), "hello protected fixture").unwrap();
    fs::write(ws.0.join(".git/config"), "hello internal fixture").unwrap();
    let glob = ws
        .call("search", "glob", json!({"pattern":"**/*.rs"}))
        .unwrap();
    assert_eq!(glob, "src/main.rs\nsrc/nested/lib.rs");
    let grep = ws
        .call(
            "search",
            "grep",
            json!({"pattern":"hello 世界","ignore_case":true,"glob":"*.rs"}),
        )
        .unwrap();
    assert!(grep.contains("src/main.rs:2: Hello 世界"));
    assert!(grep.contains("src/nested/lib.rs:1: hello 世界"));
    assert!(!grep.contains("ignored"));
    assert!(!grep.contains("protected fixture"));
    assert!(!grep.contains("internal fixture"));
    assert!(ws
        .call(
            "search",
            "write_file",
            json!({"path":"src/main.rs","content":"must still read before writing"})
        )
        .is_err());
}

#[test]
fn search_paginates_and_distinguishes_binary_skips_from_complete_no_match() {
    let ws = Workspace::new();
    fs::write(ws.0.join("a.txt"), "match one\nmatch two\nmatch three\n").unwrap();
    fs::write(ws.0.join("binary.bin"), b"match\0binary").unwrap();
    let first = ws
        .call("search", "grep", json!({"pattern":"match","limit":1}))
        .unwrap();
    assert!(first.contains("a.txt:1: match one"));
    assert!(first.contains("offset=2"));
    let next = ws
        .call(
            "search",
            "grep",
            json!({"pattern":"match","limit":2,"offset":2}),
        )
        .unwrap();
    assert!(next.contains("a.txt:2: match two"));
    assert!(next.contains("a.txt:3: match three"));
    assert!(next.contains("Skipped 1"));
    let no_match = ws
        .call("search", "grep", json!({"pattern":"absent","glob":"*.txt"}))
        .unwrap();
    assert_eq!(no_match, "No results in searched files.");
    fs::write(ws.0.join("literal.txt"), "a+b\naaab\n").unwrap();
    let literal = ws
        .call(
            "search",
            "grep",
            json!({"path":"literal.txt","pattern":"a+b","literal":true}),
        )
        .unwrap();
    assert_eq!(literal, "literal.txt:1: a+b");
}

#[test]
fn search_rejects_invalid_arguments_and_stops_on_cancellation() {
    let ws = Workspace::new();
    for (name, args) in [
        ("glob", json!({"pattern":"../*"})),
        ("glob", json!({"pattern":"["})),
        ("glob", json!({"pattern":"**/*","ignore_case":true})),
        ("grep", json!({"pattern":"["})),
        ("grep", json!({"pattern":"ok","path":"../"})),
        ("grep", json!({"pattern":"ok","limit":0})),
        ("grep", json!({"pattern":"ok","offset":-1})),
        ("grep", json!({"pattern":"ok","unexpected":true})),
    ] {
        assert!(
            ws.call("search", name, args).is_err(),
            "{name} should reject invalid arguments"
        );
    }
    let flag = std::sync::atomic::AtomicBool::new(true);
    assert!(
        search::execute(&ws.0, "glob", &json!({"pattern":"**/*"}), Some(&flag))
            .unwrap_err()
            .contains("cancelled")
    );
    let flag = std::sync::atomic::AtomicBool::new(false);
    fs::write(
        ws.0.join("huge.txt"),
        format!("{}needle", "x".repeat(10000)),
    )
    .unwrap();
    let result = search::execute(&ws.0, "grep", &json!({"pattern":"needle"}), Some(&flag)).unwrap();
    assert!(result.contains("line preview truncated"));
    assert!(result.len() < 12000);
}

#[cfg(unix)]
#[test]
fn search_does_not_follow_symlinks_or_block_on_special_files() {
    let ws = Workspace::new();
    let other = Workspace::new();
    fs::write(other.0.join("outside.txt"), "outside-secret-fixture").unwrap();
    std::os::unix::fs::symlink(&other.0, ws.0.join("outside")).unwrap();
    std::os::unix::fs::symlink(other.0.join("outside.txt"), ws.0.join("alias.txt")).unwrap();
    let fifo = std::ffi::CString::new(ws.0.join("pipe").to_string_lossy().as_bytes()).unwrap();
    assert_eq!(unsafe { libc::mkfifo(fifo.as_ptr(), 0o600) }, 0);
    assert_eq!(
        ws.call("search", "grep", json!({"pattern":"outside"}))
            .unwrap(),
        "No results in searched files."
    );
    assert_eq!(
        ws.call("search", "glob", json!({"pattern":"**/*"}))
            .unwrap(),
        "No results in searched files."
    );
}
