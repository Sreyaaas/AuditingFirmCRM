import React, { useState, useRef } from 'react';
import { SlidersHorizontal, Plus, X, Check, RefreshCw, AlertCircle, MessageSquare, Building2, Download, RotateCcw } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { 
  WhatsAppTemplateSettings, 
  FirmProfileSettings, 
  getStoredWhatsAppTemplates, 
  saveStoredWhatsAppTemplates, 
  getStoredFirmProfile, 
  saveStoredFirmProfile, 
  renderTemplate, 
  DEFAULT_WHATSAPP_TEMPLATES, 
  DEFAULT_FIRM_PROFILE 
} from '../services/firmConfigService';
import { Client, MonthlyTask, ITRFiling, DebtorRecord, UserProfile, StaffTicket, ActivityLog } from '../types/crm';
import { Button, Card, CardHeader, Field, IconButton, Input, Label, Metric, MetricGrid, Segmented, StatusDot, Textarea, cn } from './ui';

interface PracticeConfigManagerProps {
  configs: Record<string, string[]>;
  onAddOption: (categoryKey: string, newOption: string) => Promise<boolean>;
  onRemoveOption: (categoryKey: string, optionToRemove: string) => Promise<boolean>;
  clients?: Client[];
  monthlyTasks?: MonthlyTask[];
  itrFilings?: ITRFiling[];
  debtors?: DebtorRecord[];
  profiles?: UserProfile[];
  tickets?: StaffTicket[];
  activityLogs?: ActivityLog[];
  whatsappTemplates?: WhatsAppTemplateSettings;
  onSaveWhatsAppTemplates?: (templates: WhatsAppTemplateSettings) => void;
  firmProfile?: FirmProfileSettings;
  onSaveFirmProfile?: (profile: FirmProfileSettings) => void;
}

export const PracticeConfigManager: React.FC<PracticeConfigManagerProps> = ({
  configs,
  onAddOption,
  onRemoveOption,
  clients = [],
  monthlyTasks = [],
  itrFilings = [],
  debtors = [],
  profiles = [],
  tickets = [],
  activityLogs = [],
  whatsappTemplates: initialTemplates,
  onSaveWhatsAppTemplates,
  firmProfile: initialFirmProfile,
  onSaveFirmProfile,
}) => {
  // Main module tab
  const [activeTab, setActiveTab] = useState<'dropdowns' | 'whatsapp' | 'profile' | 'backup'>('dropdowns');

  // --- TAB 1: DROPDOWNS STATE ---
  const [activeCategory, setActiveCategory] = useState<string>('filing_types');
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [savingDropdown, setSavingDropdown] = useState(false);
  const [dropdownFeedback, setDropdownFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const categories = [
    { key: 'filing_types', label: 'Filing types', description: 'Monthly compliance work — GSTR-1, GSTR-3B, TDS, PF & ESI, audit.' },
    { key: 'return_types', label: 'GST returns', description: 'Return codes tracked on the GST portal — GSTR-1, GSTR-3B, CMP-08, GSTR-9.' },
    { key: 'entity_types', label: 'Entity types', description: 'Client constitution — Private Limited, LLP, Partnership, Proprietorship, Individual.' },
    { key: 'service_types', label: 'Services', description: 'Professional services available for fee billing.' },
  ];

  const currentOptions = configs[activeCategory] || [];
  const currentCategoryMeta = categories.find((c) => c.key === activeCategory) || categories[0];

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionInput.trim()) return;

    setSavingDropdown(true);
    setDropdownFeedback(null);
    const success = await onAddOption(activeCategory, newOptionInput.trim());
    setSavingDropdown(false);

    if (success) {
      setNewOptionInput('');
      setDropdownFeedback({ type: 'success', message: `Added "${newOptionInput.trim()}" to ${currentCategoryMeta.label}` });
      setTimeout(() => setDropdownFeedback(null), 3000);
    } else {
      setDropdownFeedback({ type: 'error', message: 'Option already exists or could not be saved' });
    }
  };

  const handleRemoveOption = async (option: string) => {
    setSavingDropdown(true);
    setDropdownFeedback(null);
    const success = await onRemoveOption(activeCategory, option);
    setSavingDropdown(false);

    if (success) {
      setDropdownFeedback({ type: 'success', message: `Removed "${option}" from ${currentCategoryMeta.label}` });
      setTimeout(() => setDropdownFeedback(null), 3000);
    }
  };

  // --- TAB 2: WHATSAPP TEMPLATES STATE ---
  const [templates, setTemplates] = useState<WhatsAppTemplateSettings>(() => initialTemplates || getStoredWhatsAppTemplates());
  const [activeTemplateKey, setActiveTemplateKey] = useState<keyof WhatsAppTemplateSettings>('docRequest');
  const [templateFeedback, setTemplateFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const templateDefinitions: { key: keyof WhatsAppTemplateSettings; label: string; description: string }[] = [
    { key: 'docRequest', label: 'Document request', description: 'Monthly reminder for sales, purchase and bank statements.' },
    { key: 'paymentReminder', label: 'Fee reminder', description: 'Outstanding fee notice with bank and UPI details.' },
    { key: 'filingAck', label: 'Filing confirmation', description: 'Confirmation with the portal ARN or acknowledgement.' },
  ];

  const placeholderChips = [
    { label: 'Client Name', value: '{{clientName}}' },
    { label: 'Period / Month', value: '{{period}}' },
    { label: 'Due Date', value: '{{dueDate}}' },
    { label: 'Amount (₹)', value: '{{amount}}' },
    { label: 'Practice UPI', value: '{{upiId}}' },
    { label: 'Portal ARN', value: '{{arn}}' },
    { label: 'Bank Name', value: '{{bankName}}' },
    { label: 'A/C Number', value: '{{accountNumber}}' },
    { label: 'IFSC Code', value: '{{ifscCode}}' },
  ];

  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = templates[activeTemplateKey];
    const newText = currentText.substring(0, start) + placeholder + currentText.substring(end);

    const updated = { ...templates, [activeTemplateKey]: newText };
    setTemplates(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 50);
  };

  const handleSaveTemplates = () => {
    saveStoredWhatsAppTemplates(templates);
    if (onSaveWhatsAppTemplates) {
      onSaveWhatsAppTemplates(templates);
    }
    setTemplateFeedback('Templates saved successfully');
    setTimeout(() => setTemplateFeedback(null), 3000);
  };

  const handleResetTemplates = () => {
    setTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    saveStoredWhatsAppTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    if (onSaveWhatsAppTemplates) {
      onSaveWhatsAppTemplates(DEFAULT_WHATSAPP_TEMPLATES);
    }
    setTemplateFeedback('Templates reset to firm defaults');
    setTimeout(() => setTemplateFeedback(null), 3000);
  };

  // --- TAB 3: FIRM PROFILE & BANK STATE ---
  const [profile, setProfile] = useState<FirmProfileSettings>(() => initialFirmProfile || getStoredFirmProfile());
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredFirmProfile(profile);
    if (onSaveFirmProfile) {
      onSaveFirmProfile(profile);
    }
    setProfileFeedback('Firm profile & payment parameters updated');
    setTimeout(() => setProfileFeedback(null), 3000);
  };

  // --- TAB 4: PRACTICE DATA BACKUP ---
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  const handleDownloadBackup = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const backupData = {
      exportTimestamp: new Date().toISOString(),
      firm: profile.legalName,
      software: 'Shameer & Associates Practice Management CRM',
      version: '1.0.0',
      summary: {
        totalClients: clients.length,
        monthlyTasks: monthlyTasks.length,
        itrFilings: itrFilings.length,
        debtors: debtors.length,
        staffProfiles: profiles.length,
        callTickets: tickets.length,
        activityLogs: activityLogs.length,
      },
      practiceConfigs: configs,
      whatsappTemplates: templates,
      firmProfile: profile,
      clients,
      monthlyTasks,
      itrFilings,
      debtors,
      profiles,
      tickets,
      activityLogs,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `shameer_associates_crm_backup_${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setBackupNotice(`Complete backup exported (${(JSON.stringify(backupData).length / 1024).toFixed(1)} KB)`);
    setTimeout(() => setBackupNotice(null), 4000);
  };

  // Sample preview for active template
  const sampleRender = renderTemplate(templates[activeTemplateKey], {
    clientName: 'KM Traders',
    period: 'October 2026',
    dueDate: '11 Nov 2026',
    amount: '5,760',
    upiId: profile.upiId,
    arn: 'AA321126048123Z',
    bankName: profile.bankName,
    accountNumber: profile.accountNumber,
    ifscCode: profile.ifscCode,
  });

  const sections = [
    { key: 'dropdowns' as const, label: 'Lists', icon: SlidersHorizontal },
    { key: 'whatsapp' as const, label: 'Message templates', icon: MessageSquare },
    { key: 'profile' as const, label: 'Firm & banking', icon: Building2 },
    { key: 'backup' as const, label: 'Backup', icon: Download },
  ];

  const Saved: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted animate-fade-in">
      <Check className="w-3.5 h-3.5 text-success" strokeWidth={2} />
      {children}
    </span>
  );

  const profileField = (key: keyof FirmProfileSettings, label: string, opts: { mono?: boolean; type?: string; className?: string } = {}) => (
    <Field label={label} className={opts.className}>
      <Input
        type={opts.type || 'text'}
        value={String(profile[key] ?? '')}
        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
        className={opts.mono ? 'font-mono' : undefined}
      />
    </Field>
  );

  const backupStats = [
    { label: 'Clients', value: clients.length },
    { label: 'Monthly filings', value: monthlyTasks.length },
    { label: 'ITR returns', value: itrFilings.length },
    { label: 'Debtor accounts', value: debtors.length },
    { label: 'Call tickets', value: tickets.length },
    { label: 'Audit events', value: activityLogs.length },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-6 items-start">
      {/* Section nav */}
      <nav className="flex lg:flex-col gap-px overflow-x-auto scrollbar-none lg:sticky lg:top-0">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeTab === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className={cn(
                'h-8 px-2.5 rounded-md flex items-center gap-2.5 text-sm whitespace-nowrap transition-colors',
                active ? 'bg-surface text-fg font-medium shadow-xs ring-1 ring-line' : 'text-fg-muted hover:text-fg hover:bg-hover'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-fg' : 'text-fg-subtle')} strokeWidth={1.75} />
              {s.label}
            </button>
          );
        })}
        <div className="hidden lg:flex items-center gap-2 px-2.5 pt-4 mt-3 border-t border-line text-xs text-fg-subtle">
          <StatusDot tone="success" />
          {isSupabaseConfigured() ? 'Cloud sync live' : 'Local storage mode'}
        </div>
      </nav>

      <div className="min-w-0">
        {/* Lists */}
        {activeTab === 'dropdowns' && (
          <Card>
            <CardHeader title="Lists" description="Options offered in dropdowns across the CRM" />
            <div className="p-4 space-y-4">
              <Segmented
                size="sm"
                value={activeCategory}
                onChange={(v) => {
                  setActiveCategory(v);
                  setDropdownFeedback(null);
                }}
                options={categories.map((c) => ({ value: c.key, label: c.label, count: (configs[c.key] || []).length }))}
              />
              <p className="text-sm text-fg-subtle">{currentCategoryMeta.description}</p>

              <div className="border border-line rounded-lg divide-y divide-line">
                {currentOptions.map((opt) => (
                  <div key={opt} className="group flex items-center justify-between h-10 px-3 text-sm">
                    <span className="text-fg">{opt}</span>
                    <IconButton
                      icon={X}
                      label={`Remove ${opt}`}
                      size="sm"
                      onClick={() => handleRemoveOption(opt)}
                      disabled={savingDropdown || currentOptions.length <= 1}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger"
                    />
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddOption} className="flex items-center gap-2">
                <Input
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                  placeholder={`New ${currentCategoryMeta.label.toLowerCase()} option`}
                />
                <Button type="submit" variant="primary" icon={savingDropdown ? RefreshCw : Plus} disabled={savingDropdown || !newOptionInput.trim()}>
                  Add
                </Button>
              </form>

              {dropdownFeedback && (
                <div className={cn('flex items-center gap-2 text-xs animate-fade-in', dropdownFeedback.type === 'success' ? 'text-fg-muted' : 'text-danger')}>
                  {dropdownFeedback.type === 'success' ? (
                    <Check className="w-3.5 h-3.5 text-success" strokeWidth={2} />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />
                  )}
                  {dropdownFeedback.message}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Templates */}
        {activeTab === 'whatsapp' && (
          <Card>
            <CardHeader title="Message templates" description="WhatsApp copy sent to clients" />
            <div className="p-4 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {templateDefinitions.map((t) => {
                  const selected = activeTemplateKey === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTemplateKey(t.key)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        selected ? 'border-fg/70 bg-surface ring-1 ring-fg/70' : 'border-line hover:border-line-strong'
                      )}
                    >
                      <div className="text-sm font-medium text-fg">{t.label}</div>
                      <div className="text-xs text-fg-subtle mt-1 leading-4">{t.description}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <Label className="mb-0">Message body</Label>
                  <Textarea
                    ref={textareaRef}
                    rows={10}
                    value={templates[activeTemplateKey]}
                    onChange={(e) => setTemplates({ ...templates, [activeTemplateKey]: e.target.value })}
                    className="font-mono text-xs leading-5"
                  />
                  <div>
                    <div className="eyebrow mb-1.5">Insert variable</div>
                    <div className="flex flex-wrap gap-1">
                      {placeholderChips.map((chip) => (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => handleInsertPlaceholder(chip.value)}
                          className="h-6 px-1.5 rounded-sm border border-line bg-subtle font-mono text-2xs text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
                          title={chip.label}
                        >
                          {chip.value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="mb-0">Preview</Label>
                    <span className="text-xs text-fg-subtle">Sample client · KM Traders</span>
                  </div>
                  <div className="rounded-lg border border-line bg-subtle p-4 min-h-[200px]">
                    <div className="whitespace-pre-wrap text-sm text-fg leading-6">{sampleRender}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
              <Button variant="ghost" icon={RotateCcw} onClick={handleResetTemplates}>
                Restore Defaults
              </Button>
              <div className="flex items-center gap-3">
                {templateFeedback && <Saved>{templateFeedback}</Saved>}
                <Button variant="primary" onClick={handleSaveTemplates}>
                  Save Templates
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Firm profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <Card>
              <CardHeader title="Firm identity" description="Shown on notices and exports" />
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profileField('legalName', 'Legal name')}
                {profileField('category', 'Category & registration')}
                {profileField('address', 'Office address', { className: 'sm:col-span-2' })}
                {profileField('gstin', 'GSTIN', { mono: true })}
                {profileField('pan', 'PAN', { mono: true })}
                {profileField('phone', 'Phone / WhatsApp', { mono: true })}
                {profileField('email', 'Email', { type: 'email' })}
              </div>
            </Card>

            <Card>
              <CardHeader title="Banking" description="Included in fee reminders" />
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {profileField('beneficiaryName', 'Account name')}
                {profileField('bankName', 'Bank')}
                {profileField('branch', 'Branch')}
                {profileField('accountNumber', 'Account number', { mono: true })}
                {profileField('ifscCode', 'IFSC', { mono: true })}
                {profileField('upiId', 'UPI ID', { mono: true })}
              </div>
              <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-line">
                {profileFeedback && <Saved>{profileFeedback}</Saved>}
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </Card>
          </form>
        )}

        {/* Backup */}
        {activeTab === 'backup' && (
          <Card>
            <CardHeader title="Backup" description="Full JSON export of practice data" />
            <div className="p-4 space-y-4">
              <p className="text-sm text-fg-muted max-w-2xl">
                Exports every client record, filing history, debtor ledger, call ticket and audit event, together with lists, templates and firm settings.
              </p>
              <MetricGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 shadow-none">
                {backupStats.map((s) => (
                  <Metric key={s.label} label={s.label} value={s.value} className="py-3" />
                ))}
              </MetricGrid>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
              <span className="text-xs text-fg-subtle">Contains client identifiers and bank details — store securely.</span>
              <div className="flex items-center gap-3">
                {backupNotice && <Saved>{backupNotice}</Saved>}
                <Button variant="primary" icon={Download} onClick={handleDownloadBackup}>
                  Download Backup
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
