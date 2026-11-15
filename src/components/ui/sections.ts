import {
  LayoutGrid,
  CalendarClock,
  CalendarRange,
  Briefcase,
  ListChecks,
  FileText,
  Building2,
  Wallet,
  PhoneCall,
  Users,
  History,
  Settings2,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

/**
 * Each section of the CRM has its own soft colour, used on its sidebar icon,
 * its active highlight and the badge beside its page title. `hue` indexes the
 * .av-N (soft background + text) and .tx-N (text only) classes in index.css.
 */
export const SECTIONS = {
  dashboard: { label: 'Overview', icon: LayoutGrid, hue: 0 },
  'gst-tracker': { label: 'Deadlines', icon: CalendarClock, hue: 6 },
  monthly: { label: 'Monthly Work', icon: ListChecks, hue: 3 },
  quarterly: { label: 'Quarterly', icon: CalendarRange, hue: 6 },
  itr: { label: 'Annual & ITR', icon: FileText, hue: 5 },
  assignments: { label: 'Other Assignments', icon: Briefcase, hue: 4 },
  invoices: { label: 'Invoices', icon: Receipt, hue: 2 },
  clients: { label: 'Clients', icon: Building2, hue: 1 },
  debtors: { label: 'Debtors', icon: Wallet, hue: 2 },
  staff: { label: 'Calls & Tickets', icon: PhoneCall, hue: 4 },
  employees: { label: 'Team', icon: Users, hue: 7 },
  activity: { label: 'Audit Trail', icon: History, hue: 8 },
  settings: { label: 'Settings', icon: Settings2, hue: 8 },
} satisfies Record<string, { label: string; icon: LucideIcon; hue: number }>;

export type SectionId = keyof typeof SECTIONS;
