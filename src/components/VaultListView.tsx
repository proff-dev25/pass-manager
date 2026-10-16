import React, { useState } from 'react';
import { 
  Key, 
  CreditCard, 
  FileText, 
  User, 
  Star, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  Download, 
  Upload, 
  SlidersHorizontal,
  ShieldAlert,
  ArrowUpDown,
  Tag,
  Fingerprint
} from 'lucide-react';
import { VaultItem, ItemCategory } from '../types/vault';
import { extractDomain, generateTOTP } from '../lib/crypto';

interface VaultListViewProps {
  items: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
  onAddNewItem: () => void;
  onToggleFavorite: (id: string) => void;
  onExportVault: (format: 'json' | 'csv') => void;
  onImportVault: (file: File) => void;
  autoLockMinutes: number;
  onChangeAutoLock: (minutes: number) => void;
  onOpenBiometrics: () => void;
  isBiometricEnrolled: boolean;
}

export const VaultListView: React.FC<VaultListViewProps> = ({
  items,
  onSelectItem,
  onAddNewItem,
  onToggleFavorite,
  onExportVault,
  onImportVault,
  autoLockMinutes,
  onChangeAutoLock,
  onOpenBiometrics,
  isBiometricEnrolled,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // All unique tags
  const allTags = Array.from(new Set(items.flatMap(i => i.tags || []))).sort();

  // Filter items
  const filteredItems = items.filter(item => {
    // Category filter
    if (selectedCategory === 'favorites' && !item.favorite) return false;
    if (selectedCategory !== 'all' && selectedCategory !== 'favorites' && item.category !== selectedCategory) {
      return false;
    }

    // Tag filter
    if (selectedTag && (!item.tags || !item.tags.includes(selectedTag))) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchUser = item.username?.toLowerCase().includes(q) || false;
      const matchUrl = item.websiteUrl?.toLowerCase().includes(q) || false;
      const matchNotes = item.notes?.toLowerCase().includes(q) || false;
      const matchTags = item.tags?.some(t => t.toLowerCase().includes(q)) || false;
      return matchTitle || matchUser || matchUrl || matchNotes || matchTags;
    }

    return true;
  });

  const handleCopyPassword = (e: React.MouseEvent, item: VaultItem) => {
    e.stopPropagation();
    if (!item.password) return;
    navigator.clipboard.writeText(item.password);
    setCopiedId(item.id + '-pwd');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyUsername = (e: React.MouseEvent, item: VaultItem) => {
    e.stopPropagation();
    if (!item.username) return;
    navigator.clipboard.writeText(item.username);
    setCopiedId(item.id + '-user');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportVault(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Encrypted Password Vault
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Zero-knowledge encrypted client-side storage with instant browser autofill integration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Auto Lock timer setting */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Auto-lock:</span>
            <select
              value={autoLockMinutes}
              onChange={(e) => onChangeAutoLock(parseInt(e.target.value, 10))}
              className="bg-transparent font-semibold text-slate-800 cursor-pointer focus:outline-none"
            >
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={60}>1 hour</option>
              <option value={0}>Never</option>
            </select>
          </div>

          {/* Biometrics WebAuthn Trigger */}
          <button
            onClick={onOpenBiometrics}
            className={`px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isBiometricEnrolled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Manage Touch ID & Windows Hello WebAuthn unlock"
          >
            <Fingerprint className={`w-3.5 h-3.5 ${isBiometricEnrolled ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{isBiometricEnrolled ? 'Touch ID Active' : 'Enable Touch ID'}</span>
          </button>

          {/* Export / Import Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Backup</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    onExportVault('json');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Export JSON (Encrypted)</span>
                  <span className="font-mono text-[10px] text-slate-400">.json</span>
                </button>
                <button
                  onClick={() => {
                    onExportVault('csv');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Export CSV (Plaintext)</span>
                  <span className="font-mono text-[10px] text-slate-400">.csv</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <label className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer">
                  <span>Import Vault File</span>
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* New Item Button */}
          <button
            onClick={onAddNewItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Main Vault Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Category & Tag Filters */}
        <div className="lg:col-span-3 space-y-6">
          {/* Categories */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-1">
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedTag(null); }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                selectedCategory === 'all' && !selectedTag
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-slate-400" />
                <span>All Items</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {items.length}
              </span>
            </button>

            <button
              onClick={() => { setSelectedCategory('login'); setSelectedTag(null); }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                selectedCategory === 'login' && !selectedTag
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-slate-400" />
                <span>Logins & Passwords</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {items.filter(i => i.category === 'login').length}
              </span>
            </button>

            <button
              onClick={() => { setSelectedCategory('card'); setSelectedTag(null); }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                selectedCategory === 'card' && !selectedTag
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span>Payment Cards</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {items.filter(i => i.category === 'card').length}
              </span>
            </button>

            <button
              onClick={() => { setSelectedCategory('note'); setSelectedTag(null); }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                selectedCategory === 'note' && !selectedTag
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Secure Notes</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {items.filter(i => i.category === 'note').length}
              </span>
            </button>

            <button
              onClick={() => { setSelectedCategory('identity'); setSelectedTag(null); }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                selectedCategory === 'identity' && !selectedTag
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-slate-400" />
                <span>Identities</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {items.filter(i => i.category === 'identity').length}
              </span>
            </button>

            <button
              onClick={() => { setSelectedCategory('favorites'); setSelectedTag(null); }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                selectedCategory === 'favorites' && !selectedTag
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Favorites</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {items.filter(i => i.favorite).length}
              </span>
            </button>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                      selectedTag === tag
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Main List View */}
        <div className="lg:col-span-9 space-y-4">
          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vault items by title, username, domain, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-mono text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Items Container */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No vault items found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No credentials match "${searchQuery}". Try a different search keyword.`
                  : 'Your vault is currently empty in this filter.'}
              </p>
              <button
                onClick={onAddNewItem}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item Now</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {filteredItems.map(item => {
                const domain = extractDomain(item.websiteUrl);

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    {/* Item Avatar & Details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                        {item.category === 'login' && <Key className="w-5 h-5" />}
                        {item.category === 'card' && <CreditCard className="w-5 h-5" />}
                        {item.category === 'note' && <FileText className="w-5 h-5" />}
                        {item.category === 'identity' && <User className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {item.title}
                          </span>
                          {item.totpSecret && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-medium">
                              2FA
                            </span>
                          )}
                        </div>

                        {/* Unboxed Metadata with · separator */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                          {item.username && (
                            <span className="font-mono text-slate-600 truncate">{item.username}</span>
                          )}
                          {item.cardNumber && (
                            <span className="font-mono text-slate-600">{item.cardNumber}</span>
                          )}
                          {domain && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-slate-400 truncate">{domain}</span>
                            </>
                          )}
                          {item.notes && !item.username && !item.cardNumber && (
                            <span className="truncate max-w-xs">{item.notes}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Hover Bar */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.username && (
                        <button
                          onClick={(e) => handleCopyUsername(e, item)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                          title="Copy Username"
                        >
                          {copiedId === item.id + '-user' ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {item.password && (
                        <button
                          onClick={(e) => handleCopyPassword(e, item)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                          title="Copy Password"
                        >
                          {copiedId === item.id + '-pwd' ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item.id);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          item.favorite
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={item.favorite ? 'Remove favorite' : 'Add to favorites'}
                      >
                        <Star className={`w-4 h-4 ${item.favorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
