import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Clock, 
  RefreshCw, 
  Key, 
  Sparkles, 
  Lock,
  CheckCircle2, 
  AlertCircle,
  Database,
  Search,
  ExternalLink,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { VaultItem } from '../types/vault';
import { auditVaultSecurity } from '../lib/vaultStore';
import { assessPasswordStrength } from '../lib/crypto';
import { 
  scanVaultForCompromisedPasswords, 
  CompromisedResult 
} from '../lib/hibpBreachChecker';
import confetti from 'canvas-confetti';

interface SecurityAuditViewProps {
  items: VaultItem[];
  onFixItem: (item: VaultItem) => void;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  items,
  onFixItem,
}) => {
  const report = auditVaultSecurity(items);

  // HIBP k-Anonymity Breach Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ scanned: number; total: number; currentTitle: string } | null>(null);
  const [breachResults, setBreachResults] = useState<CompromisedResult[] | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<number | null>(null);

  const compromisedList = breachResults ? breachResults.filter(r => r.isCompromised) : [];
  const safeList = breachResults ? breachResults.filter(r => !r.isCompromised) : [];

  const handleRunBreachScan = async () => {
    setIsScanning(true);
    setScanProgress({ scanned: 0, total: items.filter(i => i.category === 'login' && i.password).length, currentTitle: 'Initializing...' });

    try {
      const results = await scanVaultForCompromisedPasswords(items, (scanned, total, currentTitle) => {
        setScanProgress({ scanned, total, currentTitle });
      });

      setBreachResults(results);
      setLastScannedTime(Date.now());

      if (results.some(r => r.isCompromised)) {
        // Some breached items found
      } else {
        try {
          confetti({ particleCount: 25, spread: 60, origin: { y: 0.7 } });
        } catch {}
      }
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  // Adjust score if breach scan was performed
  let finalScore = report.score;
  if (breachResults) {
    const breachPenalty = Math.min(30, compromisedList.length * 15);
    finalScore = Math.max(10, finalScore - breachPenalty);
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 60) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cryptographic Security Audit & Breach Protection
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Comprehensive analysis of your vault credentials against dictionary vulnerabilities, reused credentials, entropy degradation, and known data leaks.
          </p>
        </div>

        {/* Breach Check Trigger Button */}
        <button
          onClick={handleRunBreachScan}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Scanning Leaks ({scanProgress?.scanned}/{scanProgress?.total})...</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4 text-indigo-200" />
              <span>{breachResults ? 'Re-scan Compromised Passwords' : 'Check for Compromised Passwords'}</span>
            </>
          )}
        </button>
      </div>

      {/* Main Score Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
        {/* Score Card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vault Health Score
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {report.totalItems} audited logins
            </span>
          </div>

          <div className="py-6 flex items-center justify-center gap-6">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#F1F5F9"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * finalScore) / 100}
                  className={getScoreColor(finalScore)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                  {finalScore}%
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {finalScore >= 85 ? 'SECURE' : finalScore >= 60 ? 'MODERATE' : 'AT RISK'}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="font-semibold text-slate-800">
                {finalScore >= 85 ? 'Strong Vault Hygiene' : 'Vulnerabilities Detected'}
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                {compromisedList.length > 0
                  ? `${compromisedList.length} password(s) found in known public data breaches. Rotate immediately!`
                  : finalScore >= 85
                  ? 'Your vault maintains strong cryptographic entropy with zero critical credential reuse.'
                  : 'Rotating weak and duplicated passwords will elevate your vault security score.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Zero-Knowledge Protection</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active
            </span>
          </div>
        </div>

        {/* 4 KPI Metric Tiles */}
        <div className="md:col-span-3 grid grid-cols-2 gap-4">
          {/* Compromised metric card */}
          <div className={`rounded-xl border p-5 shadow-sm flex flex-col justify-between transition-colors ${
            compromisedList.length > 0
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Compromised in Leaks
              </span>
              <Database className={`w-4 h-4 ${compromisedList.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
            <div className="my-2">
              <span className={`text-3xl font-bold font-mono tabular-nums ${compromisedList.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {breachResults ? compromisedList.length : '—'}
              </span>
              <span className="text-xs text-slate-500 ml-1.5 font-medium">
                {breachResults ? 'exposed accounts' : 'not scanned'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {breachResults
                ? 'Checked via HIBP k-Anonymity SHA-1 prefix protocol.'
                : 'Click "Check for Compromised Passwords" to scan.'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Reused Passwords</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="my-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {report.reusedCount}
              </span>
              <span className="text-xs text-slate-400 ml-1.5 font-medium">accounts</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Accounts sharing credentials susceptible to credential stuffing breaches.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Weak Passwords</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="my-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {report.weakCount}
              </span>
              <span className="text-xs text-slate-400 ml-1.5 font-medium">logins</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Under 12 characters or susceptible to rapid offline brute-force attacks.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Missing 2FA / TOTP</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {report.missing2faCount}
              </span>
              <span className="text-xs text-slate-400 ml-1.5 font-medium">logins</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Logins lacking automated time-based one-time authentication codes.
            </p>
          </div>
        </div>
      </div>

      {/* COMPROMISED PASSWORDS SCANNER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Known Data Leak & Compromised Passwords Scanner (k-Anonymity)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Checks your vault against billions of leaked credentials from public data dumps using Have I Been Pwned's privacy-preserving k-Anonymity mathematical model.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!breachResults && !isScanning && (
              <button
                onClick={handleRunBreachScan}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Start Leak Scan
              </button>
            )}
          </div>
        </div>

        {/* Privacy Callout Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 leading-relaxed space-y-1">
            <div className="font-semibold text-slate-800">
              How k-Anonymity Guarantees Your Privacy
            </div>
            <p>
              Your actual passwords and complete hashes <strong>NEVER leave your browser</strong>. AegisPass hashes each password locally using SHA-1, extracts only the first 5 hexadecimal characters (<code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">prefix</code>), and queries matching suffixes. The final verification is matched strictly inside your device's memory.
            </p>
          </div>
        </div>

        {/* Live Scan Progress Bar */}
        {isScanning && scanProgress && (
          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-indigo-900">
              <span className="font-medium">
                Scanning: <strong className="font-mono">{scanProgress.currentTitle}</strong>
              </span>
              <span className="font-mono tabular-nums font-semibold">
                {scanProgress.scanned} of {scanProgress.total} checked
              </span>
            </div>
            <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-200 rounded-full"
                style={{ width: `${(scanProgress.scanned / scanProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Scan Results View */}
        {breachResults && (
          <div className="space-y-6 pt-2">
            {/* Status Summary Banner */}
            {compromisedList.length > 0 ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-rose-900">
                      Warning: {compromisedList.length} Compromised Credential{compromisedList.length > 1 ? 's' : ''} Detected!
                    </h3>
                    <p className="text-xs text-rose-700 mt-0.5">
                      The passwords below appeared in confirmed third-party data breaches. Automated credential-stuffing bots actively test these passwords. Change them immediately!
                    </p>
                  </div>
                </div>
                {lastScannedTime && (
                  <span className="text-[11px] text-rose-500 font-mono shrink-0">
                    Scanned {new Date(lastScannedTime).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">
                      All Vault Passwords Passed! Zero Breaches Detected.
                    </h3>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      None of your {safeList.length} audited passwords appear in known public data leaks.
                    </p>
                  </div>
                </div>
                {lastScannedTime && (
                  <span className="text-[11px] text-emerald-600 font-mono">
                    Scanned {new Date(lastScannedTime).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}

            {/* List of Compromised Items */}
            {compromisedList.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Compromised Logins Requiring Immediate Rotation
                </h3>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {compromisedList.map(res => {
                    const matchedItem = items.find(i => i.id === res.itemId);

                    return (
                      <div
                        key={res.itemId}
                        className="p-4 bg-white hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{res.itemTitle}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-rose-100 text-rose-700">
                              {res.severity} Risk
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {res.username && (
                              <span className="font-mono text-slate-700">{res.username}</span>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-rose-600 font-semibold tabular-nums">
                              Exposed in {res.breachCount.toLocaleString()} known breaches
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-400 text-[11px]">
                              SHA-1 Prefix: {res.sha1Prefix}...
                            </span>
                          </div>
                        </div>

                        {matchedItem && (
                          <button
                            onClick={() => onFixItem(matchedItem)}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                          >
                            Rotate Password Now
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REUSED PASSWORDS GROUPINGS */}
      {report.reusedGroups.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              Critical Hazard: Reused Credentials ({report.reusedGroups.length} cluster{report.reusedGroups.length > 1 ? 's' : ''})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            When one service suffers a data breach, hackers immediately test leaked passwords across other accounts. Assign unique credentials to each service.
          </p>

          <div className="space-y-4">
            {report.reusedGroups.map((group, idx) => (
              <div key={idx} className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
                  <span>Shared Password ({group.items.length} accounts): <code className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200">••••••••••••••</code></span>
                  <span className="font-mono text-amber-700">Cluster #{idx + 1}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-xs text-slate-900 truncate">{item.title}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">{item.username || 'No user'}</div>
                      </div>
                      <button
                        onClick={() => onFixItem(item)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap shrink-0 transition-colors"
                      >
                        Rotate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEAK PASSWORDS LIST */}
      {report.weakItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-slate-900">
              Weak Passwords ({report.weakItems.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {report.weakItems.map(item => {
              const strength = item.password ? assessPasswordStrength(item.password) : null;
              return (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{item.title}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{item.username}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-rose-600 font-medium">
                        {strength?.label} ({strength?.entropy} bits entropy)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onFixItem(item)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap transition-colors"
                  >
                    Upgrade Password
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MISSING 2FA LIST */}
      {report.missing2faItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Logins Without Multi-Factor Authentication ({report.missing2faItems.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Two-factor authentication adds an indispensable extra layer of defense against hijacked credentials.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {report.missing2faItems.slice(0, 9).map(item => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-slate-900 truncate">{item.title}</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">{item.username}</div>
                </div>
                <button
                  onClick={() => onFixItem(item)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 whitespace-nowrap"
                >
                  Add 2FA
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
