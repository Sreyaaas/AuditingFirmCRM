import React, { useState } from 'react';
import { MessageSquare, ArrowUpRight, Plus, FileCheck, Trash2 } from 'lucide-react';
import { ITRFiling, StaffMember, ITRStatus, EntityType, Client } from '../types/crm';
import { Avatar, Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Label, Metric, MetricGrid, Modal, PageHeader, Pagination, SearchInput, Segmented, Select, TableCard, Toolbar, cn, formatINR } from './ui';

interface ITRFilingsManagerProps {
  itrFilings: ITRFiling[];
  staffList: StaffMember[];
  clients?: Client[];
  selectedStaffId: string | null;
  onOpenWhatsApp: (itr: ITRFiling) => void;
  onSelectClient: (clientId: string) => void;
  onUpdateITRStatus: (id: string, newStatus: ITRStatus, ackNo?: string) => void;
  onAddITR?: (newITR: Omit<ITRFiling, 'id' | 'lastActivity'>) => void;
  /** Administrators only. */
  onDelete?: (id: string) => void;
  /** e.g. "AY 2026-27" — default for new returns. */
  assessmentYear?: string;
  /** Returns due within this many days are flagged. */
  dueSoonDays?: number;
}

export const ITRFilingsManager: React.FC<ITRFilingsManagerProps> = ({
  itrFilings,
  staffList,
  clients = [],
  selectedStaffId,
  onOpenWhatsApp,
  onSelectClient,
  onUpdateITRStatus,
  onDelete,
  onAddITR,
  assessmentYear = 'AY 2026-27',
  dueSoonDays = 10,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ITRFiling | null>(null);
  const [ackModalItem, setAckModalItem] = useState<ITRFiling | null>(null);
  const [ackInput, setAckInput] = useState('');

  // Add Form State
  const [formClientId, setFormClientId] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formPAN, setFormPAN] = useState('');
  const [formEntityType, setFormEntityType] = useState<EntityType>('Private Limited');
  const [formITRForm, setFormITRForm] = useState<'ITR-1' | 'ITR-2' | 'ITR-3' | 'ITR-4' | 'ITR-5' | 'ITR-6'>('ITR-6');
  const [formAY, setFormAY] = useState(assessmentYear);
  const [formDueDate, setFormDueDate] = useState('2026-11-16');
  const [formIsRefund, setFormIsRefund] = useState(false);
  const [formTaxAmount, setFormTaxAmount] = useState('25000');
  const [formRegime, setFormRegime] = useState<'New Regime (115BAC)' | 'Old Regime'>('New Regime (115BAC)');
  const [formStaffId, setFormStaffId] = useState(staffList[0]?.id || 'staff-ameen');
  const [formPhone, setFormPhone] = useState('+91 98470 12345');
  const [formStatus, setFormStatus] = useState<ITRStatus>('Draft Computation');
  const [formAckNo, setFormAckNo] = useState('');

  const itemsPerPage = 10;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper: Compute countdown & priority
  const getDeadlineMeta = (dueDateStr: string, status: ITRStatus) => {
    if (status === 'Filed & e-Verified') {
      return {
        daysLeft: 0,
        level: 'completed' as const,
        score: 4,
        label: 'Filed',
        color: 'text-success',
      };
    }

    try {
      const [y, m, d] = dueDateStr.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          daysLeft: diffDays,
          level: 'overdue' as const,
          score: 1, // Highest priority: comes on top
          label: `${Math.abs(diffDays)}d overdue`,
          color: 'text-danger',
        };
      }

      if (diffDays <= dueSoonDays) {
        return {
          daysLeft: diffDays,
          level: 'urgent' as const,
          score: 2, // High priority: due within 10 days
          label: diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`,
          color: 'text-warning',
        };
      }

      return {
        daysLeft: diffDays,
        level: 'upcoming' as const,
        score: 3,
        label: `Due in ${diffDays}d`,
        color: 'text-fg-muted',
      };
    } catch {
      return {
        daysLeft: 999,
        level: 'upcoming' as const,
        score: 3,
        label: 'Pending',
        color: 'text-fg-muted',
      };
    }
  };

  // Format date readable
  const formatReadableDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Process and sort list:
  // 1. Overdue on top (score 1)
  // 2. Due within 10 days (score 2)
  // 3. Upcoming (score 3)
  // 4. Completed / Filed (score 4)
  const processedList = itrFilings.map((item) => ({
    ...item,
    meta: getDeadlineMeta(item.dueDate, item.status),
  }));

  const filteredList = processedList
    .filter((item) => {
      if (selectedStaffId && item.assignedStaffId !== selectedStaffId) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.meta.level !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.clientName.toLowerCase().includes(q) ||
          item.pan.toLowerCase().includes(q) ||
          item.entityType.toLowerCase().includes(q) ||
          item.itrForm.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.meta.score !== b.meta.score) {
        return a.meta.score - b.meta.score;
      }
      return a.meta.daysLeft - b.meta.daysLeft;
    });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStaff = (id: string) => staffList.find((s) => s.id === id);

  // Metric Tallies
  const overdueCount = processedList.filter((i) => i.meta.level === 'overdue').length;
  const urgentCount = processedList.filter((i) => i.meta.level === 'urgent').length;
  const filedCount = processedList.filter((i) => i.status === 'Filed & e-Verified').length;
  const docsPendingCount = processedList.filter((i) => i.status === 'Docs Pending').length;

  // Handle Quick Client Autocomplete in Add Form
  const handleSelectPredefinedClient = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setFormClientId(selectedId);
    if (!selectedId) return;
    const client = clients.find((c) => c.id === selectedId);
    if (client) {
      setFormClientName(client.name);
      setFormPAN(client.pan);
      setFormEntityType(client.entityType);
      setFormPhone(client.phone);
      if (client.entityType === 'Private Limited') setFormITRForm('ITR-6');
      else if (client.entityType === 'LLP' || client.entityType === 'Partnership') setFormITRForm('ITR-5');
      else setFormITRForm('ITR-3');
    }
  };

  // Submit New ITR Entry
  const handleSubmitAddITR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formClientName.trim()) return;

    const taxAmountNumber = parseFloat(formTaxAmount) || 0;
    const finalTaxPosition = formIsRefund ? -Math.abs(taxAmountNumber) : Math.abs(taxAmountNumber);

    const newRecord: Omit<ITRFiling, 'id' | 'lastActivity'> = {
      clientId: formClientId,
      clientName: formClientName.trim(),
      pan: formPAN.trim().toUpperCase() || 'AABCA0000A',
      entityType: formEntityType,
      itrForm: formITRForm,
      assessmentYear: formAY,
      financialYear: 'FY 2025-26',
      assignedStaffId: formStaffId,
      status: formStatus,
      dueDate: formDueDate,
      regime: formRegime,
      taxLiabilityOrRefund: finalTaxPosition,
      acknowledgmentNo: formStatus === 'Filed & e-Verified' ? (formAckNo || `ACK982${Math.floor(100000000 + Math.random() * 900000000)}`) : undefined,
      phone: formPhone.trim() || '+91 98200 00000',
    };

    if (onAddITR) {
      onAddITR(newRecord);
    }

    setIsAddModalOpen(false);
    setFormClientName('');
    setFormClientId('');
    setFormPAN('');
    setFormTaxAmount('25000');
    setFormDueDate('2026-11-16');
  };

  // Submit Ack Modal
  const handleSubmitAck = (e: React.FormEvent) => {
    e.preventDefault();
    if (ackModalItem) {
      onUpdateITRStatus(ackModalItem.id, 'Filed & e-Verified', ackInput.trim() || undefined);
      setAckModalItem(null);
      setAckInput('');
    }
  };

  const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'Docs Pending', label: 'Docs pending' },
    { value: 'Draft Computation', label: 'Computation' },
    { value: 'Client Confirmed', label: 'Approved' },
    { value: 'Filed & e-Verified', label: 'Filed' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="ITR Returns"
        description={`${assessmentYear} · Income tax returns, most urgent first`}
        actions={
          <>
            <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
              Add Return
            </Button>
          </>
        }
      />

      <MetricGrid className="grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Total returns"
          value={itrFilings.length}
          hint="AY 2026–27"
          onClick={() => {
            setPriorityFilter('all');
            setStatusFilter('all');
          }}
        />
        <Metric
          label="Overdue"
          value={overdueCount}
          tone={overdueCount > 0 ? 'danger' : undefined}
          hint={overdueCount > 0 ? 'Action required' : 'None overdue'}
          onClick={() => {
            setPriorityFilter('overdue');
            setStatusFilter('all');
          }}
        />
        <Metric
          label="Due within 10 days"
          value={urgentCount}
          tone={urgentCount > 0 ? 'warning' : undefined}
          hint="Approaching cut-off"
          onClick={() => {
            setPriorityFilter('urgent');
            setStatusFilter('all');
          }}
        />
        <Metric
          label="Filed & verified"
          value={filedCount}
          tone="success"
          hint={`${docsPendingCount} awaiting documents`}
          onClick={() => {
            setStatusFilter('Filed & e-Verified');
            setPriorityFilter('all');
          }}
        />
      </MetricGrid>

      <TableCard
        toolbar={
          <Toolbar className="justify-between">
            <Segmented
              size="sm"
              value={priorityFilter === 'all' ? statusFilter : '__none'}
              onChange={(v) => {
                setStatusFilter(v);
                setPriorityFilter('all');
                setCurrentPage(1);
              }}
              options={statusTabs}
            />
            <div className="flex items-center gap-2">
              <Select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-7 text-xs w-auto"
              >
                <option value="all">All priorities</option>
                <option value="overdue">Overdue</option>
                <option value="urgent">Due within 10 days</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Filed</option>
              </Select>
              <SearchInput
                placeholder="Client, PAN or form"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                wrapperClassName="w-40 sm:w-52"
                className="h-7 text-xs"
              />
            </div>
          </Toolbar>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredList.length}
            pageSize={itemsPerPage}
            onChange={setCurrentPage}
            noun="returns"
          />
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[220px]">Client</th>
              <th>Form</th>
              <th>Due</th>
              <th className="text-right">Tax position</th>
              <th>Owner</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="!h-auto">
                  <EmptyState title="No returns match these filters" description="Change the status, priority or search term." />
                </td>
              </tr>
            ) : (
              paginatedList.map((itr) => {
                const staff = getStaff(itr.assignedStaffId);
                const isRefund = itr.taxLiabilityOrRefund < 0;

                return (
                  <tr key={itr.id}>
                    <td className="py-2">
                      <button
                        onClick={() => onSelectClient(itr.clientId)}
                        className="block max-w-[240px] truncate text-left font-medium text-fg hover:underline underline-offset-2"
                      >
                        {itr.clientName}
                      </button>
                      <div className="ident text-fg-subtle mt-0.5">
                        {itr.pan} · {itr.assessmentYear}
                      </div>
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      <div className="text-fg">{itr.itrForm}</div>
                      <div className="text-xs text-fg-subtle">{itr.entityType}</div>
                    </td>
                    <td className="py-2 whitespace-nowrap num">
                      <div className="text-fg">{formatReadableDate(itr.dueDate)}</div>
                      <div className={cn('text-xs font-medium', itr.meta.color)}>{itr.meta.label}</div>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <div className="num font-medium text-fg">
                        {formatINR(Math.abs(itr.taxLiabilityOrRefund))}
                        <span className={cn('ml-1 text-2xs font-normal', isRefund ? 'text-success' : 'text-fg-subtle')}>
                          {isRefund ? 'refund' : 'payable'}
                        </span>
                      </div>
                      <div className="text-xs text-fg-subtle">{itr.regime.includes('New') ? 'New regime · 115BAC' : 'Old regime'}</div>
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {staff && <Avatar initials={staff.initials} seed={staff.name} size="xs" />}
                        <span className={staff ? 'text-fg' : 'text-fg-faint'}>{staff?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <Select
                        value={itr.status}
                        onChange={(e) => {
                          const newSt = e.target.value as ITRStatus;
                          if (newSt === 'Filed & e-Verified') {
                            setAckModalItem(itr);
                            setAckInput(itr.acknowledgmentNo || '');
                          } else {
                            onUpdateITRStatus(itr.id, newSt);
                          }
                        }}
                        className={cn(
                          'h-7 text-xs w-[140px] font-medium',
                          itr.status === 'Filed & e-Verified' && 'text-success',
                          itr.status === 'Docs Pending' && 'text-warning'
                        )}
                      >
                        <option value="Docs Pending">Docs pending</option>
                        <option value="26AS Reconciled">26AS reconciled</option>
                        <option value="Draft Computation">Computation</option>
                        <option value="Client Confirmed">Approved</option>
                        <option value="Filed & e-Verified">Filed &amp; verified</option>
                      </Select>
                      {itr.acknowledgmentNo && (
                        <div className="ident text-2xs text-fg-subtle mt-1 truncate max-w-[140px]" title={itr.acknowledgmentNo}>
                          {itr.acknowledgmentNo}
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={MessageSquare}
                          onClick={() => onOpenWhatsApp(itr)}
                          className="h-7 text-xs font-medium"
                        >
                          {itr.status === 'Filed & e-Verified' ? 'Ack' : 'WhatsApp'}
                        </Button>
                        <IconButton icon={ArrowUpRight} label="View client account" size="sm" onClick={() => onSelectClient(itr.clientId)} />
                        {onDelete && <IconButton icon={Trash2} label="Delete return" size="sm" className="hover:text-danger" onClick={() => setConfirmDelete(itr)} />}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {/* Add return */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add annual return"
        description="Deadline priority is calculated automatically from the due date."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="itr-add-form">
              Save Return
            </Button>
          </>
        }
      >
        <form id="itr-add-form" onSubmit={handleSubmitAddITR} className="space-y-4">
          {clients.length > 0 && (
            <Field label="Client" required hint="PAN, entity and phone are filled from the client record.">
              <Select required onChange={handleSelectPredefinedClient} value={formClientId}>
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.pan})
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client name" required>
              <Input required placeholder="Havos (P) Ltd" value={formClientName} onChange={(e) => setFormClientName(e.target.value)} />
            </Field>
            <Field label="PAN" required>
              <Input
                required
                maxLength={10}
                placeholder="AABCH4910K"
                value={formPAN}
                onChange={(e) => setFormPAN(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Entity type">
              <Select value={formEntityType} onChange={(e) => setFormEntityType(e.target.value as EntityType)}>
                <option value="Private Limited">Private Limited</option>
                <option value="Partnership">Partnership</option>
                <option value="LLP">LLP</option>
                <option value="Proprietorship">Proprietorship</option>
                <option value="Individual">Individual</option>
              </Select>
            </Field>
            <Field label="ITR form">
              <Select value={formITRForm} onChange={(e) => setFormITRForm(e.target.value as any)}>
                <option value="ITR-6">ITR-6 · Company</option>
                <option value="ITR-5">ITR-5 · Firm / LLP</option>
                <option value="ITR-4">ITR-4 · Presumptive</option>
                <option value="ITR-3">ITR-3 · Business</option>
                <option value="ITR-2">ITR-2 · Capital gains</option>
                <option value="ITR-1">ITR-1 · Salaried</option>
              </Select>
            </Field>
            <Field label="Assessment year">
              <Select value={formAY} onChange={(e) => setFormAY(e.target.value)}>
                {[assessmentYear, ...[-1, 1].map((d) => {
                  const y = Number(assessmentYear.slice(3, 7)) + d;
                  return `AY ${y}-${String((y + 1) % 100).padStart(2, '0')}`;
                })].sort().map((ay) => (
                  <option key={ay} value={ay}>
                    {ay}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Due date" required>
              <Input type="date" required value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="num" />
            </Field>
            <Field label="WhatsApp number">
              <Input placeholder="+91 98470 12345" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="font-mono" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="mb-0">Tax position (₹)</Label>
                <Segmented
                  size="sm"
                  value={formIsRefund ? 'refund' : 'tax'}
                  onChange={(v) => setFormIsRefund(v === 'refund')}
                  options={[
                    { value: 'tax', label: 'Payable' },
                    { value: 'refund', label: 'Refund' },
                  ]}
                  className="p-px"
                />
              </div>
              <Input type="number" min="0" placeholder="0" value={formTaxAmount} onChange={(e) => setFormTaxAmount(e.target.value)} className="num" />
            </div>
            <Field label="Tax regime">
              <Select value={formRegime} onChange={(e) => setFormRegime(e.target.value as any)}>
                <option value="New Regime (115BAC)">New regime (Sec 115BAC)</option>
                <option value="Old Regime">Old regime</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Owner">
              <Select value={formStaffId} onChange={(e) => setFormStaffId(e.target.value)}>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)}>
                <option value="Draft Computation">Computation</option>
                <option value="Docs Pending">Docs pending</option>
                <option value="26AS Reconciled">26AS reconciled</option>
                <option value="Client Confirmed">Approved</option>
                <option value="Filed & e-Verified">Filed &amp; verified</option>
              </Select>
            </Field>
          </div>

          {formStatus === 'Filed & e-Verified' && (
            <Field label="ITR-V acknowledgement no.">
              <Input placeholder="ACK982001245901" value={formAckNo} onChange={(e) => setFormAckNo(e.target.value)} className="font-mono" />
            </Field>
          )}
        </form>
      </Modal>

      {/* Acknowledgement */}
      <Modal
        isOpen={!!ackModalItem}
        onClose={() => setAckModalItem(null)}
        size="sm"
        icon={FileCheck}
        title="Record acknowledgement"
        description={ackModalItem ? `ITR-V reference for ${ackModalItem.clientName}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAckModalItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="itr-ack-form">
              Mark as Filed
            </Button>
          </>
        }
      >
        <form id="itr-ack-form" onSubmit={handleSubmitAck}>
          <Field label="ITR-V acknowledgement no." hint="As issued by the Income Tax e-filing portal." required>
            <Input required autoFocus value={ackInput} onChange={(e) => setAckInput(e.target.value)} className="font-mono" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this return?"
        description="This permanently removes the ITR return and its status history."
        confirmLabel="Delete Return"
        danger
        onConfirm={() => confirmDelete && onDelete?.(confirmDelete.id)}
      />
    </div>
  );
};
