import React, { useState } from 'react';
import { X, Building2, User, Phone, Mail, MapPin, IndianRupee } from 'lucide-react';
import { Client, StaffMember } from '../types/crm';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  entityTypes: string[];
  nextClientCode: string;
  onAddClient: (newClient: Client) => Promise<void>;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  staffList,
  entityTypes,
  nextClientCode,
  onAddClient,
}) => {
  if (!isOpen) return null;

  const [clientCode, setClientCode] = useState(nextClientCode);
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [entityType, setEntityType] = useState(entityTypes[0] || 'Private Limited');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Kerala');
  const [monthlyAuditFee, setMonthlyAuditFee] = useState<number>(3000);
  const [assignedStaffId, setAssignedStaffId] = useState(staffList[0]?.id || 'staff-ameen');
  const [isRecurringGST, setIsRecurringGST] = useState(true);
  const [isRecurringStatutory, setIsRecurringStatutory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);

    const client: Client = {
      id: `client-${Date.now()}`,
      clientCode: clientCode.trim(),
      name: name.trim(),
      tradeName: (tradeName.trim() || name.trim()),
      entityType: entityType as any,
      gstin: gstin.trim().toUpperCase(),
      pan: (pan.trim().toUpperCase() || (gstin.length >= 12 ? gstin.slice(2, 12).toUpperCase() : '')),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      isRecurringGST,
      isRecurringStatutory,
      assignedStaffId,
      monthlyAuditFee: Number(monthlyAuditFee) || 0,
      city: city.trim(),
      oneDriveFolderUrl: `https://shameerassociates.sharepoint.com/clients/${clientCode}`,
      status: 'Active',
    };

    await onAddClient(client);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl max-h-[92vh] bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[10px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Register New Client Entity
            </h3>
            <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
              Add client account and sync to Supabase database
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-[13px]">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Client Code
              </label>
              <input
                type="text"
                required
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                className="w-full h-8 px-2.5 font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Entity Legal Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Logistical Solutions (P) Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Trade Name (Display)
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Logistics"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Entity Type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full h-8 px-2 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                {entityTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                GSTIN (15 Digits)
              </label>
              <input
                type="text"
                placeholder="32AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full h-8 px-2.5 font-tabular uppercase bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                PAN
              </label>
              <input
                type="text"
                placeholder="AAAAA0000A"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full h-8 px-2.5 font-tabular uppercase bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Managing Director"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Phone (WhatsApp)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-8 px-2.5 font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="accounts@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                City / Location
              </label>
              <input
                type="text"
                placeholder="Kochi / Calicut"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-8 px-2.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Monthly Audit Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={monthlyAuditFee}
                onChange={(e) => setMonthlyAuditFee(Number(e.target.value))}
                className="w-full h-8 px-2.5 font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
                Assigned Executive
              </label>
              <select
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="w-full h-8 px-2 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role.includes('Partner') ? 'Partner' : 'Staff'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Compliance Checkboxes */}
          <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurringGST}
                onChange={(e) => setIsRecurringGST(e.target.checked)}
                className="rounded border-[#D1D1D6] text-[#0071E3] focus:ring-0"
              />
              <span className="text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]">Monthly GST Compliance (GSTR-1 &amp; 3B)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurringStatutory}
                onChange={(e) => setIsRecurringStatutory(e.target.checked)}
                className="rounded border-[#D1D1D6] text-[#0071E3] focus:ring-0"
              />
              <span className="text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]">Statutory Audit</span>
            </label>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-[6px] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] text-[13px] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 rounded-[6px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium transition-colors shadow-sm"
            >
              {submitting ? 'Registering...' : 'Save & Sync Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
