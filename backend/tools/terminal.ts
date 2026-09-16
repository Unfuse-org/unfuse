import type { RunCommandArgs, ToolExecutionResult } from './types';

export interface TerminalExecutionCallbacks {
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  onExit?: (code: number) => void;
}

const MAX_OUTPUT_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Sandboxed Terminal / Shell Execution Engine
 * Spawns child process with real-time stream callbacks and safety timeout
 */
export class TerminalEngine {
  private defaultCwd: string;

  constructor(defaultCwd: string = process.cwd()) {
    this.defaultCwd = defaultCwd;
  }

  public setDefaultCwd(cwd: string) {
    this.defaultCwd = cwd;
  }

  public async runCommand(
    args: RunCommandArgs,
    callbacks?: TerminalExecutionCallbacks
  ): Promise<ToolExecutionResult> {
    const cwd = args.cwd || this.defaultCwd;
    const timeoutMs = args.timeoutMs || 60_000; // 60 second default timeout

    try {
      const { spawn } = await import('node:child_process');

      return new Promise((resolve) => {
        let stdoutAcc = '';
        let stderrAcc = '';
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let stdoutTruncated = false;
        let stderrTruncated = false;
        let isTimedOut = false;

        const isWindows = process.platform === 'win32';
        const shell = isWindows ? 'cmd.exe' : (process.env.SHELL || '/bin/sh');
        const shellArgs = isWindows ? ['/c', args.command] : ['-c', args.command];

        const proc = spawn(shell, shellArgs, {
          cwd,
          env: {
            ...process.env,
            FORCE_COLOR: '1',
            PAGER: 'cat',
          },
          ...(isWindows ? {} : { detached: true }),
        });

        const timer = setTimeout(() => {
          isTimedOut = true;
          try {
            if (!isWindows && proc.pid) {
              process.kill(-proc.pid, 'SIGKILL');
            } else {
              proc.kill('SIGKILL');
            }
          } catch {
            proc.kill('SIGKILL');
          }
        }, timeoutMs);

        proc.stdout?.on('data', (data) => {
          const str = data.toString();
          const byteLen = Buffer.byteLength(str);
          if (!stdoutTruncated) {
            if (stdoutBytes + byteLen > MAX_OUTPUT_BYTES) {
              const remaining = MAX_OUTPUT_BYTES - stdoutBytes;
              stdoutAcc += str.slice(0, remaining);
              stdoutAcc += '\n[Output truncated]';
              stdoutTruncated = true;
            } else {
              stdoutAcc += str;
            }
            stdoutBytes += byteLen;
          }
          if (callbacks?.onStdout) callbacks.onStdout(str);
        });

        proc.stderr?.on('data', (data) => {
          const str = data.toString();
          const byteLen = Buffer.byteLength(str);
          if (!stderrTruncated) {
            if (stderrBytes + byteLen > MAX_OUTPUT_BYTES) {
              const remaining = MAX_OUTPUT_BYTES - stderrBytes;
              stderrAcc += str.slice(0, remaining);
              stderrAcc += '\n[Output truncated]';
              stderrTruncated = true;
            } else {
              stderrAcc += str;
            }
            stderrBytes += byteLen;
          }
          if (callbacks?.onStderr) callbacks.onStderr(str);
        });

        proc.on('close', (code, signal) => {
          clearTimeout(timer);

          if (isTimedOut) {
            if (callbacks?.onExit) callbacks.onExit(124);
            resolve({
              tool: 'run_command',
              success: false,
              error: `Command execution timed out after ${timeoutMs / 1000}s`,
              stdout: stdoutAcc,
              stderr: stderrAcc,
              exitCode: 124,
            });
            return;
          }

          // Signal-killed detection: code is null when killed by signal
          const exitCode = code !== null ? code : (signal ? 137 : 0);
          const success = code !== null ? code === 0 : false;
          if (callbacks?.onExit) callbacks.onExit(exitCode);

          resolve({
            tool: 'run_command',
            success,
            stdout: stdoutAcc,
            stderr: stderrAcc,
            exitCode,
            data: {
              command: args.command,
              cwd,
              exitCode,
            },
          });
        });

        proc.on('error', (err) => {
          clearTimeout(timer);
          resolve({
            tool: 'run_command',
            success: false,
            error: `Failed to spawn shell command: ${err.message}`,
          });
        });
      });
    } catch (err: any) {
      return {
        tool: 'run_command',
        success: false,
        error: `Terminal execution failure: ${err.message}`,
      };
    }
  }
}
