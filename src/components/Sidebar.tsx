import React from 'react';
import {
  LayoutGrid,
  CalendarClock,
  ListChecks,
  FileText,
  Building2,
  Wallet,
  PhoneCall,
  Users,
  History,
  Settings2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { StaffMember, UserProfile } from '../types/crm';
import { BrandLogo, cn } from './ui';

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
  /** Admins, and staff granted fee access, see Debtors. */
  canViewFees?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number | null;
  alert?: number | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  staffList = [],
  currentUser,
  monthlyTaskCount,
  itrCount,
  totalClientsCount,
  debtorsCount,
  gstOverdueCount = 0,
  unassignedTicketsCount = 0,
  canViewFees = true,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const isAdmin = currentUser.role === 'admin';

  const workspace: NavItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
    { id: 'gst-tracker', label: 'Deadlines', icon: CalendarClock, alert: gstOverdueCount || null },
    { id: 'monthly', label: 'GST & Audit', icon: ListChecks, count: monthlyTaskCount },
    { id: 'itr', label: 'ITR Returns', icon: FileText, count: itrCount },
  ];

  const relationships: NavItem[] = [
    { id: 'clients', label: 'Clients', icon: Building2, count: totalClientsCount },
    ...(canViewFees ? [{ id: 'debtors', label: 'Debtors', icon: Wallet, count: debtorsCount }] : []),
    { id: 'staff', label: 'Calls & Tickets', icon: PhoneCall, alert: unassignedTicketsCount || null },
  ];

  const admin: NavItem[] = [
    { id: 'employees', label: 'Team', icon: Users, count: staffList.length },
    { id: 'activity', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  const select = (tabId: string) => {
    setActiveTab(tabId);
    onCloseMobile?.();
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => select(item.id)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group w-full h-8 flex items-center gap-2.5 px-2.5 rounded-md text-sm transition-colors',
          active ? 'bg-accent/[0.09] text-fg font-medium' : 'text-fg-muted hover:text-fg hover:bg-hover'
        )}
      >
        <Icon
          className={cn('w-4 h-4 shrink-0', active ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted')}
          strokeWidth={1.75}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {item.alert ? (
          <span className="num text-2xs font-semibold text-danger">{item.alert}</span>
        ) : item.count !== undefined && item.count !== null ? (
          <span className={cn('num text-2xs', active ? 'text-accent font-medium' : 'text-fg-faint')}>{item.count}</span>
        ) : null}
      </button>
    );
  };

  const section = (title: string, items: NavItem[]) => (
    <div className="space-y-px">
      <div className="eyebrow px-2.5 pb-1.5">{title}</div>
      {items.map(renderItem)}
    </div>
  );

  const content = (
    <div className="w-60 h-full bg-canvas border-r border-line flex flex-col select-none">
      {/* Brand — h-16 to align with the header hairline */}
      <div className="h-16 px-4 border-b border-line flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => select('dashboard')}
          className="flex items-center min-w-0 rounded-sm -ml-0.5 focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label="Go to Overview"
          title="Overview"
        >
          <BrandLogo size="md" />
        </button>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden h-7 w-7 inline-flex items-center justify-center rounded-md text-fg-subtle hover:text-fg hover:bg-hover"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {section('Workspace', workspace)}
        {section('Relationships', relationships)}
        {isAdmin && section('Admin', admin)}
      </nav>

    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-full">{content}</aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40 animate-fade-in" onClick={onCloseMobile} />
          <div className="relative z-10 h-full shadow-dialog animate-slide-in-left">{content}</div>
        </div>
      )}
    </>
  );
};
