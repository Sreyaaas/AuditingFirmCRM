import { DebtAgingBucket, DebtStatus, DebtorMonth, DebtorRecord } from '../types/crm';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** '2026-11' → 'November 2026' (or 'Nov 2026' when short). */
export const monthLabel = (key: string, short = false): string => {
  const [y, m] = key.split('-').map(Number);
  const name = MONTH_NAMES[(m || 1) - 1] || key;
  return `${short ? name.slice(0, 3) : name} ${y}`;
};

/** Current calendar month as 'YYYY-MM'. */
export const currentMonthKey = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Next calendar month after a 'YYYY-MM' key. */
export const nextMonthKey = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

export const closingOf = (m: DebtorMonth): number => m.opening - m.received + m.billed;

/** All month keys present across records, oldest first. */
export const collectMonths = (records: DebtorRecord[]): string[] =>
  Array.from(new Set(records.flatMap((r) => r.months.map((m) => m.month)))).sort();

export const monthOf = (record: DebtorRecord, key: string): DebtorMonth | undefined => record.months.find((m) => m.month === key);

/**
 * Age of an outstanding balance, measured by how many consecutive recent months
 * carried a balance without any payment received.
 */
const agingFor = (months: DebtorMonth[], balance: number): DebtAgingBucket => {
  if (balance <= 0) return '0-30 Days';
  let unpaid = 0;
  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i];
    if (m.received > 0) break;
    if (m.opening > 0 || m.billed > 0) unpaid++;
  }
  if (unpaid <= 1) return '0-30 Days';
  if (unpaid === 2) return '31-60 Days';
  if (unpaid === 3) return '61-90 Days';
  return '90+ Days';
};

/**
 * Re-derives every opening balance from the first month, then balance, status and ageing.
 * Keeps the record internally consistent after a payment or bill is posted.
 */
export const recalcDebtor = (record: DebtorRecord): DebtorRecord => {
  const months = [...record.months].sort((a, b) => a.month.localeCompare(b.month));
  for (let i = 1; i < months.length; i++) {
    months[i] = { ...months[i], opening: closingOf(months[i - 1]) };
  }
  const latest = months[months.length - 1];
  const balance = latest ? closingOf(latest) : 0;
  const agingBucket = agingFor(months, balance);

  let status: DebtStatus;
  if (balance < 0) status = 'Advance';
  else if (balance === 0) status = 'Cleared';
  else if (latest && latest.received > 0) status = 'Partially Paid';
  else if (agingBucket === '0-30 Days') status = 'Pending';
  else status = 'Overdue';

  return { ...record, months, currentBalance: balance, status, agingBucket };
};

/** Ensures the record has an entry for `key`, carrying the previous closing forward. */
export const ensureMonth = (record: DebtorRecord, key: string): DebtorRecord => {
  if (record.months.some((m) => m.month === key)) return record;
  const sorted = [...record.months].sort((a, b) => a.month.localeCompare(b.month));
  const prev = sorted[sorted.length - 1];
  return { ...record, months: [...sorted, { month: key, opening: prev ? closingOf(prev) : 0, received: 0, billed: 0 }] };
};

/** Adds a payment to the given month (default: the record's latest month) and recalculates. */
export const applyPayment = (record: DebtorRecord, amount: number, key?: string): DebtorRecord => {
  const target = key || record.months[record.months.length - 1]?.month || currentMonthKey();
  const withMonth = ensureMonth(record, target);
  return recalcDebtor({
    ...withMonth,
    months: withMonth.months.map((m) => (m.month === target ? { ...m, received: m.received + amount } : m)),
  });
};

/** Adds a bill to the given month (default: the record's latest month) and recalculates. */
export const applyBilling = (record: DebtorRecord, amount: number, key?: string): DebtorRecord => {
  const target = key || record.months[record.months.length - 1]?.month || currentMonthKey();
  const withMonth = ensureMonth(record, target);
  return recalcDebtor({
    ...withMonth,
    months: withMonth.months.map((m) => (m.month === target ? { ...m, billed: m.billed + amount } : m)),
  });
};
