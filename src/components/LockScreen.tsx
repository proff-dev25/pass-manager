import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Cpu,
  Fingerprint,
  Laptop
} from 'lucide-react';
import { assessPasswordStrength } from '../lib/crypto';
import { 
  getSavedWebAuthnConfig, 
  authenticateWithPlatformAuthenticator, 
  getPlatformAuthenticatorName,
  WebAuthnConfig
} from '../lib/webauthn';

interface LockScreenProps {
  hasExistingVault: boolean;
  onUnlock: (password: string) => Promise<{ success: boolean; error?: string }>;
  onCreateVault: (password: string) => Promise<void>;
  onResetVault: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  hasExistingVault,
  onUnlock,
  onCreateVault,
  onResetVault,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // WebAuthn state
  const [webAuthnConfig, setWebAuthnConfig] = useState<WebAuthnConfig | null>(getSavedWebAuthnConfig());
  const [isBiometricPrompting, setIsBiometricPrompting] = useState(false);
  const platformName = getPlatformAuthenticatorName();

  useEffect(() => {
    setWebAuthnConfig(getSavedWebAuthnConfig());
  }, []);

  // WebAuthn Unlock Handler
  const handleBiometricUnlock = async () => {
    setErrorMessage(null);
    setIsBiometricPrompting(true);
    setIsSubmitting(true);

    try {
      const res = await authenticateWithPlatformAuthenticator();
      if (res.success && res.masterPassword) {
        const unlockRes = await onUnlock(res.masterPassword);
        if (!unlockRes.success) {
          setErrorMessage(unlockRes.error || 'Failed to unlock vault with biometric credential.');
        }
      } else {
        setErrorMessage(res.error || 'Biometric verification failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Biometric verification error.');
    } finally {
      setIsBiometricPrompting(false);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage('Please enter a master password.');
      return;
    }

    if (!hasExistingVault && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (hasExistingVault) {
        const res = await onUnlock(password);
        if (!res.success) {
          setErrorMessage(res.error || 'Incorrect master password.');
        }
      } else {
        await onCreateVault(password);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo shortcut
  const handleQuickDemo = async () => {
    const demoPass = 'MasterPass2026!';
    setPassword(demoPass);
    setConfirmPassword(demoPass);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (hasExistingVault) {
        const res = await onUnlock(demoPass);
        if (!res.success) {
          // If previous vault was created with a different password, re-initialize
          await onCreateVault(demoPass);
        }
      } else {
        await onCreateVault(demoPass);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const strength = !hasExistingVault && password ? assessPasswordStrength(password) : null;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl relative overflow-hidden">
        {/* Biometric Active Hardware Modal Indicator */}
        {isBiometricPrompting && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-200">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500/50 flex items-center justify-center animate-pulse">
                <Fingerprint className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="absolute inset-0 rounded-full border border-indigo-400/40 animate-ping opacity-40" />
            </div>

            <h3 className="text-lg font-bold tracking-tight text-white mb-1">
              Verifying with {platformName}
            </h3>
            <p className="text-xs text-slate-300 max-w-xs mb-6">
              Touch your fingerprint sensor, look into Windows Hello camera, or enter your device security PIN to unlock your vault.
            </p>

            <button
              onClick={() => {
                setIsBiometricPrompting(false);
                setIsSubmitting(false);
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
            >
              Cancel & Use Password
            </button>
          </div>
        )}

        {/* Subtle decorative security badge header */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <Shield className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {hasExistingVault ? 'Unlock Your Vault' : 'Create Encrypted Vault'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {hasExistingVault
                ? 'Unlock using Touch ID, Windows Hello, or your master password.'
                : 'Set a strong master password. All items are encrypted on your device.'}
            </p>
          </div>
        </div>

        {/* Biometric WebAuthn Unlock Button (If configured or existing vault) */}
        {hasExistingVault && (
          <div className="mb-5 space-y-3">
            <button
              type="button"
              onClick={handleBiometricUnlock}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md flex items-center justify-center gap-2.5 transition-all group cursor-pointer"
            >
              <Fingerprint className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>
                {webAuthnConfig
                  ? `Unlock with ${webAuthnConfig.authenticatorName || 'Touch ID / Windows Hello'}`
                  : `Unlock with ${platformName}`}
              </span>
            </button>

            <div className="relative text-center my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-medium text-slate-400">
                or enter master password
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Master Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus={!webAuthnConfig}
                placeholder="Enter master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {strength && (
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Strength: <strong className="text-indigo-600">{strength.label}</strong></span>
                <span>{strength.entropy} bits entropy</span>
              </div>
            )}
          </div>

          {!hasExistingVault && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Master Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter master password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Deriving PBKDF2 Key...</span>
            ) : hasExistingVault ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Vault</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Create & Encrypt Vault</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Shortcut */}
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Instant Demo Access (Load Demo Vault)</span>
          </button>

          <div className="text-[11px] text-slate-400 text-center leading-relaxed">
            Zero-knowledge: Keys derived using 100,000 rounds of PBKDF2 SHA-256. Master password is never saved or transmitted.
          </div>
        </div>

        {hasExistingVault && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                if (confirm('Resetting the vault will erase local encrypted storage. Proceed?')) {
                  onResetVault();
                }
              }}
              className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
            >
              Reset Vault / Forgot Password?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
