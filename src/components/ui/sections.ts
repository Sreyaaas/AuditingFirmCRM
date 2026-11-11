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
  monthly: { label: 'GST & Audit', icon: ListChecks, hue: 3 },
  itr: { label: 'ITR Returns', icon: FileText, hue: 5 },
  clients: { label: 'Clients', icon: Building2, hue: 1 },
  debtors: { label: 'Debtors', icon: Wallet, hue: 2 },
  staff: { label: 'Calls & Tickets', icon: PhoneCall, hue: 4 },
  employees: { label: 'Team', icon: Users, hue: 7 },
  activity: { label: 'Audit Trail', icon: History, hue: 8 },
  settings: { label: 'Settings', icon: Settings2, hue: 8 },
} satisfies Record<string, { label: string; icon: LucideIcon; hue: number }>;

export type SectionId = keyof typeof SECTIONS;
