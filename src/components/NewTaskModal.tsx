import React, { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from './ui';
import { MonthlyTask, StaffMember, FilingStatus } from '../types/crm';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  filingTypes?: string[];
  onAddTask: (task: MonthlyTask) => void;
}

const NewTaskModalForm: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  staffList,
  filingTypes = ['GSTR-1 (Sales)', 'GSTR-3B (Summary)', 'Statutory Audit', 'TDS Payment', 'PF & ESI', 'CMP-08', 'IFF'],
  onAddTask,
}) => {
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
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      icon={ListChecks}
      title="New compliance task"
      description="Assign a recurring GST, TDS or audit filing."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-task-form">
            Add Task
          </Button>
        </>
      }
    >
      <form id="new-task-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Client" required>
          <Input required autoFocus placeholder="Trade name" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="GSTIN" required>
            <Input required value={gstin} onChange={(e) => setGstin(e.target.value)} className="font-mono uppercase" />
          </Field>
          <Field label="WhatsApp number" required>
            <Input required value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Return">
            <Select value={filingType} onChange={(e) => setFilingType(e.target.value as any)}>
              {filingTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Period">
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="num" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Owner">
            <Select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)}>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as FilingStatus)}>
              <option value="Docs Pending">Docs Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Draft Ready">Draft Ready</option>
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
