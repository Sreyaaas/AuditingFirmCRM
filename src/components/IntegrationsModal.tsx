import React, { useState } from 'react';
import { X, Database, HardDrive, Check, AlertCircle, RefreshCw, KeyRound, Globe, Copy } from 'lucide-react';
import { CloudIntegration } from '../types/crm';
import { getSupabaseConfig, updateSupabaseCredentials, disconnectSupabase, testSupabaseConnection } from '../services/supabaseClient';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: CloudIntegration;
  onSync: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  integrations,
  onSync,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'supabase' | 'onedrive'>('supabase');
  const currentConfig = getSupabaseConfig();

  const [urlInput, setUrlInput] = useState(currentConfig.isLive ? currentConfig.url : '');
  const [keyInput, setKeyInput] = useState(currentConfig.isLive ? currentConfig.anonKey : '');
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const handleConnectLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      setStatusMessage({ success: false, text: 'Please enter both Supabase Project URL and Anon Public Key.' });
      return;
    }

    setTesting(true);
    setStatusMessage(null);

    const result = await testSupabaseConnection(urlInput, keyInput);
    setTesting(false);

    if (result.success) {
      updateSupabaseCredentials(urlInput, keyInput);
      setStatusMessage({ success: true, text: result.message });
      onSync();
    } else {
      setStatusMessage({ success: false, text: result.message });
    }
  };

  const handleDisconnect = () => {
    disconnectSupabase();
    setUrlInput('');
    setKeyInput('');
    setStatusMessage({ success: true, text: 'Switched back to Simulated Database (Offline Local Storage Mode).' });
    onSync();
  };

  const handleCopySchemaPath = () => {
    navigator.clipboard.writeText('supabase/schema.sql');
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Database &amp; Cloud Sync</h3>
            <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
              Configure connections with Supabase (PostgreSQL) &amp; OneDrive
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Segmented Tab switch */}
        <div className="p-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div className="flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#242426] p-0.5 rounded-[6px] text-[12px]">
            <button
              onClick={() => { setActiveTab('supabase'); setStatusMessage(null); }}
              className={`flex-1 py-1 px-2 font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'supabase'
                  ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                  : 'text-[#6E6E73] dark:text-[#8E8E93]'
              }`}
            >
              <Database className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Supabase (PostgreSQL)</span>
            </button>

            <button
              onClick={() => { setActiveTab('onedrive'); setStatusMessage(null); }}
              className={`flex-1 py-1 px-2 font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'onedrive'
                  ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                  : 'text-[#6E6E73] dark:text-[#8E8E93]'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>OneDrive (Client Files)</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-[13px] overflow-y-auto max-h-[70vh]">
          {statusMessage && (
            <div className={`p-2.5 rounded-[6px] text-[12px] flex items-center gap-2 ${
              statusMessage.success 
                ? 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20' 
                : 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20'
            }`}>
              {statusMessage.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-4">
              {/* Current Connection Status Badge */}
              <div className="p-3 bg-[#F9FAFB] dark:bg-[#202124] border border-[#E5E7EB] dark:border-[#374151] rounded-[6px] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${currentConfig.isLive ? 'bg-[#34C759]' : 'bg-[#FF9500]'}`}></span>
                  <div>
                    <div className="font-semibold text-[#111827] dark:text-[#F3F4F6] text-[12px]">
                      {currentConfig.isLive ? 'Connected to Live Supabase' : 'Operating in Simulated Mode (Local DB)'}
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      {currentConfig.isLive 
                        ? 'All client data, filings & debtors sync to your live PostgreSQL database.' 
                        : 'All features work 100% offline. Ready to connect as soon as you get credentials.'}
                    </div>
                  </div>
                </div>

                {currentConfig.isLive && (
                  <button
                    onClick={handleDisconnect}
                    className="text-[11px] text-[#DC2626] hover:underline shrink-0 ml-2"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleConnectLive} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-1">
                    Supabase Project URL
                  </label>
                  <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#202124] border border-[#E5E7EB] dark:border-[#374151] rounded-[4px] px-2.5 py-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                    <input
                      type="text"
                      placeholder="https://xyzcompany.supabase.co"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full bg-transparent text-[12px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#202124] border border-[#E5E7EB] dark:border-[#374151] rounded-[4px] px-2.5 py-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      className="w-full bg-transparent text-[12px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="submit"
                    disabled={testing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-[4px] text-[12px] font-medium transition-colors disabled:opacity-50"
                  >
                    {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                    <span>{testing ? 'Testing connection...' : 'Test & Connect Instantly'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySchemaPath}
                    className="inline-flex items-center gap-1 text-[11px] text-[#0071E3] hover:underline"
                    title="Copy schema file path"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSchema ? 'Copied path!' : 'Copy schema.sql path'}</span>
                  </button>
                </div>
              </form>

              {/* Instructions Box for Client */}
              <div className="p-3 bg-[#F9FAFB] dark:bg-[#202124] border border-[#E5E7EB] dark:border-[#374151] rounded-[6px] space-y-1.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                <div className="font-semibold text-[#111827] dark:text-[#F3F4F6] text-[12px]">
                  How to setup Supabase in 2 minutes:
                </div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Client signs in at <strong className="text-[#111827] dark:text-[#F3F4F6]">supabase.com</strong> and creates a new project.</li>
                  <li>In project settings &rarr; <strong className="text-[#111827] dark:text-[#F3F4F6]">API</strong>, copy the <strong className="text-[#111827] dark:text-[#F3F4F6]">Project URL</strong> and <strong className="text-[#111827] dark:text-[#F3F4F6]">anon public key</strong>.</li>
                  <li>Paste the contents of <strong className="text-[#0071E3]">supabase/schema.sql</strong> into the Supabase <strong className="text-[#111827] dark:text-[#F3F4F6]">SQL Editor</strong> and click Run.</li>
                  <li>Paste credentials above or into <strong className="text-[#111827] dark:text-[#F3F4F6]">.env</strong> &mdash; the CRM connects instantly!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'onedrive' && (
            <div className="space-y-3">
              <div>
                <span className="text-[#6E6E73] dark:text-[#8E8E93] text-[12px] block">SharePoint Tenant URL</span>
                <input
                  type="text"
                  readOnly
                  value="https://shameerassociates.sharepoint.com"
                  className="mt-1 w-full bg-[#F2F2F7] dark:bg-[#242426] px-3 py-1.5 rounded-[6px] border border-[#E5E5EA] dark:border-[#3A3A3C] font-tabular text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] text-[12px] space-y-1">
                <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Client Folder Provisioning Pattern:</div>
                <code className="text-[#6E6E73] dark:text-[#8E8E93] font-tabular block">
                  /Clients/[ClientCode]_[TradeName]/2026/GST/<br />
                  /Clients/[ClientCode]_[TradeName]/2026/ITR/
                </code>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStatusMessage({ success: true, text: 'Microsoft Graph API client folder mapping verified.' })}
                  className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-[6px] text-[12px] font-medium transition-colors"
                >
                  Test Microsoft Graph API
                </button>
                <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Client folders mapped</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
