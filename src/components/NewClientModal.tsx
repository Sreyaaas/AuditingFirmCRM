import React, { useEffect, useState } from 'react';
import { Building2, Pencil, Eye, EyeOff } from 'lucide-react';
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
  initialClient?: Client | null;
  onAddClient?: (newClient: Client) => Promise<void> | void;
  onUpdateClient?: (updatedClient: Client) => Promise<void> | void;
  onSaveClient?: (client: Client) => Promise<void> | void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  staffList,
  entityTypes,
  nextClientCode = 'C-001',
  clientToEdit,
  initialClient,
  onAddClient,
  onUpdateClient,
  onSaveClient,
}) => {
  const activeClient = clientToEdit || initialClient;
  const isEditing = !!activeClient;

  const [clientCode, setClientCode] = useState(activeClient ? activeClient.clientCode : nextClientCode);
  const [name, setName] = useState(activeClient ? activeClient.name : '');
  const [tradeName, setTradeName] = useState(activeClient ? activeClient.tradeName : '');
  const [entityType, setEntityType] = useState(activeClient ? activeClient.entityType : (entityTypes[0] || 'Private Limited'));
  const [gstin, setGstin] = useState(activeClient ? activeClient.gstin : '');
  const [pan, setPan] = useState(activeClient ? activeClient.pan : '');
  const [contactPerson, setContactPerson] = useState(activeClient ? activeClient.contactPerson : '');
  const [phone, setPhone] = useState(activeClient ? activeClient.phone : '+91 ');
  const [partnerName, setPartnerName] = useState(activeClient?.partnerName || '');
  const [partnerPhone, setPartnerPhone] = useState(activeClient?.partnerPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(activeClient?.secondaryPhone || '');
  const [email, setEmail] = useState(activeClient ? activeClient.email : '');
  const [city, setCity] = useState(activeClient ? activeClient.city : 'Kochi');
  const [monthlyAuditFee, setMonthlyAuditFee] = useState<number>(activeClient ? activeClient.monthlyAuditFee : 3000);
  const [assignedStaffId, setAssignedStaffId] = useState(activeClient ? activeClient.assignedStaffId : (staffList[0]?.id || 'staff-ameen'));
  const [isRecurringGST, setIsRecurringGST] = useState<boolean>(activeClient ? activeClient.isRecurringGST : true);
  const [isRecurringStatutory, setIsRecurringStatutory] = useState<boolean>(activeClient ? activeClient.isRecurringStatutory : false);
  const [oneDriveFolderUrl, setOneDriveFolderUrl] = useState<string>(activeClient ? activeClient.oneDriveFolderUrl : FIRM_ONEDRIVE_ROOT_URL);
  const [status, setStatus] = useState<'Active' | 'Archived' | 'On Hold'>(activeClient ? activeClient.status : 'Active');
  const [gstUsername, setGstUsername] = useState(activeClient?.gstUsername || '');
  const [gstPassword, setGstPassword] = useState(activeClient?.gstPassword || '');
  const [itUsername, setItUsername] = useState(activeClient?.itUsername || '');
  const [itPassword, setItPassword] = useState(activeClient?.itPassword || '');
  const [tracesPassword, setTracesPassword] = useState(activeClient?.tracesPassword || '');
  const [showGstPassword, setShowGstPassword] = useState(false);
  const [showItPassword, setShowItPassword] = useState(false);
  const [showTracesPassword, setShowTracesPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeClient) {
      setClientCode(activeClient.clientCode);
      setName(activeClient.name);
      setTradeName(activeClient.tradeName);
      setEntityType(activeClient.entityType);
      setGstin(activeClient.gstin);
      setPan(activeClient.pan);
      setContactPerson(activeClient.contactPerson);
      setPhone(activeClient.phone);
      setPartnerName(activeClient.partnerName || '');
      setPartnerPhone(activeClient.partnerPhone || '');
      setSecondaryPhone(activeClient.secondaryPhone || '');
      setEmail(activeClient.email);
      setCity(activeClient.city);
      setMonthlyAuditFee(activeClient.monthlyAuditFee);
      setAssignedStaffId(activeClient.assignedStaffId);
      setIsRecurringGST(activeClient.isRecurringGST);
      setIsRecurringStatutory(activeClient.isRecurringStatutory);
      setOneDriveFolderUrl(activeClient.oneDriveFolderUrl || FIRM_ONEDRIVE_ROOT_URL);
      setStatus(activeClient.status);
      setGstUsername(activeClient.gstUsername || '');
      setGstPassword(activeClient.gstPassword || '');
      setItUsername(activeClient.itUsername || '');
      setItPassword(activeClient.itPassword || '');
      setTracesPassword(activeClient.tracesPassword || '');
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
      setCity('Kochi');
      setMonthlyAuditFee(3000);
      setAssignedStaffId(staffList[0]?.id || 'staff-ameen');
      setIsRecurringGST(true);
      setIsRecurringStatutory(false);
      setOneDriveFolderUrl(FIRM_ONEDRIVE_ROOT_URL);
      setStatus('Active');
      setGstUsername('');
      setGstPassword('');
      setItUsername('');
      setItPassword('');
      setTracesPassword('');
    }
  }, [isOpen, clientToEdit, nextClientCode, entityTypes, staffList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);

    if (isEditing && activeClient) {
      const updated: Client = {
        ...activeClient,
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
        oneDriveFolderUrl: oneDriveFolderUrl.trim() || activeClient.oneDriveFolderUrl || FIRM_ONEDRIVE_ROOT_URL,
        status,
        gstUsername: gstUsername.trim() || undefined,
        gstPassword: gstPassword.trim() || undefined,
        itUsername: itUsername.trim() || undefined,
        itPassword: itPassword.trim() || undefined,
        tracesPassword: tracesPassword.trim() || undefined,
      };

      if (onUpdateClient) {
        await onUpdateClient(updated);
      } else if (onSaveClient) {
        await onSaveClient(updated);
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
        gstUsername: gstUsername.trim() || undefined,
        gstPassword: gstPassword.trim() || undefined,
        itUsername: itUsername.trim() || undefined,
        itPassword: itPassword.trim() || undefined,
        tracesPassword: tracesPassword.trim() || undefined,
      };

      if (onAddClient) {
        await onAddClient(newClient);
      } else if (onSaveClient) {
        await onSaveClient(newClient);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Secondary / Office phone (Optional)">
              <Input placeholder="Landline / Mobile 2" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Email">
              <Input type="email" placeholder="accounts@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="City">
              <Input placeholder="Kochi" value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
          </div>
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

        <section className="space-y-4 pt-5 border-t border-line">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Government Portal Access (Credentials)</div>
            <span className="text-2xs text-fg-subtle">Vault records</span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-fg block mb-2">GST Portal</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="GST Username">
                  <Input
                    placeholder="GSTIN or portal username"
                    value={gstUsername}
                    onChange={(e) => setGstUsername(e.target.value)}
                    className="font-mono"
                  />
                </Field>
                <Field label="GST Password">
                  <div className="relative">
                    <Input
                      type={showGstPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={gstPassword}
                      onChange={(e) => setGstPassword(e.target.value)}
                      className="font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGstPassword(!showGstPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg focus:outline-none cursor-pointer"
                      title={showGstPassword ? 'Hide password' : 'Show password'}
                    >
                      {showGstPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            <div className="pt-3 border-t border-line/60">
              <span className="text-xs font-semibold text-fg block mb-2">Income Tax e-Filing Portal</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="IT e-Filing Username">
                  <Input
                    placeholder="PAN or portal user ID"
                    value={itUsername}
                    onChange={(e) => setItUsername(e.target.value)}
                    className="font-mono"
                  />
                </Field>
                <Field label="IT e-Filing Password">
                  <div className="relative">
                    <Input
                      type={showItPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={itPassword}
                      onChange={(e) => setItPassword(e.target.value)}
                      className="font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowItPassword(!showItPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg focus:outline-none cursor-pointer"
                      title={showItPassword ? 'Hide password' : 'Show password'}
                    >
                      {showItPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            <div className="pt-3 border-t border-line/60">
              <span className="text-xs font-semibold text-fg block mb-2">TRACES TDS Portal</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="TRACES Password (Optional)">
                  <div className="relative">
                    <Input
                      type={showTracesPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={tracesPassword}
                      onChange={(e) => setTracesPassword(e.target.value)}
                      className="font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTracesPassword(!showTracesPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg focus:outline-none cursor-pointer"
                      title={showTracesPassword ? 'Hide password' : 'Show password'}
                    >
                      {showTracesPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
};

export const EditClientModal = NewClientModal;
