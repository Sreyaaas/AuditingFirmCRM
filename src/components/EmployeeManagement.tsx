import React, { useState } from 'react';
import { Plus, KeyRound, UserPlus, MoreHorizontal } from 'lucide-react';
import { UserProfile, UserRole } from '../types/crm';
import type { NewMemberInput } from '../services/authService';
import { MIN_PASSWORD_LENGTH, passwordProblem } from '../services/authService';
import type { AppPreferences } from '../services/firmConfigService';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  Menu,
  Metric,
  MetricGrid,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  Select,
  TableCard,
  Toolbar,
  cn,
  formatDate,
} from './ui';

interface EmployeeManagementProps {
  currentUser: UserProfile;
  profiles: UserProfile[];
  preferences: AppPreferences;
  onAddEmployee: (input: NewMemberInput) => Promise<{ error?: string }>;
  onToggleStatus: (userId: string) => Promise<{ error?: string }>;
  onUpdateEmployee: (userId: string, patch: Partial<UserProfile>) => void;
  onSetPassword: (userId: string, password: string) => Promise<{ error?: string }>;
  onSelectEmployeeWork?: (employeeName: string) => void;
}

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }> = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn('relative inline-flex h-[18px] w-8 shrink-0 rounded-full transition-colors disabled:opacity-40', checked ? 'bg-ink' : 'bg-muted')}
  >
    <span className={cn('absolute top-[2px] left-[2px] h-[14px] w-[14px] rounded-full bg-surface shadow-sm transition-transform', checked && 'translate-x-[14px]')} />
  </button>
);

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  currentUser,
  profiles,
  preferences,
  onAddEmployee,
  onToggleStatus,
  onUpdateEmployee,
  onSetPassword,
  onSelectEmployeeWork,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'employee'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', designation: 'Audit & Tax Executive', phone: '', password: '', role: 'employee' as UserRole });
  const [fees, setFees] = useState({ view: preferences.newStaffCanViewFees, record: preferences.newStaffCanRecordPayments });
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [passwordFor, setPasswordFor] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const filtered = profiles.filter((p) => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return [p.name, p.email, p.designation, p.phone].some((v) => (v || '').toLowerCase().includes(q));
  });

  const openAdd = () => {
    setForm({ name: '', email: '', designation: 'Audit & Tax Executive', phone: '', password: '', role: 'employee' });
    setFees({ view: preferences.newStaffCanViewFees, record: preferences.newStaffCanRecordPayments });
    setAddError(null);
    setIsAddOpen(true);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(form.password);
    if (problem) return setAddError(problem);
    setAdding(true);
    setAddError(null);
    const res = await onAddEmployee({
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      canAccessFinancials: form.role === 'admin' || fees.view,
      canEditPayments: form.role === 'admin' || fees.record,
    });
    setAdding(false);
    if (res.error) return setAddError(res.error);
    setIsAddOpen(false);
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordFor) return;
    const problem = passwordProblem(newPassword);
    if (problem) return setPwError(problem);
    setSavingPw(true);
    setPwError(null);
    const res = await onSetPassword(passwordFor.id, newPassword);
    setSavingPw(false);
    if (res.error) return setPwError(res.error);
    setPasswordFor(null);
  };

  const activeCount = profiles.filter((p) => p.status === 'Active').length;
  const adminCount = profiles.filter((p) => p.role === 'admin' && p.status === 'Active').length;
  const feeAccessCount = profiles.filter((p) => p.status === 'Active' && p.role !== 'admin' && p.canAccessFinancials).length;

  return (
    <div className="space-y-4">
      <PageHeader
        section="employees" title="Team"
        description="Logins, roles and what each person can see"
        actions={
          <Button variant="primary" icon={Plus} onClick={openAdd}>
            Add Member
          </Button>
        }
      />

      <MetricGrid className="grid-cols-2 lg:grid-cols-4">
        <Metric label="Members" value={profiles.length} hint={`${activeCount} can sign in`} />
        <Metric label="Administrators" value={adminCount} hint="Full access" />
        <Metric label="Staff with fee access" value={feeAccessCount} hint="Can open Debtors" />
        <Metric label="Inactive" value={profiles.length - activeCount} hint="Blocked from signing in" />
      </MetricGrid>

      <TableCard
        toolbar={
          <Toolbar className="justify-between">
            <SearchInput
              placeholder="Name, email or designation"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-full sm:w-64"
              className="h-7 text-xs"
            />
            <div className="flex items-center gap-2">
              <Segmented
                size="sm"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'admin', label: 'Admins' },
                  { value: 'employee', label: 'Staff' },
                ]}
              />
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-7 text-xs w-auto">
                <option value="all">Any status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </div>
          </Toolbar>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[240px]">Member</th>
              <th>Role</th>
              <th className="text-center">View fees</th>
              <th className="text-center">Record payments</th>
              <th className="text-right">Clients</th>
              <th className="text-right">Tasks done</th>
              <th>Status</th>
              <th>Joined</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="!h-auto">
                  <EmptyState title="No members match these filters" />
                </td>
              </tr>
            )}
            {filtered.map((emp) => {
              const isSelf = emp.id === currentUser.id;
              const isAdminRow = emp.role === 'admin';
              const inactive = emp.status !== 'Active';
              return (
                <tr key={emp.id}>
                  <td className="py-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={emp.initials || emp.name.slice(0, 2).toUpperCase()} seed={emp.name} size="sm" />
                      <div className="min-w-0">
                        <button
                          onClick={() => onSelectEmployeeWork?.(emp.name)}
                          className={cn('font-medium hover:underline underline-offset-2 text-left', inactive ? 'text-fg-muted' : 'text-fg')}
                          title="View assigned work"
                        >
                          {emp.name}
                          {isSelf && <span className="ml-1.5 text-xs font-normal text-fg-subtle">You</span>}
                        </button>
                        <div className="text-xs text-fg-subtle truncate">
                          {emp.designation} · {emp.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Select
                      value={emp.role}
                      disabled={isSelf}
                      onChange={(e) => {
                        const role = e.target.value as UserRole;
                        onUpdateEmployee(emp.id, role === 'admin' ? { role, canAccessFinancials: true, canEditPayments: true } : { role });
                      }}
                      className="h-7 text-xs w-[124px]"
                      aria-label={`Role for ${emp.name}`}
                    >
                      <option value="employee">Staff</option>
                      <option value="admin">Administrator</option>
                    </Select>
                  </td>
                  <td className="text-center">
                    <Toggle
                      label={`Fee access for ${emp.name}`}
                      checked={isAdminRow || emp.canAccessFinancials}
                      disabled={isAdminRow}
                      onChange={(v) => onUpdateEmployee(emp.id, v ? { canAccessFinancials: true } : { canAccessFinancials: false, canEditPayments: false })}
                    />
                  </td>
                  <td className="text-center">
                    <Toggle
                      label={`Payment recording for ${emp.name}`}
                      checked={isAdminRow || emp.canEditPayments}
                      disabled={isAdminRow || !emp.canAccessFinancials}
                      onChange={(v) => onUpdateEmployee(emp.id, { canEditPayments: v })}
                    />
                  </td>
                  <td className="num text-right">{emp.assignedClientsCount}</td>
                  <td className="num text-right whitespace-nowrap">
                    {emp.completedThisMonth}
                    <span className="text-fg-subtle"> / {emp.assignedTasksCount}</span>
                  </td>
                  <td>
                    <Badge tone={inactive ? 'neutral' : 'success'} dot>
                      {emp.status}
                    </Badge>
                  </td>
                  <td className="num text-fg-muted whitespace-nowrap">{formatDate(emp.joinedDate)}</td>
                  <td className="text-right">
                    <div className="relative inline-block">
                      <IconButton icon={MoreHorizontal} label={`Actions for ${emp.name}`} size="sm" onClick={() => setMenuFor(menuFor === emp.id ? null : emp.id)} />
                      <Menu
                        open={menuFor === emp.id}
                        onClose={() => setMenuFor(null)}
                        align="right"
                        items={[
                          { value: 'password', label: 'Set password', icon: KeyRound },
                          ...(isSelf ? [] : [{ value: 'status', label: inactive ? 'Activate' : 'Deactivate', danger: !inactive }]),
                        ]}
                        onSelect={(v) => {
                          if (v === 'password') {
                            setPasswordFor(emp);
                            setNewPassword('');
                            setPwError(null);
                          }
                          if (v === 'status') onToggleStatus(emp.id);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        size="sm"
        icon={UserPlus}
        title="Add team member"
        description="Creates a login. Share the password privately; they can change it after signing in."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="add-member-form" disabled={adding}>
              {adding ? 'Creating…' : 'Create Login'}
            </Button>
          </>
        }
      >
        <form id="add-member-form" onSubmit={submitAdd} className="space-y-4">
          {addError && <p className="text-sm text-danger">{addError}</p>}
          <Field label="Full name" required>
            <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Work email" required>
            <Input type="email" required placeholder="name@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Initial password" required hint={`At least ${MIN_PASSWORD_LENGTH} characters, letters and numbers.`}>
            <Input type="text" required autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Designation" required>
              <Input required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input placeholder="+91 98200 00000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="font-mono" />
            </Field>
          </div>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value="employee">Staff</option>
              <option value="admin">Administrator — full access</option>
            </Select>
          </Field>
          {form.role === 'employee' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between gap-3 text-sm text-fg">
                Can view fees (Debtors)
                <Toggle label="Can view fees" checked={fees.view} onChange={(v) => setFees({ view: v, record: v ? fees.record : false })} />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm text-fg">
                Can record payments and bills
                <Toggle label="Can record payments" checked={fees.record} disabled={!fees.view} onChange={(v) => setFees({ ...fees, record: v })} />
              </div>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={!!passwordFor}
        onClose={() => setPasswordFor(null)}
        size="sm"
        icon={KeyRound}
        title="Set password"
        description={passwordFor ? `New password for ${passwordFor.name} (${passwordFor.email})` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPasswordFor(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="set-password-form" disabled={savingPw}>
              {savingPw ? 'Saving…' : 'Set Password'}
            </Button>
          </>
        }
      >
        <form id="set-password-form" onSubmit={submitPassword} className="space-y-3">
          {pwError && <p className="text-sm text-danger">{pwError}</p>}
          <Field label="New password" required hint="They will use this the next time they sign in.">
            <Input type="text" required autoFocus autoComplete="off" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="font-mono" />
          </Field>
        </form>
      </Modal>
    </div>
  );
};
