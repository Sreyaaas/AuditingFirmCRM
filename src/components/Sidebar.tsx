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
  Database,
  X,
  type LucideIcon,
} from 'lucide-react';
import { StaffMember, UserProfile } from '../types/crm';
import { cn, StatusDot } from './ui';

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
  onOpenIntegrations,
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
    { id: 'debtors', label: 'Debtors', icon: Wallet, count: debtorsCount },
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
          active ? 'bg-surface text-fg font-medium shadow-xs ring-1 ring-line' : 'text-fg-muted hover:text-fg hover:bg-hover'
        )}
      >
        <Icon
          className={cn('w-4 h-4 shrink-0', active ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted')}
          strokeWidth={1.75}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {item.alert ? (
          <span className="num inline-flex items-center gap-1 text-2xs font-medium text-danger">
            <StatusDot tone="danger" />
            {item.alert}
          </span>
        ) : item.count !== undefined && item.count !== null ? (
          <span className={cn('num text-2xs', active ? 'text-fg-muted' : 'text-fg-faint')}>{item.count}</span>
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
      {/* Brand — h-14 to align with the header hairline */}
      <div className="h-14 px-4 border-b border-line flex items-center justify-between shrink-0">
        <div className="flex items-center min-w-0">
          <img src="/logo-light.png" alt="Shameer & Associates — Accountants and Practitioners" className="h-7 w-auto object-contain block dark:hidden max-w-[176px]" />
          <img src="/logo-dark.png" alt="Shameer & Associates — Accountants and Practitioners" className="h-7 w-auto object-contain hidden dark:block max-w-[176px]" />
        </div>
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
        {isAdmin && section('Practice', admin)}
      </nav>

      <div className="px-3 py-3 border-t border-line shrink-0">
        {isAdmin ? (
          <button
            onClick={onOpenIntegrations}
            className="w-full h-8 flex items-center gap-2.5 px-2.5 rounded-md text-xs text-fg-subtle hover:text-fg hover:bg-hover transition-colors"
          >
            <Database className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="flex-1 text-left">Cloud sync</span>
            <StatusDot tone="success" title="Connected" />
          </button>
        ) : (
          <div className="h-8 flex items-center gap-2.5 px-2.5 text-xs text-fg-subtle">
            <StatusDot tone="success" />
            <span className="flex-1">Connected</span>
            <span className="ident text-2xs text-fg-faint">v2.0</span>
          </div>
        )}
      </div>
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
