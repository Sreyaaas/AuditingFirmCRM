/**
 * Sample records for local development only.
 *
 * Used when no Supabase project is configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 * In production every screen reads from the database; nothing here is shown.
 * Kept deliberately small — at most four rows per section.
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
    "id": "staff-shameer",
    "name": "Shameer",
    "email": "shameer@shameerassociates.in",
    "role": "admin",
    "designation": "Managing Partner",
    "phone": "+91 98200 11000",
    "status": "Active",
    "joinedDate": "2018-01-15",
    "assignedClientsCount": 0,
    "assignedTasksCount": 0,
    "completedThisMonth": 0,
    "canEditPayments": true,
    "canAccessFinancials": true,
    "initials": "SH",
    "authUserId": null
  },
  {
    "id": "staff-ameen",
    "name": "Ameen",
    "email": "ameen@shameerassociates.in",
    "role": "admin",
    "designation": "Partner",
    "phone": "+91 98201 11001",
    "status": "Active",
    "joinedDate": "2021-06-01",
    "assignedClientsCount": 0,
    "assignedTasksCount": 0,
    "completedThisMonth": 0,
    "canEditPayments": true,
    "canAccessFinancials": true,
    "initials": "AM",
    "authUserId": null
  },
  {
    "id": "staff-susmi",
    "name": "Susmi",
    "email": "susmi@shameerassociates.in",
    "role": "employee",
    "designation": "Audit & Tax Executive",
    "phone": "+91 98201 11002",
    "status": "Active",
    "joinedDate": "2022-03-15",
    "assignedClientsCount": 0,
    "assignedTasksCount": 0,
    "completedThisMonth": 0,
    "canEditPayments": false,
    "canAccessFinancials": false,
    "initials": "SU",
    "authUserId": null
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
    "id": "client-havos",
    "clientCode": "C-001",
    "name": "Havos (P) Ltd",
    "tradeName": "Havos",
    "entityType": "Private Limited",
    "gstin": "32AABCH4910K1Z5",
    "pan": "AABCH4910K",
    "contactPerson": "Managing Director",
    "phone": "+91 98470 12345",
    "email": "accounts@havos.in",
    "isRecurringGST": true,
    "isRecurringStatutory": true,
    "assignedStaffId": "staff-ameen",
    "monthlyAuditFee": 9000,
    "city": "Calicut",
    "oneDriveFolderUrl": "https://shameerassociates.sharepoint.com/clients/C-001-Havos",
    "status": "Active"
  },
  {
    "id": "client-km-traders",
    "clientCode": "C-002",
    "name": "KM Traders",
    "tradeName": "KM Traders",
    "entityType": "Partnership",
    "gstin": "32AACKM8821L1Z2",
    "pan": "AACKM8821L",
    "contactPerson": "K. M. Partner",
    "phone": "+91 94471 23456",
    "email": "info@kmtraders.in",
    "isRecurringGST": true,
    "isRecurringStatutory": true,
    "assignedStaffId": "staff-susmi",
    "monthlyAuditFee": 5760,
    "city": "Kochi",
    "oneDriveFolderUrl": "https://shameerassociates.sharepoint.com/clients/C-002-KMTraders",
    "status": "Active"
  }
];

export const SAMPLE_TASKS: MonthlyTask[] = [
  {
    "id": "task-m-1",
    "clientId": "client-km-traders",
    "clientName": "KM Traders",
    "tradeName": "KM Traders",
    "gstin": "32AACKM8821L1Z2",
    "filingType": "GSTR-3B",
    "period": "October 2026",
    "assignedStaffId": "staff-susmi",
    "status": "Docs Pending",
    "dueDate": "2026-11-20",
    "daysRemaining": 16,
    "taxPayable": 5760,
    "turnoverReported": 480000,
    "lastUpdated": "1h ago",
    "phone": "+91 94471 23456",
    "docsReceived": false,
    "notes": "Pending sales invoices and purchase bills from client accountant"
  },
  {
    "id": "task-m-3",
    "clientId": "client-havos",
    "clientName": "Havos (P) Ltd",
    "tradeName": "Havos",
    "gstin": "32AABCH4910K1Z5",
    "filingType": "GSTR-3B",
    "period": "October 2026",
    "assignedStaffId": "staff-ameen",
    "status": "Draft Ready",
    "dueDate": "2026-11-20",
    "daysRemaining": 16,
    "taxPayable": 11500,
    "turnoverReported": 890000,
    "lastUpdated": "2h ago",
    "phone": "+91 98470 12345",
    "docsReceived": true,
    "notes": "Draft computation verified; awaiting director approval for challan creation"
  }
];

export const SAMPLE_ITR: ITRFiling[] = [
  {
    "id": "itr-1",
    "clientId": "client-km-traders",
    "clientName": "KM Traders",
    "pan": "AACKM8821L",
    "entityType": "Partnership",
    "itrForm": "ITR-5",
    "assessmentYear": "AY 2026-27",
    "financialYear": "FY 2025-26",
    "assignedStaffId": "staff-susmi",
    "status": "Docs Pending",
    "dueDate": "2026-10-31",
    "regime": "Old Regime",
    "taxLiabilityOrRefund": 28600,
    "lastActivity": "31 Oct 2026",
    "phone": "+91 94471 23456"
  },
  {
    "id": "itr-3",
    "clientId": "client-havos",
    "clientName": "Havos (P) Ltd",
    "pan": "AABCH4910K",
    "entityType": "Private Limited",
    "itrForm": "ITR-6",
    "assessmentYear": "AY 2026-27",
    "financialYear": "FY 2025-26",
    "assignedStaffId": "staff-ameen",
    "status": "Draft Computation",
    "dueDate": "2026-11-16",
    "regime": "New Regime (115BAC)",
    "taxLiabilityOrRefund": 42500,
    "lastActivity": "03 Nov 2026",
    "phone": "+91 98470 12345"
  }
];

export const SAMPLE_DEBTORS: DebtorRecord[] = [
  {
    "sNo": 1,
    "id": "deb-1",
    "clientName": "Havos (P) Ltd",
    "phone": "+91 98470 12345",
    "entityType": "Private Limited",
    "assignedStaff": "Ameen",
    "currentBalance": 10500,
    "status": "Pending",
    "agingBucket": "0-30 Days",
    "months": [
      {
        "month": "2026-08",
        "opening": 0,
        "received": 0,
        "billed": 0
      },
      {
        "month": "2026-09",
        "opening": 0,
        "received": 0,
        "billed": 9000
      },
      {
        "month": "2026-10",
        "opening": 9000,
        "received": 9000,
        "billed": 1500
      },
      {
        "month": "2026-11",
        "opening": 1500,
        "received": 0,
        "billed": 9000
      }
    ]
  },
  {
    "sNo": 2,
    "id": "deb-2",
    "clientName": "KM Traders",
    "phone": "+91 94471 23456",
    "entityType": "Partnership",
    "assignedStaff": "Susmi",
    "currentBalance": 5760,
    "status": "Overdue",
    "agingBucket": "61-90 Days",
    "months": [
      {
        "month": "2026-08",
        "opening": 4260,
        "received": 1440,
        "billed": 2940
      },
      {
        "month": "2026-09",
        "opening": 5760,
        "received": 0,
        "billed": 0
      },
      {
        "month": "2026-10",
        "opening": 5760,
        "received": 0,
        "billed": 0
      },
      {
        "month": "2026-11",
        "opening": 5760,
        "received": 0,
        "billed": 0
      }
    ]
  }
];

export const SAMPLE_BILLINGS: OfficeBillingEntry[] = [
  {
    "serialNo": 1,
    "date": "2026-10-05",
    "clientName": "Havos (P) Ltd",
    "natureOfService": "GST Filing",
    "filingMonth": "September",
    "professionalIncome": 1500,
    "user": "Ameen",
    "billingStatus": "Billed",
    "id": "bill-sample-1",
    "period": "2026-10"
  },
  {
    "serialNo": 2,
    "date": "2026-10-05",
    "clientName": "Havos (P) Ltd",
    "natureOfService": "Statutory Audit Advance",
    "filingMonth": "October",
    "professionalIncome": 9000,
    "user": "Ameen",
    "billingStatus": "Pending",
    "id": "bill-sample-2",
    "period": "2026-10"
  }
];

export const SAMPLE_GST_RETURNS: GSTComplianceItem[] = [
  {
    "id": "gst-ov-1",
    "clientName": "KM Traders",
    "tradeName": "KM Traders",
    "gstin": "32AACKM8821L1Z2",
    "returnType": "GSTR-3B",
    "filingMonth": "September 2026",
    "dueDate": "2026-10-20",
    "daysRemaining": -15,
    "priorityLevel": "overdue",
    "filingStatus": "Overdue",
    "assignedStaff": "Susmi",
    "phone": "+91 94471 23456",
    "taxPayable": 5760
  },
  {
    "id": "gst-up-1",
    "clientName": "Havos (P) Ltd",
    "tradeName": "Havos",
    "gstin": "32AABCH4910K1Z5",
    "returnType": "GSTR-3B",
    "filingMonth": "October 2026",
    "dueDate": "2026-11-20",
    "daysRemaining": 16,
    "priorityLevel": "upcoming",
    "filingStatus": "Docs Pending",
    "assignedStaff": "Ameen",
    "phone": "+91 98470 12345",
    "taxPayable": 11500
  }
];

export const SAMPLE_TICKETS: StaffTicket[] = [
  {
    "id": "ticket-1",
    "ticketNo": "TK-1081",
    "clientId": "client-km-traders",
    "clientName": "KM Traders",
    "tradeName": "KM Traders",
    "callerName": "K. M. Partner",
    "callerPhone": "+91 94471 23456",
    "callType": "Inbound Phone Call",
    "subject": "GSTR-2B ITC Mismatch for October purchase bills",
    "description": "Accountant called stating supplier invoice for ₹14,000 is not reflecting in 2B. Needs reconciliation before GSTR-3B cutoff.",
    "category": "GST & Return Query",
    "priority": "High",
    "status": "In Progress",
    "loggedByStaffId": "staff-susmi",
    "loggedAt": "Today, 09:30 AM",
    "assignedStaffId": "staff-susmi",
    "assignedAt": "Today, 09:50 AM"
  },
  {
    "id": "ticket-2",
    "ticketNo": "TK-1082",
    "clientId": "client-havos",
    "clientName": "Havos (P) Ltd",
    "tradeName": "Havos",
    "callerName": "Managing Director",
    "callerPhone": "+91 98470 12345",
    "callType": "Inbound Phone Call",
    "subject": "Advance tax calculation and challan generation for Q3",
    "description": "Director requested estimated tax liability draft and net payable after TDS credits before 15th December installment.",
    "category": "Bank Loan / Computation",
    "priority": "Normal",
    "status": "In Progress",
    "loggedByStaffId": "staff-ameen",
    "loggedAt": "Yesterday, 02:15 PM",
    "assignedStaffId": "staff-ameen",
    "assignedAt": "Yesterday, 02:40 PM"
  }
];

export const SAMPLE_ACTIVITY_LOGS: ActivityLog[] = [];
