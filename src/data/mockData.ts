import { StaffMember, Client, MonthlyTask, ITRFiling, CloudIntegration, DebtorAccount, StaffTicket } from '../types/crm';

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Ananya Sharma',
    role: 'GST & Compliance',
    initials: 'AS',
    email: 'ananya@shameerassociates.in',
    phone: '+91 98201 12345',
    assignedRecurringCount: 12,
    assignedITRCount: 26,
    completedThisMonth: 8,
  },
  {
    id: 'staff-2',
    name: 'Rahul Verma',
    role: 'Statutory Audit',
    initials: 'RV',
    email: 'rahul@shameerassociates.in',
    phone: '+91 98202 23456',
    assignedRecurringCount: 11,
    assignedITRCount: 24,
    completedThisMonth: 7,
  },
  {
    id: 'staff-3',
    name: 'Priya Patel',
    role: 'Tax Specialist',
    initials: 'PP',
    email: 'priya@shameerassociates.in',
    phone: '+91 98203 34567',
    assignedRecurringCount: 10,
    assignedITRCount: 25,
    completedThisMonth: 7,
  },
  {
    id: 'staff-4',
    name: 'Karthik Nair',
    role: 'ITR & Corporate Tax',
    initials: 'KN',
    email: 'karthik@shameerassociates.in',
    phone: '+91 98204 45678',
    assignedRecurringCount: 9,
    assignedITRCount: 25,
    completedThisMonth: 6,
  },
  {
    id: 'staff-5',
    name: 'Sneha Sen',
    role: 'Audit Associate',
    initials: 'SS',
    email: 'sneha@shameerassociates.in',
    phone: '+91 98205 56789',
    assignedRecurringCount: 8,
    assignedITRCount: 20,
    completedThisMonth: 6,
  },
];

// Seed sample companies for the 120 client slots
const clientTemplates = [
  { name: 'Zenith Tech Systems Pvt Ltd', trade: 'Zenith Labs', type: 'Private Limited' as const, fee: 18000, city: 'Mumbai', phone: '9820011111' },
  { name: 'Aura Logistics & Freight LLP', trade: 'Aura Cargo', type: 'LLP' as const, fee: 14000, city: 'Navi Mumbai', phone: '9820022222' },
  { name: 'Nova Health Diagnostics Ltd', trade: 'Nova Medicare', type: 'Private Limited' as const, fee: 24000, city: 'Pune', phone: '9820033333' },
  { name: 'Kalyan Jewellers Retailers', trade: 'Kalyan Retail', type: 'Partnership' as const, fee: 12000, city: 'Ahmedabad', phone: '9820044444' },
  { name: 'Vortex Global Software LLP', trade: 'Vortex Cloud', type: 'LLP' as const, fee: 22000, city: 'Bengaluru', phone: '9820055555' },
  { name: 'Shree Krishna Agro Mills Pvt Ltd', trade: 'Krishna Flour Mills', type: 'Private Limited' as const, fee: 16500, city: 'Indore', phone: '9820066666' },
  { name: 'Paramount Polymers & Chemical', trade: 'Paramount Chem', type: 'Partnership' as const, fee: 15000, city: 'Vadodara', phone: '9820077777' },
  { name: 'BlueHorizon Hospitality Suites', trade: 'Horizon Suites', type: 'Private Limited' as const, fee: 19000, city: 'Goa', phone: '9820088888' },
  { name: 'Matrix Electrical Solutions', trade: 'Matrix Power', type: 'Proprietorship' as const, fee: 9500, city: 'Surat', phone: '9820099999' },
  { name: 'Starlight Media Innovations Pvt Ltd', trade: 'Starlight VFX', type: 'Private Limited' as const, fee: 21000, city: 'Hyderabad', phone: '9820100000' },
  { name: 'Falcon Fasteners & Engineering LLP', trade: 'Falcon Tools', type: 'LLP' as const, fee: 13500, city: 'Chennai', phone: '9820111112' },
  { name: 'Greenleaf Organic Nutrition Pvt Ltd', trade: 'GreenLeaf Naturals', type: 'Private Limited' as const, fee: 17500, city: 'Delhi', phone: '9820122223' },
  { name: 'Apex Capital Advisors LLP', trade: 'Apex Advisory', type: 'LLP' as const, fee: 25000, city: 'Mumbai', phone: '9820133334' },
  { name: 'Dynasty Garments Export House', trade: 'Dynasty Apparel', type: 'Partnership' as const, fee: 16000, city: 'Tirupur', phone: '9820144445' },
  { name: 'Titanium Motors & Spares LLP', trade: 'Titanium Auto', type: 'LLP' as const, fee: 14500, city: 'Gurugram', phone: '9820155556' },
  { name: 'Cosmic Cloud Networks Pvt Ltd', trade: 'Cosmic Networks', type: 'Private Limited' as const, fee: 28000, city: 'Bengaluru', phone: '9820166667' },
  { name: 'Trident Marine Shipping Agency', trade: 'Trident Freight', type: 'Partnership' as const, fee: 19500, city: 'Kochi', phone: '9820177778' },
  { name: 'Mahalaxmi Steel Fabricators', trade: 'Mahalaxmi Iron', type: 'Proprietorship' as const, fee: 8500, city: 'Jaipur', phone: '9820188889' },
  { name: 'Elevate Digital Marketing LLP', trade: 'Elevate Media', type: 'LLP' as const, fee: 13000, city: 'Mumbai', phone: '9820199990' },
  { name: 'Symphony Acoustics & Audio Ltd', trade: 'Symphony Pro', type: 'Private Limited' as const, fee: 22500, city: 'Noida', phone: '9820200001' },
];

// Generate 120 clients
export const INITIAL_CLIENTS: Client[] = Array.from({ length: 120 }, (_, index) => {
  const tpl = clientTemplates[index % clientTemplates.length];
  const suffix = index >= 20 ? ` (${Math.floor(index / 20) + 1})` : '';
  const isRecurring = index < 50; // The 50 monthly recurring clients specified by user
  const assignedStaff = INITIAL_STAFF[index % INITIAL_STAFF.length];
  const clientNum = String(index + 1).padStart(3, '0');
  const stateCode = '27';
  const panLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
  const pan = `${panLetters[index % 10]}ABC${panLetters[(index + 3) % 10]}${String(1000 + index).slice(-4)}Z`;
  const gstin = `${stateCode}${pan}1Z${index % 9}`;

  return {
    id: `client-${index + 1}`,
    clientCode: `C-${clientNum}`,
    name: `${tpl.name}${suffix}`,
    tradeName: `${tpl.trade}${suffix}`,
    entityType: tpl.type,
    gstin,
    pan,
    contactPerson: `Director ${String.fromCharCode(65 + (index % 26))}. Kumar`,
    phone: `+91 ${tpl.phone.slice(0, 5)} ${String(10000 + index).slice(-5)}`,
    email: `accounts@${tpl.trade.toLowerCase().replace(/[^a-z]/g, '')}.in`,
    isRecurringGST: isRecurring,
    isRecurringStatutory: isRecurring,
    assignedStaffId: assignedStaff.id,
    monthlyAuditFee: tpl.fee,
    city: tpl.city,
    oneDriveFolderUrl: `https://[PLACEHOLDER: onedrive-domain]/clients/C-${clientNum}`,
    status: 'Active',
  };
});

// The 50 Monthly Recurring Compliance Tasks
const filingTypesPool: MonthlyTask['filingType'][] = ['GSTR-1', 'GSTR-3B', 'Statutory Audit', 'TDS Payment', 'PF/ESI'];

export const INITIAL_MONTHLY_TASKS: MonthlyTask[] = INITIAL_CLIENTS.slice(0, 50).map((client, i) => {
  const staff = INITIAL_STAFF[i % INITIAL_STAFF.length];
  const filingType = filingTypesPool[i % filingTypesPool.length];
  
  let status: MonthlyTask['status'] = 'In Progress';
  let daysRemaining = 5;
  let dueDate = '2026-11-11';
  let arnNumber: string | undefined = undefined;

  if (filingType === 'GSTR-1') {
    dueDate = '2026-11-11';
    daysRemaining = 3;
  } else if (filingType === 'GSTR-3B') {
    dueDate = '2026-11-20';
    daysRemaining = 12;
  } else if (filingType === 'TDS Payment') {
    dueDate = '2026-11-07';
    daysRemaining = 1;
  } else if (filingType === 'PF/ESI') {
    dueDate = '2026-11-15';
    daysRemaining = 7;
  } else {
    dueDate = '2026-11-30';
    daysRemaining = 22;
  }

  // Realistic operational distribution
  if (i < 30) {
    status = 'Filed';
    arnNumber = `AA271126${String(100000 + i)}`;
  } else if (i < 38) {
    status = 'Draft Ready';
  } else if (i < 45) {
    status = 'In Progress';
  } else if (i < 48) {
    status = 'Docs Pending';
  } else {
    status = 'Overdue';
    daysRemaining = -2;
  }

  return {
    id: `task-m-${i + 1}`,
    clientId: client.id,
    clientName: client.name,
    tradeName: client.tradeName,
    gstin: client.gstin,
    filingType,
    period: 'October 2026',
    assignedStaffId: staff.id,
    status,
    dueDate,
    daysRemaining,
    arnNumber,
    taxPayable: (i + 1) * 14250,
    turnoverReported: (i + 1) * 380000,
    lastUpdated: `${(i % 5) + 1}h ago`,
    phone: client.phone,
    docsReceived: status !== 'Docs Pending',
    notes: status === 'Docs Pending' ? 'Pending sales invoices from client accountant' : undefined,
  };
});

// Annual ITR Filings for the 120 Clients
export const INITIAL_ITR_FILINGS: ITRFiling[] = INITIAL_CLIENTS.map((client, i) => {
  const staff = INITIAL_STAFF[i % INITIAL_STAFF.length];
  const itrForm = client.entityType === 'Private Limited' 
    ? 'ITR-6' 
    : client.entityType === 'LLP' || client.entityType === 'Partnership' 
      ? 'ITR-5' 
      : (i % 2 === 0 ? 'ITR-3' : 'ITR-2');

  const status = i < 68 
    ? 'Filed & e-Verified' 
    : i < 88 
      ? 'Client Confirmed' 
      : i < 104 
        ? 'Draft Computation' 
        : i < 114 
          ? '26AS Reconciled' 
          : 'Docs Pending';

  const isAudit = client.entityType === 'Private Limited' || client.monthlyAuditFee > 15000;
  const dueDate = isAudit ? '2026-10-31' : '2026-07-31';

  return {
    id: `itr-${i + 1}`,
    clientId: client.id,
    clientName: client.name,
    pan: client.pan,
    entityType: client.entityType,
    itrForm,
    assessmentYear: 'AY 2026-27',
    financialYear: 'FY 2025-26',
    assignedStaffId: staff.id,
    status,
    dueDate,
    regime: i % 3 === 0 ? 'Old Regime' : 'New Regime (115BAC)',
    taxLiabilityOrRefund: (i % 2 === 0 ? 1 : -1) * ((i + 1) * 9800),
    acknowledgmentNo: status === 'Filed & e-Verified' ? `ACK${982000000000 + i}` : undefined,
    lastActivity: `${(i % 12) + 1} Nov 2026`,
    phone: client.phone,
  };
});

export const INITIAL_DEBTORS: DebtorAccount[] = INITIAL_CLIENTS.slice(0, 48).map((client, i) => {
  const staff = INITIAL_STAFF[i % INITIAL_STAFF.length];
  const serviceCategories: DebtorAccount['serviceCategory'][] = [
    'GST Retainer',
    'Statutory Audit',
    'ITR Filing',
    'ROC Compliance',
    'TDS Filing',
  ];
  const category = serviceCategories[i % serviceCategories.length];
  const baseFee = client.monthlyAuditFee || 15000;
  
  // Create varied debt profiles across aging buckets
  let billedAmount = baseFee;
  let paidAmount = 0;
  let agingDays = 14;
  let agingBucket: DebtorAccount['agingBucket'] = '0-30 Days';
  let status: DebtorAccount['status'] = 'Pending';
  let invoiceDate = '2026-10-15';
  let dueDate = '2026-11-05';
  let lastReminder: string | undefined = undefined;

  if (category === 'Statutory Audit') {
    billedAmount = baseFee * 2.5;
  } else if (category === 'ITR Filing') {
    billedAmount = client.entityType === 'Individual' ? 6500 : 18500;
  }

  if (i < 12) {
    // 0-30 days current
    agingDays = (i % 25) + 3;
    agingBucket = '0-30 Days';
    status = 'Pending';
    invoiceDate = '2026-10-20';
    dueDate = '2026-11-10';
  } else if (i < 24) {
    // 31-60 days
    agingDays = 35 + (i % 20);
    agingBucket = '31-60 Days';
    status = i % 2 === 0 ? 'Partially Paid' : 'Overdue';
    paidAmount = status === 'Partially Paid' ? Math.round(billedAmount * 0.4) : 0;
    invoiceDate = '2026-09-15';
    dueDate = '2026-10-05';
    lastReminder = '28 Oct 2026';
  } else if (i < 36) {
    // 61-90 days
    agingDays = 65 + (i % 20);
    agingBucket = '61-90 Days';
    status = 'Overdue';
    invoiceDate = '2026-08-10';
    dueDate = '2026-08-31';
    lastReminder = '24 Oct 2026';
  } else if (i < 42) {
    // 90+ days severe
    agingDays = 95 + (i % 40);
    agingBucket = '90+ Days';
    status = 'Overdue';
    invoiceDate = '2026-06-15';
    dueDate = '2026-07-05';
    lastReminder = '01 Nov 2026';
  } else {
    // Recently cleared
    agingDays = 10;
    agingBucket = '0-30 Days';
    status = 'Cleared';
    paidAmount = billedAmount;
    invoiceDate = '2026-10-05';
    dueDate = '2026-10-25';
  }

  const outstandingBalance = billedAmount - paidAmount;

  return {
    id: `debt-${i + 1}`,
    clientId: client.id,
    clientName: client.name,
    tradeName: client.tradeName,
    entityType: client.entityType,
    invoiceNo: `INV-2627-${String(100 + i + 1)}`,
    invoiceDate,
    dueDate,
    serviceCategory: category,
    billedAmount,
    paidAmount,
    outstandingBalance,
    agingDays,
    agingBucket,
    status,
    lastReminderSent: lastReminder,
    assignedStaffId: staff.id,
    phone: client.phone,
  };
});

export const INITIAL_TICKETS: StaffTicket[] = [
  {
    id: 'ticket-1',
    ticketNo: 'TK-1081',
    clientId: 'client-1',
    clientName: 'Zenith Tech Systems Pvt Ltd',
    tradeName: 'Zenith Labs',
    callerName: 'Rajeev Kapoor (MD)',
    callerPhone: '+91 98200 11111',
    callType: 'Inbound Phone Call',
    subject: 'Bank Sanction: Provisional Computation & CA Net Worth Certificate required',
    description: 'Director called asking for provisional computation for FY 25-26 and CA net worth certificate needed for HDFC CC limit renewal by tomorrow 2 PM.',
    category: 'Bank Loan / Computation',
    priority: 'Urgent',
    status: 'In Progress',
    loggedByStaffId: 'staff-5', // Sneha Sen took the call
    loggedAt: 'Today, 10:45 AM',
    assignedStaffId: 'staff-1', // Ananya Sharma took ownership
    assignedAt: 'Today, 11:15 AM',
    resolutionNotes: 'Drafting computation based on Q1-Q2 provisional P&L. Waiting for stock statement.',
  },
  {
    id: 'ticket-2',
    ticketNo: 'TK-1082',
    clientId: 'client-2',
    clientName: 'Aura Logistics & Freight LLP',
    tradeName: 'Aura Cargo',
    callerName: 'Sunil Rao (Chief Accountant)',
    callerPhone: '+91 98200 22222',
    callType: 'Inbound Phone Call',
    subject: 'GSTR-2B ITC Mismatch for October purchase invoices',
    description: 'Accountant called stating supplier invoice for ₹1,40,000 is not reflecting in 2B. Needs reconciliation before GSTR-3B cutoff.',
    category: 'GST & Return Query',
    priority: 'High',
    status: 'In Progress',
    loggedByStaffId: 'staff-2', // Rahul Verma logged it
    loggedAt: 'Today, 09:30 AM',
    assignedStaffId: 'staff-3', // Priya Patel assigned to herself
    assignedAt: 'Today, 09:50 AM',
  },
  {
    id: 'ticket-3',
    ticketNo: 'TK-1083',
    clientId: 'client-3',
    clientName: 'Nova Health Diagnostics Ltd',
    tradeName: 'Nova Medicare',
    callerName: 'Dr. Arvinder Singh (Director)',
    callerPhone: '+91 98200 33333',
    callType: 'Inbound Phone Call',
    subject: 'Income Tax Intimation u/s 143(1) with Demand Notice for AY 2025-26',
    description: 'Client received email intimation from CPC Bengaluru with demand notice of ₹14,800. Wants us to review TDS mismatch and file rectification.',
    category: 'Income Tax Notice',
    priority: 'High',
    status: 'In Progress',
    loggedByStaffId: 'staff-1', // Ananya logged it
    loggedAt: 'Yesterday, 04:15 PM',
    assignedStaffId: 'staff-4', // Karthik Nair handling
    assignedAt: 'Yesterday, 05:00 PM',
  },
  {
    id: 'ticket-4',
    ticketNo: 'TK-1084',
    clientId: 'client-4',
    clientName: 'Kalyan Jewellers Retailers',
    tradeName: 'Kalyan Retail',
    callerName: 'Nitin Shah (Partner)',
    callerPhone: '+91 98200 44444',
    callType: 'Inbound Phone Call',
    subject: 'Director DSC Token Expired - Renewal Needed for ROC MCA Filing',
    description: 'Partner called saying e-Pass 2003 token expired. Needs Class-3 DSC renewal urgently for signing MCA form MGT-7 before Saturday.',
    category: 'DSC & Portal Access',
    priority: 'Normal',
    status: 'Unassigned', // In open pool!
    loggedByStaffId: 'staff-5', // Sneha Sen logged it
    loggedAt: 'Today, 11:30 AM',
    assignedStaffId: null,
  },
  {
    id: 'ticket-5',
    ticketNo: 'TK-1085',
    clientId: 'client-5',
    clientName: 'Vortex Global Software LLP',
    tradeName: 'Vortex Cloud',
    callerName: 'Aditya Nair (Finance Head)',
    callerPhone: '+91 98200 55555',
    callType: 'WhatsApp Query',
    subject: 'Foreign Inward Remittance (FIRC) & GST LUT Renewal Verification',
    description: 'Received export payment in USD from US client. Needs FIRC verification and query regarding Letter of Undertaking (LUT) submission.',
    category: 'GST & Return Query',
    priority: 'Normal',
    status: 'Resolved',
    loggedByStaffId: 'staff-4',
    loggedAt: '02 Nov 2026, 02:20 PM',
    assignedStaffId: 'staff-1',
    assignedAt: '02 Nov 2026, 02:45 PM',
    resolvedAt: '02 Nov 2026, 05:10 PM',
    resolutionNotes: 'LUT acknowledgment verified on GST portal. FIRC documentation copy saved in OneDrive client folder.',
  },
  {
    id: 'ticket-6',
    ticketNo: 'TK-1086',
    clientId: 'client-7',
    clientName: 'Paramount Polymers & Chemical',
    tradeName: 'Paramount Chem',
    callerName: 'Hitesh Patel (Accounts)',
    callerPhone: '+91 98200 77777',
    callType: 'Inbound Phone Call',
    subject: 'TDS Certificate Form 16A generation for Q2 vendor deductions',
    description: 'Vendor accounts team requested signed Form 16A for September quarter TDS deductions under section 194C and 194J.',
    category: 'Accounting & Books',
    priority: 'Normal',
    status: 'Unassigned', // In open pool!
    loggedByStaffId: 'staff-3',
    loggedAt: 'Today, 12:15 PM',
    assignedStaffId: null,
  },
  {
    id: 'ticket-7',
    ticketNo: 'TK-1087',
    clientId: 'client-10',
    clientName: 'Starlight Media Innovations Pvt Ltd',
    tradeName: 'Starlight VFX',
    callerName: 'Devika Menon (Finance)',
    callerPhone: '+91 98201 00000',
    callType: 'Inbound Phone Call',
    subject: 'GST Portal Login OTP authorization for GSTR-1 submission',
    description: 'Staff tried logging into GST portal to upload JSON. Called director for OTP, phone was busy. Need to retry at 3 PM.',
    category: 'DSC & Portal Access',
    priority: 'Urgent',
    status: 'Waiting on Client',
    loggedByStaffId: 'staff-2',
    loggedAt: 'Today, 01:05 PM',
    assignedStaffId: 'staff-2',
    assignedAt: 'Today, 01:10 PM',
    resolutionNotes: 'Sent WhatsApp reminder to director for OTP coordination at 3:00 PM.',
  },
  {
    id: 'ticket-8',
    ticketNo: 'TK-1088',
    clientId: 'client-15',
    clientName: 'Titanium Motors & Spares LLP',
    tradeName: 'Titanium Auto',
    callerName: 'Vikram Joshi (Partner)',
    callerPhone: '+91 98201 55556',
    callType: 'Office Visit',
    subject: 'Draft Balance Sheet & Depreciation Schedule for partner review',
    description: 'Audit balance sheet draft required for internal partner meeting scheduled on Friday. Partner visited office with physical voucher file.',
    category: 'Accounting & Books',
    priority: 'Normal',
    status: 'In Progress',
    loggedByStaffId: 'staff-1',
    loggedAt: 'Yesterday, 03:30 PM',
    assignedStaffId: 'staff-2',
    assignedAt: 'Yesterday, 04:00 PM',
  },
];

export const INITIAL_CLOUD_INTEGRATIONS: CloudIntegration = {
  supabase: {
    status: 'connected',
    url: 'https://[PLACEHOLDER: supabase-ref].supabase.co',
    lastSynced: 'Synced',
    tables: [
      { name: 'clients', count: 120 },
      { name: 'monthly_tasks', count: 50 },
      { name: 'itr_filings', count: 120 },
      { name: 'staff', count: 5 },
    ],
  },
  oneDrive: {
    status: 'connected',
    tenant: '[PLACEHOLDER: tenant-id].sharepoint.com',
    foldersMapped: 120,
    lastSynced: '10m ago',
    storageUsedGb: 48.6,
  },
};
