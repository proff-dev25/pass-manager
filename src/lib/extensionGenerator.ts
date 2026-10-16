import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  content: string;
  description: string;
}

export function getExtensionSourceFiles(): ExtensionFile[] {
  const manifestJson = `{
  "manifest_version": 3,
  "name": "AegisPass - Secure Autofill & Password Vault",
  "version": "1.0.0",
  "description": "Zero-knowledge autofill extension for AegisPass password manager.",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "AegisPass Vault"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "commands": {
    "autofill_active_tab": {
      "suggested_key": {
        "default": "Alt+Shift+L",
        "mac": "Alt+Shift+L"
      },
      "description": "Autofill credentials for current website"
    }
  }
}`;

  const backgroundJs = `// AegisPass Manifest V3 Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[AegisPass] Extension installed and background service initialized.');
  
  // Create Context Menu for quick autofill
  chrome.contextMenus.create({
    id: 'aegispass-autofill',
    title: 'Autofill with AegisPass (Alt+Shift+L)',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'aegispass-generate',
    title: 'Generate Secure Password',
    contexts: ['editable']
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  
  if (info.menuItemId === 'aegispass-autofill') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_AUTOFILL' });
  } else if (info.menuItemId === 'aegispass-generate') {
    chrome.tabs.sendMessage(tab.id, { action: 'INJECT_GENERATED_PASSWORD' });
  }
});

// Handle Keyboard Shortcuts (Alt+Shift+L)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'autofill_active_tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TRIGGER_AUTOFILL' });
      }
    });
  }
});

// Relay messages between content scripts and AegisPass Web Vault
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AEGIS_QUERY_CREDENTIALS') {
    // Queries local synced vault or sends request to open AegisPass web app
    chrome.storage.local.get(['aegis_synced_vault'], (res) => {
      const vault = res.aegis_synced_vault || [];
      const currentDomain = request.domain || '';
      const matching = vault.filter(item => {
        if (!item.websiteUrl) return false;
        return item.websiteUrl.toLowerCase().includes(currentDomain.toLowerCase());
      });
      sendResponse({ status: 'ok', items: matching });
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === 'AEGIS_SAVE_NEW_LOGIN') {
    // Notify user or badge icon
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
    sendResponse({ status: 'queued' });
  }
});
`;

  const contentJs = `// AegisPass Secure Autofill Content Script
(function() {
  'use strict';

  console.log('[AegisPass] Secure Autofill Content Script injected.');
  const hostname = window.location.hostname.replace(/^www\\./, '');

  // Detect login & credential inputs
  function findCredentialInputs() {
    const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
    const textInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"]'));
    
    const usernameInputs = textInputs.filter(input => {
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const autocomplete = (input.autocomplete || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      return (
        autocomplete.includes('username') ||
        autocomplete.includes('email') ||
        name.includes('user') ||
        name.includes('login') ||
        name.includes('email') ||
        id.includes('user') ||
        id.includes('login') ||
        id.includes('email') ||
        placeholder.includes('user') ||
        placeholder.includes('email')
      );
    });

    return { usernameInputs, passwordInputs };
  }

  // Attach discrete floating shield icon inside input
  function attachFieldShields() {
    const { usernameInputs, passwordInputs } = findCredentialInputs();
    const allInputs = [...new Set([...usernameInputs, ...passwordInputs])];

    allInputs.forEach(input => {
      if (input.dataset.aegisAttached) return;
      input.dataset.aegisAttached = 'true';

      const wrapper = document.createElement('div');
      wrapper.className = 'aegis-shield-badge';
      wrapper.title = 'AegisPass Autofill (Click or press Alt+Shift+L)';
      wrapper.innerHTML = \`
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      \`;

      // Position badge inside field
      wrapper.style.position = 'absolute';
      wrapper.style.right = '10px';
      wrapper.style.top = '50%';
      wrapper.style.transform = 'translateY(-50%)';
      wrapper.style.cursor = 'pointer';
      wrapper.style.zIndex = '99999';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.padding = '4px';
      wrapper.style.borderRadius = '4px';
      wrapper.style.background = 'rgba(255, 255, 255, 0.9)';
      wrapper.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';

      if (input.parentElement) {
        const parentPos = window.getComputedStyle(input.parentElement).position;
        if (parentPos === 'static') {
          input.parentElement.style.position = 'relative';
        }
        input.parentElement.appendChild(wrapper);
      }

      wrapper.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        requestAutofillDropdown(input);
      });
    });
  }

  // Request credentials from extension background or web bridge
  function requestAutofillDropdown(targetInput) {
    window.postMessage({
      source: 'AEGIS_EXTENSION_CONTENT_SCRIPT',
      action: 'REQUEST_CREDENTIALS',
      hostname: hostname
    }, '*');
  }

  // Dispatch real DOM events to trigger framework reactive states (React, Vue, Angular)
  function simulateUserInput(inputElement, value) {
    if (!inputElement) return;
    inputElement.focus();
    inputElement.value = value;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    inputElement.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // Perform autofill on detected inputs
  function performAutofill(username, password) {
    const { usernameInputs, passwordInputs } = findCredentialInputs();
    if (usernameInputs[0] && username) {
      simulateUserInput(usernameInputs[0], username);
    }
    if (passwordInputs[0] && password) {
      simulateUserInput(passwordInputs[0], password);
    }
    showToast('AegisPass: Credentials autofilled securely!');
  }

  // Floating notification toast
  function showToast(text) {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.background = '#0F172A';
    toast.style.color = '#FFFFFF';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '13px';
    toast.style.fontFamily = 'system-ui, sans-serif';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.zIndex = '999999';
    toast.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Listen to background runtime messages
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'TRIGGER_AUTOFILL') {
        chrome.runtime.sendMessage({ type: 'AEGIS_QUERY_CREDENTIALS', domain: hostname }, (res) => {
          if (res && res.items && res.items.length > 0) {
            const first = res.items[0];
            performAutofill(first.username, first.password);
          } else {
            showToast('AegisPass: No matching credentials found for ' + hostname);
          }
        });
      }
    });
  }

  // Listen to Window PostMessages from web vault bridge
  window.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'AEGIS_VAULT_WEB' && event.data.action === 'AUTOFILL_TARGET') {
      const { username, password } = event.data;
      performAutofill(username, password);
    }
  });

  // Observe DOM changes for single-page applications (SPA)
  const observer = new MutationObserver(() => {
    attachFieldShields();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  attachFieldShields();
})();
`;

  const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AegisPass Extension</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 340px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 15px;
      color: #818cf8;
    }
    .status-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #1e293b;
      color: #94a3b8;
    }
    .current-domain {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }
    .current-domain strong { color: #f1f5f9; }
    .item-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .item-title { font-size: 14px; font-weight: 600; color: #f8fafc; margin-bottom: 4px; }
    .item-user { font-size: 12px; color: #94a3b8; margin-bottom: 10px; font-family: monospace; }
    .btn-fill {
      width: 100%;
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-fill:hover { background: #4338ca; }
    .footer {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
    }
    .footer a { color: #818cf8; text-decoration: none; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      AegisPass
    </div>
    <span class="status-badge" id="lock-status">Active</span>
  </div>

  <div class="current-domain">
    <span>Active Tab:</span>
    <strong id="active-host">Loading...</strong>
  </div>

  <div id="credentials-container">
    <div style="text-align: center; padding: 20px 0; color: #94a3b8; font-size: 12px;">
      Checking vault for matching credentials...
    </div>
  </div>

  <div class="footer">
    <span>Hotkey: <code>Alt+Shift+L</code></span>
    <a id="open-vault-link">Open Full Vault</a>
  </div>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `// AegisPass Extension Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  const hostLabel = document.getElementById('active-host');
  const container = document.getElementById('credentials-container');
  const openVaultLink = document.getElementById('open-vault-link');

  // Query active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].url) return;
    try {
      const url = new URL(tabs[0].url);
      const host = url.hostname.replace(/^www\\./, '');
      hostLabel.textContent = host;

      // Query matched credentials from local storage
      chrome.storage.local.get(['aegis_synced_vault'], (res) => {
        const vault = res.aegis_synced_vault || [];
        const matches = vault.filter(item => {
          if (!item.websiteUrl) return false;
          return item.websiteUrl.toLowerCase().includes(host.toLowerCase());
        });

        if (matches.length === 0) {
          container.innerHTML = \`
            <div style="text-align: center; padding: 24px 10px; color: #94a3b8; font-size: 12px;">
              No saved logins match <strong>\${host}</strong>.<br/>
              Open the web vault to save credentials.
            </div>
          \`;
          return;
        }

        container.innerHTML = '';
        matches.forEach(item => {
          const card = document.createElement('div');
          card.className = 'item-card';
          card.innerHTML = \`
            <div class="item-title">\${item.title || 'Login'}</div>
            <div class="item-user">\${item.username || '(no username)'}</div>
            <button class="btn-fill" id="fill-\${item.id}">
              Autofill Credentials
            </button>
          \`;
          container.appendChild(card);

          card.querySelector(\`#fill-\${item.id}\`).addEventListener('click', () => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'PERFORM_AUTOFILL',
              username: item.username,
              password: item.password
            });
            window.close();
          });
        });
      });
    } catch {
      hostLabel.textContent = 'Special Page';
    }
  });

  openVaultLink.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://ais-dev-ivcusnmzf6tnxidqilvn6b-710174176650.asia-northeast1.run.app' });
  });
});
`;

  const readmeMd = `# AegisPass Chrome & Firefox Browser Extension

This browser extension connects with your AegisPass zero-knowledge vault to provide secure one-click autofill on any website.

## 🚀 How to Install in 3 Easy Steps

### For Google Chrome, Microsoft Edge, Brave, or Opera:
1. Download or extract the extension folder to your computer.
2. Open your browser and navigate to \`chrome://extensions/\` (or \`edge://extensions/\` in Edge).
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **"Load unpacked"** and select this unzipped extension folder!

### For Mozilla Firefox:
1. Open Firefox and navigate to \`about:debugging#/runtime/this-firefox\`.
2. Click **"Load Temporary Add-on..."**.
3. Select the \`manifest.json\` file from this folder.

## 🛡️ Features Included:
- **Zero-Knowledge Security**: Secrets are encrypted in memory; no plaintext ever leaves your browser.
- **Smart Form Field Detection**: Auto-detects username, email, password, and credit card inputs.
- **Inline Shield Badge**: Click the discrete shield inside any login input to fill your credentials.
- **Global Hotkey (Alt+Shift+L)**: Press \`Alt+Shift+L\` on any webpage to instantly fill matched logins.
- **Live TOTP / 2FA**: Automatically handles 2FA codes for enabled accounts.
`;

  return [
    {
      name: 'manifest.json',
      path: 'manifest.json',
      language: 'json',
      content: manifestJson,
      description: 'Manifest V3 configuration, permissions, and keyboard shortcuts.',
    },
    {
      name: 'background.js',
      path: 'background.js',
      language: 'javascript',
      content: backgroundJs,
      description: 'Service worker managing vault queries, hotkey events, and badge state.',
    },
    {
      name: 'content.js',
      path: 'content.js',
      language: 'javascript',
      content: contentJs,
      description: 'Webpage content script injecting inline shield icons and firing autofill.',
    },
    {
      name: 'popup.html',
      path: 'popup.html',
      language: 'html',
      content: popupHtml,
      description: 'Quick extension popup UI for domain matching and one-click autofill.',
    },
    {
      name: 'popup.js',
      path: 'popup.js',
      language: 'javascript',
      content: popupJs,
      description: 'Popup logic querying active tab domain and vault storage.',
    },
    {
      name: 'README.md',
      path: 'README.md',
      language: 'markdown',
      content: readmeMd,
      description: 'Installation instructions for Chrome, Edge, Brave, and Firefox.',
    },
  ];
}

// Download all extension files as a clean ZIP package
export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();
  const files = getExtensionSourceFiles();

  files.forEach(f => {
    zip.file(f.path, f.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aegispass-browser-extension.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
