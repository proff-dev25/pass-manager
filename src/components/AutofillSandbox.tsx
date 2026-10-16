import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  Lock, 
  RotateCw, 
  ArrowLeft, 
  ArrowRight, 
  Shield, 
  Check, 
  Sparkles, 
  Key, 
  CreditCard, 
  Terminal, 
  Command, 
  Clock, 
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Fingerprint
} from 'lucide-react';
import { VaultItem } from '../types/vault';
import { findMatchingLogins } from '../lib/vaultStore';
import { generateTOTP, generatePassword } from '../lib/crypto';
import confetti from 'canvas-confetti';

interface AutofillSandboxProps {
  vaultItems: VaultItem[];
  onSaveNewItem: (item: VaultItem) => void;
}

type SandboxPreset = 'github' | 'chase' | 'stripe' | 'netflix' | 'signup';

interface ConsoleLog {
  id: string;
  timestamp: string;
  tag: 'CONTENT_SCRIPT' | 'BACKGROUND' | 'AUTOFILL' | 'SECURITY';
  message: string;
}

export const AutofillSandbox: React.FC<AutofillSandboxProps> = ({
  vaultItems,
  onSaveNewItem,
}) => {
  const [activePreset, setActivePreset] = useState<SandboxPreset>('github');
  const [currentUrl, setCurrentUrl] = useState<string>('https://github.com/login');
  const [urlInput, setUrlInput] = useState<string>('https://github.com/login');

  // Form input states
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [cardNameInput, setCardNameInput] = useState<string>('');
  const [cardNumberInput, setCardNumberInput] = useState<string>('');
  const [cardExpInput, setCardExpInput] = useState<string>('');
  const [cardCvvInput, setCardCvvInput] = useState<string>('');

  // Extension interaction states
  const [activeDropdownField, setActiveDropdownField] = useState<'username' | 'password' | 'card' | null>(null);
  const [autofillSuccessToast, setAutofillSuccessToast] = useState<string | null>(null);
  const [savePromptVisible, setSavePromptVisible] = useState<boolean>(false);
  const [pendingSaveCreds, setPendingSaveCreds] = useState<{ username: string; password: string } | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // Live extension logs
  const [logs, setLogs] = useState<ConsoleLog[]>([]);

  const addLog = (tag: ConsoleLog['tag'], message: string) => {
    const newLog: ConsoleLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      tag,
      message,
    };
    setLogs(prev => [newLog, ...prev.slice(0, 19)]);
  };

  // Switch presets
  const handleSelectPreset = (preset: SandboxPreset) => {
    setActivePreset(preset);
    setActiveDropdownField(null);
    setSavePromptVisible(false);
    setSubmittedMessage(null);

    // Clear fields
    setUsernameInput('');
    setPasswordInput('');
    setOtpInput('');
    setCardNameInput('');
    setCardNumberInput('');
    setCardExpInput('');
    setCardCvvInput('');

    let url = '';
    if (preset === 'github') url = 'https://github.com/login';
    else if (preset === 'chase') url = 'https://secure05c.chase.com/auth';
    else if (preset === 'stripe') url = 'https://checkout.stripe.com/pay';
    else if (preset === 'netflix') url = 'https://www.netflix.com/login';
    else if (preset === 'signup') url = 'https://acme-cloud.io/signup';

    setCurrentUrl(url);
    setUrlInput(url);

    addLog('BACKGROUND', `Browser tab navigated to ${url}`);
    addLog('CONTENT_SCRIPT', `Injected DOM observer, scanning for credential inputs.`);
  };

  // Find matching items from vault
  const matchedLogins = findMatchingLogins(vaultItems, currentUrl);
  const matchedCards = vaultItems.filter(i => i.category === 'card');

  useEffect(() => {
    addLog('CONTENT_SCRIPT', `Detected form inputs on ${currentUrl}`);
    if (matchedLogins.length > 0) {
      addLog('BACKGROUND', `Found ${matchedLogins.length} matching vault credential(s) for domain.`);
    } else if (activePreset === 'stripe') {
      addLog('BACKGROUND', `Found ${matchedCards.length} saved payment card(s) for checkout.`);
    } else {
      addLog('BACKGROUND', `No saved credentials for current domain.`);
    }
  }, [currentUrl]);

  // Execute Autofill with an item
  const handleAutofillItem = async (item: VaultItem) => {
    setActiveDropdownField(null);

    if (item.category === 'login') {
      if (item.username) setUsernameInput(item.username);
      if (item.password) setPasswordInput(item.password);

      // Auto-generate TOTP if present
      if (item.totpSecret) {
        const otpRes = await generateTOTP(item.totpSecret);
        setOtpInput(otpRes.token);
        addLog('AUTOFILL', `Injected username "${item.username}", encrypted password, and live TOTP token ${otpRes.token}`);
      } else {
        addLog('AUTOFILL', `Injected username "${item.username}" and password from vault item "${item.title}".`);
      }

      setAutofillSuccessToast(`Autofilled credentials for ${item.title}`);
    } else if (item.category === 'card') {
      if (item.cardholderName) setCardNameInput(item.cardholderName);
      if (item.cardNumber) setCardNumberInput(item.cardNumber);
      if (item.cardExpMonth && item.cardExpYear) {
        setCardExpInput(`${item.cardExpMonth}/${item.cardExpYear.slice(-2)}`);
      }
      if (item.cardCvv) setCardCvvInput(item.cardCvv);

      addLog('AUTOFILL', `Injected payment card details for "${item.title}".`);
      setAutofillSuccessToast(`Autofilled ${item.title}`);
    }

    try {
      confetti({
        particleCount: 20,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch {}

    setTimeout(() => setAutofillSuccessToast(null), 3000);
  };

  // Global hotkey trigger simulation (Alt+Shift+L)
  const handleTriggerHotkey = () => {
    addLog('BACKGROUND', `Captured global hotkey Alt+Shift+L from active tab.`);
    if (activePreset === 'stripe') {
      if (matchedCards.length > 0) {
        handleAutofillItem(matchedCards[0]);
      } else {
        setAutofillSuccessToast('No cards in vault');
      }
    } else {
      if (matchedLogins.length > 0) {
        handleAutofillItem(matchedLogins[0]);
      } else {
        setAutofillSuccessToast(`No logins match ${currentUrl}`);
      }
    }
  };

  // Form submit handler to demonstrate "Save new password" extension feature
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedMessage('Authentication submitted to simulated server!');

    // Check if these credentials are new
    const exists = vaultItems.some(
      i => i.websiteUrl && i.websiteUrl.includes(new URL(currentUrl).hostname) && i.username === usernameInput
    );

    if (!exists && usernameInput && passwordInput) {
      setPendingSaveCreds({ username: usernameInput, password: passwordInput });
      setSavePromptVisible(true);
      addLog('SECURITY', `Detected new login credentials. Prompting user to save to encrypted vault.`);
    }
  };

  const handleConfirmSavePrompt = () => {
    if (!pendingSaveCreds) return;
    const newItem: VaultItem = {
      id: `item-${Date.now()}`,
      category: 'login',
      title: `${new URL(currentUrl).hostname.replace('www.', '')} Account`,
      websiteUrl: currentUrl,
      username: pendingSaveCreds.username,
      password: pendingSaveCreds.password,
      tags: ['autofill-saved'],
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveNewItem(newItem);
    setSavePromptVisible(false);
    setPendingSaveCreds(null);
    addLog('SECURITY', `Successfully encrypted and stored new credentials in vault.`);
    setAutofillSuccessToast('Saved new login to AegisPass vault!');
    setTimeout(() => setAutofillSuccessToast(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Browser Extension Autofill Testing Sandbox
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Test how AegisPass content scripts and background service workers automatically detect input fields, render the inline shield badge, and securely autofill credentials or payment cards.
          </p>
        </div>

        {/* Actions Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              addLog('SECURITY', 'WebAuthn platform assertion verified via Touch ID / Windows Hello. Extension unlocked.');
              handleTriggerHotkey();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
            title="Simulate WebAuthn Biometric verification"
          >
            <Fingerprint className="w-3.5 h-3.5 text-indigo-200" />
            <span>Biometric Unlock</span>
          </button>

          <button
            onClick={handleTriggerHotkey}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow transition-all cursor-pointer"
            title="Simulate Alt+Shift+L shortcut"
          >
            <Command className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hotkey</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-indigo-300">
              Alt+Shift+L
            </kbd>
          </button>
        </div>
      </div>

      {/* Preset Target Sites Selector */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl">
        <span className="text-xs font-semibold text-slate-500 px-3">Test Websites:</span>
        <button
          onClick={() => handleSelectPreset('github')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activePreset === 'github'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          GitHub Developer (Login + 2FA)
        </button>
        <button
          onClick={() => handleSelectPreset('chase')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activePreset === 'chase'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Chase Banking Portal
        </button>
        <button
          onClick={() => handleSelectPreset('stripe')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activePreset === 'stripe'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Stripe Payment Checkout (Card Autofill)
        </button>
        <button
          onClick={() => handleSelectPreset('netflix')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activePreset === 'netflix'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Netflix Streaming (Reused Password Test)
        </button>
        <button
          onClick={() => handleSelectPreset('signup')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activePreset === 'signup'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          New Account Signup (Suggest & Save)
        </button>
      </div>

      {/* SIMULATED BROWSER WINDOW */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Browser Chrome Header (Address bar & controls) */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>

          {/* Navigation buttons */}
          <div className="hidden sm:flex items-center gap-1 text-slate-500">
            <button className="p-1 hover:text-slate-300 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 hover:text-slate-300 transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSelectPreset(activePreset)}
              className="p-1 hover:text-slate-300 transition-colors"
              title="Reload simulated page"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Address Bar */}
          <div className="flex-1 max-w-xl mx-auto flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrentUrl(urlInput);
                }
              }}
              className="w-full bg-transparent border-none text-slate-200 focus:outline-none"
            />
          </div>

          {/* Extension Action Button in Browser Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              onClick={handleTriggerHotkey}
              className="relative p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shadow-sm"
              title="AegisPass Extension Active - Click to autofill"
            >
              <Shield className="w-4 h-4" />
              {(matchedLogins.length > 0 || (activePreset === 'stripe' && matchedCards.length > 0)) && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 flex items-center justify-center font-mono">
                  {activePreset === 'stripe' ? matchedCards.length : matchedLogins.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BROWSER VIEWPORT / SIMULATED WEBPAGE */}
        <div className="bg-slate-50 p-6 md:p-12 min-h-[460px] flex items-center justify-center relative">
          {/* Extension Toast notification */}
          {autofillSuccessToast && (
            <div className="absolute top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{autofillSuccessToast}</span>
            </div>
          )}

          {/* Extension "Save Password" Prompt notification */}
          {savePromptVisible && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-indigo-500/50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">Save password to AegisPass?</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Would you like to store credentials for <strong className="text-indigo-300 font-mono">{new URL(currentUrl).hostname}</strong> in your zero-knowledge encrypted vault?
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSavePromptVisible(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Never for this site
                    </button>
                    <button
                      onClick={handleConfirmSavePrompt}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
                    >
                      Save to Vault
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Webpage Content Cards */}
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            {/* 1. GITHUB LOGIN PRESET */}
            {activePreset === 'github' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="text-center pb-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Sign in to GitHub</h3>
                  <p className="text-xs text-slate-500">to continue to GitHub.com</p>
                </div>

                {/* Username Input with inline shield */}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Username or email address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="login"
                      id="login_field"
                      autoComplete="username"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="octocat@github.com"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />

                    {/* AegisPass Floating Shield Badge inside input */}
                    <button
                      type="button"
                      onClick={() => setActiveDropdownField(activeDropdownField === 'username' ? null : 'username')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                      title="AegisPass Autofill (Click to view matches)"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Inline Extension Dropdown */}
                  {activeDropdownField === 'username' && (
                    <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          <span>AegisPass Logins for github.com</span>
                        </div>
                        <span className="font-mono text-indigo-600">Alt+Shift+L</span>
                      </div>

                      {matchedLogins.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {matchedLogins.map(item => (
                            <div
                              key={item.id}
                              onClick={() => handleAutofillItem(item)}
                              className="p-3 hover:bg-indigo-50/50 cursor-pointer transition-colors flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-bold text-slate-900">{item.title}</div>
                                <div className="text-[11px] font-mono text-slate-500">{item.username}</div>
                              </div>
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold shadow-xs"
                              >
                                Autofill
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No matching logins in vault.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Password Input with inline shield */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Password
                    </label>
                    <span className="text-xs text-indigo-600 hover:underline cursor-pointer">
                      Forgot password?
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      name="password"
                      id="password"
                      autoComplete="current-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />

                    {/* Shield icon */}
                    <button
                      type="button"
                      onClick={() => setActiveDropdownField(activeDropdownField === 'password' ? null : 'password')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                      title="AegisPass Autofill"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2FA Token input */}
                {otpInput && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
                    <div>
                      <span className="font-semibold">TOTP 2FA Injected:</span>
                      <span className="ml-2 font-mono font-bold tracking-widest">{otpInput}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-700">
                      Auto-generated
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  Sign In
                </button>
              </form>
            )}

            {/* 2. CHASE BANKING PORTAL */}
            {activePreset === 'chase' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="text-center pb-2">
                  <div className="text-lg font-bold text-blue-900 tracking-wider font-serif">
                    CHASE <span className="font-sans font-light text-slate-500">| Commercial</span>
                  </div>
                  <p className="text-xs text-slate-500">Secure Online Banking Session</p>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Banking ID"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveDropdownField(activeDropdownField === 'username' ? null : 'username')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded bg-blue-50 text-blue-600"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  </div>

                  {activeDropdownField === 'username' && (
                    <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 flex justify-between">
                        <span>AegisPass Banking Logins</span>
                        <span className="font-mono text-blue-600">Alt+Shift+L</span>
                      </div>
                      {matchedLogins.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleAutofillItem(item)}
                          className="p-3 hover:bg-blue-50/50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">{item.title}</div>
                            <div className="text-[11px] font-mono text-slate-500">{item.username}</div>
                          </div>
                          <button type="button" className="px-2.5 py-1 rounded bg-blue-700 text-white text-xs font-semibold">
                            Autofill
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {otpInput && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Multi-Factor Token Code (Auto-Detected)
                    </label>
                    <input
                      type="text"
                      value={otpInput}
                      readOnly
                      className="w-full px-3.5 py-2.5 border border-emerald-300 bg-emerald-50 rounded-lg text-sm font-mono font-bold tracking-widest text-emerald-800"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Log In Securely
                </button>
              </form>
            )}

            {/* 3. STRIPE PAYMENT CHECKOUT PRESET */}
            {activePreset === 'stripe' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Acme Pro Subscription</h3>
                    <p className="text-xs text-slate-500">$49.00 / month</p>
                  </div>
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    Stripe Checkout
                  </div>
                </div>

                {/* Cardholder name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Name on card
                  </label>
                  <input
                    type="text"
                    value={cardNameInput}
                    onChange={(e) => setCardNameInput(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                {/* Card Number with shield badge */}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Card information
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumberInput}
                      onChange={(e) => setCardNumberInput(e.target.value)}
                      placeholder="1234 1234 1234 1234"
                      className="w-full px-3.5 py-2 pr-10 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveDropdownField(activeDropdownField === 'card' ? null : 'card')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                      title="AegisPass Card Autofill"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card dropdown */}
                  {activeDropdownField === 'card' && (
                    <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500">
                        Saved Payment Cards in AegisPass
                      </div>
                      {matchedCards.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleAutofillItem(c)}
                          className="p-3 hover:bg-indigo-50/50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">{c.title}</div>
                            <div className="text-[11px] font-mono text-slate-500">{c.cardNumber} ({c.cardBrand})</div>
                          </div>
                          <button type="button" className="px-2.5 py-1 rounded bg-indigo-600 text-white text-xs font-semibold">
                            Autofill Card
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Exp and CVC */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Expiration</label>
                    <input
                      type="text"
                      value={cardExpInput}
                      onChange={(e) => setCardExpInput(e.target.value)}
                      placeholder="MM / YY"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CVC / CVV</label>
                    <input
                      type="password"
                      value={cardCvvInput}
                      onChange={(e) => setCardCvvInput(e.target.value)}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  Pay $49.00
                </button>
              </form>
            )}

            {/* 4. NETFLIX STREAMING PRESET */}
            {activePreset === 'netflix' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="text-center pb-2">
                  <div className="text-2xl font-black text-rose-600 tracking-wider">
                    NETFLIX
                  </div>
                  <p className="text-xs text-slate-500">Sign in to watch your shows</p>
                </div>

                <div className="relative">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email or mobile number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveDropdownField(activeDropdownField === 'username' ? null : 'username')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded bg-rose-50 text-rose-600"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  </div>

                  {activeDropdownField === 'username' && (
                    <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500">
                        AegisPass Logins for netflix.com
                      </div>
                      {matchedLogins.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleAutofillItem(item)}
                          className="p-3 hover:bg-rose-50/50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">{item.title}</div>
                            <div className="text-[11px] font-mono text-slate-500">{item.username}</div>
                          </div>
                          <button type="button" className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-semibold">
                            Autofill
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Sign In
                </button>
              </form>
            )}

            {/* 5. NEW ACCOUNT SIGNUP PRESET */}
            {activePreset === 'signup' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="text-center pb-2">
                  <h3 className="text-lg font-bold text-slate-900">Create an Acme Cloud Account</h3>
                  <p className="text-xs text-slate-500">30-day free developer trial</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">New Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generatePassword({
                          length: 20,
                          useUpper: true,
                          useLower: true,
                          useNumbers: true,
                          useSymbols: true,
                          avoidAmbiguous: true,
                          mode: 'password',
                        });
                        setPasswordInput(generated);
                        addLog('SECURITY', `Generated 20-character high entropy password.`);
                      }}
                      className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Suggest Strong Password</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Type or click 'Suggest Strong Password'"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  Create Account & Test Save
                </button>
              </form>
            )}

            {submittedMessage && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-center font-medium">
                {submittedMessage}
              </div>
            )}
          </div>
        </div>

        {/* EXTENSION CONSOLE / EVENT LOG INSPECTOR */}
        <div className="bg-slate-950 p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>AegisPass Extension Runtime Bridge & Console Stream</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[11px] text-slate-500 hover:text-slate-300 font-mono"
            >
              Clear Logs
            </button>
          </div>

          <div className="h-28 overflow-y-auto space-y-1 text-xs font-mono select-all">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">No events yet. Select a website or click an autofill shield icon.</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-slate-600 shrink-0 font-mono text-[10px]">{log.timestamp}</span>
                  <span
                    className={`px-1 py-0.2 rounded text-[10px] font-semibold shrink-0 ${
                      log.tag === 'CONTENT_SCRIPT'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : log.tag === 'BACKGROUND'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : log.tag === 'AUTOFILL'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {log.tag}
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
