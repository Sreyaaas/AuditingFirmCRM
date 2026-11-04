import React, { useState } from 'react';
import { 
  Plus, 
  KeyRound, 
  Search, 
  X
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/crm';

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

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Employee Accounts &amp; Permissions
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            Staff directory, role assignments, and client allocation
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
        <div>
          <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Total Staff</div>
          <div className="font-tabular text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
            {profiles.length}
          </div>
          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">{activeCount} active</div>
        </div>

        <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
          <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">Audit Employees</div>
          <div className="font-tabular text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
            {employeeCount}
          </div>
          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Assigned to clients</div>
        </div>

        <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
          <div className="text-[12px] text-[#0071E3] dark:text-[#2997FF]">Administrators</div>
          <div className="font-tabular text-[22px] font-semibold text-[#0071E3] dark:text-[#2997FF] mt-0.5">
            {adminCount}
          </div>
          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Full access</div>
        </div>

        <div className="border-l border-[#E5E5EA] dark:border-[#2C2C2E] pl-4">
          <div className="text-[12px] text-[#34C759]">Access Isolation</div>
          <div className="text-[15px] font-semibold text-[#34C759] mt-1">
            Active
          </div>
          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">Database RLS enforced</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1C1C1E] p-3 border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px]">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#F2F2F7] dark:bg-[#242426] px-2.5 py-1.5 rounded-[6px]">
          <Search className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#8E8E93] shrink-0 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Search employee by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-[13px] bg-transparent focus:outline-none placeholder:text-[#86868B] text-[#1D1D1F] dark:text-[#F5F5F7]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#6E6E73] hover:text-[#1D1D1F]">
              <X className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-2.5 py-1 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="employee">Employees</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] text-[12px] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#FBFBFD] dark:bg-[#161618] text-[#6E6E73] dark:text-[#8E8E93] text-[12px] border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Employee</th>
                <th className="py-2.5 px-3 font-semibold">Designation</th>
                <th className="py-2.5 px-3 font-semibold">Contact</th>
                <th className="py-2.5 px-3 font-semibold text-center">Role</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-center">Assigned Clients</th>
                <th className="py-2.5 px-3 font-semibold text-center">Tasks Done</th>
                <th className="py-2.5 px-3 font-semibold">Joined</th>
                {currentUser.role === 'admin' && (
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
              {filteredProfiles.map((emp) => {
                const isCurrentUser = emp.id === currentUser.id;
                const isUserAdmin = emp.role === 'admin';

                return (
                  <tr key={emp.id} className="hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] font-medium text-[11px] flex items-center justify-center shrink-0">
                          {emp.initials || emp.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5">
                            <span>{emp.name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93]">
                                (You)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] font-tabular">{emp.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {emp.designation}
                    </td>

                    <td className="py-2.5 px-3 font-tabular text-[#6E6E73] dark:text-[#8E8E93] text-[12px]">
                      {emp.phone || '—'}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                        isUserAdmin
                          ? 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF]'
                          : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93]'
                      }`}>
                        {isUserAdmin ? 'Admin' : 'Employee'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                        emp.status === 'Active'
                          ? 'bg-[#34C759]/10 text-[#34C759]'
                          : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                      }`}>
                        {emp.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center font-tabular font-medium">
                      {emp.assignedClientsCount}
                    </td>

                    <td className="py-2.5 px-3 text-center font-tabular text-[#6E6E73] dark:text-[#8E8E93]">
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">{emp.completedThisMonth}</span>
                      <span> / {emp.assignedTasksCount}</span>
                    </td>

                    <td className="py-2.5 px-3 font-tabular text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                      {emp.joinedDate}
                    </td>

                    {currentUser.role === 'admin' && (
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setResetModalUser(emp)}
                            title="Reset password"
                            className="p-1 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>

                          {!isCurrentUser && (
                            <button
                              onClick={() => onToggleStatus(emp.id)}
                              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                                emp.status === 'Active'
                                  ? 'text-[#FF3B30] hover:bg-[#FF3B30]/10'
                                  : 'text-[#34C759] hover:bg-[#34C759]/10'
                              }`}
                            >
                              {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Add Employee Account
                </h3>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                  Create staff login credentials and role
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@shameerassociates.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none focus:border-[#0071E3] text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    required
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98200 00000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                  Account Type
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] focus:outline-none text-[#1D1D1F] dark:text-[#F5F5F7]"
                >
                  <option value="employee">Employee (Assigned clients only)</option>
                  <option value="admin">Administrator (Full practice access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Reset Access Password
              </h3>
              <button onClick={() => setResetModalUser(null)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <div className="py-4 text-[13px] text-[#6E6E73] dark:text-[#8E8E93] space-y-2">
              <p>
                Generate a temporary login credential for <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">{resetModalUser.email}</strong>?
              </p>
              <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] font-tabular text-[12px]">
                Temporary Code: <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold">SA-{Math.floor(100000 + Math.random() * 900000)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-3 py-1.5 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetPassword(resetModalUser.id);
                  setResetModalUser(null);
                }}
                className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
