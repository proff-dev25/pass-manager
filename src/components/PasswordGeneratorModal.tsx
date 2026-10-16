import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  ShieldCheck, 
  X,
  Volume2
} from 'lucide-react';
import { generatePassword, assessPasswordStrength } from '../lib/crypto';
import confetti from 'canvas-confetti';

interface PasswordGeneratorProps {
  onSelectPassword?: (password: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorProps> = ({
  onSelectPassword,
  onClose,
  isModal = false,
}) => {
  const [mode, setMode] = useState<'password' | 'passphrase'>('password');
  const [length, setLength] = useState<number>(18);
  const [useUpper, setUseUpper] = useState<boolean>(true);
  const [useLower, setUseLower] = useState<boolean>(true);
  const [useNumbers, setUseNumbers] = useState<boolean>(true);
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const [avoidAmbiguous, setAvoidAmbiguous] = useState<boolean>(true);

  // Passphrase options
  const [wordCount, setWordCount] = useState<number>(4);
  const [delimiter, setDelimiter] = useState<string>('-');
  const [capitalizeWords, setCapitalizeWords] = useState<boolean>(true);

  const [password, setPassword] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Generate on parameter changes
  const regenerate = () => {
    const result = generatePassword({
      mode,
      length,
      useUpper,
      useLower,
      useNumbers,
      useSymbols,
      avoidAmbiguous,
      wordCount,
      delimiter,
      capitalizeWords,
    });
    setPassword(result);
  };

  useEffect(() => {
    regenerate();
  }, [mode, length, useUpper, useLower, useNumbers, useSymbols, avoidAmbiguous, wordCount, delimiter, capitalizeWords]);

  const strength = assessPasswordStrength(password);

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    try {
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore in headless
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const strengthColors: Record<number, string> = {
    0: 'bg-rose-500',
    1: 'bg-amber-500',
    2: 'bg-yellow-500',
    3: 'bg-emerald-500',
    4: 'bg-indigo-500',
  };

  const content = (
    <div className="space-y-6">
      {/* Generated Display Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden text-white shadow-inner">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-medium">GENERATED CREDENTIAL</span>
          <div className="flex items-center gap-3">
            <span className="font-mono tabular-nums">{password.length} chars</span>
            <span>·</span>
            <span className="font-mono tabular-nums">{strength.entropy} bits entropy</span>
          </div>
        </div>

        <div className="py-2 overflow-x-auto text-xl font-mono tracking-wider text-indigo-300 break-all select-all font-semibold">
          {password || 'Generating...'}
        </div>

        {/* Strength Progress Bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
            {[0, 1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-full flex-1 transition-all duration-300 ${
                  step <= strength.score ? strengthColors[strength.score] : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-300 font-mono">
            {strength.label}
          </span>
        </div>

        {/* Action buttons inside display */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Est. Crack Time: <strong className="text-slate-200">{strength.crackTimeEstimate}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={regenerate}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Regenerate new password"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Password</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg max-w-sm">
        <button
          onClick={() => setMode('password')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'password'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Random Characters
        </button>
        <button
          onClick={() => setMode('passphrase')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'passphrase'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Memorable Passphrase
        </button>
      </div>

      {/* Options Controls */}
      {mode === 'password' ? (
        <div className="space-y-4">
          {/* Length Slider */}
          <div>
            <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1.5">
              <span>Password Length</span>
              <span className="font-mono text-indigo-600 font-semibold tabular-nums text-base">
                {length}
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
              <span>8</span>
              <span>16</span>
              <span>24</span>
              <span>32</span>
              <span>48</span>
              <span>64</span>
            </div>
          </div>

          {/* Character Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useUpper}
                onChange={(e) => setUseUpper(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Uppercase (A-Z)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useLower}
                onChange={(e) => setUseLower(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Lowercase (a-z)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useNumbers}
                onChange={(e) => setUseNumbers(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Numbers (0-9)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useSymbols}
                onChange={(e) => setUseSymbols(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Symbols (!@#$%)</span>
            </label>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={avoidAmbiguous}
              onChange={(e) => setAvoidAmbiguous(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <div className="flex flex-col">
              <span>Avoid Ambiguous Characters</span>
              <span className="text-xs text-slate-500 font-normal">Excludes confusing symbols like 0, O, 1, l, I, |</span>
            </div>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Passphrase Word Count */}
          <div>
            <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1.5">
              <span>Number of Words</span>
              <span className="font-mono text-indigo-600 font-semibold tabular-nums text-base">
                {wordCount} words
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={8}
              value={wordCount}
              onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Delimiter Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Word Separator
              </label>
              <select
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="-">Hyphen (-)</option>
                <option value="_">Underscore (_)</option>
                <option value=".">Period (.)</option>
                <option value=" ">Space ( )</option>
                <option value="#">Hash (#)</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2.5 p-2.5 w-full rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={capitalizeWords}
                  onChange={(e) => setCapitalizeWords(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Capitalize Words</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Modal Actions */}
      {isModal && onSelectPassword && (
        <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              onSelectPassword(password);
              if (onClose) onClose();
            }}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            Use This Password
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold">Generate Secure Password</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="pb-6 mb-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cryptographic Password & Passphrase Generator
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate mathematically resilient, high-entropy passwords directly in your browser using the Web Cryptography API.
          </p>
        </div>
        {content}
      </div>
    </div>
  );
};
