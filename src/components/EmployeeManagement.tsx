import React, { useState } from 'react';
import { Plus, KeyRound, UserPlus } from 'lucide-react';
import { UserProfile, UserRole } from '../types/crm';
import { Avatar, Badge, Button, EmptyState, Field, IconButton, Input, Metric, MetricGrid, Modal, PageHeader, SearchInput, Segmented, Select, TableCard, Toolbar, cn, formatDate } from './ui';

interface EmployeeManagementProps {
  currentUser: UserProfile;
  profiles: UserProfile[];
  onAddEmployee: (profile: Omit<UserProfile, 'id' | 'assignedClientsCount' | 'assignedTasksCount' | 'completedThisMonth'>) => void;
  onToggleStatus: (userId: string) => void;
  onUpdateRole: (userId: string, newRole: UserRole) => void;
  onResetPassword: (userId: string) => void;
  onSelectEmployeeWork?: (employeeName: string) => void;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  currentUser,
  profiles,
  onAddEmployee,
  onToggleStatus,
  onUpdateRole,
  onResetPassword,
  onSelectEmployeeWork,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'employee'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  // Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDesignation, setNewDesignation] = useState('Audit & Accounts Associate');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [canEditPayments, setCanEditPayments] = useState(false);

  // Reset Password Confirmation Modal
  const [resetModalUser, setResetModalUser] = useState<UserProfile | null>(null);

  const filteredProfiles = profiles.filter((p) => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.designation.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    onAddEmployee({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      designation: newDesignation.trim(),
      phone: newPhone.trim() || '+91 98200 00000',
      status: 'Active',
      joinedDate: new Date().toISOString().slice(0, 10),
      canEditPayments: newRole === 'admin' ? true : canEditPayments,
      canAccessFinancials: newRole === 'admin',
      initials: newName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewDesignation('Audit & Accounts Associate');
    setNewRole('employee');
    setCanEditPayments(false);
  };

  const activeCount = profiles.filter((p) => p.status === 'Active').length;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const employeeCount = profiles.filter((p) => p.role === 'employee').length;

  const isAdminViewer = currentUser.role === 'admin';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Team"
        description="Staff accounts, roles and client allocation"
        actions={
          isAdminViewer && (
            <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
              Add Member
            </Button>
          )
        }
      />

      <MetricGrid className="grid-cols-2 lg:grid-cols-4">
        <Metric label="Members" value={profiles.length} hint={`${activeCount} active`} />
        <Metric label="Staff" value={employeeCount} hint="Access to assigned clients" />
        <Metric label="Administrators" value={adminCount} hint="Full practice access" />
        <Metric label="Row-level security" value="On" tone="success" hint="Enforced in the database" />
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
              <th>Designation</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th className="text-right">Clients</th>
              <th className="text-right">Tasks done</th>
              <th>Joined</th>
              {isAdminViewer && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 && (
              <tr>
                <td colSpan={9} className="!h-auto">
                  <EmptyState title="No members match these filters" />
                </td>
              </tr>
            )}
            {filteredProfiles.map((emp) => {
              const isCurrentUser = emp.id === currentUser.id;
              const isUserAdmin = emp.role === 'admin';

              return (
                <tr key={emp.id} className={cn(emp.status !== 'Active' && 'opacity-60')}>
                  <td className="py-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={emp.initials || emp.name.slice(0, 2).toUpperCase()} size="sm" />
                      <div className="min-w-0">
                        <button
                          onClick={() => onSelectEmployeeWork?.(emp.name)}
                          className="font-medium text-fg hover:underline underline-offset-2 text-left"
                          title="View assigned work"
                        >
                          {emp.name}
                          {isCurrentUser && <span className="ml-1.5 text-xs font-normal text-fg-subtle">You</span>}
                        </button>
                        <div className="text-xs text-fg-subtle truncate">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-fg-muted">{emp.designation}</td>
                  <td className="ident text-fg-muted whitespace-nowrap">{emp.phone || '—'}</td>
                  <td>
                    <Badge tone={isUserAdmin ? 'info' : 'neutral'}>{isUserAdmin ? 'Admin' : 'Staff'}</Badge>
                  </td>
                  <td>
                    <Badge tone={emp.status === 'Active' ? 'success' : 'neutral'} dot>
                      {emp.status}
                    </Badge>
                  </td>
                  <td className="num text-right text-fg">{emp.assignedClientsCount}</td>
                  <td className="num text-right whitespace-nowrap">
                    <span className="text-fg">{emp.completedThisMonth}</span>
                    <span className="text-fg-subtle"> / {emp.assignedTasksCount}</span>
                  </td>
                  <td className="num text-fg-muted whitespace-nowrap">{formatDate(emp.joinedDate)}</td>
                  {isAdminViewer && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton icon={KeyRound} label="Reset password" size="sm" onClick={() => setResetModalUser(emp)} />
                        {!isCurrentUser && (
                          <Button size="sm" variant={emp.status === 'Active' ? 'ghost' : 'secondary'} onClick={() => onToggleStatus(emp.id)}>
                            {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        size="sm"
        icon={UserPlus}
        title="Add team member"
        description="Creates a login and assigns a role."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="add-member-form">
              Create Account
            </Button>
          </>
        }
      >
        <form id="add-member-form" onSubmit={handleCreateSubmit} className="space-y-4">
          <Field label="Full name" required>
            <Input required placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </Field>
          <Field label="Work email" required>
            <Input type="email" required placeholder="name@shameerassociates.in" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Designation" required>
              <Input required value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input placeholder="+91 98200 00000" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="font-mono" />
            </Field>
          </div>
          <Field label="Role">
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
              <option value="employee">Staff — assigned clients only</option>
              <option value="admin">Administrator — full practice access</option>
            </Select>
          </Field>
          {newRole === 'employee' && (
            <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
              <input type="checkbox" checked={canEditPayments} onChange={(e) => setCanEditPayments(e.target.checked)} className="h-3.5 w-3.5" />
              Allow recording client payments
            </label>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        size="sm"
        icon={KeyRound}
        title="Reset password"
        description={resetModalUser ? `Issue a temporary credential for ${resetModalUser.email}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetModalUser(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (resetModalUser) onResetPassword(resetModalUser.id);
                setResetModalUser(null);
              }}
            >
              Reset Password
            </Button>
          </>
        }
      >
        {resetModalUser && (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">
              {resetModalUser.name} will be asked to set a new password at next sign-in.
            </p>
            <div className="flex items-center justify-between h-10 px-3 rounded-md border border-line bg-subtle text-sm">
              <span className="text-fg-subtle">Temporary code</span>
              <span className="ident text-sm font-medium text-fg">SA-{Math.floor(100000 + Math.random() * 900000)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
