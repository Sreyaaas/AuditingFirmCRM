import React, { useEffect, useState } from 'react';
import { Building2, Pencil } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from './ui';
import { Client, StaffMember, EntityType } from '../types/crm';
import { FIRM_ONEDRIVE_ROOT_URL } from '../services/firmConfigService';

export interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  entityTypes: string[];
  nextClientCode?: string;
  clientToEdit?: Client | null;
  onAddClient?: (newClient: Client) => Promise<void>;
  onUpdateClient?: (updatedClient: Client) => Promise<void>;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  staffList,
  entityTypes,
  nextClientCode = 'C-001',
  clientToEdit,
  onAddClient,
  onUpdateClient,
}) => {
  const isEditing = !!clientToEdit;

  const [clientCode, setClientCode] = useState(clientToEdit ? clientToEdit.clientCode : nextClientCode);
  const [name, setName] = useState(clientToEdit ? clientToEdit.name : '');
  const [tradeName, setTradeName] = useState(clientToEdit ? clientToEdit.tradeName : '');
  const [entityType, setEntityType] = useState(clientToEdit ? clientToEdit.entityType : (entityTypes[0] || 'Private Limited'));
  const [gstin, setGstin] = useState(clientToEdit ? clientToEdit.gstin : '');
  const [pan, setPan] = useState(clientToEdit ? clientToEdit.pan : '');
  const [contactPerson, setContactPerson] = useState(clientToEdit ? clientToEdit.contactPerson : '');
  const [phone, setPhone] = useState(clientToEdit ? clientToEdit.phone : '+91 ');
  const [partnerName, setPartnerName] = useState(clientToEdit?.partnerName || '');
  const [partnerPhone, setPartnerPhone] = useState(clientToEdit?.partnerPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(clientToEdit?.secondaryPhone || '');
  const [email, setEmail] = useState(clientToEdit ? clientToEdit.email : '');
  const [city, setCity] = useState(clientToEdit ? clientToEdit.city : 'Kerala');
  const [monthlyAuditFee, setMonthlyAuditFee] = useState<number>(clientToEdit ? clientToEdit.monthlyAuditFee : 3000);
  const [assignedStaffId, setAssignedStaffId] = useState(clientToEdit ? clientToEdit.assignedStaffId : (staffList[0]?.id || 'staff-ameen'));
  const [isRecurringGST, setIsRecurringGST] = useState<boolean>(clientToEdit ? clientToEdit.isRecurringGST : true);
  const [isRecurringStatutory, setIsRecurringStatutory] = useState<boolean>(clientToEdit ? clientToEdit.isRecurringStatutory : false);
  const [oneDriveFolderUrl, setOneDriveFolderUrl] = useState<string>(clientToEdit ? clientToEdit.oneDriveFolderUrl : FIRM_ONEDRIVE_ROOT_URL);
  const [status, setStatus] = useState<'Active' | 'Archived' | 'On Hold'>(clientToEdit ? clientToEdit.status : 'Active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setClientCode(clientToEdit.clientCode);
      setName(clientToEdit.name);
      setTradeName(clientToEdit.tradeName);
      setEntityType(clientToEdit.entityType);
      setGstin(clientToEdit.gstin);
      setPan(clientToEdit.pan);
      setContactPerson(clientToEdit.contactPerson);
      setPhone(clientToEdit.phone);
      setPartnerName(clientToEdit.partnerName || '');
      setPartnerPhone(clientToEdit.partnerPhone || '');
      setSecondaryPhone(clientToEdit.secondaryPhone || '');
      setEmail(clientToEdit.email);
      setCity(clientToEdit.city);
      setMonthlyAuditFee(clientToEdit.monthlyAuditFee);
      setAssignedStaffId(clientToEdit.assignedStaffId);
      setIsRecurringGST(clientToEdit.isRecurringGST);
      setIsRecurringStatutory(clientToEdit.isRecurringStatutory);
      setOneDriveFolderUrl(clientToEdit.oneDriveFolderUrl || FIRM_ONEDRIVE_ROOT_URL);
      setStatus(clientToEdit.status);
    } else if (isOpen) {
      setClientCode(nextClientCode);
      setName('');
      setTradeName('');
      setEntityType(entityTypes[0] || 'Private Limited');
      setGstin('');
      setPan('');
      setContactPerson('');
      setPhone('+91 ');
      setPartnerName('');
      setPartnerPhone('');
      setSecondaryPhone('');
      setEmail('');
      setCity('Kerala');
      setMonthlyAuditFee(3000);
      setAssignedStaffId(staffList[0]?.id || 'staff-ameen');
      setIsRecurringGST(true);
      setIsRecurringStatutory(false);
      setOneDriveFolderUrl(FIRM_ONEDRIVE_ROOT_URL);
      setStatus('Active');
    }
  }, [isOpen, clientToEdit, nextClientCode, entityTypes, staffList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);

    if (isEditing && clientToEdit) {
      const updated: Client = {
        ...clientToEdit,
        clientCode: clientCode.trim(),
        name: name.trim(),
        tradeName: (tradeName.trim() || name.trim()),
        entityType: entityType as EntityType,
        gstin: gstin.trim().toUpperCase(),
        pan: (pan.trim().toUpperCase() || (gstin.length >= 12 ? gstin.slice(2, 12).toUpperCase() : '')),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        partnerName: partnerName.trim() || undefined,
        partnerPhone: partnerPhone.trim() || undefined,
        secondaryPhone: secondaryPhone.trim() || undefined,
        email: email.trim(),
        isRecurringGST,
        isRecurringStatutory,
        assignedStaffId,
        monthlyAuditFee: Number(monthlyAuditFee) || 0,
        city: city.trim(),
        oneDriveFolderUrl: oneDriveFolderUrl.trim() || clientToEdit.oneDriveFolderUrl || FIRM_ONEDRIVE_ROOT_URL,
        status,
      };

      if (onUpdateClient) {
        await onUpdateClient(updated);
      }
    } else {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        clientCode: clientCode.trim(),
        name: name.trim(),
        tradeName: (tradeName.trim() || name.trim()),
        entityType: entityType as EntityType,
        gstin: gstin.trim().toUpperCase(),
        pan: (pan.trim().toUpperCase() || (gstin.length >= 12 ? gstin.slice(2, 12).toUpperCase() : '')),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        partnerName: partnerName.trim() || undefined,
        partnerPhone: partnerPhone.trim() || undefined,
        secondaryPhone: secondaryPhone.trim() || undefined,
        email: email.trim(),
        isRecurringGST,
        isRecurringStatutory,
        assignedStaffId,
        monthlyAuditFee: Number(monthlyAuditFee) || 0,
        city: city.trim(),
        oneDriveFolderUrl: oneDriveFolderUrl.trim() || FIRM_ONEDRIVE_ROOT_URL,
        status,
      };

      if (onAddClient) {
        await onAddClient(newClient);
      }
    }

    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={isEditing ? Pencil : Building2}
      title={isEditing ? `Edit client · ${tradeName || name}` : 'New client'}
      description={isEditing ? 'Update client registration, contact information, and service arrangements.' : 'Adds the client to the CRM.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="client-form" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Client'}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-4">
          <div className="eyebrow">Entity Information</div>
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
          <div className="eyebrow">Work, Fees & Settings</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Monthly fee (₹)">
              <Input type="number" min="0" step="500" value={monthlyAuditFee} onChange={(e) => setMonthlyAuditFee(Number(e.target.value))} className="num font-mono" />
            </Field>
            <Field label="Owner / Assigned Staff">
              <Select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)}>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role.includes('Partner') ? 'Partner' : 'Staff'}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Field label="Recurring GST Filing">
              <Select value={isRecurringGST ? 'yes' : 'no'} onChange={(e) => setIsRecurringGST(e.target.value === 'yes')}>
                <option value="yes">Yes · Monthly GST returns required</option>
                <option value="no">No · Annual / non-GST client</option>
              </Select>
            </Field>

            <Field label="Account Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Archived">Archived</option>
              </Select>
            </Field>
          </div>

          <Field label="SharePoint / OneDrive Folder URL" hint="Cloud folder link for this client's documents">
            <Input
              value={oneDriveFolderUrl}
              onChange={(e) => setOneDriveFolderUrl(e.target.value)}
              placeholder="https://shameerassociates.sharepoint.com/clients/..."
              className="font-mono text-xs"
            />
          </Field>
        </section>
      </form>
    </Modal>
  );
};

export const EditClientModal = NewClientModal;
