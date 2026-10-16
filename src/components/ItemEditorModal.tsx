import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Globe, 
  User, 
  CreditCard, 
  FileText, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Clock, 
  Plus, 
  Trash2,
  Lock,
  Tag
} from 'lucide-react';
import { VaultItem, ItemCategory } from '../types/vault';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import { generateTOTP, assessPasswordStrength } from '../lib/crypto';

interface ItemEditorModalProps {
  initialItem?: Partial<VaultItem> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  initialItem,
  isOpen,
  onClose,
  onSave,
}) => {
  const [category, setCategory] = useState<ItemCategory>('login');
  const [title, setTitle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);

  // Card fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardBrand, setCardBrand] = useState('Visa');

  // Identity fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Generator modal state
  const [showGenerator, setShowGenerator] = useState(false);

  // TOTP live preview
  const [totpPreview, setTotpPreview] = useState<string>('');

  useEffect(() => {
    if (initialItem) {
      setCategory(initialItem.category || 'login');
      setTitle(initialItem.title || '');
      setWebsiteUrl(initialItem.websiteUrl || '');
      setUsername(initialItem.username || '');
      setPassword(initialItem.password || '');
      setTotpSecret(initialItem.totpSecret || '');
      setNotes(initialItem.notes || '');
      setTags(initialItem.tags || []);
      setFavorite(initialItem.favorite || false);

      setCardholderName(initialItem.cardholderName || '');
      setCardNumber(initialItem.cardNumber || '');
      setCardExpMonth(initialItem.cardExpMonth || '');
      setCardExpYear(initialItem.cardExpYear || '');
      setCardCvv(initialItem.cardCvv || '');
      setCardBrand(initialItem.cardBrand || 'Visa');

      setFullName(initialItem.fullName || '');
      setEmail(initialItem.email || '');
      setPhone(initialItem.phone || '');
      setAddress(initialItem.address || '');
    } else {
      // Defaults
      setCategory('login');
      setTitle('');
      setWebsiteUrl('');
      setUsername('');
      setPassword('');
      setTotpSecret('');
      setNotes('');
      setTags([]);
      setFavorite(false);
      setCardholderName('');
      setCardNumber('');
      setCardExpMonth('');
      setCardExpYear('');
      setCardCvv('');
      setFullName('');
      setEmail('');
      setPhone('');
      setAddress('');
    }
  }, [initialItem, isOpen]);

  // Update TOTP preview when secret changes
  useEffect(() => {
    if (!totpSecret) {
      setTotpPreview('');
      return;
    }
    generateTOTP(totpSecret).then(res => {
      setTotpPreview(res.token);
    });
  }, [totpSecret]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const clean = tagInput.trim().toLowerCase();
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(x => x !== t));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const existingId = initialItem?.id;
    const now = Date.now();

    const isPasswordRotated = initialItem?.password && initialItem.password !== password;
    const history = initialItem?.history ? [...initialItem.history] : [];
    if (isPasswordRotated) {
      history.unshift({
        password: initialItem.password!,
        changedAt: now,
      });
    }

    const item: VaultItem = {
      id: existingId || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      category,
      title: title.trim(),
      favorite,
      tags,
      notes: notes.trim(),
      createdAt: initialItem?.createdAt || now,
      updatedAt: now,
      history,
    };

    if (category === 'login') {
      item.websiteUrl = websiteUrl.trim();
      item.username = username.trim();
      item.password = password;
      item.totpSecret = totpSecret.trim().toUpperCase();
    } else if (category === 'card') {
      item.cardholderName = cardholderName.trim();
      item.cardNumber = cardNumber.trim();
      item.cardExpMonth = cardExpMonth.trim();
      item.cardExpYear = cardExpYear.trim();
      item.cardCvv = cardCvv.trim();
      item.cardBrand = cardBrand;
    } else if (category === 'identity') {
      item.fullName = fullName.trim();
      item.email = email.trim();
      item.phone = phone.trim();
      item.address = address.trim();
    }

    onSave(item);
    onClose();
  };

  const strength = assessPasswordStrength(password);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {initialItem?.id ? 'Edit Vault Item' : 'New Vault Item'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Category Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Item Type
            </label>
            <div className="grid grid-cols-4 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setCategory('login')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  category === 'login'
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('card')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  category === 'card'
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('note')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  category === 'note'
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Note</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('identity')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  category === 'identity'
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Identity</span>
              </button>
            </div>
          </div>

          {/* Common Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Title / Name *
            </label>
            <input
              type="text"
              required
              placeholder={category === 'login' ? 'e.g. GitHub Dev, Google Workspace' : 'e.g. Master SSH Keys'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Login Specific Fields */}
          {category === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website URL (for Browser Extension Matching)
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://github.com/login"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  The extension uses this URL to automatically pop up autofill suggestions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="user@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGenerator(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter or generate password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-medium text-indigo-600 font-mono">
                      {strength.label} ({strength.entropy} bits)
                    </span>
                    <span>Est. crack time: {strength.crackTimeEstimate}</span>
                  </div>
                )}
              </div>

              {/* TOTP 2FA Secret Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authenticator Key (TOTP / 2FA Secret)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. JBSWY3DPEHPK3PXP"
                    value={totpSecret}
                    onChange={(e) => setTotpSecret(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs uppercase"
                  />
                </div>
                {totpPreview && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-emerald-600 font-mono">
                    <span>Active 6-digit Code:</span>
                    <strong className="tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {totpPreview}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Card Fields */}
          {category === 'card' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="JOHN DOE"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="4532 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exp Month
                  </label>
                  <input
                    type="text"
                    placeholder="MM"
                    maxLength={2}
                    value={cardExpMonth}
                    onChange={(e) => setCardExpMonth(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exp Year
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY"
                    maxLength={4}
                    value={cardExpYear}
                    onChange={(e) => setCardExpYear(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    placeholder="•••"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Identity Fields */}
          {category === 'identity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  placeholder="123 Main St, Apt 4B, City, Country"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Secure Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Encrypted Notes
            </label>
            <textarea
              rows={3}
              placeholder="Private recovery seeds, server IPs, security answers..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add tag (e.g. work, dev, finance)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-mono"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Star / Add to Favorites</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
              >
                Save Item
              </button>
            </div>
          </div>
        </form>

        {/* Embedded Generator Modal */}
        {showGenerator && (
          <PasswordGeneratorModal
            isModal={true}
            onSelectPassword={(newPwd) => {
              setPassword(newPwd);
              setShowGenerator(false);
            }}
            onClose={() => setShowGenerator(false)}
          />
        )}
      </div>
    </div>
  );
};
