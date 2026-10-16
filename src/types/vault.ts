export type ItemCategory = 'login' | 'card' | 'note' | 'identity';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'hidden' | 'boolean';
}

export interface PasswordHistoryEntry {
  password: string;
  changedAt: number;
}

export interface VaultItem {
  id: string;
  category: ItemCategory;
  title: string;
  websiteUrl?: string;
  username?: string;
  password?: string;
  totpSecret?: string;
  
  // Card specific
  cardholderName?: string;
  cardNumber?: string;
  cardExpMonth?: string;
  cardExpYear?: string;
  cardCvv?: string;
  cardBrand?: string;
  
  // Note specific
  notes?: string;
  
  // Identity specific
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  
  // Metadata
  tags: string[];
  favorite: boolean;
  customFields?: CustomField[];
  history?: PasswordHistoryEntry[];
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

export interface EncryptedVaultPayload {
  version: number;
  salt: string; // base64
  verifyHash: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  itemsCount: number;
  lastSaved: number;
}

export interface PasswordAuditReport {
  score: number; // 0-100
  totalItems: number;
  weakCount: number;
  reusedCount: number;
  missing2faCount: number;
  oldPasswordsCount: number;
  reusedGroups: { password: string; items: VaultItem[] }[];
  weakItems: VaultItem[];
  missing2faItems: VaultItem[];
  oldItems: VaultItem[];
}

export interface GeneratorOptions {
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
}

export interface ExtensionAutofillRequest {
  type: 'AEGIS_AUTOFILL_REQUEST';
  url: string;
  tabId?: number;
  timestamp: number;
}

export interface ExtensionAutofillResponse {
  type: 'AEGIS_AUTOFILL_RESPONSE';
  success: boolean;
  item?: {
    id: string;
    title: string;
    username?: string;
    password?: string;
    totpCode?: string;
    cardNumber?: string;
    cardholderName?: string;
    cardExp?: string;
    cardCvv?: string;
  };
}
