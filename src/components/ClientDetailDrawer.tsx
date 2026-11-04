import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  FileSpreadsheet,
  Download, 
  Upload,
  PhoneCall,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Receipt,
  FileCheck,
  FolderOpen,
  Calendar,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  Search,
  FileCode
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
  onOpenWhatsApp,
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
      name: `${client.clientCode}_GSTR3B_Acknowledgment_Receipt_Oct2026.pdf`,
      extension: 'pdf',
      category: 'GST Return',
      size: '1.4 MB',
      date: 'Today, 11:30 AM',
      uploadedBy: staff?.name || 'Ameen',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-2',
      name: `October_2026_Sales_Register_B2B_B2C_${client.tradeName.replace(/\s+/g, '_')}.xlsx`,
      extension: 'xlsx',
      category: 'Accounts & Books',
      size: '2.8 MB',
      date: '03 Nov 2026',
      uploadedBy: 'Client Accountant',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-3',
      name: `GSTR_2B_Input_Tax_Credit_Reconciliation_Oct2026.pdf`,
      extension: 'pdf',
      category: 'GST Return',
      size: '860 KB',
      date: '02 Nov 2026',
      uploadedBy: 'Susmi',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-4',
      name: `Current_Account_Bank_Statement_Reconciled_Oct2026.pdf`,
      extension: 'pdf',
      category: 'Banking',
      size: '4.2 MB',
      date: '01 Nov 2026',
      uploadedBy: 'Client Upload',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-5',
      name: `Purchase_Invoices_Input_Register_Oct2026.xlsx`,
      extension: 'xlsx',
      category: 'Accounts & Books',
      size: '3.1 MB',
      date: '31 Oct 2026',
      uploadedBy: 'Ameen',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-6',
      name: `ITR_Computation_and_Tax_Liability_AY2026-27_Draft.pdf`,
      extension: 'pdf',
      category: 'ITR Filing',
      size: '1.9 MB',
      date: '28 Oct 2026',
      uploadedBy: 'CA Shameer',
      url: client.oneDriveFolderUrl,
    },
    {
      id: 'doc-7',
      name: `GSTR1_Offline_Upload_Payload_October2026.json`,
      extension: 'json',
      category: 'GST Return',
      size: '340 KB',
      date: '25 Oct 2026',
      uploadedBy: 'System Export',
      url: client.oneDriveFolderUrl,
    },
  ];

  const handleSyncOneDrive = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncNotice('Folder up to date with Microsoft SharePoint');
      setTimeout(() => setSyncNotice(null), 3000);
    }, 1200);
  };

  const filteredFiles = defaultOneDriveFiles.filter((file) => {
    if (fileFilter !== 'all' && file.extension !== fileFilter) return false;
    if (fileSearch) {
      const q = fileSearch.toLowerCase();
      return file.name.toLowerCase().includes(q) || file.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-[#1C1C1E] rounded-[12px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Strip */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFA] dark:bg-[#202022]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {client.clientCode}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] font-medium">
                  {client.entityType}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#34C759]/10 text-[#34C759] font-medium">
                  {client.isRecurringGST ? 'Monthly Recurring' : 'Annual ITR'}
                </span>
              </div>

              <h2 className="text-[20px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight truncate">
                {client.tradeName}
              </h2>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] truncate">
                {client.name} • {client.city}, Kerala
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onOpenWhatsApp(task || client)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium text-white bg-[#34C759] hover:bg-[#2DB84D] transition-colors"
                title="Send WhatsApp message"
              >
                <MessageSquare className="w-3.5 h-3.5 stroke-[2]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-[6px] text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] flex items-center justify-center transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="mt-4 flex items-center gap-1 bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] p-1 rounded-[7px] text-[12px]">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-1.5 px-3 font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Company Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('onedrive')}
              className={`flex-1 py-1.5 px-3 font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'onedrive'
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>OneDrive Files</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF]">
                {defaultOneDriveFiles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className={`flex-1 py-1.5 px-3 font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'compliance'
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Statutory &amp; Dues</span>
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 py-1.5 px-3 font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'tickets'
                  ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                  : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Calls &amp; Desk</span>
              {clientTickets.length > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#FF9500]/10 text-[#FF9500]">
                  {clientTickets.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-[13px]">
          {/* TAB 1: Company Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Registration Identifiers Grid */}
              <div>
                <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-2">
                  Tax &amp; Legal Identifiers
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F2F2F7] dark:bg-[#242426] p-4 rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">GSTIN (State 32 - Kerala)</span>
                      <button
                        onClick={() => handleCopy(client.gstin, 'gstin')}
                        className="text-[11px] text-[#0071E3] dark:text-[#2997FF] hover:underline inline-flex items-center gap-1"
                      >
                        {copiedField === 'gstin' ? <Check className="w-3 h-3 text-[#34C759]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'gstin' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <span className="font-mono text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.gstin}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">PAN Number</span>
                      <button
                        onClick={() => handleCopy(client.pan, 'pan')}
                        className="text-[11px] text-[#0071E3] dark:text-[#2997FF] hover:underline inline-flex items-center gap-1"
                      >
                        {copiedField === 'pan' ? <Check className="w-3 h-3 text-[#34C759]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'pan' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <span className="font-mono text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.pan}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#333336]">
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">Entity Constitution</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.entityType}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#333336]">
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">Jurisdiction &amp; Branch</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {client.city}, Kerala, India
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-2">
                  Client Direct Contact
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F2F2F7] dark:bg-[#242426] p-4 rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Contact Person</span>
                    </span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-1">
                      {client.contactPerson}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#34C759]" />
                      <span>Phone / WhatsApp</span>
                    </span>
                    <span className="font-mono text-[#34C759] font-semibold block mt-1">
                      {client.phone}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>Email</span>
                    </span>
                    <span className="font-mono text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] block mt-1 truncate">
                      {client.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Firm Management Profile */}
              <div>
                <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-2">
                  Assigned Team &amp; Financial Ledger
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F2F2F7] dark:bg-[#242426] p-4 rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <div>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">Assigned Executive</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      {staff?.name || 'Ameen'}
                    </span>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                      {staff?.role || 'Partner & Senior Auditor'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">Monthly Retainer Fee</span>
                    <span className="font-mono text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">
                      ₹{client.monthlyAuditFee.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">Monthly compliance billing</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">Current Fee Outstanding</span>
                    <span className={`font-mono text-[15px] font-semibold block mt-0.5 ${
                      debtor && debtor.currentBalance > 0 
                        ? 'text-[#FF3B30] dark:text-[#FF453A]' 
                        : 'text-[#34C759]'
                    }`}>
                      {debtor ? `₹${debtor.currentBalance.toLocaleString('en-IN')}` : '₹0 (Cleared)'}
                    </span>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                      {debtor ? debtor.agingBucket : 'No pending balance'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OneDrive Files & Documents */}
          {activeTab === 'onedrive' && (
            <div className="space-y-4">
              {/* OneDrive Connection Strip */}
              <div className="p-3.5 bg-[#F2F2F7] dark:bg-[#242426] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <span className="w-2 h-2 rounded-full bg-[#34C759]"></span>
                    <span>Microsoft SharePoint / OneDrive Connected</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block mt-0.5 truncate">
                    /Shared Documents/Clients/{client.clientCode}_{client.tradeName.replace(/\s+/g, '_')}/
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSyncOneDrive}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-[#1C1C1E] border border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[5px] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E5E5EA] transition-all"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#0071E3]' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>

                  <a
                    href={client.oneDriveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#0071E3] text-white rounded-[5px] hover:bg-[#0077ED] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in OneDrive</span>
                  </a>
                </div>
              </div>

              {syncNotice && (
                <div className="p-2.5 bg-[#34C759]/10 border border-[#34C759]/20 rounded-[6px] text-[12px] text-[#34C759] flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 stroke-[2]" />
                  <span>{syncNotice}</span>
                </div>
              )}

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#86868B]" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-[#F2F2F7] dark:bg-[#242426] border border-transparent hover:border-[#D1D1D6] focus:border-[#0071E3] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto bg-[#F2F2F7] dark:bg-[#242426] p-0.5 rounded-[6px] text-[11px]">
                  <button
                    onClick={() => setFileFilter('all')}
                    className={`px-2.5 py-1 rounded-[5px] transition-all ${
                      fileFilter === 'all'
                        ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                        : 'text-[#6E6E73] dark:text-[#8E8E93]'
                    }`}
                  >
                    All ({defaultOneDriveFiles.length})
                  </button>
                  <button
                    onClick={() => setFileFilter('pdf')}
                    className={`px-2.5 py-1 rounded-[5px] transition-all ${
                      fileFilter === 'pdf'
                        ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                        : 'text-[#6E6E73] dark:text-[#8E8E93]'
                    }`}
                  >
                    PDFs ({defaultOneDriveFiles.filter(f => f.extension === 'pdf').length})
                  </button>
                  <button
                    onClick={() => setFileFilter('xlsx')}
                    className={`px-2.5 py-1 rounded-[5px] transition-all ${
                      fileFilter === 'xlsx'
                        ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                        : 'text-[#6E6E73] dark:text-[#8E8E93]'
                    }`}
                  >
                    Excel ({defaultOneDriveFiles.filter(f => f.extension === 'xlsx').length})
                  </button>
                  <button
                    onClick={() => setFileFilter('json')}
                    className={`px-2.5 py-1 rounded-[5px] transition-all ${
                      fileFilter === 'json'
                        ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                        : 'text-[#6E6E73] dark:text-[#8E8E93]'
                    }`}
                  >
                    JSON ({defaultOneDriveFiles.filter(f => f.extension === 'json').length})
                  </button>
                </div>
              </div>

              {/* Documents List */}
              <div className="border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] bg-white dark:bg-[#1C1C1E]">
                {filteredFiles.length === 0 ? (
                  <div className="p-8 text-center text-[#6E6E73] dark:text-[#8E8E93]">
                    No files found matching your search.
                  </div>
                ) : (
                  filteredFiles.map((file) => {
                    const isPdf = file.extension === 'pdf';
                    const isXlsx = file.extension === 'xlsx';

                    return (
                      <div
                        key={file.id}
                        className="p-3 sm:px-4 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* File Type Badge */}
                          <div className={`w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0 text-[10px] font-bold ${
                            isPdf 
                              ? 'bg-[#FF3B30]/10 text-[#FF3B30]' 
                              : isXlsx 
                                ? 'bg-[#34C759]/10 text-[#34C759]' 
                                : 'bg-[#FF9500]/10 text-[#FF9500]'
                          }`}>
                            {isPdf ? (
                              <FileText className="w-4 h-4 stroke-[1.5]" />
                            ) : isXlsx ? (
                              <FileSpreadsheet className="w-4 h-4 stroke-[1.5]" />
                            ) : (
                              <FileCode className="w-4 h-4 stroke-[1.5]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] truncate group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF]">
                              {file.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                              <span className="font-mono">{file.size}</span>
                              <span>•</span>
                              <span>{file.category}</span>
                              <span>•</span>
                              <span>{file.date}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="hidden sm:inline">by {file.uploadedBy}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-[5px] text-[#6E6E73] hover:text-[#0071E3] dark:hover:text-[#2997FF] hover:bg-white dark:hover:bg-[#2C2C2E] transition-colors"
                            title="Download document"
                          >
                            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Upload Dropzone Simulator */}
              <div className="border border-dashed border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[8px] p-5 text-center bg-[#FAFAFA] dark:bg-[#202022]">
                <Upload className="w-5 h-5 text-[#86868B] mx-auto mb-1 stroke-[1.5]" />
                <div className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Upload Client Invoices, Bills &amp; Returns
                </div>
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                  Direct sync to Microsoft SharePoint / OneDrive folder ({client.tradeName})
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Compliance & Filings */}
          {activeTab === 'compliance' && (
            <div className="space-y-4">
              {/* Monthly Filing Task Card */}
              {task && (
                <div className="p-4 bg-[#F2F2F7] dark:bg-[#242426] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                      Current Monthly Filing
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      task.status === 'Filed' 
                        ? 'bg-[#34C759]/10 text-[#34C759]' 
                        : task.status === 'Overdue' 
                          ? 'bg-[#FF3B30]/10 text-[#FF3B30]' 
                          : 'bg-[#FF9500]/10 text-[#FF9500]'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[12px]">
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Return Type</span>
                      <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block">{task.filingType}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Period</span>
                      <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">{task.period}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Due Date</span>
                      <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7] block">{task.dueDate}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Tax Amount</span>
                      <span className="font-mono font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block">
                        ₹{task.taxPayable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {task.arnNumber && (
                    <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#333336] flex items-center justify-between text-[11px]">
                      <span className="text-[#6E6E73] dark:text-[#8E8E93]">Government Portal ARN:</span>
                      <span className="font-mono text-[#34C759] font-medium">{task.arnNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Annual ITR Filing Card */}
              {itrFiling && (
                <div className="p-4 bg-[#F2F2F7] dark:bg-[#242426] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                      Income Tax Return (ITR)
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] font-medium">
                      {itrFiling.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[12px]">
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">ITR Form</span>
                      <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block">{itrFiling.itrForm}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Assessment Year</span>
                      <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">{itrFiling.assessmentYear}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Regime</span>
                      <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">{itrFiling.regime}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Tax / Refund</span>
                      <span className={`font-mono font-semibold block ${
                        itrFiling.taxLiabilityOrRefund < 0 ? 'text-[#34C759]' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                      }`}>
                        {itrFiling.taxLiabilityOrRefund < 0 
                          ? `Refund: ₹${Math.abs(itrFiling.taxLiabilityOrRefund).toLocaleString('en-IN')}` 
                          : `Tax: ₹${itrFiling.taxLiabilityOrRefund.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>

                  {itrFiling.acknowledgmentNo && (
                    <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#333336] flex items-center justify-between text-[11px]">
                      <span className="text-[#6E6E73] dark:text-[#8E8E93]">ITD Acknowledgment No:</span>
                      <span className="font-mono text-[#34C759] font-medium">{itrFiling.acknowledgmentNo}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Fee Outstanding Ledger Card */}
              {debtor && (
                <div className="p-4 bg-[#F2F2F7] dark:bg-[#242426] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                      Fee Dues &amp; Ledger
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      debtor.status === 'Cleared' 
                        ? 'bg-[#34C759]/10 text-[#34C759]' 
                        : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                    }`}>
                      {debtor.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[12px]">
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Current Outstanding</span>
                      <span className="font-mono font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] block">
                        ₹{debtor.currentBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Aging</span>
                      <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">{debtor.agingBucket}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Nov Billing</span>
                      <span className="font-mono text-[#1D1D1F] dark:text-[#F5F5F7] block">
                        ₹{debtor.november.currentBilling.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Nov Cleared</span>
                      <span className="font-mono text-[#34C759] block">
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
            <div className="space-y-3">
              {clientTickets.length === 0 ? (
                <div className="p-8 text-center text-[#6E6E73] dark:text-[#8E8E93] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
                  No past call tickets or inquiries recorded for {client.tradeName}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clientTickets.map((t) => {
                    const assignedTo = getStaff(t.assignedStaffId);
                    return (
                      <div 
                        key={t.id} 
                        className="p-3.5 bg-[#F2F2F7] dark:bg-[#242426] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-[12px] text-[#0071E3] dark:text-[#2997FF]">
                            {t.ticketNo}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">
                            {t.status}
                          </span>
                        </div>

                        <div className="font-semibold text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {t.subject}
                        </div>
                        <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                          {t.description}
                        </p>

                        <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#333336] flex items-center justify-between text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
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

        {/* Modal Footer Strip */}
        <div className="px-6 py-3.5 border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFA] dark:bg-[#202022] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href={client.oneDriveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>SharePoint Folder</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
            >
              Close
            </button>

            <button
              onClick={() => onOpenWhatsApp(task || client)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Send WhatsApp Notice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
