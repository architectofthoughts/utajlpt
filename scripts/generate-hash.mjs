// Generate AUTH_PASSPHRASE_HASH for .dev.vars and Cloudflare secrets
// Usage: node scripts/generate-hash.mjs <passphrase>

import { webcrypto } from 'crypto';
const crypto = webcrypto;

async function hashPassphrase(passphrase, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const passphrase = process.argv[2];
if (!passphrase) {
    console.error('Usage: node scripts/generate-hash.mjs <passphrase>');
    process.exit(1);
}

const salt = crypto.randomUUID();
const hash = await hashPassphrase(passphrase, salt);
const result = `${salt}:${hash}`;

console.log('\nGenerated AUTH_PASSPHRASE_HASH:');
console.log(result);
console.log('\nAdd this to .dev.vars:');
console.log(`AUTH_PASSPHRASE_HASH=${result}`);
console.log('\nFor production, run:');
console.log(`npx wrangler pages secret put AUTH_PASSPHRASE_HASH`);
console.log('Then paste the value above.');
