import React, { useState, useEffect, useRef } from 'react';
import { TopBar, ActiveTab } from './components/TopBar';
import { LockScreen } from './components/LockScreen';
import { VaultListView } from './components/VaultListView';
import { AutofillSandbox } from './components/AutofillSandbox';
import { ExtensionView } from './components/ExtensionView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { PasswordGeneratorModal } from './components/PasswordGeneratorModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemEditorModal } from './components/ItemEditorModal';
import { BiometricSettingsModal } from './components/BiometricSettingsModal';
import { CyberAdvisorChat } from './components/CyberAdvisorChat';
import { VaultItem, EncryptedVaultPayload } from './types/vault';
import {
  hasStoredVault,
  getStoredVaultPayload,
  initializeNewVault,
  unlockVault,
  saveVaultItems,
  getAutoLockMinutes,
  setAutoLockMinutes as saveAutoLockSetting,
  INITIAL_DEMO_ITEMS,
  findMatchingLogins,
} from './lib/vaultStore';
import { downloadExtensionZip } from './lib/extensionGenerator';
import { getSavedWebAuthnConfig } from './lib/webauthn';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('vault');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [hasVault, setHasVault] = useState<boolean>(hasStoredVault());
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(getAutoLockMinutes());
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState<boolean>(!!getSavedWebAuthnConfig());

  // Modals
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<VaultItem | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<VaultItem> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isBiometricSettingsOpen, setIsBiometricSettingsOpen] = useState<boolean>(false);

  // Inactivity auto-lock tracking
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Auto-lock check every 10 seconds
    const interval = setInterval(() => {
      if (!isUnlocked || autoLockMinutes <= 0) return;
      const inactiveMinutes = (Date.now() - lastActivityRef.current) / 60000;
      if (inactiveMinutes >= autoLockMinutes) {
        handleLockVault();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      clearInterval(interval);
    };
  }, [isUnlocked, autoLockMinutes]);

  // Real WebExtension postMessage Bridge
  // Listens to standard WebExtension content script / background messages
  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const { source, action, hostname } = event.data;

      if (source === 'AEGIS_EXTENSION_CONTENT_SCRIPT' && action === 'REQUEST_CREDENTIALS') {
        if (!isUnlocked) {
          window.postMessage({
            source: 'AEGIS_VAULT_WEB',
            action: 'VAULT_LOCKED',
          }, '*');
          return;
        }

        const matches = findMatchingLogins(vaultItems, hostname);
        window.postMessage({
          source: 'AEGIS_VAULT_WEB',
          action: 'CREDENTIALS_FOUND',
          hostname,
          items: matches.map(m => ({
            id: m.id,
            title: m.title,
            username: m.username,
            password: m.password,
            totpSecret: m.totpSecret,
          })),
        }, '*');
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, [isUnlocked, vaultItems]);

  // Unlock Vault
  const handleUnlock = async (masterPassword: string) => {
    const res = await unlockVault(masterPassword);
    if (res.success && res.key && res.items) {
      setVaultKey(res.key);
      setVaultItems(res.items);
      setIsUnlocked(true);
      lastActivityRef.current = Date.now();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  // Create New Vault
  const handleCreateVault = async (masterPassword: string) => {
    const { key, items } = await initializeNewVault(masterPassword, INITIAL_DEMO_ITEMS);
    setVaultKey(key);
    setVaultItems(items);
    setHasVault(true);
    setIsUnlocked(true);
    lastActivityRef.current = Date.now();
  };

  // Reset Vault
  const handleResetVault = () => {
    localStorage.removeItem('aegispass_encrypted_vault_v1');
    setHasVault(false);
    setIsUnlocked(false);
    setVaultKey(null);
    setVaultItems([]);
  };

  // Lock Vault
  const handleLockVault = () => {
    setIsUnlocked(false);
    setVaultKey(null);
    setIsEditorOpen(false);
    setIsDetailOpen(false);
    setSelectedItemForDetail(null);
  };

  // Persist modified items to encrypted storage
  const persistItems = async (newItems: VaultItem[]) => {
    setVaultItems(newItems);
    if (!vaultKey) return;
    const existingPayload = getStoredVaultPayload();
    if (existingPayload) {
      await saveVaultItems(newItems, vaultKey, existingPayload);
    }
  };

  // Save Item (New or Edit)
  const handleSaveItem = async (item: VaultItem) => {
    const index = vaultItems.findIndex(i => i.id === item.id);
    let updated: VaultItem[];
    if (index >= 0) {
      updated = [...vaultItems];
      updated[index] = item;
    } else {
      updated = [item, ...vaultItems];
    }
    await persistItems(updated);

    if (selectedItemForDetail?.id === item.id) {
      setSelectedItemForDetail(item);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string) => {
    const updated = vaultItems.filter(i => i.id !== id);
    await persistItems(updated);
    if (selectedItemForDetail?.id === id) {
      setSelectedItemForDetail(null);
      setIsDetailOpen(false);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string) => {
    const updated = vaultItems.map(item => {
      if (item.id === id) {
        return { ...item, favorite: !item.favorite };
      }
      return item;
    });
    await persistItems(updated);

    if (selectedItemForDetail?.id === id) {
      setSelectedItemForDetail(prev => (prev ? { ...prev, favorite: !prev.favorite } : null));
    }
  };

  // Change Auto-lock duration
  const handleChangeAutoLock = (minutes: number) => {
    setAutoLockMinutesState(minutes);
    saveAutoLockSetting(minutes);
  };

  // Export Vault
  const handleExportVault = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const payload = getStoredVaultPayload();
      if (!payload) return;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegispass-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV format
      const headers = ['Title', 'Category', 'Website', 'Username', 'Password', 'TOTP_Secret', 'Notes'];
      const rows = vaultItems.map(i => [
        `"${(i.title || '').replace(/"/g, '""')}"`,
        `"${i.category}"`,
        `"${(i.websiteUrl || '').replace(/"/g, '""')}"`,
        `"${(i.username || '').replace(/"/g, '""')}"`,
        `"${(i.password || '').replace(/"/g, '""')}"`,
        `"${(i.totpSecret || '').replace(/"/g, '""')}"`,
        `"${(i.notes || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegispass-plain-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Import Vault file
  const handleImportVault = async (file: File) => {
    const text = await file.text();
    try {
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (parsed.salt && parsed.ciphertext && parsed.iv) {
          // Encrypted payload replacement
          localStorage.setItem('aegispass_encrypted_vault_v1', JSON.stringify(parsed));
          alert('Encrypted vault imported successfully! Please unlock with its master password.');
          handleLockVault();
          return;
        }
      }

      // Plaintext CSV parse fallback
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const imported: VaultItem[] = [];
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          imported.push({
            id: `item-${Date.now()}-${i}`,
            title: parts[0] || 'Imported Credential',
            category: (parts[1] as any) || 'login',
            websiteUrl: parts[2] || '',
            username: parts[3] || '',
            password: parts[4] || '',
            totpSecret: parts[5] || '',
            notes: parts[6] || '',
            tags: ['imported'],
            favorite: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      if (imported.length > 0) {
        const combined = [...imported, ...vaultItems];
        await persistItems(combined);
        alert(`Successfully imported ${imported.length} items into vault.`);
      }
    } catch (err) {
      alert('Failed to parse file. Make sure it is a valid AegisPass backup or CSV file.');
    }
  };

  // Fix item from Security Audit
  const handleFixAuditItem = (item: VaultItem) => {
    setEditingItem(item);
    setIsEditorOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Bar with 3-zone contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isUnlocked={isUnlocked}
        onLockVault={handleLockVault}
        onUnlockVaultClick={() => {
          setActiveTab('vault');
        }}
        onDownloadExtension={downloadExtensionZip}
        itemsCount={vaultItems.length}
      />

      {/* Main App Body */}
      <main className="flex-1">
        {/* If vault is locked and user is on Vault or Audit tab, prompt unlock */}
        {!isUnlocked && (activeTab === 'vault' || activeTab === 'audit') ? (
          <LockScreen
            hasExistingVault={hasVault}
            onUnlock={handleUnlock}
            onCreateVault={handleCreateVault}
            onResetVault={handleResetVault}
          />
        ) : (
          <>
            {activeTab === 'vault' && (
              <VaultListView
                items={vaultItems}
                onSelectItem={(item) => {
                  setSelectedItemForDetail(item);
                  setIsDetailOpen(true);
                }}
                onAddNewItem={() => {
                  setEditingItem(null);
                  setIsEditorOpen(true);
                }}
                onToggleFavorite={handleToggleFavorite}
                onExportVault={handleExportVault}
                onImportVault={handleImportVault}
                autoLockMinutes={autoLockMinutes}
                onChangeAutoLock={handleChangeAutoLock}
                onOpenBiometrics={() => setIsBiometricSettingsOpen(true)}
                isBiometricEnrolled={isBiometricEnrolled}
              />
            )}

            {activeTab === 'sandbox' && (
              <AutofillSandbox
                vaultItems={vaultItems}
                onSaveNewItem={handleSaveItem}
              />
            )}

            {activeTab === 'extension' && (
              <ExtensionView />
            )}

            {activeTab === 'audit' && (
              <SecurityAuditView
                items={vaultItems}
                onFixItem={handleFixAuditItem}
              />
            )}

            {activeTab === 'generator' && (
              <PasswordGeneratorModal />
            )}

            {activeTab === 'advisor' && (
              <CyberAdvisorChat />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <BiometricSettingsModal
        isOpen={isBiometricSettingsOpen}
        onClose={() => setIsBiometricSettingsOpen(false)}
        onBiometricStatusChanged={() => setIsBiometricEnrolled(!!getSavedWebAuthnConfig())}
      />

      <ItemDetailModal
        item={selectedItemForDetail}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedItemForDetail(null);
        }}
        onEdit={(item) => {
          setIsDetailOpen(false);
          setEditingItem(item);
          setIsEditorOpen(true);
        }}
        onDelete={handleDeleteItem}
        onToggleFavorite={handleToggleFavorite}
      />

      <ItemEditorModal
        initialItem={editingItem}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
      />
    </div>
  );
}
