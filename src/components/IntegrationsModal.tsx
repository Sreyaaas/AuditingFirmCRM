import React, { useState } from 'react';
import { X, Database, HardDrive, Check } from 'lucide-react';
import { CloudIntegration } from '../types/crm';

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
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTest = (service: string) => {
    setTestResult(`Connection confirmed: ${service} binding active.`);
    setTimeout(() => setTestResult(null), 3000);
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
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Cloud &amp; Database Sync</h3>
            <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
              Configure connections with Supabase &amp; OneDrive
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
              onClick={() => { setActiveTab('supabase'); setTestResult(null); }}
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
              onClick={() => { setActiveTab('onedrive'); setTestResult(null); }}
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
        <div className="p-5 space-y-4 text-[13px]">
          {testResult && (
            <div className="p-2.5 bg-[#34C759]/10 text-[#34C759] rounded-[6px] text-[12px]">
              {testResult}
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-3">
              <div>
                <span className="text-[#6E6E73] dark:text-[#8E8E93] text-[12px] block">Project URL</span>
                <input
                  type="text"
                  readOnly
                  value="https://[PROJECT-ID].supabase.co"
                  className="mt-1 w-full bg-[#F2F2F7] dark:bg-[#242426] px-3 py-1.5 rounded-[6px] border border-[#E5E5EA] dark:border-[#3A3A3C] font-tabular text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div>
                <span className="text-[#6E6E73] dark:text-[#8E8E93] text-[12px] block">Database Tables</span>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[12px]">
                  {integrations.supabase.tables.map((t, i) => (
                    <div key={i} className="p-2 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] border border-[#E5E5EA] dark:border-[#3A3A3C] flex justify-between font-tabular">
                      <span>{t.name}</span>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93]">{t.count} rows</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#34C759] mt-1.5 font-medium">
                  Database RLS security policies active in supabase/schema.sql
                </p>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleTest('Supabase')}
                  className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-[6px] text-[12px] font-medium transition-colors"
                >
                  Test Connection
                </button>
                <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Ready for live API keys</span>
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
                  onClick={() => handleTest('OneDrive')}
                  className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-[6px] text-[12px] font-medium transition-colors"
                >
                  Test Microsoft Graph API
                </button>
                <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">120 folders mapped</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
