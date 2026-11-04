import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MonthlyTask, StaffMember, FilingStatus } from '../types/crm';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  filingTypes?: string[];
  onAddTask: (task: MonthlyTask) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  staffList,
  filingTypes = ['GSTR-1 (Sales)', 'GSTR-3B (Summary)', 'Statutory Audit', 'TDS Payment', 'PF & ESI', 'CMP-08', 'IFF'],
  onAddTask,
}) => {
  if (!isOpen) return null;

  const [tradeName, setTradeName] = useState('');
  const [gstin, setGstin] = useState('27AABCZ1234F1Z5');
  const [filingType, setFilingType] = useState<MonthlyTask['filingType']>('GSTR-1');
  const [period, setPeriod] = useState('October 2026');
  const [assignedStaffId, setAssignedStaffId] = useState(staffList[0]?.id || '');
  const [dueDate, setDueDate] = useState('2026-11-11');
  const [phone, setPhone] = useState('+91 98200 12345');
  const [status, setStatus] = useState<FilingStatus>('In Progress');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim()) return;

    const newTask: MonthlyTask = {
      id: `task-custom-${Date.now()}`,
      clientId: `client-custom-${Date.now()}`,
      clientName: tradeName,
      tradeName,
      gstin: gstin.toUpperCase(),
      filingType,
      period,
      assignedStaffId,
      status,
      dueDate,
      daysRemaining: 4,
      phone,
      lastUpdated: 'Just now',
      docsReceived: status !== 'Docs Pending',
      taxPayable: 18500,
    };

    onAddTask(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Add Compliance Task</h3>
            <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Assign recurring GST or statutory audit task</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-[13px]">
          <div>
            <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">
              Client / Trade Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paramount Chem LLP"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">GSTIN</label>
              <input
                type="text"
                required
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-1.5 font-tabular uppercase bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Phone (WhatsApp)</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 font-tabular bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Filing Type</label>
              <select
                value={filingType}
                onChange={(e) => setFilingType(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                {filingTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Period</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Assigned Executive</label>
              <select
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.initials})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] block mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FilingStatus)}
                className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="Docs Pending">Docs Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Draft Ready">Draft Ready</option>
                <option value="Filed">Filed</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px]"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
