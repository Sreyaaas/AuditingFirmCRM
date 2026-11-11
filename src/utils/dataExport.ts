import * as XLSX from 'xlsx';
import { DebtorRecord } from '../types/crm';
import { closingOf } from './debtors';

type Row = Record<string, unknown>;

/** Excel cells hold plain values: nested objects and lists become JSON text. */
const flatten = (row: Row): Row =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v]));

/**
 * Builds a workbook with one sheet per dataset and downloads it.
 * Runs entirely in the browser: nothing is uploaded anywhere.
 */
export function downloadExcelBackup(sets: { name: string; rows: Row[] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sets) {
    const ws = rows.length ? XLSX.utils.json_to_sheet(rows.map(flatten)) : XLSX.utils.aoa_to_sheet([['No rows']]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

/** Debtor accounts without their month list, plus one row per account per month. */
export const debtorSheets = (debtors: DebtorRecord[]) => ({
  accounts: debtors.map(({ months: _months, ...rest }) => rest as Row),
  months: debtors.flatMap((d) =>
    d.months.map((m) => ({ client: d.clientName, month: m.month, opening: m.opening, received: m.received, billed: m.billed, closing: closingOf(m) }))
  ),
});
