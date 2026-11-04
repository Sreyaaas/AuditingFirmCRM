export type UserRole = 'admin' | 'employee';
export type AccountStatus = 'Active' | 'Inactive';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  phone: string;
  status: AccountStatus;
  joinedDate: string;
  assignedClientsCount: number;
  assignedTasksCount: number;
  completedThisMonth: number;
  canEditPayments: boolean;
  canAccessFinancials: boolean;
  initials?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  clientName?: string;
  category: 'Filing' | 'Payment' | 'Account' | 'Task' | 'Client' | 'Security';
}

export type FilingStatus = 'Docs Pending' | 'In Progress' | 'Draft Ready' | 'Filed' | 'Overdue';
export type ITRStatus = 'Docs Pending' | '26AS Reconciled' | 'Draft Computation' | 'Client Confirmed' | 'Filed & e-Verified';
export type EntityType = 'Private Limited' | 'LLP' | 'Partnership' | 'Proprietorship' | 'Individual';
export type DebtAgingBucket = '0-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';
export type DebtStatus = 'Pending' | 'Partially Paid' | 'Overdue' | 'Cleared';

export type TicketPriority = 'Urgent' | 'High' | 'Normal' | 'Low';
export type TicketStatus = 'Unassigned' | 'In Progress' | 'Waiting on Client' | 'Resolved';
export type TicketCategory = 
  | 'GST & Return Query' 
  | 'Income Tax Notice' 
  | 'Bank Loan / Computation' 
  | 'Accounting & Books' 
  | 'DSC & Portal Access' 
  | 'General Inquiry';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  email: string;
  phone: string;
  assignedRecurringCount: number;
  assignedITRCount: number;
  completedThisMonth: number;
  activeTicketsCount?: number;
}

export interface Client {
  id: string;
  clientCode: string;
  name: string;
  tradeName: string;
  entityType: EntityType;
  gstin: string;
  pan: string;
  contactPerson: string;
  phone: string;
  email: string;
  isRecurringGST: boolean;
  isRecurringStatutory: boolean;
  assignedStaffId: string;
  monthlyAuditFee: number;
  city: string;
  oneDriveFolderUrl: string;
  status: 'Active' | 'Archived' | 'On Hold';
}

export interface MonthlyTask {
  id: string;
  clientId: string;
  clientName: string;
  tradeName: string;
  gstin: string;
  filingType: 'GSTR-1' | 'GSTR-3B' | 'Statutory Audit' | 'TDS Payment' | 'PF/ESI';
  period: string; // e.g. "October 2026"
  assignedStaffId: string;
  status: FilingStatus;
  dueDate: string; // e.g. "2026-11-11"
  daysRemaining: number;
  arnNumber?: string;
  taxPayable?: number;
  turnoverReported?: number;
  lastUpdated: string;
  phone: string;
  notes?: string;
  docsReceived: boolean;
}

export interface ITRFiling {
  id: string;
  clientId: string;
  clientName: string;
  pan: string;
  entityType: EntityType;
  itrForm: 'ITR-1' | 'ITR-2' | 'ITR-3' | 'ITR-4' | 'ITR-5' | 'ITR-6' | 'ITR-7';
  assessmentYear: string; // "AY 2026-27"
  financialYear: string;  // "FY 2025-26"
  assignedStaffId: string;
  status: ITRStatus;
  dueDate: string;
  regime: 'New Regime (115BAC)' | 'Old Regime';
  taxLiabilityOrRefund: number; // positive = payable, negative = refund
  acknowledgmentNo?: string;
  lastActivity: string;
  phone: string;
}

// Exact Debtors Monthly Reconciliation Ledger Structure from Shameer and Associates Workbook
export interface MonthDebtorLedger {
  outstanding: number;
  paymentCleared: number;
  currentBilling: number;
}

export interface DebtorRecord {
  sNo: number;
  id: string;
  clientName: string;
  phone: string;
  entityType: EntityType;
  assignedStaff: string; // Ameen, Susmi
  august: MonthDebtorLedger;
  september: MonthDebtorLedger;
  october: MonthDebtorLedger;
  november: MonthDebtorLedger;
  currentBalance: number;
  status: DebtStatus;
  agingBucket: DebtAgingBucket;
  lastReminderSent?: string;
}

export interface OfficeBillingEntry {
  serialNo: number;
  date: string;
  clientName: string;
  natureOfService: string;
  filingMonth?: string;
  professionalIncome: number;
  rcm?: number;
  taxAmount?: number;
  oopExpenses?: number;
  billingStatus?: 'Billed' | 'Pending' | 'Received';
  user: string; // Ameen, Susmi
  invoiceNumber?: string;
}

export type GSTPriorityLevel = 'overdue' | 'due-2-days' | 'upcoming' | 'filed';

export interface GSTComplianceItem {
  id: string;
  clientName: string;
  tradeName: string;
  gstin: string;
  returnType: 'GSTR-1' | 'GSTR-3B' | 'CMP-08' | 'IFF';
  filingMonth: string; // e.g. "October 2026"
  dueDate: string;
  daysRemaining: number;
  priorityLevel: GSTPriorityLevel;
  filingStatus: 'Overdue' | 'Due Soon' | 'In Progress' | 'Docs Pending' | 'Filed';
  assignedStaff: string; // Ameen, Susmi
  arnNumber?: string;
  filedDate?: string;
  phone: string;
  taxPayable?: number;
}

export interface StaffTicket {
  id: string;
  ticketNo: string; // e.g. "TK-1081"
  clientId: string;
  clientName: string;
  tradeName: string;
  callerName: string;
  callerPhone: string;
  callType: 'Inbound Phone Call' | 'WhatsApp Query' | 'Office Visit' | 'Email Inquiry';
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  loggedByStaffId: string;
  loggedAt: string;
  assignedStaffId: string | null;
  assignedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface CloudIntegration {
  supabase: {
    status: 'connected' | 'syncing' | 'error';
    url: string;
    lastSynced: string;
    tables: { name: string; count: number }[];
  };
  oneDrive: {
    status: 'connected' | 'syncing' | 'error';
    tenant: string;
    foldersMapped: number;
    lastSynced: string;
    storageUsedGb: number;
  };
}
