/**
 * Sample records for local development and testing.
 *
 * Used when no Supabase project is configured or as fallback when tables are empty.
 */
import type {
  ActivityLog,
  Client,
  DebtorRecord,
  GSTComplianceItem,
  ITRFiling,
  MonthlyTask,
  OfficeBillingEntry,
  StaffMember,
  StaffTicket,
  UserProfile,
} from '../types/crm';

export const SAMPLE_PROFILES: UserProfile[] = [
  {
    id: "staff-shameer",
    name: "Shameer",
    email: "shameer@shameerassociates.in",
    role: "admin",
    designation: "Managing Partner",
    phone: "+91 98200 11000",
    status: "Active",
    joinedDate: "2018-01-15",
    assignedClientsCount: 0,
    assignedTasksCount: 0,
    completedThisMonth: 0,
    canEditPayments: true,
    canAccessFinancials: true,
    initials: "SH",
    authUserId: null
  },
  {
    id: "staff-ameen",
    name: "Ameen",
    email: "ameen@shameerassociates.in",
    role: "admin",
    designation: "Partner",
    phone: "+91 98201 11001",
    status: "Active",
    joinedDate: "2021-06-01",
    assignedClientsCount: 0,
    assignedTasksCount: 0,
    completedThisMonth: 0,
    canEditPayments: true,
    canAccessFinancials: true,
    initials: "AM",
    authUserId: null
  },
  {
    id: "staff-susmi",
    name: "Susmi",
    email: "susmi@shameerassociates.in",
    role: "employee",
    designation: "Audit & Tax Executive",
    phone: "+91 98201 11002",
    status: "Active",
    joinedDate: "2022-03-15",
    assignedClientsCount: 0,
    assignedTasksCount: 0,
    completedThisMonth: 0,
    canEditPayments: false,
    canAccessFinancials: false,
    initials: "SU",
    authUserId: null
  }
];

export const SAMPLE_STAFF: StaffMember[] = SAMPLE_PROFILES.map((p) => ({
  id: p.id,
  name: p.name,
  role: p.designation,
  initials: p.initials || p.name.slice(0, 2).toUpperCase(),
  email: p.email,
  phone: p.phone,
  assignedRecurringCount: 0,
  assignedITRCount: 0,
  completedThisMonth: 0,
}));

export const SAMPLE_CLIENTS: Client[] = [
  {
    id: "client-havos",
    clientCode: "C-001",
    name: "Havos (P) Ltd",
    tradeName: "Havos",
    entityType: "Private Limited",
    gstin: "32AABCH4910K1Z5",
    pan: "AABCH4910K",
    contactPerson: "Managing Director",
    phone: "+91 98470 12345",
    email: "accounts@havos.in",
    isRecurringGST: true,
    isRecurringStatutory: true,
    assignedStaffId: "staff-ameen",
    monthlyAuditFee: 9000,
    city: "Calicut",
    oneDriveFolderUrl: "https://shameerassociates.sharepoint.com/clients/C-001-Havos",
    status: "Active"
  },
  {
    id: "client-km-traders",
    clientCode: "C-002",
    name: "KM Traders",
    tradeName: "KM Traders",
    entityType: "Partnership",
    gstin: "32AACKM8821L1Z2",
    pan: "AACKM8821L",
    contactPerson: "K. M. Partner",
    phone: "+91 94471 23456",
    email: "info@kmtraders.in",
    isRecurringGST: true,
    isRecurringStatutory: true,
    assignedStaffId: "staff-susmi",
    monthlyAuditFee: 5760,
    city: "Kochi",
    oneDriveFolderUrl: "https://shameerassociates.sharepoint.com/clients/C-002-KMTraders",
    status: "Active"
  },
  {
    id: "client-malabar-spices",
    clientCode: "C-003",
    name: "Malabar Spices LLP",
    tradeName: "Malabar Spices",
    entityType: "LLP",
    gstin: "32AABFM3921P1Z9",
    pan: "AABFM3921P",
    contactPerson: "Faisal Rahman",
    phone: "+91 98471 99882",
    email: "accounts@malabarspices.in",
    isRecurringGST: true,
    isRecurringStatutory: true,
    assignedStaffId: "staff-susmi",
    monthlyAuditFee: 7500,
    city: "Calicut",
    oneDriveFolderUrl: "https://shameerassociates.sharepoint.com/clients/C-003-MalabarSpices",
    status: "Active"
  },
  {
    id: "client-rafeek-sons",
    clientCode: "C-004",
    name: "Rafeek & Sons Trading",
    tradeName: "Rafeek & Sons",
    entityType: "Proprietorship",
    gstin: "32AABPR4421M1Z3",
    pan: "AABPR4421M",
    contactPerson: "Rafeek K.",
    phone: "+91 94470 55443",
    email: "rafeek@rafeeksons.in",
    isRecurringGST: true,
    isRecurringStatutory: true,
    assignedStaffId: "staff-susmi",
    monthlyAuditFee: 4500,
    city: "Calicut",
    oneDriveFolderUrl: "https://shameerassociates.sharepoint.com/clients/C-004-RafeekSons",
    status: "Active"
  },
  {
    id: "client-spanish-absolute",
    clientCode: "C-005",
    name: "Spanish Absolute Parlour",
    tradeName: "Spanish Absolute",
    entityType: "Proprietorship",
    gstin: "32AAKCS2219K1ZP",
    pan: "AAKCS2219K",
    contactPerson: "Sujith Kumar",
    phone: "+91 98472 88771",
    email: "accounts@spanishabsolute.com",
    isRecurringGST: true,
    isRecurringStatutory: false,
    assignedStaffId: "staff-ameen",
    monthlyAuditFee: 3500,
    city: "Calicut",
    oneDriveFolderUrl: "https://shameerassociates.sharepoint.com/clients/C-005-SpanishAbsolute",
    status: "Active"
  }
];

export const SAMPLE_TASKS: MonthlyTask[] = [
  {
    id: "task-m-1",
    clientId: "client-km-traders",
    clientName: "KM Traders",
    tradeName: "KM Traders",
    gstin: "32AACKM8821L1Z2",
    filingType: "GSTR-3B",
    period: "October 2026",
    assignedStaffId: "staff-susmi",
    status: "Docs Pending",
    dueDate: "2026-11-20",
    daysRemaining: 14,
    taxPayable: 5760,
    turnoverReported: 480000,
    lastUpdated: "1h ago",
    phone: "+91 94471 23456",
    docsReceived: false,
    notes: "Pending sales invoices and purchase bills from client accountant"
  },
  {
    id: "task-m-2",
    clientId: "client-havos",
    clientName: "Havos (P) Ltd",
    tradeName: "Havos",
    gstin: "32AABCH4910K1Z5",
    filingType: "GSTR-3B",
    period: "October 2026",
    assignedStaffId: "staff-ameen",
    status: "Draft Ready",
    dueDate: "2026-11-20",
    daysRemaining: 14,
    taxPayable: 11500,
    turnoverReported: 890000,
    lastUpdated: "2h ago",
    phone: "+91 98470 12345",
    docsReceived: true,
    notes: "Draft computation verified; awaiting director approval for challan creation"
  },
  {
    id: "task-m-3",
    clientId: "client-malabar-spices",
    clientName: "Malabar Spices LLP",
    tradeName: "Malabar Spices",
    gstin: "32AABFM3921P1Z9",
    filingType: "GSTR-1",
    period: "October 2026",
    assignedStaffId: "staff-susmi",
    status: "In Progress",
    dueDate: "2026-11-11",
    daysRemaining: 5,
    taxPayable: 0,
    turnoverReported: 1250000,
    lastUpdated: "3h ago",
    phone: "+91 98471 99882",
    docsReceived: true,
    notes: "B2B outward supplies verified against sales register"
  },
  {
    id: "task-m-4",
    clientId: "client-havos",
    clientName: "Havos (P) Ltd",
    tradeName: "Havos",
    gstin: "32AABCH4910K1Z5",
    filingType: "Statutory Audit",
    period: "FY 2025-26",
    assignedStaffId: "staff-shameer",
    status: "In Progress",
    dueDate: "2026-11-30",
    daysRemaining: 24,
    taxPayable: 0,
    turnoverReported: 8900000,
    lastUpdated: "1h ago",
    phone: "+91 98470 12345",
    docsReceived: true,
    notes: "Statutory audit draft report, balance sheet schedule & notes to accounts under review"
  },
  {
    id: "task-m-5",
    clientId: "client-rafeek-sons",
    clientName: "Rafeek & Sons Trading",
    tradeName: "Rafeek & Sons",
    gstin: "32AABPR4421M1Z3",
    filingType: "GSTR-3B",
    period: "October 2026",
    assignedStaffId: "staff-susmi",
    status: "Docs Pending",
    dueDate: "2026-11-20",
    daysRemaining: 14,
    taxPayable: 4500,
    turnoverReported: 350000,
    lastUpdated: "4h ago",
    phone: "+91 94470 55443",
    docsReceived: false,
    notes: "Followed up via WhatsApp for purchase vouchers"
  },
  {
    id: "task-m-6",
    clientId: "client-spanish-absolute",
    clientName: "Spanish Absolute Parlour",
    tradeName: "Spanish Absolute",
    gstin: "32AAKCS2219K1ZP",
    filingType: "CMP-08",
    period: "Q3 2026",
    assignedStaffId: "staff-ameen",
    status: "Draft Ready",
    dueDate: "2026-11-18",
    daysRemaining: 12,
    taxPayable: 3500,
    turnoverReported: 280000,
    lastUpdated: "5h ago",
    phone: "+91 98472 88771",
    docsReceived: true,
    notes: "Composition tax payment calculated at 1%"
  },
  {
    id: "task-m-7",
    clientId: "client-malabar-spices",
    clientName: "Malabar Spices LLP",
    tradeName: "Malabar Spices",
    gstin: "32AABFM3921P1Z9",
    filingType: "Statutory Audit",
    period: "FY 2025-26",
    assignedStaffId: "staff-shameer",
    status: "Draft Ready",
    dueDate: "2026-11-15",
    daysRemaining: 9,
    taxPayable: 0,
    turnoverReported: 12500000,
    lastUpdated: "2h ago",
    phone: "+91 98471 99882",
    docsReceived: true,
    notes: "LLP statutory compliance and partner capital account audit verified"
  }
];

export const SAMPLE_ITR: ITRFiling[] = [
  {
    id: "itr-1",
    clientId: "client-km-traders",
    clientName: "KM Traders",
    pan: "AACKM8821L",
    entityType: "Partnership",
    itrForm: "ITR-5",
    assessmentYear: "AY 2026-27",
    financialYear: "FY 2025-26",
    assignedStaffId: "staff-susmi",
    status: "Docs Pending",
    dueDate: "2026-10-31",
    regime: "Old Regime",
    taxLiabilityOrRefund: 28600,
    lastActivity: "31 Oct 2026",
    phone: "+91 94471 23456"
  },
  {
    id: "itr-2",
    clientId: "client-havos",
    clientName: "Havos (P) Ltd",
    pan: "AABCH4910K",
    entityType: "Private Limited",
    itrForm: "ITR-6",
    assessmentYear: "AY 2026-27",
    financialYear: "FY 2025-26",
    assignedStaffId: "staff-ameen",
    status: "Draft Computation",
    dueDate: "2026-11-16",
    regime: "New Regime (115BAC)",
    taxLiabilityOrRefund: 42500,
    lastActivity: "03 Nov 2026",
    phone: "+91 98470 12345"
  },
  {
    id: "itr-3",
    clientId: "client-malabar-spices",
    clientName: "Malabar Spices LLP",
    pan: "AABFM3921P",
    entityType: "LLP",
    itrForm: "ITR-5",
    assessmentYear: "AY 2026-27",
    financialYear: "FY 2025-26",
    assignedStaffId: "staff-ameen",
    status: "Client Confirmed",
    dueDate: "2026-10-31",
    regime: "Old Regime",
    taxLiabilityOrRefund: 34200,
    lastActivity: "04 Nov 2026",
    phone: "+91 98471 99882"
  },
  {
    id: "itr-4",
    clientId: "client-rafeek-sons",
    clientName: "Rafeek & Sons Trading",
    pan: "AABPR4421M",
    entityType: "Proprietorship",
    itrForm: "ITR-3",
    assessmentYear: "AY 2026-27",
    financialYear: "FY 2025-26",
    assignedStaffId: "staff-susmi",
    status: "Docs Pending",
    dueDate: "2026-11-15",
    regime: "New Regime (115BAC)",
    taxLiabilityOrRefund: 18400,
    lastActivity: "02 Nov 2026",
    phone: "+91 94470 55443"
  },
  {
    id: "itr-5",
    clientId: "client-spanish-absolute",
    clientName: "Spanish Absolute Parlour",
    pan: "AAKCS2219K",
    entityType: "Proprietorship",
    itrForm: "ITR-4",
    assessmentYear: "AY 2026-27",
    financialYear: "FY 2025-26",
    assignedStaffId: "staff-susmi",
    status: "Client Confirmed",
    dueDate: "2026-11-15",
    regime: "New Regime (115BAC)",
    taxLiabilityOrRefund: 12000,
    lastActivity: "01 Nov 2026",
    phone: "+91 98472 88771"
  }
];

export const SAMPLE_DEBTORS: DebtorRecord[] = [
  {
    sNo: 1,
    id: "deb-1",
    clientName: "Havos (P) Ltd",
    phone: "+91 98470 12345",
    entityType: "Private Limited",
    assignedStaff: "Ameen",
    currentBalance: 10500,
    status: "Pending",
    agingBucket: "0-30 Days",
    months: [
      {
        month: "2026-08",
        opening: 0,
        received: 0,
        billed: 0
      },
      {
        month: "2026-09",
        opening: 0,
        received: 0,
        billed: 9000
      },
      {
        month: "2026-10",
        opening: 9000,
        received: 9000,
        billed: 1500
      },
      {
        month: "2026-11",
        opening: 1500,
        received: 0,
        billed: 9000
      }
    ]
  },
  {
    sNo: 2,
    id: "deb-2",
    clientName: "KM Traders",
    phone: "+91 94471 23456",
    entityType: "Partnership",
    assignedStaff: "Susmi",
    currentBalance: 5760,
    status: "Overdue",
    agingBucket: "61-90 Days",
    months: [
      {
        month: "2026-08",
        opening: 4260,
        received: 1440,
        billed: 2940
      },
      {
        month: "2026-09",
        opening: 5760,
        received: 0,
        billed: 0
      },
      {
        month: "2026-10",
        opening: 5760,
        received: 0,
        billed: 0
      },
      {
        month: "2026-11",
        opening: 5760,
        received: 0,
        billed: 0
      }
    ]
  },
  {
    sNo: 3,
    id: "deb-3",
    clientName: "Malabar Spices LLP",
    phone: "+91 98471 99882",
    entityType: "LLP",
    assignedStaff: "Susmi",
    currentBalance: 15000,
    status: "Partially Paid",
    agingBucket: "31-60 Days",
    months: [
      {
        month: "2026-08",
        opening: 0,
        received: 0,
        billed: 7500
      },
      {
        month: "2026-09",
        opening: 7500,
        received: 7500,
        billed: 7500
      },
      {
        month: "2026-10",
        opening: 7500,
        received: 0,
        billed: 7500
      },
      {
        month: "2026-11",
        opening: 15000,
        received: 7500,
        billed: 7500
      }
    ]
  },
  {
    sNo: 4,
    id: "deb-4",
    clientName: "Rafeek & Sons Trading",
    phone: "+91 94470 55443",
    entityType: "Proprietorship",
    assignedStaff: "Susmi",
    currentBalance: 4500,
    status: "Pending",
    agingBucket: "0-30 Days",
    months: [
      {
        month: "2026-08",
        opening: 0,
        received: 0,
        billed: 4500
      },
      {
        month: "2026-09",
        opening: 4500,
        received: 4500,
        billed: 4500
      },
      {
        month: "2026-10",
        opening: 4500,
        received: 4500,
        billed: 4500
      },
      {
        month: "2026-11",
        opening: 4500,
        received: 0,
        billed: 0
      }
    ]
  },
  {
    sNo: 5,
    id: "deb-5",
    clientName: "Spanish Absolute Parlour",
    phone: "+91 98472 88771",
    entityType: "Proprietorship",
    assignedStaff: "Ameen",
    currentBalance: 7000,
    status: "Partially Paid",
    agingBucket: "31-60 Days",
    months: [
      {
        month: "2026-08",
        opening: 0,
        received: 0,
        billed: 3500
      },
      {
        month: "2026-09",
        opening: 3500,
        received: 0,
        billed: 3500
      },
      {
        month: "2026-10",
        opening: 7000,
        received: 3500,
        billed: 3500
      },
      {
        month: "2026-11",
        opening: 7000,
        received: 0,
        billed: 0
      }
    ]
  }
];

export const SAMPLE_BILLINGS: OfficeBillingEntry[] = [
  {
    serialNo: 1,
    date: "2026-10-05",
    clientName: "Havos (P) Ltd",
    natureOfService: "GST Filing",
    filingMonth: "September",
    professionalIncome: 1500,
    user: "Ameen",
    billingStatus: "Billed",
    id: "bill-sample-1",
    period: "2026-10"
  },
  {
    serialNo: 2,
    date: "2026-10-05",
    clientName: "Havos (P) Ltd",
    natureOfService: "Statutory Audit Advance",
    filingMonth: "October",
    professionalIncome: 9000,
    user: "Ameen",
    billingStatus: "Pending",
    id: "bill-sample-2",
    period: "2026-10"
  },
  {
    serialNo: 3,
    date: "2026-10-15",
    clientName: "Malabar Spices LLP",
    natureOfService: "GST & MCA Advisory",
    filingMonth: "October",
    professionalIncome: 7500,
    user: "Susmi",
    billingStatus: "Received",
    id: "bill-sample-3",
    period: "2026-10"
  },
  {
    serialNo: 4,
    date: "2026-10-22",
    clientName: "Rafeek & Sons Trading",
    natureOfService: "GSTR-3B Monthly Compliance",
    filingMonth: "October",
    professionalIncome: 1500,
    user: "Susmi",
    billingStatus: "Billed",
    id: "bill-sample-4",
    period: "2026-10"
  },
  {
    serialNo: 5,
    date: "2026-10-28",
    clientName: "Spanish Absolute Parlour",
    natureOfService: "Presumptive ITR Consultation",
    filingMonth: "October",
    professionalIncome: 3500,
    user: "Ameen",
    billingStatus: "Received",
    id: "bill-sample-5",
    period: "2026-10"
  }
];

export const SAMPLE_GST_RETURNS: GSTComplianceItem[] = [
  {
    id: "gst-ov-1",
    clientName: "KM Traders",
    tradeName: "KM Traders",
    gstin: "32AACKM8821L1Z2",
    returnType: "GSTR-3B",
    filingMonth: "September 2026",
    dueDate: "2026-10-20",
    daysRemaining: -15,
    priorityLevel: "overdue",
    filingStatus: "Overdue",
    assignedStaff: "Susmi",
    phone: "+91 94471 23456",
    taxPayable: 5760
  },
  {
    id: "gst-up-1",
    clientName: "Havos (P) Ltd",
    tradeName: "Havos",
    gstin: "32AABCH4910K1Z5",
    returnType: "GSTR-3B",
    filingMonth: "October 2026",
    dueDate: "2026-11-20",
    daysRemaining: 16,
    priorityLevel: "upcoming",
    filingStatus: "Docs Pending",
    assignedStaff: "Ameen",
    phone: "+91 98470 12345",
    taxPayable: 11500
  },
  {
    id: "gst-up-2",
    clientName: "Malabar Spices LLP",
    tradeName: "Malabar Spices",
    gstin: "32AABFM3921P1Z9",
    returnType: "GSTR-1",
    filingMonth: "October 2026",
    dueDate: "2026-11-11",
    daysRemaining: 7,
    priorityLevel: "upcoming",
    filingStatus: "In Progress",
    assignedStaff: "Susmi",
    phone: "+91 98471 99882",
    taxPayable: 0
  },
  {
    id: "gst-up-3",
    clientName: "Rafeek & Sons Trading",
    tradeName: "Rafeek & Sons",
    gstin: "32AABPR4421M1Z3",
    returnType: "GSTR-3B",
    filingMonth: "October 2026",
    dueDate: "2026-11-20",
    daysRemaining: 16,
    priorityLevel: "upcoming",
    filingStatus: "Docs Pending",
    assignedStaff: "Susmi",
    phone: "+91 94470 55443",
    taxPayable: 4500
  },
  {
    id: "gst-up-4",
    clientName: "Spanish Absolute Parlour",
    tradeName: "Spanish Absolute",
    gstin: "32AAKCS2219K1ZP",
    returnType: "CMP-08",
    filingMonth: "Q3 2026",
    dueDate: "2026-11-18",
    daysRemaining: 14,
    priorityLevel: "upcoming",
    filingStatus: "Draft Ready",
    assignedStaff: "Ameen",
    phone: "+91 98472 88771",
    taxPayable: 3500
  }
];

export const SAMPLE_TICKETS: StaffTicket[] = [
  {
    id: "ticket-1",
    ticketNo: "TK-1081",
    clientId: "client-km-traders",
    clientName: "KM Traders",
    tradeName: "KM Traders",
    callerName: "K. M. Partner",
    callerPhone: "+91 94471 23456",
    callType: "Inbound Phone Call",
    subject: "GSTR-2B ITC Mismatch for October purchase bills",
    description: "Accountant called stating supplier invoice for ₹14,000 is not reflecting in 2B. Needs reconciliation before GSTR-3B cutoff.",
    category: "GST & Return Query",
    priority: "High",
    status: "In Progress",
    loggedByStaffId: "staff-susmi",
    loggedAt: "Today, 09:30 AM",
    assignedStaffId: "staff-susmi",
    assignedAt: "Today, 09:50 AM"
  },
  {
    id: "ticket-2",
    ticketNo: "TK-1082",
    clientId: "client-havos",
    clientName: "Havos (P) Ltd",
    tradeName: "Havos",
    callerName: "Managing Director",
    callerPhone: "+91 98470 12345",
    callType: "Inbound Phone Call",
    subject: "Advance tax calculation and challan generation for Q3",
    description: "Director requested estimated tax liability draft and net payable after TDS credits before 15th December installment.",
    category: "Bank Loan / Computation",
    priority: "Normal",
    status: "In Progress",
    loggedByStaffId: "staff-ameen",
    loggedAt: "Yesterday, 02:15 PM",
    assignedStaffId: "staff-ameen",
    assignedAt: "Yesterday, 02:40 PM"
  },
  {
    id: "ticket-3",
    ticketNo: "TK-1083",
    clientId: "client-malabar-spices",
    clientName: "Malabar Spices LLP",
    tradeName: "Malabar Spices",
    callerName: "Faisal Rahman",
    callerPhone: "+91 98471 99882",
    callType: "WhatsApp Query",
    subject: "Intimation u/s 143(1) for AY 2025-26 refund mismatch",
    description: "Client received CPC intimation with ₹4,500 demand instead of refund due to TDS 26AS mismatch. Needs rectification request filing.",
    category: "Income Tax Notice",
    priority: "Urgent",
    status: "In Progress",
    loggedByStaffId: "staff-susmi",
    loggedAt: "Today, 11:15 AM",
    assignedStaffId: "staff-susmi",
    assignedAt: "Today, 11:30 AM"
  },
  {
    id: "ticket-4",
    ticketNo: "TK-1084",
    clientId: "client-rafeek-sons",
    clientName: "Rafeek & Sons Trading",
    tradeName: "Rafeek & Sons",
    callerName: "Rafeek K.",
    callerPhone: "+91 94470 55443",
    callType: "Inbound Phone Call",
    subject: "E-Way Bill generation threshold inquiry",
    description: "Clarification on interstate supply threshold and vehicle number updating on the NIC portal.",
    category: "GST & Return Query",
    priority: "Normal",
    status: "In Progress",
    loggedByStaffId: "staff-susmi",
    loggedAt: "Today, 02:20 PM",
    assignedStaffId: "staff-susmi",
    assignedAt: "Today, 02:30 PM"
  },
  {
    id: "ticket-5",
    ticketNo: "TK-1085",
    clientId: "client-spanish-absolute",
    clientName: "Spanish Absolute Parlour",
    tradeName: "Spanish Absolute",
    callerName: "Sujith Kumar",
    callerPhone: "+91 98472 88771",
    callType: "WhatsApp Query",
    subject: "QRMP scheme quarterly return query",
    description: "Confirming whether CMP-08 was filed and acknowledgment receipt was received.",
    category: "GST & Return Query",
    priority: "Low",
    status: "Resolved",
    loggedByStaffId: "staff-ameen",
    loggedAt: "Yesterday, 04:10 PM",
    assignedStaffId: "staff-ameen",
    assignedAt: "Yesterday, 04:15 PM"
  }
];

export const SAMPLE_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: "log-1",
    timestamp: "Today, 11:30 AM",
    userName: "Susmi",
    userRole: "employee",
    action: "Assigned Ticket TK-1083 (Malabar Spices LLP) to Susmi",
    details: "Assigned call ticket for rectification request follow-up",
    clientName: "Malabar Spices LLP",
    category: "Task"
  },
  {
    id: "log-2",
    timestamp: "Today, 10:15 AM",
    userName: "Ameen",
    userRole: "admin",
    action: "Recorded payment of ₹7,500 for Malabar Spices LLP via NEFT",
    details: "Applied receipt towards outstanding professional fees balance",
    clientName: "Malabar Spices LLP",
    category: "Payment"
  },
  {
    id: "log-3",
    timestamp: "Yesterday, 04:45 PM",
    userName: "Shameer",
    userRole: "admin",
    action: "Approved draft computation for Havos (P) Ltd (ITR-6)",
    details: "Verified tax liability computation and 26AS reconciliation",
    clientName: "Havos (P) Ltd",
    category: "Filing"
  },
  {
    id: "log-4",
    timestamp: "Yesterday, 02:20 PM",
    userName: "Susmi",
    userRole: "employee",
    action: "Dispatched WhatsApp filing reminder to Rafeek & Sons Trading",
    details: "Reminded client regarding purchase invoice records for GSTR-3B",
    clientName: "Rafeek & Sons Trading",
    category: "Filing"
  },
  {
    id: "log-5",
    timestamp: "Yesterday, 11:00 AM",
    userName: "Ameen",
    userRole: "admin",
    action: "Generated CMP-08 draft challan for Spanish Absolute Parlour",
    details: "Draft challan prepared for Q3 2026 composition turnover",
    clientName: "Spanish Absolute Parlour",
    category: "Filing"
  }
];
