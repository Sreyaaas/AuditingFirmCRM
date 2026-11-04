import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Sun, 
  Moon, 
  Check, 
  ChevronDown,
  Shield,
  Command,
  Menu,
  LogOut
} from 'lucide-react';
import { UserProfile } from '../types/crm';

interface HeaderProps {
  activeTab: string;
  onOpenCommandPalette: () => void;
  currentUser: UserProfile;
  profiles: UserProfile[];
  onSwitchUser: (userId: string) => void;
  onLogout?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenNewTask: () => void;
  onOpenIntegrations: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenCommandPalette,
  currentUser,
  profiles,
  onSwitchUser,
  onLogout,
  theme,
  onToggleTheme,
  onOpenNewTask,
  onToggleMobileSidebar,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isAdmin = currentUser.role === 'admin';

  const tabMeta: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Firm Overview', subtitle: 'Shameer & Associates • FY 2026-27' },
    'gst-tracker': { title: 'Upcoming Deadlines & Filings', subtitle: 'GST & Statutory Compliance' },
    monthly: { title: 'Monthly Work (GST & Audit)', subtitle: 'Recurring Practice Filings' },
    itr: { title: 'Annual Tax Returns (ITR)', subtitle: 'Assessment Year 2026-27' },
    clients: { title: 'Client Accounts', subtitle: 'Registered Practice Entities' },
    debtors: { title: 'Money Owed to Us', subtitle: 'Client Fee Accounts & Collections' },
    staff: { title: 'Client Calls & Follow-ups', subtitle: 'Inbound Inquiries & Workload Queue' },
    employees: { title: 'Employee Management', subtitle: 'Staff Accounts & Access Controls' },
    activity: { title: 'Activity History & Audit Trail', subtitle: 'Immutable System Activity' },
    settings: { title: 'Firm Settings', subtitle: 'Practice Parameters & Setup' },
  };

  const currentTabInfo = tabMeta[activeTab] || { title: 'Firm Overview', subtitle: 'Shameer & Associates' };

  return (
    <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      {/* Left: Mobile hamburger + Active Screen Title & Practice Context */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 -ml-1 text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] rounded-[6px]"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 stroke-[1.5]" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight truncate">
            {currentTabInfo.title}
          </h1>
          <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] truncate hidden sm:block">
            {currentTabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center: Apple Spotlight Search Bar */}
      <div className="flex-1 max-w-md mx-4 lg:mx-8 hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full h-9 px-3 rounded-[6px] bg-[#F2F2F7] dark:bg-[#242426] border border-transparent hover:border-[#D1D1D6] dark:hover:border-[#3A3A3C] flex items-center justify-between text-[13px] text-[#86868B] transition-colors group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-[#86868B] group-hover:text-[#1D1D1F] dark:group-hover:text-[#F5F5F7] shrink-0" strokeWidth={1.5} />
            <span className="truncate">Search clients, tasks, or jump to...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[#86868B] bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded shrink-0">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Dark Mode, User Session, Primary Action */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="md:hidden p-1.5 text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] rounded-[6px]"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4 stroke-[1.5]" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          className="w-8 h-8 rounded-[6px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex items-center justify-center transition-colors"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 stroke-[1.5]" />
          ) : (
            <Sun className="w-4 h-4 stroke-[1.5]" />
          )}
        </button>

        {/* User Session Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] border border-[#E5E5EA] dark:border-[#2C2C2E] transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-[#0071E3] text-white text-[10px] font-semibold flex items-center justify-center">
              {currentUser.initials || currentUser.name.slice(0, 1)}
            </span>
            <span className="font-medium hidden sm:inline max-w-[110px] truncate">
              {currentUser.name}
            </span>
            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93] hidden xl:inline">
              {isAdmin ? 'Admin' : 'Staff'}
            </span>
            <ChevronDown className="w-3 h-3 text-[#86868B] stroke-[1.5]" />
          </button>

          {/* User Popover Menu with Backdrop */}
          {isUserMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsUserMenuOpen(false)} 
              />
              <div 
                className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-[#1C1C1E] rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl z-50 p-1.5 text-[13px] animate-in fade-in duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E] mb-1">
                  <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    {isAdmin && <Shield className="w-3 h-3 text-[#0071E3] stroke-[1.5]" />}
                  </div>
                  <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] truncate">{currentUser.email}</div>
                  <div className="text-[11px] text-[#86868B] mt-0.5">{currentUser.designation}</div>
                </div>

                <div className="px-3 py-1 text-[10px] font-semibold text-[#86868B] dark:text-[#6E6E73] uppercase tracking-wider">
                  Switch Active User
                </div>

                <div className="space-y-0.5">
                  {profiles.map((p) => {
                    const isSelected = p.id === currentUser.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSwitchUser(p.id);
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-[5px] transition-colors text-left ${
                          isSelected 
                            ? 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] font-semibold' 
                            : 'text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="text-[11px] text-[#86868B] capitalize">{p.role} • {p.designation}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0071E3] shrink-0 stroke-[1.5]" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 mt-1 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-[5px] text-[12px] text-[#FF3B30] dark:text-[#FF453A] hover:bg-[#FF3B30]/10 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenNewTask}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-[6px] transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" />
          <span>Add Task</span>
        </button>
      </div>
    </header>
  );
};
