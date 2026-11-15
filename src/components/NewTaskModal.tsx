import React, { useState } from 'react';
import { ListChecks, Briefcase, Calendar } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Tabs, Textarea } from './ui';
import { Client, MonthlyTask, StaffMember, FilingStatus, TaskCategory } from '../types/crm';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  clients: Client[];
  filingTypes?: string[];
  initialCategory?: TaskCategory;
  onAddTask: (task: MonthlyTask) => void;
}

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual & ITR' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'other', label: 'Other Assignments' },
];

const SERVICES_BY_CATEGORY: Record<TaskCategory, string[]> = {
  monthly: [
    'GST (GSTR-1 / 3B)',
    'TDS Payment',
    'PF Filing',
    'ESI Filing',
    'Accounting & Bookkeeping',
    'Monthly MIS Report',
  ],
  quarterly: [
    'GST (QRMP / CMP-08)',
    'TDS Return (24Q - Salary)',
    'TDS Return (26Q - Non-Salary)',
    'TDS Return (27Q)',
  ],
  annual: [
    'ITR - Individual',
    'ITR - Business',
    'ITR - Company',
    'Tax Audit (3CA/3CB-3CD)',
    'Statutory Audit',
    'GSTR-9',
    'GSTR-9C',
    'ROC (AOC-4 & MGT-7)',
    'ROC (DPT-3)',
  ],
  weekly: [
    'Weekly Bookkeeping',
    'Cash & Bank Verification',
  ],
  other: [],
};

const FINANCIAL_YEARS = [
  '2026-27 (Current)',
  '2025-26',
  '2024-25',
  '2023-24',
  '2022-23',
  '2021-22',
];

const NewTaskModalForm: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  staffList,
  clients,
  initialCategory = 'monthly',
  onAddTask,
}) => {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const [category, setCategory] = useState<TaskCategory>(initialCategory);
  const [clientId, setClientId] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState(staffList[0]?.id || '');
  const [financialYear, setFinancialYear] = useState('2026-27 (Current)');
  const [filingType, setFilingType] = useState<string>(SERVICES_BY_CATEGORY[initialCategory][0] || 'GST (GSTR-1 / 3B)');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedFee, setEstimatedFee] = useState<number | ''>('');
  const [status, setStatus] = useState<FilingStatus>('In Progress');

  const getDefaultDueDate = (cat: TaskCategory, service: string) => {
    const y = today.getFullYear();
    const m = today.getMonth();
    if (cat === 'monthly') {
      if (service.includes('TDS Payment')) return iso(new Date(y, m, 7));
      return iso(new Date(y, m, 20));
    }
    if (cat === 'quarterly') {
      return iso(new Date(y, m + 1, 31));
    }
    if (cat === 'annual') {
      if (service.includes('Audit')) return iso(new Date(y, 9, 31)); // 31 Oct
      return iso(new Date(y, 6, 31)); // 31 July
    }
    if (cat === 'weekly') {
      return iso(new Date(today.getTime() + 7 * 86400000));
    }
    return iso(new Date(today.getTime() + 14 * 86400000));
  };

  const getDefaultPeriod = (cat: TaskCategory) => {
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    if (cat === 'monthly') return prevMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (cat === 'quarterly') return 'Q2 (Jul - Sep 2026)';
    if (cat === 'annual') return 'FY 2025-26';
    if (cat === 'weekly') return `Week ${Math.ceil(today.getDate() / 7)} (${today.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`;
    return 'FY 2026-27';
  };

  const [period, setPeriod] = useState(getDefaultPeriod(initialCategory));
  const [dueDate, setDueDate] = useState(getDefaultDueDate(initialCategory, SERVICES_BY_CATEGORY[initialCategory][0] || ''));

  const handleCategoryChange = (newCat: TaskCategory) => {
    setCategory(newCat);
    const newService = SERVICES_BY_CATEGORY[newCat][0] || '';
    setFilingType(newService);
    setPeriod(getDefaultPeriod(newCat));
    setDueDate(getDefaultDueDate(newCat, newService));
  };

  const handleServiceChange = (service: string) => {
    setFilingType(service);
    setDueDate(getDefaultDueDate(category, service));
  };

  const chooseClient = (id: string) => {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      setGstin(c.gstin || '');
      setPhone(c.phone || '');
      if (c.assignedStaffId) setAssignedStaffId(c.assignedStaffId);
      if (c.monthlyAuditFee && c.monthlyAuditFee > 0 && estimatedFee === '') {
        setEstimatedFee(c.monthlyAuditFee);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const [y, m, d] = dueDate.split('-').map(Number);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysRemaining = Math.round((new Date(y, m - 1, d).getTime() - startOfToday.getTime()) / 86400000);

    const cleanFY = financialYear.replace(' (Current)', '').trim();
    const finalTitle = category === 'other' ? (assignmentTitle.trim() || 'Ad-hoc Assignment') : filingType;

    const newTask: MonthlyTask = {
      id: `task-custom-${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      tradeName: client.tradeName,
      gstin: gstin.toUpperCase(),
      filingType: finalTitle,
      category,
      assignmentTitle: category === 'other' ? finalTitle : undefined,
      financialYear: cleanFY,
      estimatedFee: Number(estimatedFee) || undefined,
      period,
      assignedStaffId,
      status,
      dueDate,
      daysRemaining,
      phone,
      notes: notes.trim() || undefined,
      lastUpdated: 'Just now',
      docsReceived: status !== 'Docs Pending',
      taxPayable: 0,
    };

    onAddTask(newTask);
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      icon={category === 'other' ? Briefcase : ListChecks}
      title={category === 'other' ? 'New client assignment' : 'New compliance task'}
      description="Create tasks and assignments for the firm."
      subheader={
        <Tabs
          className="border-b-0 -mb-px"
          value={category}
          onChange={handleCategoryChange}
          options={CATEGORY_OPTIONS}
        />
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-task-form">
            Create {category === 'other' ? 'Assignment' : 'Task'}
          </Button>
        </>
      }
    >
      <form id="new-task-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Client Selection */}
        <Field label="Client" required hint={clients.length === 0 ? 'Add the client on the Clients page first.' : undefined}>
          <Select required autoFocus value={clientId} onChange={(e) => chooseClient(e.target.value)}>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName} · {c.clientCode}
              </option>
            ))}
          </Select>
        </Field>

        {/* Identifiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="GSTIN" required>
            <Input required value={gstin} onChange={(e) => setGstin(e.target.value)} className="font-mono uppercase" placeholder="32AAAAA0000A1Z5" />
          </Field>
          <Field label="WhatsApp phone number" required>
            <Input required value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono" placeholder="10-digit mobile" />
          </Field>
        </div>

        {/* Dynamic Fields Based on Category */}
        {category === 'other' ? (
          <>
            <Field label="Assignment Title" required hint="Specialized assignment, incorporation, or secretarial work.">
              <Input
                required
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                placeholder="e.g. Share Transfer, Partnership Deed Amendment, Company Incorporation"
              />
            </Field>

            <Field label="Scope / Description">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scope of work, documents checklist, or client notes…"
              />
            </Field>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Service / Return" required>
              <Select value={filingType} onChange={(e) => handleServiceChange(e.target.value)}>
                {SERVICES_BY_CATEGORY[category].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Period / Month" required>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. October 2026" />
            </Field>
          </div>
        )}

        {/* FY, Due Date & Estimated Fee */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Financial Year" required hint="Supports past years back to 2021-22">
            <Select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
              {FINANCIAL_YEARS.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Due date" required>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="num" required />
          </Field>

          <Field label="Estimated Fee (₹)">
            <Input
              type="number"
              min="0"
              placeholder="Optional"
              value={estimatedFee}
              onChange={(e) => setEstimatedFee(e.target.value ? Number(e.target.value) : '')}
              className="font-mono num"
            />
          </Field>
        </div>

        {/* Owner & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Assigned Owner">
            <Select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)}>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as FilingStatus)}>
              <option value="Docs Pending">Docs Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Draft Ready">Draft Ready</option>
              <option value="Completed">Completed</option>
              <option value="Filed">Filed</option>
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
};

/** Mounts the form only while open, so its state resets on every open. */
export const NewTaskModal: React.FC<NewTaskModalProps> = (props) => (props.isOpen ? <NewTaskModalForm {...props} /> : null);
