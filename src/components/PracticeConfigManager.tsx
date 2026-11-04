import React, { useState, useRef } from 'react';
import { 
  SlidersHorizontal, 
  Plus, 
  X, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  MessageSquare, 
  Building2, 
  Download, 
  RotateCcw,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
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
    { key: 'filing_types', label: 'Filing Types', description: 'Monthly compliance types (GSTR-1, GSTR-3B, TDS, PF & ESI, Audit, etc.)' },
    { key: 'return_types', label: 'GST Returns', description: 'GST Portal Return codes (GSTR-1, GSTR-3B, CMP-08, GSTR-9, etc.)' },
    { key: 'entity_types', label: 'Entity Types', description: 'Legal client constitution structures (Private Limited, LLP, Partnership, Individual, etc.)' },
    { key: 'service_types', label: 'Service Catalog', description: 'Professional services rendered for fee billing & retainer ledger' },
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
    { key: 'docRequest', label: 'Document Request', description: 'Monthly purchase/sales invoices & statement reminder for GST & Audit' },
    { key: 'paymentReminder', label: 'Payment & Fee Reminder', description: 'Outstanding fee collection notice with bank & UPI payment instructions' },
    { key: 'filingAck', label: 'Filing Acknowledgment', description: 'Filing confirmation with official government portal reference (ARN / ACK)' },
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

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden shadow-sm">
      {/* Top Header */}
      <div className="p-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF] stroke-[1.5]" />
            <h2 className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              Practice Parameters &amp; Customization
            </h2>
          </div>
          <p className="text-[12.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            Admin console for Managing Partners (Shameer &amp; Ameen) to configure practice dropdowns, client reminder copy, and bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#16A34A] dark:text-[#34C759] bg-[#16A34A]/10 px-2.5 py-1 rounded-[5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#34C759]"></span>
            <span>{isSupabaseConfigured() ? 'Supabase Live Sync' : 'Local Storage Mode'}</span>
          </div>
        </div>
      </div>

      {/* Main Module Underline Tabs */}
      <div className="flex items-center border-b border-[#E5E5EA] dark:border-[#2C2C2E] px-5 gap-6 text-[13px] bg-[#FBFBFD] dark:bg-[#161618] overflow-x-auto">
        <button
          onClick={() => setActiveTab('dropdowns')}
          className={`py-3 font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dropdowns'
              ? 'border-[#0071E3] text-[#0071E3] dark:border-[#2997FF] dark:text-[#2997FF] font-semibold'
              : 'border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Dropdowns &amp; Categories</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`py-3 font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'whatsapp'
              ? 'border-[#0071E3] text-[#0071E3] dark:border-[#2997FF] dark:text-[#2997FF] font-semibold'
              : 'border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>WhatsApp Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-[#0071E3] text-[#0071E3] dark:border-[#2997FF] dark:text-[#2997FF] font-semibold'
              : 'border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Firm Profile &amp; Bank Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`py-3 font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'backup'
              ? 'border-[#0071E3] text-[#0071E3] dark:border-[#2997FF] dark:text-[#2997FF] font-semibold'
              : 'border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
          }`}
        >
          <Download className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Practice Data Backup</span>
        </button>
      </div>

      <div className="p-5">
        {/* ============================================================== */}
        {/* TAB 1: DROPDOWNS & CATEGORIES */}
        {/* ============================================================== */}
        {activeTab === 'dropdowns' && (
          <div className="space-y-4">
            {/* Category Sub-pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#F2F2F7] dark:bg-[#242426] p-1 rounded-[6px]">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setDropdownFeedback(null);
                  }}
                  className={`px-3 py-1 text-[12px] font-medium rounded-[5px] transition-all ${
                    activeCategory === cat.key
                      ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                      : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                  }`}
                >
                  {cat.label} ({(configs[cat.key] || []).length})
                </button>
              ))}
            </div>

            <div className="text-[12.5px] text-[#6E6E73] dark:text-[#8E8E93]">
              {currentCategoryMeta.description}
            </div>

            {/* Current Options Pill Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentOptions.map((opt) => (
                <div
                  key={opt}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12.5px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7]"
                >
                  <span className="font-medium">{opt}</span>
                  <button
                    onClick={() => handleRemoveOption(opt)}
                    disabled={savingDropdown || currentOptions.length <= 1}
                    className="text-[#86868B] hover:text-[#DC2626] dark:hover:text-[#FF453A] disabled:opacity-30 transition-colors p-0.5 rounded"
                    title="Remove option"
                  >
                    <X className="w-3 h-3 stroke-[2]" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Option Form */}
            <form onSubmit={handleAddOption} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                placeholder={`Add new ${currentCategoryMeta.label.toLowerCase()} option...`}
                className="flex-1 h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B]"
              />
              <button
                type="submit"
                disabled={savingDropdown || !newOptionInput.trim()}
                className="h-8 px-3.5 rounded-[6px] bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
              >
                {savingDropdown ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 stroke-[2]" />
                )}
                <span>Add Option</span>
              </button>
            </form>

            {dropdownFeedback && (
              <div
                className={`flex items-center gap-2 p-2 rounded-[6px] text-[12px] animate-in fade-in duration-150 ${
                  dropdownFeedback.type === 'success'
                    ? 'bg-[#16A34A]/10 text-[#16A34A] dark:text-[#34C759] border border-[#16A34A]/20'
                    : 'bg-[#DC2626]/10 text-[#DC2626] dark:text-[#FF453A] border border-[#DC2626]/20'
                }`}
              >
                {dropdownFeedback.type === 'success' ? (
                  <Check className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
                )}
                <span>{dropdownFeedback.message}</span>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: WHATSAPP TEMPLATES */}
        {/* ============================================================== */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            {/* Template Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {templateDefinitions.map((t) => {
                const isSelected = activeTemplateKey === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTemplateKey(t.key)}
                    className={`p-3 rounded-[6px] border text-left transition-all ${
                      isSelected
                        ? 'border-[#0071E3] dark:border-[#2997FF] bg-[#0071E3]/5 dark:bg-[#2997FF]/10 text-[#1D1D1F] dark:text-[#F5F5F7]'
                        : 'border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#D1D1D6] dark:hover:border-[#3A3A3C] text-[#6E6E73] dark:text-[#8E8E93]'
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center justify-between">
                      <span>{t.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />}
                    </div>
                    <div className="text-[11.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 leading-snug">
                      {t.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Clickable Variable Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block">
                Click Variable to Insert into Template
              </span>
              <div className="flex flex-wrap gap-1.5">
                {placeholderChips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => handleInsertPlaceholder(chip.value)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-[4px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E5E5EA] dark:hover:bg-[#333336] hover:border-[#0071E3] transition-colors"
                    title={`Insert ${chip.value}`}
                  >
                    <Plus className="w-2.5 h-2.5 text-[#0071E3]" />
                    <span>{chip.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea Editor */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                Template Message Body
              </label>
              <textarea
                ref={textareaRef}
                rows={7}
                value={templates[activeTemplateKey]}
                onChange={(e) => setTemplates({ ...templates, [activeTemplateKey]: e.target.value })}
                className="w-full p-3 font-mono text-[12.5px] leading-relaxed rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3] resize-y"
              />
            </div>

            {/* Live Message Sample Preview */}
            <div className="p-3.5 rounded-[6px] bg-[#FBFBFD] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#333336] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#0071E3]" />
                  <span>Client Message Preview (Sample: KM Traders)</span>
                </span>
                <span className="font-mono text-[10px]">wa.me preview</span>
              </div>
              <div className="whitespace-pre-wrap font-sans text-[12.5px] text-[#1D1D1F] dark:text-[#F5F5F7] bg-white dark:bg-[#1C1C1E] p-3 rounded-[5px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm">
                {sampleRender}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetTemplates}
                className="h-8 px-3 rounded-[6px] text-[12.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#DC2626] border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>Reset to Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                {templateFeedback && (
                  <span className="text-[12px] text-[#16A34A] dark:text-[#34C759] flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5 stroke-[2]" />
                    <span>{templateFeedback}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveTemplates}
                  className="h-8 px-4 rounded-[6px] text-[12.5px] font-medium bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Save WhatsApp Templates</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: FIRM PROFILE & BANK ACCOUNTS */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Section 1: Firm Legal Identity */}
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block">
                Firm Legal Identity &amp; Tax Identifiers
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Firm Legal Name
                  </label>
                  <input
                    type="text"
                    value={profile.legalName}
                    onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
                    className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Category &amp; Registration
                  </label>
                  <input
                    type="text"
                    value={profile.category}
                    onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                    className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Office Address / Locations
                  </label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Practice GSTIN
                  </label>
                  <input
                    type="text"
                    value={profile.gstin}
                    onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                    className="w-full h-8 px-3 font-mono text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Practice PAN
                  </label>
                  <input
                    type="text"
                    value={profile.pan}
                    onChange={(e) => setProfile({ ...profile, pan: e.target.value })}
                    className="w-full h-8 px-3 font-mono text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Primary Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full h-8 px-3 font-mono text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Bank Account & Payment Details */}
            <div className="pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
              <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block">
                Bank Account &amp; UPI Payment Details (Used in WhatsApp Fee Notices)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Beneficiary / Account Name
                  </label>
                  <input
                    type="text"
                    value={profile.beneficiaryName}
                    onChange={(e) => setProfile({ ...profile, beneficiaryName: e.target.value })}
                    className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={profile.bankName}
                    onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                    className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={profile.branch}
                    onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                    className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={profile.accountNumber}
                    onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })}
                    className="w-full h-8 px-3 font-mono text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={profile.ifscCode}
                    onChange={(e) => setProfile({ ...profile, ifscCode: e.target.value })}
                    className="w-full h-8 px-3 font-mono text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                    Primary Practice UPI ID
                  </label>
                  <input
                    type="text"
                    value={profile.upiId}
                    onChange={(e) => setProfile({ ...profile, upiId: e.target.value })}
                    className="w-full h-8 px-3 font-mono text-[13px] rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div>
                {profileFeedback && (
                  <span className="text-[12px] text-[#16A34A] dark:text-[#34C759] flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5 stroke-[2]" />
                    <span>{profileFeedback}</span>
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="h-8 px-4 rounded-[6px] text-[12.5px] font-medium bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5 stroke-[2]" />
                <span>Save Firm Profile</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* TAB 4: PRACTICE DATA BACKUP */}
        {/* ============================================================== */}
        {activeTab === 'backup' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Complete Practice Ledger Backup
              </h3>
              <p className="text-[12.5px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                Generate an immediate JSON archive containing all client master records, filing histories, rolling debtors aging, call desk inquiries, and audit trails.
              </p>
            </div>

            {/* Entity Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-[6px] bg-[#FBFBFD] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#333336]">
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">Master Clients</div>
                <div className="text-[18px] font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {clients.length}
                </div>
              </div>

              <div className="p-3 rounded-[6px] bg-[#FBFBFD] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#333336]">
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">Monthly Filings</div>
                <div className="text-[18px] font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {monthlyTasks.length}
                </div>
              </div>

              <div className="p-3 rounded-[6px] bg-[#FBFBFD] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#333336]">
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">ITR Records</div>
                <div className="text-[18px] font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {itrFilings.length}
                </div>
              </div>

              <div className="p-3 rounded-[6px] bg-[#FBFBFD] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#333336]">
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">Debtors Accounts</div>
                <div className="text-[18px] font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {debtors.length}
                </div>
              </div>

              <div className="p-3 rounded-[6px] bg-[#FBFBFD] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#333336]">
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">Call Desk Tickets</div>
                <div className="text-[18px] font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {tickets.length}
                </div>
              </div>

              <div className="p-3 rounded-[6px] bg-[#FBFBFD] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#333336]">
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">Audit Log Events</div>
                <div className="text-[18px] font-semibold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {activityLogs.length}
                </div>
              </div>
            </div>

            {/* Download CTA Card */}
            <div className="p-4 rounded-[6px] border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[6px] bg-[#0071E3]/10 dark:bg-[#2997FF]/15 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF] shrink-0">
                  <FileSpreadsheet className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Ready to Export Complete Practice Snapshot
                  </div>
                  <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                    Includes all clients, filing acknowledgments, ledger transactions, and practice credentials.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {backupNotice && (
                  <span className="text-[12px] text-[#16A34A] dark:text-[#34C759] font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[2]" />
                    <span>{backupNotice}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="h-8 px-4 rounded-[6px] text-[12.5px] font-medium bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                >
                  <Download className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span>Download Backup (.json)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
