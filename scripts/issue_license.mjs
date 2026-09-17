#!/usr/bin/env node
/**
 * Unfuse Offline License Signing Tool
 * 
 * ⚠️ SECURITY NOTICE:
 * This script runs OFFLINE on your secure machine or signing server.
 * The Ed25519 private key NEVER touches the client codebase or public repository.
 * It is loaded from the UNFUSE_LICENSE_SIGNING_KEY environment variable or the
 * gitignored '.secrets/license_authority.key' file.
 * 
 * Usage:
 *   node scripts/issue_license.mjs --holder "alice@example.com" --tier pro --days 365
 *   node scripts/issue_license.mjs --holder "bob@corp.internal" --tier pro --lifetime
 *   node scripts/issue_license.mjs --holder "charlie@free.org" --tier free
 */

import { sign, verify, createPrivateKey, createPublicKey, randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const LOCAL_KEY_FILE = resolve(PROJECT_ROOT, '.secrets', 'license_authority.key');

// The embedded public key matching src-tauri/src/license/mod.rs
export const EMBEDDED_PUBLIC_KEY_HEX =
  'de0db7b52e547b6e0b9601662df0af4c9550933e55af7285a9b53237b2a1aeb4';

/**
 * Resolves the private signing key securely without any hardcoded secret fallback.
 */
export function resolveSigningKeyHex() {
  if (process.env.UNFUSE_LICENSE_SIGNING_KEY) {
    const key = process.env.UNFUSE_LICENSE_SIGNING_KEY.trim();
    if (key.length === 64) return key;
    throw new Error('UNFUSE_LICENSE_SIGNING_KEY environment variable must be a 64-character hex string');
  }

  if (existsSync(LOCAL_KEY_FILE)) {
    const key = readFileSync(LOCAL_KEY_FILE, 'utf8').trim();
    if (key.length === 64) return key;
    throw new Error(`Private key file at ${LOCAL_KEY_FILE} is invalid (expected 64 hex characters)`);
  }

  throw new Error(
    `No signing authority private key found!\n` +
    `Either set the UNFUSE_LICENSE_SIGNING_KEY environment variable or run:\n` +
    `  node scripts/generate_authority_keypair.mjs\n` +
    `to generate a local private key in .secrets/license_authority.key (excluded from git).`
  );
}

export function canonicalLicenseBytes(key, tier, holder, expiresAt) {
  return Buffer.from(
    `unfuse-license:v1:${key}:${tier}:${holder}:${expiresAt ?? 0}`,
    'utf8'
  );
}

export function generateLicenseKeyString(tier) {
  const prefix = `UNFUSE-${tier.toUpperCase()}`;
  const year = new Date().getFullYear();
  const chunk1 = randomBytes(2).toString('hex').toUpperCase();
  const chunk2 = randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${year}-${chunk1}-${chunk2}`;
}

export function issueLicense({
  holder,
  tier = 'pro',
  expiresAt = null,
  signingKeyHex = null,
}) {
  if (!holder || !holder.trim()) {
    throw new Error('License holder is required (e.g. email or username)');
  }
  if (!['pro', 'free', 'enterprise'].includes(tier)) {
    throw new Error(`Invalid tier: ${tier}. Must be 'pro', 'free', or 'enterprise'`);
  }

  const activeSigningKey = signingKeyHex || resolveSigningKeyHex();
  const key = generateLicenseKeyString(tier);
  const canonicalBytes = canonicalLicenseBytes(key, tier, holder, expiresAt);

  // Reconstruct Ed25519 private key from 32 raw bytes (PKCS#8 prefix)
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const privKeyDer = Buffer.concat([pkcs8Prefix, Buffer.from(activeSigningKey, 'hex')]);
  const privateKey = createPrivateKey({ key: privKeyDer, format: 'der', type: 'pkcs8' });

  // Cryptographic Ed25519 signature
  const signatureBytes = sign(null, canonicalBytes, privateKey);
  const signatureHex = signatureBytes.toString('hex');

  // Verify immediately against embedded public key to guarantee correctness before delivery
  const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
  const pubKeyDer = Buffer.concat([spkiPrefix, Buffer.from(EMBEDDED_PUBLIC_KEY_HEX, 'hex')]);
  const publicKey = createPublicKey({ key: pubKeyDer, format: 'der', type: 'spki' });

  const isValid = verify(null, canonicalBytes, publicKey, signatureBytes);
  if (!isValid) {
    throw new Error('CRITICAL: Self-verification of generated license signature failed against EMBEDDED_PUBLIC_KEY_HEX!');
  }

  return {
    key,
    tier,
    holder,
    expires_at: expiresAt,
    signature: signatureHex,
  };
}

// CLI Execution
if (process.argv[1]?.endsWith('issue_license.mjs')) {
  try {
    const { values } = parseArgs({
      options: {
        holder: { type: 'string', short: 'h' },
        tier: { type: 'string', short: 't', default: 'pro' },
        days: { type: 'string', short: 'd' },
        lifetime: { type: 'boolean', short: 'l', default: false },
        help: { type: 'boolean' },
      },
    });

    if (values.help || !values.holder) {
      console.log(`
Unfuse License Issuer
=====================
Usage:
  node scripts/issue_license.mjs --holder <email> [options]

Options:
  -h, --holder <string>   Customer name or email (required)
  -t, --tier <tier>       License tier: 'pro', 'free', 'enterprise' (default: 'pro')
  -d, --days <number>     License validity in days from today
  -l, --lifetime          Issue a lifetime license without expiration
      --help              Show this help message

Examples:
  node scripts/issue_license.mjs --holder "dev@company.com" --tier pro --days 365
  node scripts/issue_license.mjs --holder "sponsor@github.com" --tier pro --lifetime
`);
      process.exit(values.help ? 0 : 1);
    }

    let expiresAt = null;
    if (!values.lifetime && values.days) {
      const days = parseInt(values.days, 10);
      if (isNaN(days) || days <= 0) {
        throw new Error('Days must be a positive integer');
      }
      expiresAt = Math.floor(Date.now() / 1000) + days * 86400;
    }

    const license = issueLicense({
      holder: values.holder,
      tier: values.tier,
      expiresAt,
    });

    console.log(JSON.stringify(license, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
