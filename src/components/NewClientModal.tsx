import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from './ui';
import { Client, StaffMember } from '../types/crm';
import { FIRM_ONEDRIVE_ROOT_URL } from '../services/firmConfigService';

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
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Kerala');
  const [monthlyAuditFee, setMonthlyAuditFee] = useState<number>(3000);
  const [assignedStaffId, setAssignedStaffId] = useState(staffList[0]?.id || 'staff-ameen');
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
      partnerName: partnerName.trim() || undefined,
      partnerPhone: partnerPhone.trim() || undefined,
      secondaryPhone: secondaryPhone.trim() || undefined,
      email: email.trim(),
      isRecurringGST: true,
      isRecurringStatutory: false,
      assignedStaffId,
      monthlyAuditFee: Number(monthlyAuditFee) || 0,
      city: city.trim(),
      oneDriveFolderUrl: FIRM_ONEDRIVE_ROOT_URL,
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
      description="Adds the client to the CRM."
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
          <div className="eyebrow">Contact & Partners</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact person (Primary)">
              <Input placeholder="Managing Director / Name" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </Field>
            <Field label="Primary WhatsApp number" required>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono" placeholder="+91 98470 12345" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Partner / Director name (Optional)">
              <Input placeholder="Partner 2 / Director name" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
            </Field>
            <Field label="Partner WhatsApp number (Optional)">
              <Input placeholder="+91 94470 12345" value={partnerPhone} onChange={(e) => setPartnerPhone(e.target.value)} className="font-mono" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Secondary / Office phone (Optional)">
              <Input placeholder="Landline / Mobile 2" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <Input type="email" placeholder="accounts@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
          <Field label="City">
            <Input placeholder="Kochi" value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
        </section>

        <section className="space-y-4 pt-5 border-t border-line">
          <div className="eyebrow">Work & fees</div>
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
        </section>
      </form>
    </Modal>
  );
};
