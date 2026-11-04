import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search
} from 'lucide-react';
import { Client, MonthlyTask, ITRFiling, StaffMember, StaffTicket, DebtorRecord } from '../types/crm';

interface ClientDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  task?: MonthlyTask | null;
  itrFiling?: ITRFiling | null;
  debtor?: DebtorRecord | null;
  staff?: StaffMember | null;
  tickets?: StaffTicket[];
  staffList?: StaffMember[];
  onOpenWhatsApp: (taskOrItr: any) => void;
}

interface ClientDocument {
  id: string;
  name: string;
  extension: 'pdf' | 'xlsx' | 'json';
  category: 'GST Return' | 'Accounts & Books' | 'Banking' | 'ITR Filing' | 'Statutory';
  size: string;
  date: string;
  uploadedBy: string;
  url: string;
}

export const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({
  isOpen,
  onClose,
  client,
  task,
  itrFiling,
  debtor,
  staff,
  tickets = [],
  staffList = [],
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'onedrive' | 'compliance' | 'tickets'>('profile');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [fileFilter, setFileFilter] = useState<'all' | 'pdf' | 'xlsx' | 'json'>('all');
  const [fileSearch, setFileSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !client) return null;

  const clientTickets = tickets.filter((t) => t.clientId === client.id);

  const getStaff = (id: string | null) => {
    if (!id) return null;
    return staffList.find((s) => s.id === id);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Mock Realistic OneDrive Document Repository for the Client
  const defaultOneDriveFiles: ClientDocument[] = [
    {
      id: 'doc-1',
      name: `GSTR-3B_Acknowledgment_Oct2026.pdf`,
      extension: 'pdf',
      category: 'GST Return',
      size: '248 KB',
      date: '20 Oct 2026',
      uploadedBy: 'Susmi',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-2',
      name: `Sales_Register_B2B_October_2026.xlsx`,
      extension: 'xlsx',
      category: 'Accounts & Books',
      size: '1.4 MB',
      date: '18 Oct 2026',
      uploadedBy: 'Client Upload',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-3',
      name: `GSTR1_Offline_Utility_Payload.json`,
      extension: 'json',
      category: 'GST Return',
      size: '42 KB',
      date: '11 Oct 2026',
      uploadedBy: 'Ameen',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-4',
      name: `Bank_Statement_Federal_Bank_Sep2026.pdf`,
      extension: 'pdf',
      category: 'Banking',
      size: '890 KB',
      date: '02 Oct 2026',
      uploadedBy: 'Susmi',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-5',
      name: `Purchase_Inward_Register_Q2_FY26.xlsx`,
      extension: 'xlsx',
      category: 'Accounts & Books',
      size: '2.8 MB',
      date: '28 Sep 2026',
      uploadedBy: 'Ameen',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-6',
      name: `ITR_Draft_AY2026-27_Computation.pdf`,
      extension: 'pdf',
      category: 'ITR Filing',
      size: '512 KB',
      date: '14 Sep 2026',
      uploadedBy: 'Shameer',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-7',
      name: `GST_Registration_Certificate_REG06.pdf`,
      extension: 'pdf',
      category: 'Statutory',
      size: '340 KB',
      date: '12 Jan 2025',
      uploadedBy: 'Shameer',
      url: client.oneDriveFolderUrl,
    },
  ];

  const handleSyncOneDrive = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncNotice('SharePoint index updated');
      setTimeout(() => setSyncNotice(null), 3000);
    }, 800);
  };

  const filteredFiles = defaultOneDriveFiles.filter((file) => {
    if (fileFilter !== 'all' && file.extension !== fileFilter) return false;
    if (fileSearch) {
      const q = fileSearch.toLowerCase();
      return (
        file.name.toLowerCase().includes(q) ||
        file.category.toLowerCase().includes(q) ||
        file.uploadedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[88vh] bg-white dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Restrained Linear Enterprise Standard */}
        <div className="px-6 pt-5 pb-0 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                <span className="font-mono">{client.clientCode}</span>
                <span className="text-[#D1D1D6] dark:text-[#3A3A3C]">/</span>
                <span>{client.entityType}</span>
                <span className="text-[#D1D1D6] dark:text-[#3A3A3C]">/</span>
                <span>{client.isRecurringGST ? 'Monthly Recurring' : 'Annual ITR'}</span>
              </div>

              <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight truncate">
                {client.tradeName}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 -mr-1 rounded-[5px] text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex items-center justify-center transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Underline Tabs */}
          <div className="mt-4 flex items-center gap-6 text-[13px] -mb-[1px]">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2.5 font-medium transition-colors border-b-2 ${
                activeTab === 'profile'
                  ? 'border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveTab('onedrive')}
              className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'onedrive'
                  ? 'border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <span>Files</span>
              <span className="font-mono text-[11px] text-[#86868B] dark:text-[#6E6E73]">
                {defaultOneDriveFiles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className={`pb-2.5 font-medium transition-colors border-b-2 ${
                activeTab === 'compliance'
                  ? 'border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              Compliance
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`pb-2.5 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'tickets'
                  ? 'border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]'
                  : 'border-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <span>Desk</span>
              {clientTickets.length > 0 && (
                <span className="font-mono text-[11px] text-[#86868B] dark:text-[#6E6E73]">
                  {clientTickets.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - Flat 1px Hairline Separators */}
        <div className="p-6 overflow-y-auto flex-1 text-[13px] divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
          {/* TAB 1: Overview */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Section 1: Identifiers */}
              <div className="pb-5">
                <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-3">
                  Identifiers
                </span>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">GSTIN</span>
                      <button
                        onClick={() => handleCopy(client.gstin, 'gstin')}
                        className="text-[11px] text-[#0071E3] dark:text-[#2997FF] hover:underline inline-flex items-center gap-1"
                      >
                        {copiedField === 'gstin' ? <Check className="w-3 h-3 text-[#16A34A] dark:text-[#34C759]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'gstin' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <span className="font-mono text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.gstin}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">PAN</span>
                      <button
                        onClick={() => handleCopy(client.pan, 'pan')}
                        className="text-[11px] text-[#0071E3] dark:text-[#2997FF] hover:underline inline-flex items-center gap-1"
                      >
                        {copiedField === 'pan' ? <Check className="w-3 h-3 text-[#16A34A] dark:text-[#34C759]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'pan' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <span className="font-mono text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.pan}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block">Constitution</span>
                    <span className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.entityType}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block">Jurisdiction</span>
                    <span className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.city}, Kerala
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact */}
              <div className="pt-5 pb-5">
                <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-3">
                  Contact
                </span>
                <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                  <div>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block">
                      Contact Person
                    </span>
                    <span className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.contactPerson}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block">
                      Phone
                    </span>
                    <span className="font-mono text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.phone}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block">
                      Email
                    </span>
                    <span className="text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5 truncate">
                      {client.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Engagement & Ledger */}
              <div className="pt-5">
                <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-3">
                  Engagement &amp; Ledger
                </span>
                <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                  <div>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block">Assigned To</span>
                    <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {staff?.name || 'Ameen'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block">Monthly Retainer</span>
                    <span className="font-mono text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      ₹{client.monthlyAuditFee.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] block">Current Outstanding</span>
                    <span className={`font-mono text-[13px] font-medium block mt-0.5 ${
                      debtor && debtor.currentBalance > 0 
                        ? 'text-[#C53030] dark:text-[#FF453A]' 
                        : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                    }`}>
                      {debtor ? `₹${debtor.currentBalance.toLocaleString('en-IN')}` : '₹0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OneDrive Files & Documents */}
          {activeTab === 'onedrive' && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#86868B]" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Filter documents..."
                    className="w-full pl-8 pr-3 py-1 text-[12px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#2C2C2E] focus:border-[#0071E3] rounded-[5px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncOneDrive}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                  </button>

                  <a
                    href={client.oneDriveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#0071E3] dark:text-[#2997FF] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>SharePoint</span>
                  </a>
                </div>
              </div>

              {syncNotice && (
                <div className="p-2 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[5px] text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                  {syncNotice}
                </div>
              )}

              <div className="border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                {filteredFiles.length === 0 ? (
                  <div className="p-6 text-center text-[#6E6E73] dark:text-[#8E8E93]">
                    No files found matching your search.
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-2.5 sm:px-3 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[10px] text-[#86868B] uppercase w-8 shrink-0">
                          {file.extension}
                        </span>
                        <span className="font-medium text-[12.5px] text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                          {file.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-[11px] text-[#86868B]">
                        <span className="font-mono">{file.size}</span>
                        <span className="font-mono hidden sm:inline">{file.date}</span>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Compliance */}
          {activeTab === 'compliance' && (
            <div className="space-y-6 pt-1">
              {task && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                      Monthly Filing
                    </span>
                    <span className="text-[11px] font-mono text-[#6E6E73] dark:text-[#8E8E93]">
                      {task.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Type</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] block">{task.filingType}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Period</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] block">{task.period}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Due</span>
                      <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7] block">{task.dueDate}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Tax</span>
                      <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7] block">
                        ₹{task.taxPayable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {task.arnNumber && (
                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-[#6E6E73] dark:text-[#8E8E93]">Portal ARN</span>
                      <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7]">{task.arnNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {itrFiling && (
                <div className="space-y-3 pt-5 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                      Income Tax Return
                    </span>
                    <span className="text-[11px] font-mono text-[#6E6E73] dark:text-[#8E8E93]">
                      {itrFiling.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Form</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] block">{itrFiling.itrForm}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">AY</span>
                      <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7] block">{itrFiling.assessmentYear}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Regime</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] block">{itrFiling.regime}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Tax / Refund</span>
                      <span className="font-mono block text-[#1D1D1F] dark:text-[#F5F5F7]">
                        ₹{Math.abs(itrFiling.taxLiabilityOrRefund).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {debtor && (
                <div className="space-y-3 pt-5 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                      Fee Ledger
                    </span>
                    <span className="text-[11px] font-mono text-[#6E6E73] dark:text-[#8E8E93]">
                      {debtor.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Outstanding</span>
                      <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7] block">
                        ₹{debtor.currentBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Aging</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] block">{debtor.agingBucket}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Cleared This Month</span>
                      <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7] block">
                        ₹{debtor.november.paymentCleared.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Tickets & Calling Queue */}
          {activeTab === 'tickets' && (
            <div className="space-y-3 pt-1">
              {clientTickets.length === 0 ? (
                <div className="p-6 text-center text-[#6E6E73] dark:text-[#8E8E93]">
                  No past call tickets or inquiries recorded.
                </div>
              ) : (
                <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                  {clientTickets.map((t) => {
                    const assignedTo = getStaff(t.assignedStaffId);
                    return (
                      <div key={t.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {t.ticketNo}
                          </span>
                          <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                            {t.status}
                          </span>
                        </div>

                        <div className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {t.subject}
                        </div>
                        <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                          {t.description}
                        </p>

                        <div className="pt-1 flex items-center justify-between text-[11px] text-[#86868B]">
                          <span>Caller: {t.callerName}</span>
                          <span>Assigned: {assignedTo?.name || 'Unassigned'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-[5px] text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
