import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Globe, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  ShieldCheck, 
  Copy, 
  Check, 
  AlertCircle,
  HelpCircle,
  Zap,
  Search
} from 'lucide-react';

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  groundingChunks?: GroundingChunk[];
}

export const CyberAdvisorChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I am your **AegisPass Cyber Security Advisor & Breach Analyst** powered by Gemini with live **Google Search Grounding**.

I can help you analyze recent security vulnerabilities, investigate known corporate data breaches, formulate strong password policies, and guide you through WebAuthn passkey implementation.

What cybersecurity or credential security question can I help you investigate today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [enableSearch, setEnableSearch] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setErrorMessage(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          model,
          enableSearch,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'No response text received.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingChunks: data.groundingChunks || [],
      };

      setMessages([...newHistory, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(err.message || 'Failed to connect to the Gemini cybersecurity advisor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearHistory = () => {
    if (confirm('Clear chat history?')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'assistant',
          content: 'Chat history cleared. What cybersecurity topic or recent breach would you like to explore?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const QUICK_PROMPTS = [
    'Recent major corporate credential leaks in 2024–2026?',
    'How does k-anonymity protect passwords in HIBP checks?',
    'Best practices for transitioning from passwords to WebAuthn passkeys?',
    'What is credential stuffing and how do zero-knowledge managers prevent it?',
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-100px)] flex flex-col">
      {/* Header Strip */}
      <div className="bg-white border border-slate-200 rounded-t-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                Gemini Cybersecurity Advisor
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                Google Search Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live intelligence on breach disclosures, threat mitigation, and cryptographic protocols.
            </p>
          </div>
        </div>

        {/* Controls: Model & Search Toggles */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setModel('gemini-3.8-flash')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                model === 'gemini-3.8-flash'
                  ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="gemini-3.8-flash: Recommended general model"
            >
              Gemini 3.8 Flash
            </button>
            <button
              onClick={() => setModel('gemini-3.1-flash-lite')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                model === 'gemini-3.1-flash-lite'
                  ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="gemini-3.1-flash-lite: Fast response model"
            >
              Flash Lite
            </button>
          </div>

          <button
            onClick={() => setEnableSearch(!enableSearch)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              enableSearch
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={enableSearch ? 'Google Search Grounding active' : 'Enable Google Search Grounding'}
          >
            <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Search Grounding</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 bg-slate-50/70 border-x border-slate-200 p-4 sm:p-6 overflow-y-auto space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-indigo-600 text-white shadow-xs'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className="space-y-2 max-w-2xl">
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap select-text">{msg.content}</div>

                {/* Grounding Citations */}
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
                      <Search className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Google Search Verified Sources:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.groundingChunks
                        .filter(c => c.web?.uri && c.web?.title)
                        .slice(0, 4)
                        .map((chunk, idx) => (
                          <a
                            key={idx}
                            href={chunk.web!.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-[11px] font-medium text-slate-700 hover:text-indigo-700 transition-colors"
                          >
                            <span className="truncate max-w-[200px]">{chunk.web!.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                          </a>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Message metadata & actions */}
              <div
                className={`flex items-center gap-2 text-[10px] text-slate-400 font-mono px-1 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <span>{msg.timestamp}</span>
                <button
                  onClick={() => handleCopy(msg.content, msg.id)}
                  className="hover:text-slate-600 transition-colors p-0.5"
                  title="Copy message"
                >
                  {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto animate-in fade-in">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Searching intelligence databases & reasoning...</span>
              </div>
              <div className="space-y-1.5 w-64">
                <div className="h-2 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-2 bg-slate-100 rounded-full animate-pulse w-5/6" />
                <div className="h-2 bg-slate-100 rounded-full animate-pulse w-4/6" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips (when few messages) */}
      {messages.length <= 3 && (
        <div className="bg-slate-50 border-x border-slate-200 px-4 py-2 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 hover:text-indigo-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-50 border-x border-rose-200 px-4 py-2 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="bg-white border border-slate-200 rounded-b-2xl p-3 sm:p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about recent data breaches, password entropy, WebAuthn, or CVE vulnerabilities..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-sm transition-all cursor-pointer shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Powered by Gemini 3.8 Flash + Google Search Grounding</span>
          <span>Zero-Knowledge: Local credentials are never sent</span>
        </div>
      </div>
    </div>
  );
};
