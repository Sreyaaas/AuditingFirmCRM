/**
 * Parser for the firm's debtors workbook (the Excel file kept by the office).
 *
 * Expected layout — matched by header text, not fixed cell positions:
 *  - A sheet named "Debtors": a row containing "Client Name", and directly above it a row of
 *    month names. Each month spans three columns: Outstanding · Payment cleared · Current billing.
 *  - Any number of monthly billing sheets (e.g. "August"): a header row containing
 *    "Name of Client" and "Professional income".
 *  - A cell such as "FY 26-27" anywhere in the first rows sets the financial year, so
 *    April–December map to the first year and January–March to the next.
 */
import * as XLSX from 'xlsx';
import { DebtorMonth, DebtorRecord, OfficeBillingEntry } from '../types/crm';
import { closingOf, recalcDebtor } from './debtors';

export interface DebtorWorkbookResult {
  records: DebtorRecord[];
  billings: OfficeBillingEntry[];
  months: string[];
  warnings: string[];
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const monthIndex = (text: unknown): number => {
  if (typeof text !== 'string') return -1;
  const t = text.trim().toLowerCase();
  if (t.length < 3) return -1;
  return MONTHS.indexOf(t.slice(0, 3));
};

const num = (v: unknown): number => {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[₹,\s]/g, '');
    if (cleaned === '' || cleaned === '-') return 0;
    const n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }
  return 0;
};

const text = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

const rowsOf = (ws: XLSX.WorkSheet): unknown[][] => XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][];

/** Detects "FY 26-27" / "FY 2026-27" and returns the starting calendar year. */
const detectFyStart = (wb: XLSX.WorkBook): number | null => {
  for (const name of wb.SheetNames) {
    for (const row of rowsOf(wb.Sheets[name]).slice(0, 6)) {
      for (const cell of row) {
        const m = /FY\s*(\d{2,4})\s*[-–/]\s*\d{2}/i.exec(text(cell));
        if (m) {
          const y = Number(m[1]);
          return y < 100 ? 2000 + y : y;
        }
      }
    }
  }
  return null;
};

const monthKey = (idx: number, fyStart: number): string => {
  const year = idx >= 3 ? fyStart : fyStart + 1; // Apr–Dec → FY start year
  return `${year}-${String(idx + 1).padStart(2, '0')}`;
};

/** Excel serial number or dd/mm/yyyy text → ISO date (yyyy-mm-dd), or '' if not a date. */
const toIsoDate = (v: unknown): string => {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text(v));
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function parseDebtorsSheet(ws: XLSX.WorkSheet, fyStart: number, warnings: string[]): DebtorRecord[] {
  const rows = rowsOf(ws);
  const headerIdx = rows.findIndex((r) => r.some((c) => /client\s*name/i.test(text(c))));
  if (headerIdx < 1) {
    warnings.push('Debtors sheet: could not find the "Client Name" header row.');
    return [];
  }
  const header = rows[headerIdx];
  const nameCol = header.findIndex((c) => /client\s*name/i.test(text(c)));
  const monthRow = rows[headerIdx - 1];

  const blocks: { col: number; key: string }[] = [];
  monthRow.forEach((cell, col) => {
    const idx = monthIndex(cell);
    if (idx >= 0) blocks.push({ col, key: monthKey(idx, fyStart) });
  });
  if (blocks.length === 0) {
    warnings.push('Debtors sheet: no month headings found above the "Client Name" row.');
    return [];
  }
  const allMonths = blocks.map((b) => b.key).sort();

  const records: DebtorRecord[] = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const name = text(row[nameCol]);
    if (!name) continue;

    const entered = new Map<string, DebtorMonth>();
    for (const b of blocks) {
      const cells = [row[b.col], row[b.col + 1], row[b.col + 2]];
      if (cells.every((c) => text(c) === '')) continue;
      entered.set(b.key, { month: b.key, opening: num(cells[0]), received: num(cells[1]), billed: num(cells[2]) });
    }

    // Cross-check the sheet: each month's opening should equal the previous month's closing.
    let prev: DebtorMonth | undefined;
    for (const key of allMonths) {
      const m = entered.get(key);
      if (m && prev && text(rows[r][blocks.find((b) => b.key === key)!.col]) !== '') {
        const expected = closingOf(prev);
        if (Math.abs(expected - m.opening) > 0.5) {
          warnings.push(`${name}: ${key} opening is ₹${m.opening.toLocaleString('en-IN')} but the previous month closed at ₹${expected.toLocaleString('en-IN')}. Using ₹${expected.toLocaleString('en-IN')}.`);
        }
      }
      if (m) prev = m;
      else if (prev) prev = { month: key, opening: closingOf(prev), received: 0, billed: 0 };
    }

    // Every account covers the same months so month views line up; balances carry forward.
    const months: DebtorMonth[] = allMonths.map((key, i) => entered.get(key) || { month: key, opening: i === 0 ? 0 : NaN, received: 0, billed: 0 });
    if (isNaN(months[0].opening)) months[0].opening = 0;

    const sNo = Number(row[nameCol - 1]) || records.length + 1;
    records.push(
      recalcDebtor({
        sNo,
        id: `debtor-${slug(name)}`,
        clientName: name,
        phone: '',
        entityType: '',
        assignedStaff: '',
        months: months.map((m) => ({ ...m, opening: isNaN(m.opening) ? 0 : m.opening })),
        currentBalance: 0,
        status: 'Pending',
        agingBucket: '0-30 Days',
      })
    );
  }
  return records;
}

function parseBillingSheet(name: string, ws: XLSX.WorkSheet, fyStart: number): OfficeBillingEntry[] {
  const rows = rowsOf(ws);
  const headerIdx = rows.findIndex((r) => r.some((c) => /name\s*of\s*client/i.test(text(c))) && r.some((c) => /professional/i.test(text(c))));
  if (headerIdx < 0) return [];
  const header = rows[headerIdx].map((c) => text(c).toLowerCase());
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const c = {
    serial: col(/serial|s\.?\s*no/),
    date: col(/^date/),
    client: col(/name\s*of\s*client/),
    service: col(/nature/),
    filing: col(/filing\s*month/),
    income: col(/professional/),
    rcm: col(/^rcm/),
    tax: col(/tax\s*amount/),
    oop: col(/oop/),
    status: col(/billing\s*status/),
    user: col(/^user/),
    invoice: col(/invoice/),
  };
  const idx = monthIndex(name);
  const period = idx >= 0 ? monthKey(idx, fyStart) : '';
  const get = (row: unknown[], i: number) => (i >= 0 ? row[i] : '');

  const out: OfficeBillingEntry[] = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const client = text(get(row, c.client));
    if (!client) continue;
    const status = text(get(row, c.status));
    out.push({
      id: `bill-${period || slug(name)}-${r}`,
      serialNo: Number(get(row, c.serial)) || out.length + 1,
      date: toIsoDate(get(row, c.date)),
      clientName: client,
      natureOfService: text(get(row, c.service)),
      filingMonth: text(get(row, c.filing)),
      professionalIncome: num(get(row, c.income)),
      rcm: num(get(row, c.rcm)) || undefined,
      taxAmount: num(get(row, c.tax)) || undefined,
      oopExpenses: num(get(row, c.oop)),
      billingStatus: (['Billed', 'Pending', 'Received'].includes(status) ? status : '') as OfficeBillingEntry['billingStatus'],
      user: text(get(row, c.user)),
      invoiceNumber: text(get(row, c.invoice)),
      period,
    });
  }
  return out;
}

/** Parses a workbook already read by the xlsx library. */
export function parseDebtorWorkbook(wb: XLSX.WorkBook, fallbackFyStart = new Date().getFullYear()): DebtorWorkbookResult {
  const warnings: string[] = [];
  const fyStart = detectFyStart(wb) ?? fallbackFyStart;
  const debtorSheet = wb.SheetNames.find((n) => /debtor/i.test(n));

  const records = debtorSheet ? parseDebtorsSheet(wb.Sheets[debtorSheet], fyStart, warnings) : [];
  if (!debtorSheet) warnings.push('No sheet named "Debtors" was found.');

  const billings = wb.SheetNames.filter((n) => n !== debtorSheet).flatMap((n) => parseBillingSheet(n, wb.Sheets[n], fyStart));
  const months = Array.from(new Set(records.flatMap((r) => r.months.map((m) => m.month)))).sort();
  return { records, billings, months, warnings };
}

/** Reads an uploaded .xlsx File in the browser and parses it. */
export async function parseDebtorWorkbookFile(file: File): Promise<DebtorWorkbookResult> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return parseDebtorWorkbook(wb);
}
