import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from './ui';
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

  // Keep the suggested code in sync when the dialog is reopened after a client was added.
  useEffect(() => {
    if (isOpen) setClientCode(nextClientCode);
  }, [isOpen, nextClientCode]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={Building2}
      title="New client"
      description="Creates the client account and syncs it to the practice database."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-client-form" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Client'}
          </Button>
        </>
      }
    >
      <form id="new-client-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-4">
          <div className="eyebrow">Entity</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Client code" required>
              <Input required value={clientCode} onChange={(e) => setClientCode(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Legal name" required className="sm:col-span-2">
              <Input required placeholder="Havos (P) Ltd" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Trade name" hint="Shown across the CRM. Defaults to legal name.">
              <Input placeholder="Havos" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
            </Field>
            <Field label="Entity type">
              <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                {entityTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="GSTIN" hint="15 characters">
              <Input placeholder="32AAAAA0000A1Z5" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className="font-mono uppercase" />
            </Field>
            <Field label="PAN" hint="Derived from GSTIN if left blank">
              <Input placeholder="AAAAA0000A" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} className="font-mono uppercase" />
            </Field>
          </div>
        </section>

        <section className="space-y-4 pt-5 border-t border-line">
          <div className="eyebrow">Contact</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact person">
              <Input placeholder="Managing Director" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </Field>
            <Field label="WhatsApp number">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Email" className="sm:col-span-2">
              <Input type="email" placeholder="accounts@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="City">
              <Input placeholder="Kochi" value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-4 pt-5 border-t border-line">
          <div className="eyebrow">Engagement</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Monthly fee (₹)">
              <Input type="number" min="0" step="500" value={monthlyAuditFee} onChange={(e) => setMonthlyAuditFee(Number(e.target.value))} className="num" />
            </Field>
            <Field label="Owner">
              <Select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)}>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role.includes('Partner') ? 'Partner' : 'Staff'}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-fg">
              <input type="checkbox" checked={isRecurringGST} onChange={(e) => setIsRecurringGST(e.target.checked)} className="h-3.5 w-3.5" />
              Monthly GST (GSTR-1 &amp; 3B)
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-fg">
              <input type="checkbox" checked={isRecurringStatutory} onChange={(e) => setIsRecurringStatutory(e.target.checked)} className="h-3.5 w-3.5" />
              Statutory audit
            </label>
          </div>
        </section>
      </form>
    </Modal>
  );
};
