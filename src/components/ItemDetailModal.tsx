import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Globe, 
  User, 
  CreditCard, 
  FileText, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Clock, 
  Star, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ShieldCheck,
  History,
  Lock
} from 'lucide-react';
import { VaultItem } from '../types/vault';
import { generateTOTP, assessPasswordStrength, extractDomain } from '../lib/crypto';
import confetti from 'canvas-confetti';

interface ItemDetailModalProps {
  item: VaultItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // TOTP Live State
  const [totpToken, setTotpToken] = useState<string>('');
  const [totpRemaining, setTotpRemaining] = useState<number>(30);
  const [totpProgress, setTotpProgress] = useState<number>(100);

  useEffect(() => {
    if (!item?.totpSecret) return;

    let isMounted = true;
    const updateOtp = async () => {
      if (!item?.totpSecret) return;
      const res = await generateTOTP(item.totpSecret);
      if (isMounted) {
        setTotpToken(res.token);
        setTotpRemaining(res.remainingSeconds);
        setTotpProgress(res.progressPercent);
      }
    };

    updateOtp();
    const interval = setInterval(updateOtp, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [item?.totpSecret]);

  if (!isOpen || !item) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const domain = extractDomain(item.websiteUrl);
  const strength = item.password ? assessPasswordStrength(item.password) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
              {item.category === 'login' && <Key className="w-6 h-6" />}
              {item.category === 'card' && <CreditCard className="w-6 h-6" />}
              {item.category === 'note' && <FileText className="w-6 h-6" />}
              {item.category === 'identity' && <User className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">{item.title}</h2>
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  className={`p-1 rounded-md transition-colors ${
                    item.favorite ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={item.favorite ? 'Remove favorite' : 'Add to favorites'}
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="capitalize">{item.category}</span>
                {domain && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href={item.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>{domain}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Edit Item"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${item.title}" permanently?`)) {
                  onDelete(item.id);
                  onClose();
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Delete Item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* LOGIN CREDENTIALS */}
          {item.category === 'login' && (
            <>
              {/* Username Field */}
              {item.username && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Username or Email</span>
                    <button
                      onClick={() => copyToClipboard(item.username!, 'username')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      {copiedField === 'username' ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-sm font-medium text-slate-800 break-all select-all">
                    {item.username}
                  </div>
                </div>
              )}

              {/* Password Field */}
              {item.password && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Password</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(item.password!, 'password')}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        {copiedField === 'password' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="font-mono text-sm font-semibold text-slate-900 tracking-wider break-all select-all">
                    {showPassword ? item.password : '••••••••••••••••••••'}
                  </div>

                  {strength && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Entropy: {strength.entropy} bits ({strength.label})</span>
                      <span>Crack time: {strength.crackTimeEstimate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* LIVE TOTP AUTHENTICATOR */}
              {item.totpSecret && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>One-Time Password (2FA / TOTP)</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-mono">
                      <svg className="w-4 h-4 -rotate-90">
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          fill="transparent"
                          className="opacity-20"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          stroke="#4F46E5"
                          strokeWidth="2.5"
                          fill="transparent"
                          strokeDasharray={37.7}
                          strokeDashoffset={37.7 - (37.7 * totpProgress) / 100}
                        />
                      </svg>
                      <span>{totpRemaining}s</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="font-mono text-2xl font-bold tracking-widest text-indigo-950">
                      {totpToken ? `${totpToken.slice(0, 3)} ${totpToken.slice(3)}` : '------'}
                    </div>

                    <button
                      onClick={() => copyToClipboard(totpToken, 'totp')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      {copiedField === 'totp' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* PAYMENT CARD DETAILS */}
          {item.category === 'card' && (
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl shadow-md border border-slate-800">
                <div className="text-[10px] text-indigo-300 font-mono uppercase tracking-widest mb-4">
                  {item.cardBrand || 'Payment Card'}
                </div>
                <div className="font-mono text-lg font-bold tracking-widest text-white mb-4">
                  {item.cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div className="flex items-end justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">CARDHOLDER</div>
                    <div className="font-semibold text-slate-200">{item.cardholderName || 'NAME ON CARD'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">EXPIRES</div>
                    <div className="font-mono font-semibold text-slate-200">
                      {item.cardExpMonth || 'MM'}/{item.cardExpYear || 'YY'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Card Copies */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => item.cardNumber && copyToClipboard(item.cardNumber.replace(/\s+/g, ''), 'cardNumber')}
                  className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'cardNumber' ? 'Card Copied!' : 'Copy Number'}</span>
                </button>
                <button
                  onClick={() => item.cardCvv && copyToClipboard(item.cardCvv, 'cardCvv')}
                  className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{copiedField === 'cardCvv' ? 'CVV Copied!' : 'Copy CVV'}</span>
                </button>
              </div>
            </div>
          )}

          {/* IDENTITY DETAILS */}
          {item.category === 'identity' && (
            <div className="space-y-3">
              {item.fullName && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">Full Name</div>
                    <div className="text-sm font-semibold text-slate-900">{item.fullName}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.fullName!, 'fullname')}
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    Copy
                  </button>
                </div>
              )}
              {item.email && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">Email Address</div>
                    <div className="text-sm font-mono text-slate-900">{item.email}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.email!, 'email')}
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    Copy
                  </button>
                </div>
              )}
              {item.address && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">Physical Address</div>
                    <div className="text-sm text-slate-900">{item.address}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.address!, 'address')}
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECURE NOTES */}
          {item.notes && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Secure Notes</span>
                <button
                  onClick={() => copyToClipboard(item.notes!, 'notes')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                {item.notes}
              </pre>
            </div>
          )}

          {/* TAGS */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-slate-400">Tags:</span>
              {item.tags.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 font-mono"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* PASSWORD ROTATION HISTORY */}
          {item.history && item.history.length > 0 && (
            <div className="p-3 bg-amber-50/50 border border-amber-200/70 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-2">
                <History className="w-3.5 h-3.5 text-amber-600" />
                <span>Password History ({item.history.length} previous)</span>
              </div>
              <div className="space-y-1.5">
                {item.history.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-600 font-mono">
                    <span className="tracking-wider">•••••••••••</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(h.changedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* METADATA TIMESTAMPS */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
            <span>Modified {new Date(item.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
