import type { CommandCheckResult } from './types';

const DANGEROUS_PATTERNS = [
  /\brm\s+-(?:r[fv]|f[rv]|rf)\s+[\/\\]/i, // rm -rf /
  /\brm\s+-(?:r[fv]|f[rv]|rf)\s+~\/?/i,  // rm -rf ~
  /\brmdir\s+\/s\s+\/q\s+[c-zC-Z]:\\/i,  // rmdir /s /q C:\
  /\bdel\s+\/f\s+\/s\s+\/q\s+[c-zC-Z]:\\/i,
  /\bsudo\b/i,                           // sudo escalation
  /\bdoas\b/i,
  /\bsu\s+/i,
  /\bdd\s+if=\/dev\/(?:zero|urandom|null)\s+of=\/dev\//i, // dd disk wiper
  /\bmkfs(?:\.\w+)?\s+/i,                // filesystem format
  /\bformat\s+[c-zC-Z]:/i,               // Windows disk format
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // Bash fork bomb
  /\bchmod\s+-(?:R|r)\s+777\s+[\/\\]/i,  // chmod -R 777 /
  /\b(?:shutdown|reboot|poweroff|init\s+0)\b/i,
  /\bfind\b.*\s-delete\b/i,              // find ... -delete
  /\bfind\b.*\s-exec\s+rm\b/i,           // find ... -exec rm
  /\bcurl\b.*\|\s*(?:sh|bash)\b/i,        // curl ... | sh/bash
  /\bwget\b.*\|\s*(?:sh|bash)\b/i,        // wget ... | sh/bash
  /\bpython3?\s+-c\b.*(?:shutil\.rmtree|os\.remove)/i, // python -c destructive
  /\bperl\s+-e\b.*\bsystem\s*\(/i,        // perl -e with system()
  /\bpkexec\b/i,                          // pkexec privilege escalation
  /\bbase64\s+(?:-d|--decode)\b.*\|\s*(?:sh|bash)\b/i, // base64 -d | sh
];

/**
 * Destructive Command Guard & Infinite Loop Breaker
 */
export class CommandGuard {
  private recentCommands: string[] = [];

  /**
   * Split a command string on shell operators (; && || |) while respecting
   * single and double quotes. Returns the individual command segments.
   */
  private splitShellSegments(command: string): string[] {
    const segments: string[] = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    let i = 0;

    while (i < command.length) {
      const ch = command[i];

      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
        current += ch;
        i++;
      } else if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
        current += ch;
        i++;
      } else if (!inSingle && !inDouble) {
        if (ch === ';') {
          segments.push(current);
          current = '';
          i++;
        } else if (ch === '&' && command[i + 1] === '&') {
          segments.push(current);
          current = '';
          i += 2;
        } else if (ch === '|' && command[i + 1] === '|') {
          segments.push(current);
          current = '';
          i += 2;
        } else if (ch === '|') {
          segments.push(current);
          current = '';
          i++;
        } else {
          current += ch;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    }

    if (current.length > 0) {
      segments.push(current);
    }

    return segments;
  }

  /**
   * Check if a shell command is safe to execute
   */
  public checkCommand(rawCommand: string): CommandCheckResult {
    const trimmed = rawCommand.trim();

    // 1. Split into segments and check each against dangerous patterns
    const segments = this.splitShellSegments(trimmed);
    for (const segment of segments) {
      const seg = segment.trim();
      if (!seg) continue;
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(seg)) {
          return {
            allowed: false,
            sanitizedCommand: trimmed,
            violation: {
              rule: 'destructive_command',
              target: seg,
              reason: `Execution blocked: Command matches blacklisted destructive pattern: ${pattern.source}`,
              timestamp: Date.now(),
            },
          };
        }
      }
    }

    // Also check the full combined command for patterns that span pipes
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          allowed: false,
          sanitizedCommand: trimmed,
          violation: {
            rule: 'destructive_command',
            target: trimmed,
            reason: `Execution blocked: Command matches blacklisted destructive pattern: ${pattern.source}`,
            timestamp: Date.now(),
          },
        };
      }
    }

    // 2. Check infinite command retry loops
    const lastThree = this.recentCommands.slice(-2);
    if (lastThree.length === 2 && lastThree[0] === trimmed && lastThree[1] === trimmed) {
      return {
        allowed: false,
        sanitizedCommand: trimmed,
        violation: {
          rule: 'loop_detection',
          target: trimmed,
          reason: `Execution halted: Command loop detected. The exact same command has failed or executed 3 times consecutively.`,
          timestamp: Date.now(),
        },
      };
    }

    this.recentCommands.push(trimmed);
    if (this.recentCommands.length > 20) this.recentCommands.shift();

    return {
      allowed: true,
      sanitizedCommand: trimmed,
    };
  }
}
