import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  HardDrive, 
  MessageSquare, 
  Download, 
  Upload,
  PhoneCall,
  Database
} from 'lucide-react';
import { Client, MonthlyTask, ITRFiling, StaffMember, StaffTicket } from '../types/crm';

interface ClientDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  task?: MonthlyTask | null;
  itrFiling?: ITRFiling | null;
  staff?: StaffMember | null;
  tickets?: StaffTicket[];
  staffList?: StaffMember[];
  onOpenWhatsApp: (taskOrItr: any) => void;
}

export const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({
  isOpen,
  onClose,
  client,
  task,
  itrFiling,
  staff,
  tickets = [],
  staffList = [],
  onOpenWhatsApp,
}) => {
  if (!isOpen || !client) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'onedrive' | 'supabase'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);

  const clientTickets = tickets.filter((t) => t.clientId === client.id);

  const getStaff = (id: string | null) => {
    if (!id) return null;
    return staffList.find((s) => s.id === id);
  };

  const mockOneDriveFiles = [
    { name: `GST_Oct2026_Sales_Invoices.xlsx`, size: '2.4 MB', date: '02 Nov 2026' },
    { name: `GSTR_2B_Purchase_Reconciliation.pdf`, size: '1.2 MB', date: '03 Nov 2026' },
    { name: `Bank_Statement_Oct2026.pdf`, size: '4.8 MB', date: '01 Nov 2026' },
    { name: `Audited_Balance_Sheet_Draft_FY26.pdf`, size: '6.1 MB', date: '28 Oct 2026' },
    { name: `KYC_Director_PAN_Aadhaar.pdf`, size: '420 KB', date: '15 Sep 2026' },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(client.oneDriveFolderUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="absolute inset-y-0 right-0 max-w-full flex pl-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-screen max-w-lg bg-[#FFFFFF] dark:bg-[#1C1C1E] border-l border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-tabular text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                    {client.clientCode}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93] font-medium">
                    {client.isRecurringGST ? 'Monthly GST' : 'Annual ITR'}
                  </span>
                </div>
                <h3 className="mt-1 text-[18px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {client.tradeName}
                </h3>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">{client.name}</p>
              </div>

              <button
                onClick={onClose}
                className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            {/* Segmented Sub-tabs */}
            <div className="mt-4 flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#242426] p-0.5 rounded-[6px] text-[12px]">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-1 px-2 font-medium rounded-[5px] transition-all text-center ${
                  activeTab === 'overview'
                    ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93]'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex-1 py-1 px-2 font-medium rounded-[5px] transition-all text-center ${
                  activeTab === 'tickets'
                    ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93]'
                }`}
              >
                Calls ({clientTickets.length})
              </button>
              <button
                onClick={() => setActiveTab('onedrive')}
                className={`flex-1 py-1 px-2 font-medium rounded-[5px] transition-all text-center ${
                  activeTab === 'onedrive'
                    ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93]'
                }`}
              >
                OneDrive
              </button>
              <button
                onClick={() => setActiveTab('supabase')}
                className={`flex-1 py-1 px-2 font-medium rounded-[5px] transition-all text-center ${
                  activeTab === 'supabase'
                    ? 'bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93]'
                }`}
              >
                Record
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 text-[13px]">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-2">
                    Registration Information
                  </span>
                  <div className="grid grid-cols-2 gap-3 bg-[#F2F2F7] dark:bg-[#242426] p-3 rounded-[6px]">
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">GSTIN</span>
                      <span className="font-tabular font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">{client.gstin}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">PAN</span>
                      <span className="font-tabular font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">{client.pan}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Entity Type</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">{client.entityType}</span>
                    </div>
                    <div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] block text-[11px]">Location</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] block mt-0.5">{client.city}, Maharashtra</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-2">
                    Contact &amp; Communication
                  </span>
                  <div className="space-y-2 bg-[#F2F2F7] dark:bg-[#242426] p-3 rounded-[6px]">
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73] dark:text-[#8E8E93]">Primary Contact:</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">{client.contactPerson}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73] dark:text-[#8E8E93]">Phone (WhatsApp):</span>
                      <span className="font-tabular text-[#34C759] font-medium">{client.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73] dark:text-[#8E8E93]">Email Address:</span>
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-tabular">{client.email}</span>
                    </div>
                  </div>
                </div>

                {staff && (
                  <div>
                    <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider block mb-2">
                      Assigned Executive
                    </span>
                    <div className="flex items-center justify-between p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px]">
                      <div>
                        <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{staff.name}</div>
                        <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">{staff.role}</div>
                      </div>
                      <span className="font-tabular text-[#6E6E73] dark:text-[#8E8E93] text-[12px]">{staff.phone}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-3">
                {clientTickets.length === 0 ? (
                  <div className="p-6 text-center text-[#6E6E73] dark:text-[#8E8E93] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px]">
                    No past call tickets recorded for this client.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientTickets.map((t) => {
                      const loggedBy = getStaff(t.loggedByStaffId);
                      const assignedTo = getStaff(t.assignedStaffId);
                      return (
                        <div key={t.id} className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-tabular font-semibold text-[12px] text-[#0071E3] dark:text-[#2997FF]">{t.ticketNo}</span>
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#FFFFFF] dark:bg-[#3A3A3C] text-[#6E6E73] dark:text-[#8E8E93]">
                              {t.status}
                            </span>
                          </div>

                          <div className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">{t.subject}</div>
                          <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">{t.description}</p>

                          <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#3A3A3C] flex justify-between text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
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

            {activeTab === 'onedrive' && (
              <div className="space-y-3">
                <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">OneDrive Path</span>
                    <span className="font-tabular text-[11px] text-[#6E6E73] dark:text-[#8E8E93] truncate block">
                      /Clients/{client.clientCode}_{client.tradeName.replace(/\s+/g, '_')}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="px-2 py-1 text-[11px] font-medium bg-[#FFFFFF] dark:bg-[#3A3A3C] border border-[#E5E5EA] dark:border-[#48484A] rounded-[4px] shrink-0"
                  >
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="space-y-1 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                  {mockOneDriveFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93] stroke-[1.5]" />
                        <div>
                          <div className="font-medium text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]">{file.name}</div>
                          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] font-tabular">
                            {file.size} • {file.date}
                          </div>
                        </div>
                      </div>
                      <button className="p-1 text-[#6E6E73] hover:text-[#0071E3] dark:hover:text-[#2997FF]">
                        <Download className="w-3.5 h-3.5 stroke-[1.5]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'supabase' && (
              <div className="space-y-3">
                <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] flex items-center justify-between">
                  <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">PostgreSQL Schema: public.clients</span>
                  <span className="text-[11px] text-[#34C759] font-medium">Connected</span>
                </div>

                <pre className="p-3 bg-[#F2F2F7] dark:bg-[#242426] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-[6px] text-[11px] font-tabular overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    id: client.id,
    client_code: client.clientCode,
    company_name: client.name,
    gstin: client.gstin,
    pan: client.pan,
    entity_type: client.entityType,
    is_recurring_gst: client.isRecurringGST,
    assigned_staff_id: client.assignedStaffId,
  },
  null,
  2
)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              onClick={() => onOpenWhatsApp(task || client)}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
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
