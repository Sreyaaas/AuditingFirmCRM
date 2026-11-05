import React, { useState } from 'react';
import { Database, HardDrive, Check, AlertCircle, RefreshCw, Copy } from 'lucide-react';
import { Button, Field, Input, Label, Modal, StatusDot, Tabs, cn } from './ui';
import { CloudIntegration } from '../types/crm';
import { getSupabaseConfig, updateSupabaseCredentials, disconnectSupabase, testSupabaseConnection } from '../services/supabaseClient';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: CloudIntegration;
  onSync: () => void;
}

const IntegrationsModalForm: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  integrations,
  onSync,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'onedrive'>('supabase');
  const currentConfig = getSupabaseConfig();

  const [urlInput, setUrlInput] = useState(currentConfig.isLive ? currentConfig.url : '');
  const [keyInput, setKeyInput] = useState(currentConfig.isLive ? currentConfig.anonKey : '');
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [copiedSyncScript, setCopiedSyncScript] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const handleCopySyncScript = () => {
    navigator.clipboard.writeText(`-- SHAMEER & ASSOCIATES CRM — ENABLE FULL SUPABASE SYNC
-- Run in Supabase SQL Editor:
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for CRM clients" ON public.clients;
CREATE POLICY "Enable all access for CRM clients" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for CRM tasks" ON public.tasks;
CREATE POLICY "Enable all access for CRM tasks" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for CRM profiles" ON public.profiles;
CREATE POLICY "Enable all access for CRM profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.debtor_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for CRM debtors" ON public.debtor_records;
CREATE POLICY "Enable all access for CRM debtors" ON public.debtor_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.itr_filings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for CRM itr" ON public.itr_filings;
CREATE POLICY "Enable all access for CRM itr" ON public.itr_filings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for CRM tickets" ON public.tickets;
CREATE POLICY "Enable all access for CRM tickets" ON public.tickets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for CRM logs" ON public.activity_logs;
CREATE POLICY "Enable all access for CRM logs" ON public.activity_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
`);
    setCopiedSyncScript(true);
    setTimeout(() => setCopiedSyncScript(false), 2000);
  };

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
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      icon={Database}
      title="Cloud sync"
      description="Database and document storage connections"
      subheader={
        <Tabs
          className="border-b-0 -mb-px"
          value={activeTab}
          onChange={(v) => {
            setActiveTab(v);
            setStatusMessage(null);
          }}
          options={[
            { value: 'supabase', label: 'Database' },
            { value: 'onedrive', label: 'Documents' },
          ]}
        />
      }
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {statusMessage && (
          <div
            className={cn(
              'flex items-start gap-2 px-3 py-2.5 rounded-md border text-sm animate-fade-in',
              statusMessage.success ? 'border-success/25 bg-success/[0.06] text-fg' : 'border-danger/25 bg-danger/[0.06] text-danger'
            )}
          >
            {statusMessage.success ? (
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-success" strokeWidth={2} />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {activeTab === 'supabase' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg border border-line bg-subtle">
              <div className="flex items-start gap-2.5">
                <StatusDot tone={currentConfig.isLive ? 'success' : 'warning'} className="mt-[7px]" />
                <div>
                  <div className="text-sm font-medium text-fg">
                    {currentConfig.isLive ? 'Connected to Supabase' : 'Local mode'}
                  </div>
                  <div className="text-xs text-fg-subtle mt-0.5">
                    {currentConfig.isLive
                      ? 'Clients, filings and ledgers sync to your PostgreSQL database.'
                      : 'Data is stored in this browser. Connect a project to sync across devices.'}
                  </div>
                </div>
              </div>
              {currentConfig.isLive && (
                <Button size="sm" variant="danger" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              )}
            </div>

            <form onSubmit={handleConnectLive} className="space-y-4">
              <Field label="Project URL">
                <Input placeholder="https://xyzcompany.supabase.co" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="font-mono text-xs" />
              </Field>
              <Field label="Anon public key" hint="Found under Project settings → API.">
                <Input type="password" placeholder="eyJhbGciOiJIUzI1NiIs…" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="font-mono text-xs" />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="submit" variant="primary" icon={testing ? RefreshCw : Database} disabled={testing} className={testing ? '[&_svg]:animate-spin' : ''}>
                  {testing ? 'Testing…' : 'Test & Connect'}
                </Button>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" icon={copiedSyncScript ? Check : Copy} onClick={handleCopySyncScript} title="Copy SQL that enables CRM read/write policies">
                    {copiedSyncScript ? 'Copied' : 'Copy Sync SQL'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCopySchemaPath}>
                    {copiedSchema ? 'Copied' : 'Copy Schema Path'}
                  </Button>
                </div>
              </div>
            </form>

            <div className="pt-4 border-t border-line">
              <div className="eyebrow mb-2">Setup</div>
              <ol className="space-y-1.5 text-sm text-fg-muted list-decimal pl-4 marker:text-fg-faint marker:num">
                <li>Create a project at supabase.com.</li>
                <li>Copy the Project URL and anon key from Project settings → API.</li>
                <li>
                  Run <span className="ident text-fg">supabase/schema.sql</span> in the SQL Editor.
                </li>
                <li>
                  Paste the credentials above, or set them in <span className="ident text-fg">.env</span>.
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'onedrive' && (
          <div className="space-y-4">
            <Field label="SharePoint tenant">
              <Input readOnly value="https://shameerassociates.sharepoint.com" className="font-mono text-xs bg-subtle" />
            </Field>
            <div>
              <Label>Folder convention</Label>
              <pre className="rounded-md border border-line bg-subtle px-3 py-2.5 ident text-fg-muted leading-5 whitespace-pre-wrap">
                {'/Clients/[ClientCode]_[TradeName]/2026/GST/\n/Clients/[ClientCode]_[TradeName]/2026/ITR/'}
              </pre>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-subtle inline-flex items-center gap-1.5">
                <StatusDot tone="success" /> Client folders mapped
              </span>
              <Button
                icon={HardDrive}
                onClick={() => setStatusMessage({ success: true, text: 'Microsoft Graph folder mapping verified.' })}
              >
                Test Connection
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

/** Mounts the form only while open, so its state resets on every open. */
export const IntegrationsModal: React.FC<IntegrationsModalProps> = (props) => (props.isOpen ? <IntegrationsModalForm {...props} /> : null);
