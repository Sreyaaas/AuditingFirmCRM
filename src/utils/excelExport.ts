import * as XLSX from 'xlsx';
import { DebtorRecord, OfficeBillingEntry, GSTComplianceItem } from '../types/crm';

/**
 * Generates and downloads an Excel workbook matching the exact format of
 * Shameer and Associates - Accountants and Practitioners.
 */
export function exportDebtorsAndGSTWorkbook(
  debtorRecords: DebtorRecord[],
  billingEntries: OfficeBillingEntry[],
  gstCompliance: GSTComplianceItem[]
) {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: DEBTORS RECONCILIATION STATEMENT
  // ==========================================
  const debtorsData: (string | number)[][] = [
    ['SHAMEER AND ASSOCIATES - ACCOUNTANTS AND PRACTITIONERS'],
    ['DEBTORS RECONCILIATION MASTER STATEMENT (FY 2026-27)'],
    ['Generated on:', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
    [], // empty line
    [
      'S.No',
      'Name of the Client',
      'Assigned Staff',
      // August
      'Aug - Outstanding',
      'Aug - Cleared',
      'Aug - Current Billing',
      // September
      'Sep - Outstanding',
      'Sep - Cleared',
      'Sep - Current Billing',
      // October
      'Oct - Outstanding',
      'Oct - Cleared',
      'Oct - Current Billing',
      // November
      'Nov - Outstanding',
      'Nov - Cleared',
      'Nov - Current Billing',
      // Closing
      'Current Balance',
      'Aging Bucket',
      'Status'
    ]
  ];

  // Calculate Column Totals
  const totalAugOut = debtorRecords.reduce((acc, d) => acc + (d.august?.outstanding || 0), 0);
  const totalAugClr = debtorRecords.reduce((acc, d) => acc + (d.august?.paymentCleared || 0), 0);
  const totalAugBil = debtorRecords.reduce((acc, d) => acc + (d.august?.currentBilling || 0), 0);

  const totalSepOut = debtorRecords.reduce((acc, d) => acc + (d.september?.outstanding || 0), 0);
  const totalSepClr = debtorRecords.reduce((acc, d) => acc + (d.september?.paymentCleared || 0), 0);
  const totalSepBil = debtorRecords.reduce((acc, d) => acc + (d.september?.currentBilling || 0), 0);

  const totalOctOut = debtorRecords.reduce((acc, d) => acc + (d.october?.outstanding || 0), 0);
  const totalOctClr = debtorRecords.reduce((acc, d) => acc + (d.october?.paymentCleared || 0), 0);
  const totalOctBil = debtorRecords.reduce((acc, d) => acc + (d.october?.currentBilling || 0), 0);

  const totalNovOut = debtorRecords.reduce((acc, d) => acc + (d.november?.outstanding || 0), 0);
  const totalNovClr = debtorRecords.reduce((acc, d) => acc + (d.november?.paymentCleared || 0), 0);
  const totalNovBil = debtorRecords.reduce((acc, d) => acc + (d.november?.currentBilling || 0), 0);

  const totalBalance = debtorRecords.reduce((acc, d) => acc + (d.currentBalance || 0), 0);

  // Totals row at the top (exact practice from Shameer & Associates excel sheet)
  debtorsData.push([
    '',
    'TOTAL',
    '',
    totalAugOut,
    totalAugClr,
    totalAugBil,
    totalSepOut,
    totalSepClr,
    totalSepBil,
    totalOctOut,
    totalOctClr,
    totalOctBil,
    totalNovOut,
    totalNovClr,
    totalNovBil,
    totalBalance,
    '',
    ''
  ]);

  // Client rows
  debtorRecords.forEach((d) => {
    debtorsData.push([
      d.sNo,
      d.clientName,
      d.assignedStaff,
      d.august?.outstanding || 0,
      d.august?.paymentCleared || 0,
      d.august?.currentBilling || 0,
      d.september?.outstanding || 0,
      d.september?.paymentCleared || 0,
      d.september?.currentBilling || 0,
      d.october?.outstanding || 0,
      d.october?.paymentCleared || 0,
      d.october?.currentBilling || 0,
      d.november?.outstanding || 0,
      d.november?.paymentCleared || 0,
      d.november?.currentBilling || 0,
      d.currentBalance,
      d.agingBucket,
      d.status
    ]);
  });

  const wsDebtors = XLSX.utils.aoa_to_sheet(debtorsData);

  // Set column widths
  wsDebtors['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 32 }, // Client Name
    { wch: 14 }, // Staff
    { wch: 15 }, // Aug Out
    { wch: 14 }, // Aug Clr
    { wch: 15 }, // Aug Bil
    { wch: 15 }, // Sep Out
    { wch: 14 }, // Sep Clr
    { wch: 15 }, // Sep Bil
    { wch: 15 }, // Oct Out
    { wch: 14 }, // Oct Clr
    { wch: 15 }, // Oct Bil
    { wch: 15 }, // Nov Out
    { wch: 14 }, // Nov Clr
    { wch: 15 }, // Nov Bil
    { wch: 16 }, // Current Balance
    { wch: 14 }, // Aging
    { wch: 12 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsDebtors, 'Debtors FY 26-27');

  // ==========================================
  // SHEET 2: OFFICE BILLING LOG
  // ==========================================
  const billingData: (string | number)[][] = [
    ['SHAMEER AND ASSOCIATES - OFFICE BILLING REGISTER'],
    ['Period: July 2026 - October 2026'],
    [],
    [
      'Sl No',
      'Date',
      'Name of the Client',
      'Nature of Service',
      'Filing Month',
      'Professional Income (₹)',
      'OOP Expenses (₹)',
      'Total Amount (₹)',
      'Staff User'
    ]
  ];

  let totalProfIncome = 0;
  let totalOop = 0;

  billingEntries.forEach((b) => {
    const prof = b.professionalIncome || 0;
    const oop = b.oopExpenses || 0;
    totalProfIncome += prof;
    totalOop += oop;

    billingData.push([
      b.serialNo,
      b.date,
      b.clientName,
      b.natureOfService,
      b.filingMonth || '-',
      prof,
      oop,
      prof + oop,
      b.user
    ]);
  });

  // Summary Row for Billing
  billingData.push([
    '',
    'TOTAL',
    '',
    '',
    '',
    totalProfIncome,
    totalOop,
    totalProfIncome + totalOop,
    ''
  ]);

  const wsBilling = XLSX.utils.aoa_to_sheet(billingData);
  wsBilling['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 14 }, // Date
    { wch: 32 }, // Client Name
    { wch: 28 }, // Service
    { wch: 16 }, // Month
    { wch: 22 }, // Prof Income
    { wch: 18 }, // OOP
    { wch: 18 }, // Total
    { wch: 14 }, // Staff
  ];
  XLSX.utils.book_append_sheet(wb, wsBilling, 'Office Billing Register');

  // ==========================================
  // SHEET 3: GST COMPLIANCE & FILING TRACKER
  // ==========================================
  const gstData: (string | number)[][] = [
    ['SHAMEER AND ASSOCIATES - GST COMPLIANCE & FILING REGISTER'],
    ['Prioritised Compliance Deadlines - Generated on ' + new Date().toLocaleDateString('en-IN')],
    [],
    [
      'Priority Level',
      'Client Name',
      'GSTIN',
      'Return Type',
      'Filing Period',
      'Due Date',
      'Filing Status',
      'Assigned Staff',
      'Tax Payable (₹)',
      'ARN Reference',
      'Filing Date'
    ]
  ];

  // Sort by priority strictly: overdue -> due-2-days -> upcoming -> filed
  const priorityOrder: Record<string, number> = {
    'overdue': 1,
    'due-2-days': 2,
    'upcoming': 3,
    'filed': 4
  };

  const sortedGST = [...gstCompliance].sort((a, b) => {
    const pA = priorityOrder[a.priorityLevel] || 99;
    const pB = priorityOrder[b.priorityLevel] || 99;
    if (pA !== pB) return pA - pB;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  sortedGST.forEach((g) => {
    let priorityLabel = 'Upcoming';
    if (g.priorityLevel === 'overdue') priorityLabel = '🚨 OVERDUE';
    else if (g.priorityLevel === 'due-2-days') priorityLabel = '⚠️ DUE IN 2 DAYS';
    else if (g.priorityLevel === 'filed') priorityLabel = '✅ FILED';

    gstData.push([
      priorityLabel,
      g.clientName,
      g.gstin,
      g.returnType,
      g.filingMonth,
      g.dueDate,
      g.filingStatus,
      g.assignedStaff,
      g.taxPayable || 0,
      g.arnNumber || '-',
      g.filedDate || '-'
    ]);
  });

  const wsGST = XLSX.utils.aoa_to_sheet(gstData);
  wsGST['!cols'] = [
    { wch: 18 }, // Priority
    { wch: 30 }, // Client Name
    { wch: 18 }, // GSTIN
    { wch: 14 }, // Return Type
    { wch: 16 }, // Month
    { wch: 14 }, // Due Date
    { wch: 14 }, // Status
    { wch: 14 }, // Staff
    { wch: 16 }, // Tax
    { wch: 20 }, // ARN
    { wch: 14 }, // Filed Date
  ];
  XLSX.utils.book_append_sheet(wb, wsGST, 'GST Compliance Register');

  // Trigger File Download
  const filename = `Shameer_Associates_Audit_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

