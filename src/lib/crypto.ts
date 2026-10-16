/**
 * Cryptographic engine for AegisPass
 * Uses standard Web Cryptography API (SubtleCrypto)
 * - PBKDF2 (SHA-256, 100,000 iterations)
 * - AES-GCM-256 for Zero-Knowledge Vault Encryption
 * - RFC 6238 TOTP calculation with HMAC-SHA1
 */

// Helper to convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate secure random bytes
export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

// Derive AES-GCM Key and Verification Hash from Master Password & Salt
export async function deriveVaultKey(
  masterPassword: string,
  saltBuffer: Uint8Array
): Promise<{ key: CryptoKey; verifyHash: string }> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  );

  // Derive 256-bit AES-GCM key for vault encryption
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Derive verification bits to confirm master password correctness without storing key
  const verifyBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode('AegisPass_Verify_V1_' + bufferToBase64(saltBuffer)),
      iterations: 10000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  const verifyHash = bufferToBase64(verifyBits);
  return { key, verifyHash };
}

// Encrypt plaintext JSON data with AES-GCM
export async function encryptVaultData(
  data: unknown,
  key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));
  const iv = getRandomBytes(12);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    plaintext
  );

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBuffer),
  };
}

// Decrypt AES-GCM ciphertext back into JSON
export async function decryptVaultData<T>(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<T> {
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    ciphertext as any
  );

  const dec = new TextDecoder();
  const jsonString = dec.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}

// Base32 decode for TOTP secret
function base32ToBuffer(base32: string): Uint8Array {
  const clean = base32.replace(/[\s=-]/g, '').toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean.charAt(i));
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

// Calculate RFC 6238 TOTP 6-digit token and remaining seconds
export async function generateTOTP(
  secret: string,
  stepSeconds = 30
): Promise<{ token: string; remainingSeconds: number; progressPercent: number }> {
  try {
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / stepSeconds);
    const remainingSeconds = stepSeconds - (epoch % stepSeconds);
    const progressPercent = Math.round((remainingSeconds / stepSeconds) * 100);

    const secretBytes = base32ToBuffer(secret);
    if (secretBytes.length === 0) {
      return { token: '------', remainingSeconds: 0, progressPercent: 0 };
    }

    const key = await window.crypto.subtle.importKey(
      'raw',
      secretBytes as any,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Convert counter to 8-byte big-endian buffer
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(0, Math.floor(counter / 0x100000000));
    counterView.setUint32(4, counter & 0xffffffff);

    const hmac = await window.crypto.subtle.sign('HMAC', key, counterBuffer);
    const hmacBytes = new Uint8Array(hmac);

    // Dynamic truncation
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    return { token: otp, remainingSeconds, progressPercent };
  } catch (err) {
    console.error('Error generating TOTP:', err);
    return { token: '000000', remainingSeconds: 0, progressPercent: 0 };
  }
}

// Word list for Passphrase Generator (Diceware-style high entropy memorable words)
const PASSPHRASE_WORDS = [
  'anchor', 'beacon', 'breeze', 'bridge', 'canyon', 'castle', 'cipher', 'cloud',
  'comet', 'crystal', 'delta', 'dragon', 'falcon', 'forest', 'galaxy', 'glacier',
  'harbor', 'horizon', 'island', 'jungle', 'jupiter', 'knight', 'lagoon', 'legend',
  'lunar', 'meadow', 'meteor', 'mountain', 'nebula', 'oasis', 'ocean', 'orbit',
  'passage', 'phoenix', 'pinnacle', 'planet', 'portal', 'prism', 'pulsar', 'pyramid',
  'quantum', 'radius', 'ravine', 'reef', 'river', 'rocket', 'rover', 'sapphire',
  'saturn', 'shadow', 'shield', 'sierra', 'solar', 'spark', 'summit', 'temple',
  'timber', 'topaz', 'torrent', 'tower', 'tsunami', 'tundra', 'valley', 'vessel',
  'vortex', 'voyage', 'whisper', 'zenith', 'zen', 'amber', 'atlas', 'aurora'
];

// High-entropy Password & Passphrase Generator
export function generatePassword(options: {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  avoidAmbiguous: boolean;
  mode: 'password' | 'passphrase';
  wordCount?: number;
  delimiter?: string;
  capitalizeWords?: boolean;
}): string {
  if (options.mode === 'passphrase') {
    const count = options.wordCount || 4;
    const delimiter = options.delimiter ?? '-';
    const capitalize = options.capitalizeWords ?? true;
    const selected: string[] = [];

    const randomIndices = new Uint32Array(count);
    window.crypto.getRandomValues(randomIndices);

    for (let i = 0; i < count; i++) {
      let word = PASSPHRASE_WORDS[randomIndices[i] % PASSPHRASE_WORDS.length];
      if (capitalize) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      selected.push(word);
    }
    return selected.join(delimiter);
  }

  let chars = '';
  if (options.useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (options.useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.useNumbers) chars += '0123456789';
  if (options.useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (options.avoidAmbiguous) {
    chars = chars.replace(/[O0l1I|]/g, '');
  }

  if (chars.length === 0) {
    chars = 'abcdefghijklmnopqrstuvwxyz';
  }

  const length = Math.max(6, Math.min(128, options.length));
  const randomArray = new Uint32Array(length);
  window.crypto.getRandomValues(randomArray);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length];
  }

  return result;
}

// Password strength calculation & entropy estimate
export function assessPasswordStrength(password: string): {
  entropy: number;
  score: number; // 0 (terrible) to 4 (very strong)
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  crackTimeEstimate: string;
  feedback: string[];
} {
  if (!password) {
    return {
      entropy: 0,
      score: 0,
      label: 'Very Weak',
      crackTimeEstimate: 'Instant',
      feedback: ['Password is empty'],
    };
  }

  let poolSize = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSymbol) poolSize += 33;

  if (poolSize === 0) poolSize = 1;

  // Information entropy = Length * log2(PoolSize)
  const entropy = Math.round(password.length * Math.log2(poolSize));
  const feedback: string[] = [];

  if (password.length < 10) feedback.push('Length is under 10 characters');
  if (!hasUpper) feedback.push('Add uppercase letters');
  if (!hasNumber) feedback.push('Add numeric digits');
  if (!hasSymbol) feedback.push('Add special symbols');

  // Estimate crack time assuming 100 billion guesses/second (modern GPU cluster)
  const combinations = Math.pow(poolSize, password.length);
  const guessesPerSecond = 1e11; // 100,000,000,000
  const secondsToCrack = combinations / (2 * guessesPerSecond);

  let crackTimeEstimate = 'Instant';
  if (secondsToCrack < 1) crackTimeEstimate = 'Less than a second';
  else if (secondsToCrack < 60) crackTimeEstimate = `${Math.round(secondsToCrack)} seconds`;
  else if (secondsToCrack < 3600) crackTimeEstimate = `${Math.round(secondsToCrack / 60)} minutes`;
  else if (secondsToCrack < 86400) crackTimeEstimate = `${Math.round(secondsToCrack / 3600)} hours`;
  else if (secondsToCrack < 86400 * 30) crackTimeEstimate = `${Math.round(secondsToCrack / 86400)} days`;
  else if (secondsToCrack < 86400 * 365) crackTimeEstimate = `${Math.round(secondsToCrack / (86400 * 30))} months`;
  else if (secondsToCrack < 86400 * 365 * 100) crackTimeEstimate = `${Math.round(secondsToCrack / (86400 * 365))} years`;
  else if (secondsToCrack < 86400 * 365 * 1e6) crackTimeEstimate = `${Math.round(secondsToCrack / (86400 * 365 * 1000))}k years`;
  else crackTimeEstimate = 'Centuries+';

  let score = 0;
  let label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong' = 'Very Weak';

  if (entropy < 28) {
    score = 0;
    label = 'Very Weak';
  } else if (entropy < 45) {
    score = 1;
    label = 'Weak';
  } else if (entropy < 65) {
    score = 2;
    label = 'Fair';
  } else if (entropy < 85) {
    score = 3;
    label = 'Strong';
  } else {
    score = 4;
    label = 'Very Strong';
  }

  return { entropy, score, label, crackTimeEstimate, feedback };
}

// Extract hostname/domain cleanly from a URL
export function extractDomain(url?: string): string {
  if (!url) return '';
  try {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
  }
}
