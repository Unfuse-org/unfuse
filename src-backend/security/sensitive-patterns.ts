/**
 * @file security/sensitive-patterns.ts
 * @description Master catalog of sensitive file paths, credential locations, cryptographic keys,
 * and system root boundaries that are unconditionally forbidden from AI agent access.
 * 
 * SECURITY PHILOSOPHY:
 * 1. Hard block paths NEVER reach the UI permission gate. They are rejected immediately at the server layer.
 * 2. Covers 6 core categories: Environment secrets, SSH/crypto keys, Cloud/CLI tokens, Service account JSONs,
 *    Shell history files, and OS system internals.
 * 3. Prevents credential leakage, accidental key exfiltration, and prompt injection exploits targeting auth stores.
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Sensitive filename exact matches (case-insensitive where applicable).
 */
const SENSITIVE_EXACT_FILENAMES = new Set([
  '.env',
  '.envrc',
  '.netrc',
  '.npmrc',
  '.pypirc',
  '.git-credentials',
  'id_rsa',
  'id_ed25519',
  'id_ecdsa',
  'id_dsa',
]);

/**
 * RegEx patterns for sensitive file names, secret configs, and credentials.
 */
const SENSITIVE_NAME_PATTERNS: RegExp[] = [
  // .env files (.env.local, .env.production, .env.development, etc.)
  /^\.env(\..+)?$/i,
  // Key and certificate formats
  /\.(pem|key|p12|pfx|pkcs12)$/i,
  // Private SSH key variants
  /^id_[a-zA-Z0-9_-]+$/i,
  // Cloud service accounts and Google API credentials
  /serviceaccount(key)?.*\.json$/i,
  /google-credentials.*\.json$/i,
  /firebase-adminsdk.*\.json$/i,
];

/**
 * Forbidden user directory fragments that store critical tokens and history.
 */
const SENSITIVE_USER_DIRECTORIES: string[] = [
  '.ssh',
  '.gnupg',
  '.aws',
  '.azure',
  '.gcp',
  '.config/gcloud',
  '.kube',
  '.docker',
  '.config/gh',
  'Library/Keychains',
];

/**
 * Shell history file basenames.
 */
const SENSITIVE_HISTORY_FILES = new Set([
  '.bash_history',
  '.zsh_history',
  '.node_repl_history',
  '.python_history',
  '.psql_history',
  '.sqlite_history',
  '.mysql_history',
]);

/**
 * Operating system system-critical root directory prefixes.
 */
const SYSTEM_PROTECTED_ROOTS: string[] = [
  '/etc',
  '/private/etc',
  '/private/var',
  '/System',
  '/usr',
  '/bin',
  '/sbin',
  '/var',
];

/**
 * Expands leading tildes (~) to the user's actual home directory.
 */
function expandHomeDirectory(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

/**
 * Inspects a candidate file path and determines if it violates any sensitive path rule.
 * 
 * @param targetPath The raw or absolute path requested by a tool call.
 * @returns true if the path points to a sensitive/restricted file or directory, false otherwise.
 */
export function isSensitivePath(targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== 'string') {
    return true; // Treat invalid input as sensitive / reject
  }

  // Normalize path and resolve symlinks/relative tokens
  const expanded = expandHomeDirectory(targetPath.trim());
  const normalized = path.normalize(expanded);
  const homeDir = os.homedir();
  const filename = path.basename(normalized);

  // 1. Check exact forbidden filenames (.env, .npmrc, id_rsa, etc.)
  if (SENSITIVE_EXACT_FILENAMES.has(filename.toLowerCase())) {
    return true;
  }

  // 2. Check filename pattern matches (.env.*, *.pem, *serviceAccountKey*.json)
  for (const pattern of SENSITIVE_NAME_PATTERNS) {
    if (pattern.test(filename)) {
      return true;
    }
  }

  // 3. Check shell history files
  if (SENSITIVE_HISTORY_FILES.has(filename.toLowerCase())) {
    return true;
  }

  // 4. Check user credential directory containment (~/.ssh, ~/.aws, ~/.kube, etc.)
  for (const sensitiveDir of SENSITIVE_USER_DIRECTORIES) {
    const fullRestrictedDir = path.join(homeDir, sensitiveDir);
    // If normalized path equals or is a descendant of the restricted directory
    if (normalized === fullRestrictedDir || normalized.startsWith(fullRestrictedDir + path.sep)) {
      return true;
    }
  }

  // 5. Check operating system root boundaries (/etc, /System, /usr, /bin, etc.)
  for (const sysRoot of SYSTEM_PROTECTED_ROOTS) {
    if (normalized === sysRoot || normalized.startsWith(sysRoot + path.sep)) {
      return true;
    }
  }

  // 6. Check for directories literally named "secrets" or "credentials"
  const pathSegments = normalized.split(path.sep).map((s) => s.toLowerCase());
  if (pathSegments.includes('secrets') || pathSegments.includes('credentials')) {
    return true;
  }

  return false;
}
