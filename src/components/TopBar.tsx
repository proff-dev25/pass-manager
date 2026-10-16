import React from 'react';
import { Shield, Lock, Unlock, Download, Terminal, CheckCircle2 } from 'lucide-react';

export type ActiveTab = 'vault' | 'sandbox' | 'extension' | 'audit' | 'generator' | 'advisor';

interface TopBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isUnlocked: boolean;
  onLockVault: () => void;
  onUnlockVaultClick: () => void;
  onDownloadExtension: () => void;
  itemsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  isUnlocked,
  onLockVault,
  onUnlockVaultClick,
  onDownloadExtension,
  itemsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <div 
          onClick={() => setActiveTab('vault')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:bg-indigo-500 transition-colors">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
              AegisPass
            </span>
            <span className="text-[10px] text-slate-400 font-mono -mt-0.5">
              Zero-Knowledge Vault
            </span>
          </div>
        </div>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('vault')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'vault'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Vault {isUnlocked ? `(${itemsCount})` : ''}
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'sandbox'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Autofill Sandbox</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/20 text-indigo-300 font-mono">
              Live Demo
            </span>
          </button>

          <button
            onClick={() => setActiveTab('extension')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'extension'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Browser Extension
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Security Audit
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeTab === 'generator'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Password Generator
          </button>

          <button
            onClick={() => setActiveTab('advisor')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'advisor'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Cyber Advisor</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-500/30 text-indigo-200">
              AI
            </span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {isUnlocked ? (
            <button
              onClick={onLockVault}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
              title="Lock vault immediately"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Lock Vault</span>
            </button>
          ) : (
            <button
              onClick={onUnlockVaultClick}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Vault</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
