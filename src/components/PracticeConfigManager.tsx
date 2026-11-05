import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Plus, X, Check, RefreshCw, AlertCircle, MessageSquare, Building2, Download, RotateCcw, Settings2, ShieldCheck } from 'lucide-react';
import {
  AppPreferences,
  DEFAULT_WHATSAPP_TEMPLATES,
  FirmProfileSettings,
  WhatsAppTemplateSettings,
  renderTemplate,
} from '../services/firmConfigService';
import { ActivityLog, Client, DebtorRecord, GSTComplianceItem, ITRFiling, MonthlyTask, OfficeBillingEntry, StaffTicket, UserProfile } from '../types/crm';
import { LIGHT_THEMES, DARK_THEMES } from '../types/themes';
import { Button, Card, CardHeader, Field, IconButton, Input, Label, Metric, MetricGrid, Segmented, Select, Textarea, cn } from './ui';
import { Toggle } from './EmployeeManagement';

type SaveResult = { error?: string };

interface PracticeConfigManagerProps {
  configs: Record<string, string[]>;
  onAddOption: (categoryKey: string, newOption: string) => Promise<boolean>;
  onRemoveOption: (categoryKey: string, optionToRemove: string) => Promise<boolean>;
  preferences: AppPreferences;
  onSavePreferences: (prefs: AppPreferences) => Promise<SaveResult>;
  firmProfile: FirmProfileSettings;
  onSaveFirmProfile: (profile: FirmProfileSettings) => Promise<SaveResult>;
  whatsappTemplates: WhatsAppTemplateSettings;
  onSaveWhatsAppTemplates: (templates: WhatsAppTemplateSettings) => Promise<SaveResult>;
  activeTheme?: string;
  onSelectTheme?: (theme: string) => void;
  palette?: string;
  onSelectPalette?: (palette: string) => void;
  clients?: Client[];
  monthlyTasks?: MonthlyTask[];
  itrFilings?: ITRFiling[];
  debtors?: DebtorRecord[];
  billings?: OfficeBillingEntry[];
  gstReturns?: GSTComplianceItem[];
  profiles?: UserProfile[];
  tickets?: StaffTicket[];
  activityLogs?: ActivityLog[];
}

type Section = 'general' | 'security' | 'lists' | 'templates' | 'firm' | 'backup';

const Saved: React.FC<{ children: React.ReactNode; error?: boolean }> = ({ children, error }) => (
  <span className={cn('inline-flex items-center gap-1.5 text-xs animate-fade-in', error ? 'text-danger' : 'text-fg-muted')}>
    {error ? <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} /> : <Check className="w-3.5 h-3.5 text-success" strokeWidth={2} />}
    {children}
  </span>
);

/** A labelled settings row: description on the left, control on the right. */
const Row: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4">
    <div className="min-w-0 max-w-xl">
      <div className="text-sm font-medium text-fg">{title}</div>
      {description && <div className="text-xs text-fg-subtle mt-0.5">{description}</div>}
    </div>
    <div className="shrink-0 sm:min-w-[14rem] flex sm:justify-end">{children}</div>
  </div>
);

const useFeedback = () => {
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const timer = useRef<number>();
  const show = (text: string, error = false) => {
    setMsg({ text, error });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3500);
  };
  return [msg, show] as const;
};

export const PracticeConfigManager: React.FC<PracticeConfigManagerProps> = ({
  configs,
  onAddOption,
  onRemoveOption,
  preferences,
  onSavePreferences,
  firmProfile,
  onSaveFirmProfile,
  whatsappTemplates,
  onSaveWhatsAppTemplates,
  activeTheme = 'navy-light',
  onSelectTheme,
  palette,
  onSelectPalette,
  clients = [],
  monthlyTasks = [],
  itrFilings = [],
  debtors = [],
  billings = [],
  gstReturns = [],
  profiles = [],
  tickets = [],
  activityLogs = [],
}) => {
  const [section, setSection] = useState<Section>('general');

  // -------------------------------------------------- preferences
  const [prefs, setPrefs] = useState<AppPreferences>(preferences);
  useEffect(() => setPrefs(preferences), [preferences]);
  const [prefsMsg, showPrefsMsg] = useFeedback();
  const prefsDirty = JSON.stringify(prefs) !== JSON.stringify(preferences);
  const savePrefs = async () => {
    const res = await onSavePreferences(prefs);
    showPrefsMsg(res.error ? `Not saved: ${res.error}` : 'Saved', !!res.error);
  };
  const numberField = (key: 'dueSoonDays' | 'itrDueSoonDays', min: number, max: number, suffix?: string) => (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={min}
        max={max}
        value={String(prefs[key])}
        onChange={(e) => setPrefs({ ...prefs, [key]: Math.max(min, Math.min(max, Number(e.target.value) || 0)) })}
        className="num w-24 text-right"
      />
      {suffix && <span className="text-sm text-fg-subtle whitespace-nowrap">{suffix}</span>}
    </div>
  );
  const prefsFooter = (
    <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-line">
      {prefsMsg && <Saved error={prefsMsg.error}>{prefsMsg.text}</Saved>}
      <Button variant="ghost" disabled={!prefsDirty} onClick={() => setPrefs(preferences)}>
        Discard
      </Button>
      <Button variant="primary" disabled={!prefsDirty} onClick={savePrefs}>
        Save Changes
      </Button>
    </div>
  );

  // -------------------------------------------------- lists
  const [activeCategory, setActiveCategory] = useState<string>('filing_types');
  const [newOptionInput, setNewOptionInput] = useState('');
  const [savingList, setSavingList] = useState(false);
  const [listMsg, showListMsg] = useFeedback();
  const categories = [
    { key: 'filing_types', label: 'Filing types', description: 'Monthly work — GSTR-1, GSTR-3B, TDS, PF & ESI, audit.' },
    { key: 'return_types', label: 'GST returns', description: 'Return codes tracked on the Deadlines page.' },
    { key: 'entity_types', label: 'Entity types', description: 'Client constitution — Private Limited, LLP, Partnership, Proprietorship, Individual.' },
    { key: 'service_types', label: 'Services', description: 'Services offered when billing a client.' },
  ];
  const currentOptions = configs[activeCategory] || [];
  const currentCategory = categories.find((c) => c.key === activeCategory) || categories[0];

  const addOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = newOptionInput.trim();
    if (!value) return;
    setSavingList(true);
    const ok = await onAddOption(activeCategory, value);
    setSavingList(false);
    if (ok) {
      setNewOptionInput('');
      showListMsg(`Added “${value}”`);
    } else showListMsg('Already in the list, or could not be saved', true);
  };

  // -------------------------------------------------- templates
  const [templates, setTemplates] = useState<WhatsAppTemplateSettings>(whatsappTemplates);
  useEffect(() => setTemplates(whatsappTemplates), [whatsappTemplates]);
  const [activeTemplateKey, setActiveTemplateKey] = useState<keyof WhatsAppTemplateSettings>('docRequest');
  const [tplMsg, showTplMsg] = useFeedback();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templateDefinitions: { key: keyof WhatsAppTemplateSettings; label: string; description: string }[] = [
    { key: 'docRequest', label: 'Document request', description: 'Monthly reminder for sales, purchase and bank statements.' },
    { key: 'paymentReminder', label: 'Fee reminder', description: 'Outstanding fee notice with bank and UPI details.' },
    { key: 'filingAck', label: 'Filing confirmation', description: 'Sent after a return is filed, with the ARN.' },
  ];
  const placeholderChips = ['clientName', 'period', 'dueDate', 'amount', 'upiId', 'arn', 'bankName', 'accountNumber', 'ifscCode'].map((v) => `{{${v}}}`);
  const insertPlaceholder = (placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    const text = templates[activeTemplateKey];
    setTemplates({ ...templates, [activeTemplateKey]: text.slice(0, start) + placeholder + text.slice(end) });
    window.setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 30);
  };
  const saveTemplates = async (next = templates) => {
    const res = await onSaveWhatsAppTemplates(next);
    showTplMsg(res.error ? `Not saved: ${res.error}` : 'Saved', !!res.error);
  };
  const sampleRender = renderTemplate(templates[activeTemplateKey], {
    clientName: 'KM Traders',
    period: 'October 2026',
    dueDate: '11 Nov 2026',
    amount: '5,760',
    upiId: firmProfile.upiId || '—',
    arn: 'AA321126048123Z',
    bankName: firmProfile.bankName || '—',
    accountNumber: firmProfile.accountNumber || '—',
    ifscCode: firmProfile.ifscCode || '—',
  });

  // -------------------------------------------------- firm profile
  const [profile, setProfile] = useState<FirmProfileSettings>(firmProfile);
  useEffect(() => setProfile(firmProfile), [firmProfile]);
  const [firmMsg, showFirmMsg] = useFeedback();
  const saveFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onSaveFirmProfile(profile);
    showFirmMsg(res.error ? `Not saved: ${res.error}` : 'Saved', !!res.error);
  };
  const firmField = (key: keyof FirmProfileSettings, label: string, opts: { mono?: boolean; type?: string; className?: string } = {}) => (
    <Field label={label} className={opts.className}>
      <Input
        type={opts.type || 'text'}
        value={profile[key] ?? ''}
        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
        className={opts.mono ? 'font-mono' : undefined}
      />
    </Field>
  );
  const bankingIncomplete = !profile.accountNumber || !profile.ifscCode || !profile.upiId;

  // -------------------------------------------------- backup
  const [backupMsg, showBackupMsg] = useFeedback();
  const downloadBackup = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const data = {
      exportedAt: new Date().toISOString(),
      firm: profile.legalName,
      settings: { preferences, firmProfile, whatsappTemplates, lists: configs },
      clients,
      monthlyTasks,
      itrFilings,
      gstReturns,
      debtors,
      billings,
      team: profiles.map(({ id, name, email, role, designation, phone, status, canAccessFinancials, canEditPayments }) => ({
        id,
        name,
        email,
        role,
        designation,
        phone,
        status,
        canAccessFinancials,
        canEditPayments,
      })),
      calls: tickets,
      auditTrail: activityLogs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shameer-associates-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showBackupMsg(`Downloaded (${(blob.size / 1024).toFixed(0)} KB)`);
  };

  const sections: { key: Section; label: string; icon: typeof Settings2 }[] = [
    { key: 'general', label: 'Preferences', icon: Settings2 },
    { key: 'security', label: 'Access & security', icon: ShieldCheck },
    { key: 'firm', label: 'Firm & banking', icon: Building2 },
    { key: 'templates', label: 'Message templates', icon: MessageSquare },
    { key: 'lists', label: 'Lists', icon: SlidersHorizontal },
    { key: 'backup', label: 'Backup', icon: Download },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-6 items-start">
      <nav className="flex lg:flex-col gap-px overflow-x-auto scrollbar-none lg:sticky lg:top-0">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
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
      </nav>

      <div className="min-w-0">
        {section === 'general' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Appearance & Theme"
                description="Select from 5 light enterprise palettes or 5 rich dark palettes."
              />
              <div className="p-4 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Light Themes (5) */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-3 flex items-center gap-1.5">
                      <span>Light Themes</span>
                      <span className="text-fg-faint">· 5 styles</span>
                    </div>
                    <div className="space-y-2">
                      {LIGHT_THEMES.map((t) => {
                        const isSelected = activeTheme === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => (onSelectTheme || onSelectPalette)?.(t.id)}
                            className={cn(
                              'w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-3',
                              isSelected
                                ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                : 'border-line bg-surface hover:border-line-strong hover:bg-hover'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-7 h-7 rounded-md border border-black/10 flex items-center justify-center shrink-0 shadow-xs"
                                style={{ backgroundColor: t.canvas }}
                                title={`Canvas: ${t.canvas}`}
                              >
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: t.accent }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-fg truncate">{t.name}</div>
                                <div className="text-xs text-fg-subtle truncate mt-0.5">{t.description}</div>
                              </div>
                            </div>

                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-accent uppercase tracking-wider shrink-0 bg-accent/10 px-2 py-0.5 rounded-[4px]">
                                <Check className="w-3 h-3" strokeWidth={2.5} />
                                Active
                              </span>
                            ) : (
                              <span className="text-xs text-fg-faint hover:text-fg-muted shrink-0">Select</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dark Themes (5) */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-3 flex items-center gap-1.5">
                      <span>Dark Themes</span>
                      <span className="text-fg-faint">· 5 styles</span>
                    </div>
                    <div className="space-y-2">
                      {DARK_THEMES.map((t) => {
                        const isSelected = activeTheme === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => (onSelectTheme || onSelectPalette)?.(t.id)}
                            className={cn(
                              'w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-3',
                              isSelected
                                ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                : 'border-line bg-surface hover:border-line-strong hover:bg-hover'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center shrink-0 shadow-xs"
                                style={{ backgroundColor: t.canvas }}
                                title={`Canvas: ${t.canvas}`}
                              >
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: t.accent }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-fg truncate">{t.name}</div>
                                <div className="text-xs text-fg-subtle truncate mt-0.5">{t.description}</div>
                              </div>
                            </div>

                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-accent uppercase tracking-wider shrink-0 bg-accent/10 px-2 py-0.5 rounded-[4px]">
                                <Check className="w-3 h-3" strokeWidth={2.5} />
                                Active
                              </span>
                            ) : (
                              <span className="text-xs text-fg-faint hover:text-fg-muted shrink-0">Select</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="General" description="Applies to everyone" />
              <div className="divide-y divide-line">
                <Row title="Financial year" description="Shown on the Overview and used as the default assessment year for new ITR returns.">
                  <Input value={prefs.financialYear} onChange={(e) => setPrefs({ ...prefs, financialYear: e.target.value })} placeholder="2026-27" className="num w-28" />
                </Row>
                <Row title="GST & TDS due-soon window" description="Unfiled monthly tasks and GST returns due within this many days are highlighted.">
                  {numberField('dueSoonDays', 1, 30, 'days')}
                </Row>
                <Row title="ITR due-soon window" description="Income tax returns due within this many days are highlighted.">
                  {numberField('itrDueSoonDays', 1, 60, 'days')}
                </Row>
                <Row title="WhatsApp country code" description="Added to 10-digit mobile numbers when opening WhatsApp.">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-fg-subtle">+</span>
                    <Input
                      value={prefs.whatsappCountryCode}
                      onChange={(e) => setPrefs({ ...prefs, whatsappCountryCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="num w-20"
                    />
                  </div>
                </Row>
                <Row title="Invoice numbering" description={`Next invoice: ${prefs.invoicePrefix}${String(prefs.nextInvoiceNumber).padStart(4, '0')}`}>
                  <div className="flex items-center gap-2">
                    <Input value={prefs.invoicePrefix} onChange={(e) => setPrefs({ ...prefs, invoicePrefix: e.target.value })} placeholder="SA/" className="font-mono w-24" aria-label="Invoice prefix" />
                    <Input
                      type="number"
                      min={1}
                      value={prefs.nextInvoiceNumber}
                      onChange={(e) => setPrefs({ ...prefs, nextInvoiceNumber: Math.max(1, Number(e.target.value) || 1) })}
                      className="num w-24 text-right"
                      aria-label="Next invoice number"
                    />
                  </div>
                </Row>
              </div>
              {prefsFooter}
            </Card>
          </div>
        )}

        {section === 'security' && (
          <Card>
            <CardHeader title="Access & security" description="Sign-in and default permissions" />
            <div className="divide-y divide-line">
              <Row title="Sign out after inactivity" description="Signs a user out when the app has not been used for this long. Recommended on shared office computers.">
                <Select value={String(prefs.idleTimeoutMinutes)} onChange={(e) => setPrefs({ ...prefs, idleTimeoutMinutes: Number(e.target.value) })} className="w-40">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="240">4 hours</option>
                  <option value="0">Never</option>
                </Select>
              </Row>
              <Row title="New staff can view fees" description="Default for the Debtors page when adding a staff member. Can be changed per person on the Team page.">
                <Toggle
                  label="New staff can view fees"
                  checked={prefs.newStaffCanViewFees}
                  onChange={(v) => setPrefs({ ...prefs, newStaffCanViewFees: v, newStaffCanRecordPayments: v ? prefs.newStaffCanRecordPayments : false })}
                />
              </Row>
              <Row title="New staff can record payments" description="Default for recording receipts and bills.">
                <Toggle
                  label="New staff can record payments"
                  checked={prefs.newStaffCanRecordPayments}
                  disabled={!prefs.newStaffCanViewFees}
                  onChange={(v) => setPrefs({ ...prefs, newStaffCanRecordPayments: v })}
                />
              </Row>
              <div className="px-4 py-4 text-xs text-fg-subtle leading-5">
                Passwords are stored by Supabase Auth as one-way bcrypt hashes and are never visible to anyone, including administrators. Logins are created and passwords set from the Team page.
              </div>
            </div>
            {prefsFooter}
          </Card>
        )}

        {section === 'lists' && (
          <Card>
            <CardHeader title="Lists" description="Options offered in dropdowns" />
            <div className="p-4 space-y-4">
              <Segmented
                size="sm"
                value={activeCategory}
                onChange={(v) => setActiveCategory(v)}
                options={categories.map((c) => ({ value: c.key, label: c.label, count: (configs[c.key] || []).length }))}
              />
              <p className="text-sm text-fg-subtle">{currentCategory.description}</p>
              <div className="border border-line rounded-lg divide-y divide-line">
                {currentOptions.map((opt) => (
                  <div key={opt} className="group flex items-center justify-between h-10 px-3 text-sm">
                    <span className="text-fg">{opt}</span>
                    <IconButton
                      icon={X}
                      label={`Remove ${opt}`}
                      size="sm"
                      onClick={async () => {
                        setSavingList(true);
                        await onRemoveOption(activeCategory, opt);
                        setSavingList(false);
                      }}
                      disabled={savingList || currentOptions.length <= 1}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger"
                    />
                  </div>
                ))}
              </div>
              <form onSubmit={addOption} className="flex items-center gap-2">
                <Input value={newOptionInput} onChange={(e) => setNewOptionInput(e.target.value)} placeholder={`New ${currentCategory.label.toLowerCase()} option`} />
                <Button type="submit" variant="primary" icon={savingList ? RefreshCw : Plus} disabled={savingList || !newOptionInput.trim()}>
                  Add
                </Button>
              </form>
              {listMsg && <Saved error={listMsg.error}>{listMsg.text}</Saved>}
            </div>
          </Card>
        )}

        {section === 'templates' && (
          <Card>
            <CardHeader title="Message templates" description="WhatsApp text sent to clients" />
            <div className="p-4 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {templateDefinitions.map((t) => {
                  const selected = activeTemplateKey === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTemplateKey(t.key)}
                      className={cn('p-3 rounded-lg border text-left transition-colors', selected ? 'border-fg/70 ring-1 ring-fg/70' : 'border-line hover:border-line-strong')}
                    >
                      <div className="text-sm font-medium text-fg">{t.label}</div>
                      <div className="text-xs text-fg-subtle mt-1 leading-4">{t.description}</div>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <Label className="mb-0">Message</Label>
                  <Textarea
                    ref={textareaRef}
                    rows={10}
                    value={templates[activeTemplateKey]}
                    onChange={(e) => setTemplates({ ...templates, [activeTemplateKey]: e.target.value })}
                    className="font-mono text-xs leading-5"
                  />
                  <div className="flex flex-wrap gap-1">
                    {placeholderChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => insertPlaceholder(chip)}
                        className="h-6 px-1.5 rounded-sm border border-line font-mono text-2xs text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="mb-0">Preview</Label>
                    <span className="text-xs text-fg-subtle">Sample client</span>
                  </div>
                  <div className="rounded-lg border border-line bg-subtle p-4 min-h-[200px] whitespace-pre-wrap text-sm text-fg leading-6">{sampleRender}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
              <Button
                variant="ghost"
                icon={RotateCcw}
                onClick={() => {
                  setTemplates(DEFAULT_WHATSAPP_TEMPLATES);
                  saveTemplates(DEFAULT_WHATSAPP_TEMPLATES);
                }}
              >
                Restore Defaults
              </Button>
              <div className="flex items-center gap-3">
                {tplMsg && <Saved error={tplMsg.error}>{tplMsg.text}</Saved>}
                <Button variant="primary" onClick={() => saveTemplates()}>
                  Save Templates
                </Button>
              </div>
            </div>
          </Card>
        )}

        {section === 'firm' && (
          <form onSubmit={saveFirm} className="space-y-6">
            <Card>
              <CardHeader title="Firm details" description="Used on notices and exports" />
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {firmField('legalName', 'Firm name')}
                {firmField('category', 'Description')}
                {firmField('address', 'Office address', { className: 'sm:col-span-2' })}
                {firmField('gstin', 'GSTIN', { mono: true })}
                {firmField('pan', 'PAN', { mono: true })}
                {firmField('phone', 'Phone / WhatsApp', { mono: true })}
                {firmField('email', 'Email', { type: 'email' })}
              </div>
            </Card>
            <Card>
              <CardHeader title="Bank & UPI" description="Included in fee reminders" />
              {bankingIncomplete && (
                <div className="mx-4 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-md border border-warning/30 text-sm text-fg-muted">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-warning" strokeWidth={1.75} />
                  Fee reminders include the bank account and UPI ID below. Fill them in before sending reminders.
                </div>
              )}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {firmField('beneficiaryName', 'Account name')}
                {firmField('bankName', 'Bank')}
                {firmField('branch', 'Branch')}
                {firmField('accountNumber', 'Account number', { mono: true })}
                {firmField('ifscCode', 'IFSC', { mono: true })}
                {firmField('upiId', 'UPI ID', { mono: true })}
              </div>
              <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-line">
                {firmMsg && <Saved error={firmMsg.error}>{firmMsg.text}</Saved>}
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </Card>
          </form>
        )}

        {section === 'backup' && (
          <Card>
            <CardHeader title="Backup" description="Download everything as one JSON file" />
            <div className="p-4 space-y-4">
              <p className="text-sm text-fg-muted max-w-2xl">
                Includes clients, filings, GST returns, debtors, the billing register, calls, the audit trail and all settings. Passwords are never included.
              </p>
              <MetricGrid className="grid-cols-2 sm:grid-cols-4 shadow-none">
                <Metric label="Clients" value={clients.length} className="py-3" />
                <Metric label="Monthly tasks" value={monthlyTasks.length} className="py-3" />
                <Metric label="Debtor accounts" value={debtors.length} className="py-3" />
                <Metric label="Billing entries" value={billings.length} className="py-3" />
              </MetricGrid>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
              <span className="text-xs text-fg-subtle">Contains client tax IDs and fee balances. Store it securely.</span>
              <div className="flex items-center gap-3">
                {backupMsg && <Saved>{backupMsg.text}</Saved>}
                <Button variant="primary" icon={Download} onClick={downloadBackup}>
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
