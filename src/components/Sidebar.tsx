import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutGrid,
  CalendarClock,
  CalendarRange,
  Briefcase,
  ListChecks,
  FileText,
  Building2,
  Wallet,
  ReceiptText,
  PhoneCall,
  Users,
  History,
  Settings2,
  X,
  ChevronRight,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { StaffMember, UserProfile, TaskCategory } from '../types/crm';
import { BrandLogo, SECTIONS, cn, type SectionId } from './ui';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  staffList?: StaffMember[];
  currentUser: UserProfile;
  selectedStaffId?: string | null;
  setSelectedStaffId?: (id: string | null) => void;
  monthlyTaskCount: number;
  quarterlyTaskCount?: number;
  itrCount: number;
  otherAssignmentsCount?: number;
  totalClientsCount: number;
  debtorsCount: number;
  invoicesCount?: number;
  gstOverdueCount?: number;
  unassignedTicketsCount?: number;
  /** Admins, and staff granted fee access, see Debtors. */
  canViewFees?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenNewTaskWithService?: (category: TaskCategory, serviceName: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number | null;
  alert?: number | null;
}

interface FlyoutEntry {
  category: TaskCategory;
  title: string;
  items: Array<{
    label: string;
    serviceName: string;
    hint?: string;
  }>;
}

const FLYOUT_CONFIG: Record<string, FlyoutEntry> = {
  monthly: {
    category: 'monthly',
    title: 'Monthly Compliance',
    items: [
      { label: 'GST', serviceName: 'GST (GSTR-1 / 3B)', hint: 'GSTR-1 & 3B' },
      { label: 'TDS payment', serviceName: 'TDS Payment', hint: 'Challan 281' },
      { label: 'PF filing', serviceName: 'PF Filing', hint: 'ECR monthly return' },
      { label: 'ESI filing', serviceName: 'ESI Filing', hint: 'Monthly return' },
      { label: 'Accounting and Bookkeeping', serviceName: 'Accounting & Bookkeeping', hint: 'Monthly write-up' },
      { label: 'Monthly MIS report', serviceName: 'Monthly MIS Report', hint: 'Executive reporting' },
    ],
  },
  quarterly: {
    category: 'quarterly',
    title: 'Quarterly Compliance',
    items: [
      { label: 'GST (QRMP / CMP-08)', serviceName: 'GST (QRMP / CMP-08)', hint: 'Quarterly return' },
      { label: 'TDS (24Q / 26Q / 27Q)', serviceName: 'TDS Return (26Q - Non-Salary)', hint: 'TDS quarterly returns' },
    ],
  },
  itr: {
    category: 'annual',
    title: 'Annual Compliance',
    items: [
      { label: 'Income tax return', serviceName: 'ITR - Individual', hint: 'Individual, Business, Tax audit, Company' },
      { label: 'Audit', serviceName: 'Tax Audit (3CA/3CB-3CD)', hint: 'Tax audit, Statutory audit, GSTR 9, GSTR 9C' },
      { label: 'ROC Compliance', serviceName: 'ROC (AOC-4 & MGT-7)', hint: 'AOC 4 & MGT 7/7A, DPT 3' },
    ],
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  staffList = [],
  currentUser,
  monthlyTaskCount,
  quarterlyTaskCount,
  itrCount,
  otherAssignmentsCount,
  totalClientsCount,
  debtorsCount,
  invoicesCount,
  gstOverdueCount = 0,
  unassignedTicketsCount = 0,
  canViewFees = true,
  isMobileOpen = false,
  onCloseMobile,
  onOpenNewTaskWithService,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [hoveredTab, setHoveredTab] = useState<{ id: string; rect: DOMRect } | null>(null);
  const closeTimeoutRef = useRef<number>();

  const handleItemMouseEnter = (id: string, e: React.MouseEvent<HTMLElement>) => {
    window.clearTimeout(closeTimeoutRef.current);
    if (FLYOUT_CONFIG[id]) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTab({ id, rect });
    } else {
      setHoveredTab(null);
    }
  };

  const handleItemMouseLeave = () => {
    closeTimeoutRef.current = window.setTimeout(() => {
      setHoveredTab(null);
    }, 160);
  };

  const handleFlyoutMouseEnter = () => {
    window.clearTimeout(closeTimeoutRef.current);
  };

  const handleFlyoutMouseLeave = () => {
    closeTimeoutRef.current = window.setTimeout(() => {
      setHoveredTab(null);
    }, 160);
  };

  const handleFlyoutClick = (tabId: string, category: TaskCategory, serviceName: string) => {
    select(tabId);
    onOpenNewTaskWithService?.(category, serviceName);
    setHoveredTab(null);
  };

  const workspace: NavItem[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
    { id: 'monthly', label: 'Monthly Compliance', icon: ListChecks, count: monthlyTaskCount },
    { id: 'quarterly', label: 'Quarterly Compliance', icon: CalendarRange, count: quarterlyTaskCount },
    { id: 'itr', label: 'Annual Compliance', icon: FileText, count: itrCount },
    { id: 'assignments', label: 'Other Assignments', icon: Briefcase, count: otherAssignmentsCount },
  ];

  const relationships: NavItem[] = [
    { id: 'clients', label: 'Clients', icon: Building2, count: totalClientsCount },
    { id: 'invoices', label: 'Invoices', icon: ReceiptText, count: invoicesCount },
    ...(canViewFees
      ? [
          { id: 'debtors', label: 'Debtors', icon: Wallet, count: debtorsCount },
        ]
      : []),
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
    const hue = SECTIONS[item.id as SectionId]?.hue ?? 8;
    const hasFlyout = !!FLYOUT_CONFIG[item.id];
    const isHovered = hoveredTab?.id === item.id;

    return (
      <div
        key={item.id}
        className="relative"
        onMouseEnter={(e) => hasFlyout && handleItemMouseEnter(item.id, e)}
        onMouseLeave={() => hasFlyout && handleItemMouseLeave()}
      >
        <button
          onClick={() => select(item.id)}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group w-full h-8 flex items-center gap-2.5 px-2.5 rounded-md text-sm transition-colors',
            active
              ? cn(`av-${hue}`, 'font-medium')
              : isHovered
              ? 'text-fg bg-hover'
              : 'text-fg-muted hover:text-fg hover:bg-hover'
          )}
        >
          <Icon className={cn('w-4 h-4 shrink-0', !active && `tx-${hue}`)} strokeWidth={active ? 2 : 1.75} />
          <span className="flex-1 truncate text-left">{item.label}</span>
          {hasFlyout && (
            <ChevronRight
              className={cn(
                'w-3.5 h-3.5 transition-opacity mr-0.5 shrink-0',
                isHovered ? 'text-fg opacity-100' : 'text-fg-faint opacity-0 group-hover:opacity-70'
              )}
            />
          )}
          {item.alert ? (
            <span className="num text-2xs font-semibold text-danger">{item.alert}</span>
          ) : item.count !== undefined && item.count !== null ? (
            <span className={cn('num text-2xs', active ? 'font-semibold opacity-80' : 'text-fg-faint')}>{item.count}</span>
          ) : null}
        </button>
      </div>
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

      {hoveredTab && FLYOUT_CONFIG[hoveredTab.id] && createPortal(
        <div
          style={{
            position: 'fixed',
            top: Math.max(8, Math.min(hoveredTab.rect.top - 4, window.innerHeight - 340)),
            left: hoveredTab.rect.right + 6,
            zIndex: 9999,
          }}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
          className="w-72 bg-surface border border-line rounded-[8px] shadow-2xl p-1.5 animate-pop-in select-none"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-line mb-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
              {FLYOUT_CONFIG[hoveredTab.id].title}
            </span>
            <span className="text-3xs text-fg-faint font-medium">Quick create task</span>
          </div>
          <div className="space-y-0.5">
            {FLYOUT_CONFIG[hoveredTab.id].items.map((svc) => (
              <button
                key={svc.label}
                type="button"
                onClick={() =>
                  handleFlyoutClick(
                    hoveredTab.id,
                    FLYOUT_CONFIG[hoveredTab.id].category,
                    svc.serviceName
                  )
                }
                className="w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs text-fg hover:bg-hover hover:text-fg transition-colors flex items-center justify-between group/row"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-medium truncate group-hover/row:text-accent transition-colors">
                    {svc.label}
                  </div>
                  {svc.hint && (
                    <div className="text-3xs text-fg-subtle truncate mt-0.5">
                      {svc.hint}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1 text-2xs text-fg-subtle opacity-60 group-hover/row:opacity-100 group-hover/row:text-accent font-medium">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
