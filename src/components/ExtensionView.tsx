import React, { useState } from 'react';
import { 
  Download, 
  Terminal, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  Layers, 
  Cpu, 
  Key,
  Laptop
} from 'lucide-react';
import { getExtensionSourceFiles, downloadExtensionZip, ExtensionFile } from '../lib/extensionGenerator';

export const ExtensionView: React.FC = () => {
  const files = getExtensionSourceFiles();
  const [selectedFileName, setSelectedFileName] = useState<string>('manifest.json');
  const [copiedFile, setCopiedFile] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const selectedFile = files.find(f => f.name === selectedFileName) || files[0];

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadExtensionZip();
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Banner with Architectural Image */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 p-6 sm:p-10 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <Zap className="w-4 h-4" />
              <span>MANIFEST V3 SPECIFICATION</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Official Browser Extension & Secure Autofill Engine
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Integrate AegisPass directly into Google Chrome, Microsoft Edge, Brave, and Mozilla Firefox. Includes background service worker isolation, DOM mutation observer field detection, and encrypted inline shield badges.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Packing ZIP...' : 'Download Extension (.ZIP)'}</span>
              </button>

              <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                <span>Version 1.0.0</span>
                <span>·</span>
                <span>Chrome / Edge / Firefox</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 h-64 lg:h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
            <img
              src="/src/assets/images/vault_security_shield_1792043081807.jpg"
              alt="AegisPass Zero-Knowledge Security Vault"
              className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3 Steps Installation Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          How to Install the Extension in Your Browser
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          No Chrome Web Store approval delay required — load the unpacked package directly into any Chromium browser in 30 seconds.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              1
            </div>
            <h3 className="font-semibold text-sm text-slate-900">Download & Extract</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click the <strong>"Download Extension (.ZIP)"</strong> button above and extract the zip archive into a folder on your computer.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              2
            </div>
            <h3 className="font-semibold text-sm text-slate-900">Open Extensions Page</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In Chrome or Brave, navigate to <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">chrome://extensions</code> (or <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">edge://extensions</code> in Edge).
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              3
            </div>
            <h3 className="font-semibold text-sm text-slate-900">Load Unpacked</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Toggle <strong>Developer mode</strong> in the top-right corner, click <strong>"Load unpacked"</strong>, and pick the extracted folder.
            </p>
          </div>
        </div>
      </div>

      {/* Code Viewer & Architecture Explorer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Extension Source Files & Manifest V3 Code
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect the exact background worker, content script, and popup UI code running in the browser.
            </p>
          </div>

          {/* File Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            {files.map(f => (
              <button
                key={f.name}
                onClick={() => setSelectedFileName(f.name)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                  selectedFileName === f.name
                    ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Selected File Details Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span className="font-mono font-semibold text-slate-800">{selectedFile.path}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500">{selectedFile.description}</span>
          </div>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition-colors"
          >
            {copiedFile ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy File</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content Container */}
        <div className="p-6 bg-slate-950 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed max-h-[500px] select-all">
          <pre>{selectedFile.content}</pre>
        </div>
      </div>
    </div>
  );
};
