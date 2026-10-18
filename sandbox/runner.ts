import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { SandboxManager, SandboxRuntimeConfigSchema } from '@anthropic-ai/sandbox-runtime';

let child: ChildProcess | undefined;
let stopping = false;
async function finish(code: number) {
  if (stopping) return;
  stopping = true;
  child?.kill('SIGTERM');
  await SandboxManager.reset();
  process.exit(code);
}
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => void finish(signal === 'SIGTERM' ? 143 : 130));
try {
  if (!['darwin', 'linux'].includes(process.platform)) throw new Error('This Unfuse build has no verified SRT platform adapter. Host execution is disabled.');
  const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (!Array.isArray(plan.argv) || !plan.argv.length || plan.argv.some((s: unknown) => typeof s !== 'string')) throw new Error('Invalid sandbox command');
  const config = SandboxRuntimeConfigSchema.parse(plan.config);
  if (process.platform === 'linux') config.seccomp = { applyPath: join(process.argv[3], 'seccomp', process.arch, 'apply-seccomp') };
  process.env.HOME = plan.home;
  process.env.TMPDIR = plan.tmp;
  process.env.CLAUDE_CODE_TMPDIR = plan.tmp;
  process.chdir(plan.cwd);
  await SandboxManager.initialize(config, undefined, false);
  if (!SandboxManager.isSandboxingEnabled()) throw new Error('SRT did not enable sandboxing');
  if (process.platform === 'linux' && SandboxManager.getLinuxGlobPatternWarnings().length) throw new Error('This Linux SRT adapter cannot enforce all required filesystem rules. Host execution is disabled.');
  const dependencies = await SandboxManager.checkDependenciesAsync();
  if (dependencies.errors.length || dependencies.warnings.length) throw new Error([...dependencies.errors, ...dependencies.warnings].join('; '));
  const quote = (arg: string) => "'" + arg.replaceAll("'", "'\\''") + "'";
  const wrapped = await SandboxManager.wrapWithSandboxArgv(plan.argv.map(quote).join(' '), '/bin/sh');
  if (stopping) throw new Error('Sandbox startup cancelled');
  child = spawn(wrapped.argv[0], wrapped.argv.slice(1), { cwd: plan.cwd, env: wrapped.env, stdio: 'inherit', shell: false });
  child.once('error', () => { process.stderr.write('Unfuse SRT: sandboxed process could not start.\n'); void finish(125); });
  child.once('exit', (code, signal) => void finish(code ?? (signal ? 128 : 125)));
  // Stop local MCP descendants if the application dies without closing their transport.
  const parent = process.ppid;
  setInterval(() => { if (process.ppid !== parent || process.ppid === 1) void finish(125); }, 1000).unref();
} catch (error) {
  process.stderr.write(`Unfuse SRT refused execution: ${error instanceof Error ? error.message : 'invalid sandbox setup'}\n`);
  await finish(125);
}
