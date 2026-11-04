import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  FileSpreadsheet,
  Users,
  Receipt,
  PhoneCall,
  ShieldCheck,
  UserCheck,
  History,
  SlidersHorizontal,
  Database,
  X
} from 'lucide-react';
import { StaffMember, UserProfile } from '../types/crm';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  staffList?: StaffMember[];
  currentUser: UserProfile;
  selectedStaffId?: string | null;
  setSelectedStaffId?: (id: string | null) => void;
  monthlyTaskCount: number;
  itrCount: number;
  totalClientsCount: number;
  debtorsCount: number;
  gstOverdueCount?: number;
  unassignedTicketsCount?: number;
  onOpenIntegrations: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  monthlyTaskCount,
  itrCount,
  totalClientsCount,
  debtorsCount,
  gstOverdueCount = 0,
  unassignedTicketsCount = 0,
  onOpenIntegrations,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const isAdmin = currentUser.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'gst-tracker', label: 'Deadlines & Filings', icon: ShieldCheck, badge: gstOverdueCount > 0 ? `${gstOverdueCount} due` : null, badgeUrgent: true },
    { id: 'monthly', label: 'Monthly Work', icon: CalendarCheck, badge: monthlyTaskCount },
    { id: 'itr', label: 'ITR', icon: FileSpreadsheet, badge: itrCount },
    { id: 'clients', label: 'Client Accounts', icon: Users, badge: totalClientsCount },
    { id: 'debtors', label: 'Debtors', icon: Receipt, badge: debtorsCount },
    { id: 'staff', label: 'Calls & Tickets', icon: PhoneCall, badge: unassignedTicketsCount > 0 ? `${unassignedTicketsCount} pool` : null },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="w-64 min-h-screen bg-[#FBFBFD] dark:bg-[#161618] border-r border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col justify-between p-3 select-none text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors">
      <div className="space-y-4">
        {/* Practice Identity / Official Firm Brand */}
        <div className="px-3 pt-2 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {/* Light mode crisp letterhead */}
              <img
                src="/logo-light.png"
                alt="Shameer and Associates - Accountants and Practitioners"
                className="h-10 w-auto object-contain block dark:hidden max-w-[200px]"
              />
              {/* Dark mode crisp silver-white letterhead */}
              <img
                src="/logo-dark.png"
                alt="Shameer and Associates - Accountants and Practitioners"
                className="h-10 w-auto object-contain hidden dark:block max-w-[200px]"
              />
            </div>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-[6px]"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-0.5">
          <div className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] px-2.5 py-1 tracking-wider uppercase">
            Workflows
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-[13px] transition-colors ${isActive
                    ? 'bg-[#EBF4FC] text-[#0071E3] font-semibold dark:bg-[#0071E3]/20 dark:text-[#2997FF]'
                    : 'text-[#1D1D1F] dark:text-[#E5E5EA] hover:bg-[#F2F2F7] dark:hover:bg-[#242426]'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 stroke-[1.5] ${isActive ? 'text-[#0071E3] dark:text-[#2997FF]' : 'text-[#6E6E73] dark:text-[#8E8E93]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`font-tabular text-[11px] px-1.5 py-0.5 rounded shrink-0 ml-2 ${item.badgeUrgent
                        ? 'bg-[#FF3B30]/10 text-[#FF3B30] font-semibold dark:bg-[#FF453A]/20 dark:text-[#FF453A]'
                        : isActive
                          ? 'text-[#0071E3] font-semibold dark:text-[#2997FF]'
                          : 'text-[#6E6E73] dark:text-[#8E8E93]'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Admin Tools */}
          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-0.5">
              <div className="text-[11px] font-semibold text-[#86868B] dark:text-[#6E6E73] px-2.5 py-1 tracking-wider uppercase">
                Administration
              </div>

              <button
                onClick={() => handleSelectTab('employees')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-[13px] transition-colors ${activeTab === 'employees'
                    ? 'bg-[#EBF4FC] text-[#0071E3] font-semibold dark:bg-[#0071E3]/20 dark:text-[#2997FF]'
                    : 'text-[#1D1D1F] dark:text-[#E5E5EA] hover:bg-[#F2F2F7] dark:hover:bg-[#242426]'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserCheck className={`w-4 h-4 shrink-0 stroke-[1.5] ${activeTab === 'employees' ? 'text-[#0071E3] dark:text-[#2997FF]' : 'text-[#6E6E73] dark:text-[#8E8E93]'}`} />
                  <span className="truncate">Employees</span>
                </div>
                <span className="font-tabular text-[11px] text-[#6E6E73] dark:text-[#8E8E93] shrink-0 ml-2">5</span>
              </button>

              <button
                onClick={() => handleSelectTab('activity')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-[13px] transition-colors ${activeTab === 'activity'
                    ? 'bg-[#EBF4FC] text-[#0071E3] font-semibold dark:bg-[#0071E3]/20 dark:text-[#2997FF]'
                    : 'text-[#1D1D1F] dark:text-[#E5E5EA] hover:bg-[#F2F2F7] dark:hover:bg-[#242426]'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <History className={`w-4 h-4 shrink-0 stroke-[1.5] ${activeTab === 'activity' ? 'text-[#0071E3] dark:text-[#2997FF]' : 'text-[#6E6E73] dark:text-[#8E8E93]'}`} />
                  <span className="truncate">Activity Log</span>
                </div>
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-1">
        <button
          onClick={onOpenIntegrations}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[12px] rounded-[6px] text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Cloud Sync</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]"></span>
        </button>

        {isAdmin && (
          <button
            onClick={() => handleSelectTab('settings')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] rounded-[6px] transition-colors ${activeTab === 'settings'
                ? 'bg-[#EBF4FC] text-[#0071E3] font-semibold dark:bg-[#0071E3]/20 dark:text-[#2997FF]'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F2F2F7] dark:hover:bg-[#242426]'
              }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Settings</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay & Sliding Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
