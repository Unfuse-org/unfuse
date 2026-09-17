#!/usr/bin/env node
/**
 * Unfuse Offline License Authority Keypair Generator
 * 
 * ⚠️ SECURITY NOTICE:
 * Run this tool ONCE to initialize your offline license signing authority.
 * The generated private key is stored exclusively in `.secrets/license_authority.key`.
 * This file is excluded from git via .gitignore and MUST NEVER be committed.
 * 
 * Usage:
 *   node scripts/generate_authority_keypair.mjs
 *   node scripts/generate_authority_keypair.mjs --force
 */

import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const SECRETS_DIR = resolve(PROJECT_ROOT, '.secrets');
const PRIV_KEY_PATH = resolve(SECRETS_DIR, 'license_authority.key');

const force = process.argv.includes('--force');

if (existsSync(PRIV_KEY_PATH) && !force) {
  console.error(`
❌ An authority key already exists at:
   ${PRIV_KEY_PATH}

If you overwrite this key, previously issued licenses will no longer verify!
To regenerate anyway, run with --force:
   node scripts/generate_authority_keypair.mjs --force
`);
  process.exit(1);
}

// Generate Ed25519 keypair
const { publicKey, privateKey } = generateKeyPairSync('ed25519');

// Raw 32 bytes from PKCS#8 / SPKI
const pubKeyHex = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
const privKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('hex');

// Ensure .secrets directory exists with restricted permissions (0700)
if (!existsSync(SECRETS_DIR)) {
  mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 });
}

// Write private key with strict permissions (0600)
writeFileSync(PRIV_KEY_PATH, privKeyHex.trim() + '\n', { mode: 0o600 });
try {
  chmodSync(PRIV_KEY_PATH, 0o600);
} catch {}

console.log(`
✅ Generated new Ed25519 License Authority Keypair!

Private Key (Signing Authority):
  Location: ${PRIV_KEY_PATH}
  Permissions: 0600 (owner read/write only, excluded from git)
  Status: SECURE (never commit this file)

Public Key (Embedded in Rust Binary):
  Hex: ${pubKeyHex}

Next Steps:
  1. Ensure EMBEDDED_PUBLIC_KEY_HEX in 'src-tauri/src/license/mod.rs' matches this public key.
  2. Issue licenses offline using:
     node scripts/issue_license.mjs --holder "customer@email.com" --tier pro --days 365
`);
