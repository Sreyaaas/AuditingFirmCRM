import * as XLSX from 'xlsx';
import { DebtorRecord, GSTComplianceItem, OfficeBillingEntry } from '../types/crm';
import { collectMonths, monthLabel, monthOf } from './debtors';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-27" style label for the financial year containing a 'YYYY-MM' month. */
const fyLabelFor = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `FY ${String(start % 100).padStart(2, '0')}-${String((start + 1) % 100).padStart(2, '0')}`;
};

/**
 * Downloads the debtors, billing register and GST calendar as one workbook.
 * The layout matches the office's own Excel file, so the export can be edited
 * and imported back through Debtors → Import.
 */
export function exportDebtorsAndGSTWorkbook(debtors: DebtorRecord[], billings: OfficeBillingEntry[], gstReturns: GSTComplianceItem[]) {
  const wb = XLSX.utils.book_new();
  const months = collectMonths(debtors);
  const fy = months.length ? fyLabelFor(months[months.length - 1]) : fyLabelFor(`${new Date().getFullYear()}-${new Date().getMonth() + 1}`);

  // ---------------------------------------------------- billing sheets, one per month
  const periods = Array.from(new Set(billings.map((b) => b.period).filter(Boolean) as string[])).sort();
  for (const period of periods) {
    const rows = billings.filter((b) => b.period === period).sort((a, b) => a.serialNo - b.serialNo);
    const aoa: (string | number)[][] = [
      ['', '', 'Office Billing'],
      ['', '', fy],
      [],
      [],
      ['Serial No.', 'Date', 'Name of Client', 'Nature of service', 'Filing Month', 'Professional income', 'Rcm', 'Tax Amount', 'OOP expenses', 'Billing status', 'User', 'Invoice number'],
      ...rows.map((b) => [
        b.serialNo,
        b.date,
        b.clientName,
        b.natureOfService,
        b.filingMonth || '',
        b.professionalIncome || '',
        b.rcm || '',
        b.taxAmount || '',
        b.oopExpenses || '',
        b.billingStatus || '',
        b.user,
        b.invoiceNumber || '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 9 }, { wch: 12 }, { wch: 32 }, { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
    const [, m] = period.split('-').map(Number);
    XLSX.utils.book_append_sheet(wb, ws, MONTH_NAMES[m - 1] || period);
  }

  // ---------------------------------------------------- debtors sheet
  const monthRow: (string | number)[] = ['', '', ''];
  const headerRow: (string | number)[] = ['', 'S.No', 'Client Name'];
  const totalsRow: (string | number)[] = ['', '', 'Total'];
  for (const key of months) {
    monthRow.push(MONTH_NAMES[Number(key.split('-')[1]) - 1], '', '');
    headerRow.push('Outstanding Amount', 'Payment cleared', 'Current billing');
    const sum = (f: 'opening' | 'received' | 'billed') => debtors.reduce((a, d) => a + (monthOf(d, key)?.[f] || 0), 0);
    totalsRow.push(sum('opening'), sum('received'), sum('billed'));
  }
  headerRow.push('Balance');
  totalsRow.push(debtors.reduce((a, d) => a + d.currentBalance, 0));

  const debtorRows = debtors.map((d) => {
    const row: (string | number)[] = ['', d.sNo, d.clientName];
    for (const key of months) {
      const m = monthOf(d, key);
      row.push(m?.opening || 0, m?.received || '', m?.billed || '');
    }
    row.push(d.currentBalance);
    return row;
  });

  const wsDebtors = XLSX.utils.aoa_to_sheet([['', '', 'Debtors'], ['', '', fy], totalsRow, monthRow, headerRow, ...debtorRows]);
  wsDebtors['!cols'] = [{ wch: 2 }, { wch: 6 }, { wch: 32 }, ...months.flatMap(() => [{ wch: 16 }, { wch: 15 }, { wch: 15 }]), { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsDebtors, 'Debtors');

  // ---------------------------------------------------- GST calendar
  if (gstReturns.length) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Client', 'GSTIN', 'Return', 'Period', 'Due date', 'Status', 'Owner', 'Tax payable', 'ARN', 'Filed on'],
      ...gstReturns.map((g) => [
        g.clientName,
        g.gstin,
        g.returnType,
        g.filingMonth,
        g.dueDate,
        g.priorityLevel === 'filed' ? 'Filed' : g.priorityLevel === 'overdue' ? 'Overdue' : 'Pending',
        g.assignedStaff,
        g.taxPayable || 0,
        g.arnNumber || '',
        g.filedDate || '',
      ]),
    ]);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'GST Returns');
  }

  const latest = months[months.length - 1];
  XLSX.writeFile(wb, `Debtors ${latest ? monthLabel(latest) : fy}.xlsx`);
}

