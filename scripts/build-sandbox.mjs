import { spawnSync } from 'node:child_process';
import { mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const target = process.argv[2] || spawnSync('rustc', ['--print', 'host-tuple'], { encoding: 'utf8' }).stdout?.trim();
const os = target?.includes('apple-darwin') ? 'darwin' : target?.includes('linux') ? 'linux' : target?.includes('windows') ? 'windows' : null;
const arch = target?.startsWith('aarch64') ? 'arm64' : target?.startsWith('x86_64') ? 'x64' : null;
if (!os || !arch) throw new Error(`Unsupported sandbox build target: ${target}`);
const dir = join(root, 'src-tauri/runtime');
mkdirSync(dir, { recursive: true });
const binary = join(dir, `unfuse-srt-${target}${os === 'windows' ? '.exe' : ''}`);
const source = join(root, 'sandbox/runner.ts');
const pkg = join(root, 'node_modules/@anthropic-ai/sandbox-runtime');
const inputs = [source, fileURLToPath(import.meta.url), join(root, 'package-lock.json'), join(pkg, 'package.json')];
if (!existsSync(binary) || inputs.some(input => statSync(input).mtimeMs > statSync(binary).mtimeMs)) {
  const result = spawnSync('bun', ['build', source, '--compile', `--target=bun-${os}-${arch}`, '--no-compile-autoload-dotenv', '--no-compile-autoload-bunfig', '--no-compile-autoload-tsconfig', '--outfile', binary], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Bun is required to build the bundled SRT helper. The app will not fall back to host execution.');
}
cpSync(join(pkg, 'vendor/seccomp'), join(dir, 'vendor/seccomp'), { recursive: true });
let notices = `Bun runtime license and source: https://github.com/oven-sh/bun/tree/bun-v1.3.14\n${readFileSync(join(root, 'sandbox/BUN-LICENSE.md'), 'utf8')}\n`;
const require = createRequire(join(pkg, 'package.json'));
for (const name of ['@anthropic-ai/sandbox-runtime', '@pondwader/socks5-server', 'commander', 'node-forge', 'zod']) {
  let path = name === '@anthropic-ai/sandbox-runtime' ? pkg : dirname(require.resolve(name));
  while (!existsSync(join(path, 'package.json')) || JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')).name !== name) {
    const parent = dirname(path);
    if (parent === path) throw new Error(`Cannot locate ${name} license`);
    path = parent;
  }
  for (const license of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE-MIT']) {
    if (existsSync(join(path, license))) { notices += `\n--- ${name} ---\n${readFileSync(join(path, license), 'utf8')}\n`; break; }
  }
}
writeFileSync(join(dir, 'THIRD_PARTY_NOTICES.txt'), notices);
