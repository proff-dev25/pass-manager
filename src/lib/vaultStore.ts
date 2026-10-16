import { VaultItem, EncryptedVaultPayload, PasswordAuditReport } from '../types/vault';
import {
  deriveVaultKey,
  encryptVaultData,
  decryptVaultData,
  getRandomBytes,
  bufferToBase64,
  base64ToBuffer,
  assessPasswordStrength,
  extractDomain,
} from './crypto';

const STORAGE_KEY = 'aegispass_encrypted_vault_v1';
const AUTO_LOCK_SETTING_KEY = 'aegispass_autolock_minutes';

export const INITIAL_DEMO_ITEMS: VaultItem[] = [
  {
    id: 'item-github-01',
    category: 'login',
    title: 'GitHub Developer',
    websiteUrl: 'https://github.com/login',
    username: 'octocat.dev@gmail.com',
    password: 'K7$v9#mP!xL2@qR8',
    totpSecret: 'JBSWY3DPEHPK3PXP', // Valid base32 secret for live TOTP calculation!
    favorite: true,
    tags: ['work', 'dev', 'code'],
    notes: 'Personal developer account with 2FA recovery keys backed up.',
    createdAt: Date.now() - 45 * 86400000,
    updatedAt: Date.now() - 10 * 86400000,
    history: [{ password: 'oldPassword123!', changedAt: Date.now() - 45 * 86400000 }],
  },
  {
    id: 'item-stripe-02',
    category: 'login',
    title: 'Stripe Dashboard',
    websiteUrl: 'https://dashboard.stripe.com/login',
    username: 'finance@aegislabs.io',
    password: 'vR4%yQ9&wB2*tM8#sL',
    totpSecret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
    favorite: true,
    tags: ['finance', 'billing'],
    notes: 'Production payment gateway and webhook management.',
    createdAt: Date.now() - 30 * 86400000,
    updatedAt: Date.now() - 5 * 86400000,
  },
  {
    id: 'item-netflix-03',
    category: 'login',
    title: 'Netflix Family',
    websiteUrl: 'https://www.netflix.com/login',
    username: 'alex.rivera@stream.org',
    password: 'Summer2024!Stream', // Reused password sample for audit
    favorite: false,
    tags: ['personal', 'entertainment'],
    createdAt: Date.now() - 120 * 86400000,
    updatedAt: Date.now() - 120 * 86400000,
  },
  {
    id: 'item-spotify-04',
    category: 'login',
    title: 'Spotify Premium',
    websiteUrl: 'https://accounts.spotify.com/en/login',
    username: 'alex.rivera@stream.org',
    password: 'Summer2024!Stream', // Reused password sample for audit
    favorite: false,
    tags: ['personal', 'music'],
    createdAt: Date.now() - 110 * 86400000,
    updatedAt: Date.now() - 110 * 86400000,
  },
  {
    id: 'item-bank-05',
    category: 'login',
    title: 'Chase Banking Online',
    websiteUrl: 'https://secure05c.chase.com/web/auth/#/logon/logonbox',
    username: 'arivera_banking99',
    password: 'Z9#kL2$vP7!wM5@qR',
    totpSecret: 'NBSWY3DPEHPK3PXP',
    favorite: true,
    tags: ['finance', 'banking'],
    notes: 'High security commercial checking account.',
    createdAt: Date.now() - 60 * 86400000,
    updatedAt: Date.now() - 12 * 86400000,
  },
  {
    id: 'item-card-06',
    category: 'card',
    title: 'Sapphire Preferred Business',
    cardholderName: 'ALEX RIVERA',
    cardNumber: '4532 •••• •••• 8892',
    cardExpMonth: '08',
    cardExpYear: '2028',
    cardCvv: '482',
    cardBrand: 'Visa',
    favorite: true,
    tags: ['finance', 'cards'],
    notes: 'Primary corporate travel and cloud hosting expenses card.',
    createdAt: Date.now() - 70 * 86400000,
    updatedAt: Date.now() - 70 * 86400000,
  },
  {
    id: 'item-card-07',
    category: 'card',
    title: 'Apple Card Titanium',
    cardholderName: 'ALEX RIVERA',
    cardNumber: '5424 •••• •••• 3019',
    cardExpMonth: '11',
    cardExpYear: '2029',
    cardCvv: '915',
    cardBrand: 'Mastercard',
    favorite: false,
    tags: ['personal', 'cards'],
    createdAt: Date.now() - 40 * 86400000,
    updatedAt: Date.now() - 40 * 86400000,
  },
  {
    id: 'item-note-08',
    category: 'note',
    title: 'Server Master SSH & Recovery Phrase',
    notes: `Production Cluster Recovery Seeds:
1. timber 2. glacier 3. canyon 4. beacon 5. horizon 6. summit 7. cipher 8. anchor 9. vortex 10. sapphire 11. zenith 12. harbor

Wireguard Gateway IP: 10.24.0.1/24
Backup Emergency Port: 2282`,
    favorite: true,
    tags: ['dev', 'infrastructure'],
    createdAt: Date.now() - 80 * 86400000,
    updatedAt: Date.now() - 15 * 86400000,
  },
  {
    id: 'item-identity-09',
    category: 'identity',
    title: 'Alex Rivera (Home Address)',
    fullName: 'Alex Rivera',
    email: 'alex.rivera@aegislabs.io',
    phone: '+1 (415) 890-2341',
    address: '450 Mission St, Suite 1200, San Francisco, CA 94105',
    favorite: false,
    tags: ['personal'],
    createdAt: Date.now() - 90 * 86400000,
    updatedAt: Date.now() - 20 * 86400000,
  },
];

// Check if an existing vault exists in localStorage
export function hasStoredVault(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

// Get raw encrypted vault payload
export function getStoredVaultPayload(): EncryptedVaultPayload | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Initialize a new Vault with Master Password
export async function initializeNewVault(
  masterPassword: string,
  initialItems: VaultItem[] = INITIAL_DEMO_ITEMS
): Promise<{ key: CryptoKey; items: VaultItem[] }> {
  const salt = getRandomBytes(16);
  const { key, verifyHash } = await deriveVaultKey(masterPassword, salt);
  const { iv, ciphertext } = await encryptVaultData(initialItems, key);

  const payload: EncryptedVaultPayload = {
    version: 1,
    salt: bufferToBase64(salt),
    verifyHash,
    iv,
    ciphertext,
    itemsCount: initialItems.length,
    lastSaved: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return { key, items: initialItems };
}

// Unlock an existing vault
export async function unlockVault(
  masterPassword: string
): Promise<{ success: boolean; key?: CryptoKey; items?: VaultItem[]; error?: string }> {
  const payload = getStoredVaultPayload();
  if (!payload) {
    return { success: false, error: 'No existing vault found.' };
  }

  try {
    const saltBuffer = base64ToBuffer(payload.salt);
    const { key, verifyHash } = await deriveVaultKey(masterPassword, saltBuffer);

    // Check verification hash
    if (verifyHash !== payload.verifyHash) {
      return { success: false, error: 'Incorrect master password.' };
    }

    const items = await decryptVaultData<VaultItem[]>(
      payload.ciphertext,
      payload.iv,
      key
    );

    return { success: true, key, items };
  } catch (err) {
    console.error('Vault decryption failed:', err);
    return { success: false, error: 'Decryption failed. Invalid credentials or corrupted vault.' };
  }
}

// Save modified vault items with current key
export async function saveVaultItems(
  items: VaultItem[],
  key: CryptoKey,
  existingPayload: EncryptedVaultPayload
): Promise<EncryptedVaultPayload> {
  const { iv, ciphertext } = await encryptVaultData(items, key);

  const updatedPayload: EncryptedVaultPayload = {
    ...existingPayload,
    iv,
    ciphertext,
    itemsCount: items.length,
    lastSaved: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPayload));
  return updatedPayload;
}

// Auto-lock configuration
export function getAutoLockMinutes(): number {
  const val = localStorage.getItem(AUTO_LOCK_SETTING_KEY);
  return val ? parseInt(val, 10) : 15;
}

export function setAutoLockMinutes(minutes: number): void {
  localStorage.setItem(AUTO_LOCK_SETTING_KEY, minutes.toString());
}

// Security Audit & Health Analyzer
export function auditVaultSecurity(items: VaultItem[]): PasswordAuditReport {
  const loginItems = items.filter(i => i.category === 'login' && i.password);
  
  // Reused password groups
  const passwordMap = new Map<string, VaultItem[]>();
  loginItems.forEach(item => {
    if (!item.password) return;
    const existing = passwordMap.get(item.password) || [];
    existing.push(item);
    passwordMap.set(item.password, existing);
  });

  const reusedGroups: { password: string; items: VaultItem[] }[] = [];
  passwordMap.forEach((matchedItems, pwd) => {
    if (matchedItems.length > 1) {
      reusedGroups.push({ password: pwd, items: matchedItems });
    }
  });

  // Weak items (<12 chars or low score)
  const weakItems: VaultItem[] = [];
  loginItems.forEach(item => {
    if (!item.password) return;
    const strength = assessPasswordStrength(item.password);
    if (strength.score < 2 || item.password.length < 12) {
      weakItems.push(item);
    }
  });

  // Missing 2FA
  const missing2faItems = loginItems.filter(i => !i.totpSecret);

  // Old passwords (>90 days)
  const ninetyDaysAgo = Date.now() - 90 * 86400000;
  const oldItems = loginItems.filter(i => (i.updatedAt || i.createdAt) < ninetyDaysAgo);

  // Health Score Calculation: 100 baseline minus penalties
  let score = 100;
  if (loginItems.length > 0) {
    const reusedPenalty = Math.min(35, reusedGroups.reduce((acc, g) => acc + (g.items.length - 1) * 15, 0));
    const weakPenalty = Math.min(30, (weakItems.length / loginItems.length) * 40);
    const missing2faPenalty = Math.min(20, (missing2faItems.length / loginItems.length) * 25);
    const oldPenalty = Math.min(15, (oldItems.length / loginItems.length) * 20);

    score = Math.max(10, Math.round(100 - (reusedPenalty + weakPenalty + missing2faPenalty + oldPenalty)));
  }

  return {
    score,
    totalItems: loginItems.length,
    weakCount: weakItems.length,
    reusedCount: reusedGroups.reduce((acc, g) => acc + g.items.length, 0),
    missing2faCount: missing2faItems.length,
    oldPasswordsCount: oldItems.length,
    reusedGroups,
    weakItems,
    missing2faItems,
    oldItems,
  };
}

// Find matching credentials for a domain / URL
export function findMatchingLogins(items: VaultItem[], targetUrlOrDomain: string): VaultItem[] {
  if (!targetUrlOrDomain) return [];
  const targetDomain = extractDomain(targetUrlOrDomain).toLowerCase();
  
  return items.filter(item => {
    if (item.category !== 'login' || !item.websiteUrl) return false;
    const itemDomain = extractDomain(item.websiteUrl).toLowerCase();
    return (
      itemDomain === targetDomain ||
      itemDomain.endsWith('.' + targetDomain) ||
      targetDomain.endsWith('.' + itemDomain) ||
      itemDomain.includes(targetDomain) ||
      targetDomain.includes(itemDomain)
    );
  });
}
