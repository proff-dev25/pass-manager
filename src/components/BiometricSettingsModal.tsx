import React, { useState, useEffect } from 'react';
import { 
  X, 
  Fingerprint, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Laptop, 
  KeyRound, 
  Trash2,
  Lock,
  Sparkles
} from 'lucide-react';
import { 
  getSavedWebAuthnConfig, 
  registerPlatformAuthenticator, 
  authenticateWithPlatformAuthenticator,
  removeWebAuthnConfig,
  getPlatformAuthenticatorName,
  isPlatformAuthenticatorSupported,
  WebAuthnConfig
} from '../lib/webauthn';
import confetti from 'canvas-confetti';

interface BiometricSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBiometricStatusChanged?: () => void;
}

export const BiometricSettingsModal: React.FC<BiometricSettingsModalProps> = ({
  isOpen,
  onClose,
  onBiometricStatusChanged,
}) => {
  const [config, setConfig] = useState<WebAuthnConfig | null>(getSavedWebAuthnConfig());
  const [masterPassword, setMasterPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const platformName = getPlatformAuthenticatorName();

  useEffect(() => {
    setConfig(getSavedWebAuthnConfig());
    isPlatformAuthenticatorSupported().then(supported => setIsSupported(supported));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword) {
      setStatusMessage({ type: 'error', text: 'Enter your master password to bind biometric unlock.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await registerPlatformAuthenticator(masterPassword);
      if (res.success && res.config) {
        setConfig(res.config);
        setStatusMessage({
          type: 'success',
          text: `Successfully enrolled ${platformName}! You can now unlock the vault using your biometric sensor.`,
        });
        setMasterPassword('');
        try {
          confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
        } catch {}
        if (onBiometricStatusChanged) onBiometricStatusChanged();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to register platform authenticator.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error configuring WebAuthn.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestBiometrics = async () => {
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await authenticateWithPlatformAuthenticator();
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Verified! Platform biometric assertion confirmed by hardware enclave.`,
        });
        try {
          confetti({ particleCount: 20, spread: 50, origin: { y: 0.6 } });
        } catch {}
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Biometric test verification failed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Verification failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    if (confirm(`Remove ${platformName} unlock from this browser?`)) {
      removeWebAuthnConfig();
      setConfig(null);
      setStatusMessage({ type: 'success', text: 'Biometric unlock disabled.' });
      if (onBiometricStatusChanged) onBiometricStatusChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Biometric & WebAuthn Unlock
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Detected Hardware: {platformName}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Uses W3C Web Authentication (FIDO2) with platform authenticators (Touch ID, Windows Hello, Face ID) to unlock your vault in milliseconds without typing your master password.
              </p>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {config ? (
            /* Already enrolled */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Biometrics Active</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {config.authenticatorName}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Enrolled
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTestBiometrics}
                  disabled={isProcessing}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{isProcessing ? 'Verifying...' : 'Test Biometrics'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isProcessing}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Disable</span>
                </button>
              </div>
            </div>
          ) : (
            /* Setup enrollment form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Master Password to Enable Biometrics
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter current master password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Required once to securely wrap the vault decryption key with your platform authenticator.
                </p>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{isProcessing ? 'Prompting Biometrics...' : `Enable ${platformName}`}</span>
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>FIDO2 / WebAuthn Level 3</span>
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Hardware Enclave
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
