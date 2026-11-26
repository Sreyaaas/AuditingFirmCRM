import * as XLSX from 'xlsx';
import { MasterDataCategory, MasterDataRecord, MasterPeriodValues } from '../types/crm';
import { getTabConfig, getValuesForPeriod, isVisibleInPeriod, normalizeConstitution } from './masterData';

export interface ParsedMasterSheet {
  category: MasterDataCategory;
  sheetName: string;
  records: MasterDataRecord[];
}

const num = (v: unknown): number => {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[₹,\s]/g, '').trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const str = (v: unknown): string => (v == null ? '' : String(v).trim());

const findCol = (headers: string[], candidates: string[]): number => {
  const norm = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const c of candidates) {
    const target = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = norm.findIndex((h) => h === target || h.includes(target));
    if (idx >= 0) return idx;
  }
  return -1;
};

const detectCategoryFromSheet = (sheetName: string, headers: string[], defaultCategory: MasterDataCategory): MasterDataCategory => {
  const s = sheetName.toLowerCase();
  const h = headers.join(' ').toLowerCase();
  if (s.includes('gst') && !s.includes('quart') && !s.includes('qrmp')) return 'monthly-gst';
  if (s.includes('itr') || h.includes('itr 3') || h.includes('itr3')) return 'annual-itr';
  if (s.includes('qrmp') || s.includes('tds') || s.includes('quarter')) return 'quarterly-tds';
  if (s.includes('audit') || s.includes('tax audit')) return 'tax-audit';
  if (s.includes('company') || s.includes('roc') || s.includes('pvt')) return 'company-roc';
  if (h.includes('email')) return 'monthly-gst';
  return defaultCategory;
};

/**
 * Parses an uploaded Excel (.xlsx/.xls) or CSV workbook into MasterDataRecord[].
 * Handles leading blank rows/columns and office header variations like
 * "Legal constution", "Propreitorship", "Current outstading balance", etc.
 */
export async function parseMasterDataWorkbook(
  file: File,
  activeCategory: MasterDataCategory,
  activePeriod: string,
  importAllSheets = false
): Promise<{ sheets: ParsedMasterSheet[]; totalRows: number }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  const sheetsToProcess = importAllSheets ? wb.SheetNames : [wb.SheetNames[0]];
  const parsedSheets: ParsedMasterSheet[] = [];
  let totalRows = 0;

  for (const sheetName of sheetsToProcess) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header row (first row containing "Client")
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const rowStr = (rows[i] || []).map((c) => str(c).toLowerCase());
      if (rowStr.some((c) => c === 'client' || c === 'client name')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) continue;

    const headers = (rows[headerIdx] || []).map((c) => str(c));
    const category = importAllSheets
      ? detectCategoryFromSheet(sheetName, headers, activeCategory)
      : activeCategory;

    const colClient = findCol(headers, ['client', 'client name']);
    const colItrType = findCol(headers, ['itr 3', 'itr3', 'itr type', 'type']);
    const colConst = findCol(headers, ['legal constitution', 'legal constution', 'constitution']);
    const colUser = findCol(headers, ['user name', 'username', 'user id', 'pan']);
    const colPass = findCol(headers, ['password', 'pass']);
    const colEmail = findCol(headers, ['email id', 'email']);
    const colRef = findCol(headers, ['reference', 'ref']);
    const colNature = findCol(headers, ['nature of service', 'service']);
    const colFees = findCol(headers, ['professional fees', 'fees']);
    const colTax = findCol(headers, ['tax payable', 'tax payable for the month']);
    const colOop = findCol(headers, ['reimbursement', 'oop', 'reimbursement/oop expenses']);
    const colOut = findCol(headers, ['current outstading balance', 'current outstanding balance', 'outstanding balance', 'outstanding']);

    if (colClient < 0) continue;

    const records: MasterDataRecord[] = [];
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const clientName = str(row[colClient]);
      if (!clientName) continue;
      // Skip repeated header rows inside combined sheets
      if (clientName.toLowerCase() === 'client') continue;

      const periodVal: MasterPeriodValues = {
        professionalFees: colFees >= 0 ? num(row[colFees]) : 0,
        taxPayable: colTax >= 0 ? num(row[colTax]) : 0,
        oopExpenses: colOop >= 0 ? num(row[colOop]) : 0,
        currentOutstanding: colOut >= 0 ? num(row[colOut]) : 0,
      };

      records.push({
        id: `md-${category}-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
        category,
        clientName,
        legalConstitution: colConst >= 0 ? normalizeConstitution(str(row[colConst])) : '',
        itrType: colItrType >= 0 ? str(row[colItrType]) : undefined,
        username: colUser >= 0 ? str(row[colUser]) : undefined,
        password: colPass >= 0 ? str(row[colPass]) : undefined,
        email: colEmail >= 0 ? str(row[colEmail]) : undefined,
        reference: colRef >= 0 ? str(row[colRef]) : undefined,
        natureOfService: colNature >= 0 ? str(row[colNature]) : undefined,
        effectiveFrom: activePeriod,
        periodValues: { [activePeriod]: periodVal },
        updatedAt: new Date().toISOString(),
      });
    }

    if (records.length > 0) {
      parsedSheets.push({ category, sheetName, records });
      totalRows += records.length;
    }
  }

  return { sheets: parsedSheets, totalRows };
}

export function exportMasterDataToExcel(
  records: MasterDataRecord[],
  category: MasterDataCategory,
  periodKey: string
) {
  const cfg = getTabConfig(category);
  const active = records.filter((r) => r.category === category && isVisibleInPeriod(r, periodKey));

  const rows = active.map((r, idx) => {
    const vals = getValuesForPeriod(r, periodKey);
    const row: Record<string, string | number> = {
      '#': idx + 1,
      Client: r.clientName,
    };
    if (cfg.showItrType) row['ITR Type'] = r.itrType || '';
    row['Legal Constitution'] = r.legalConstitution || '';
    row['Username'] = r.username || '';
    row['Password'] = r.password || '';
    if (cfg.showEmail) row['Email ID'] = r.email || '';
    if (cfg.showReference) row['Reference'] = r.reference || '';
    if (cfg.showNatureOfService) row['Nature of Service'] = r.natureOfService || '';
    row['Professional Fees'] = vals.professionalFees;
    row['Tax Payable'] = vals.taxPayable;
    row['Reimbursement / OOP Expenses'] = vals.oopExpenses;
    row['Current Outstanding Balance'] = vals.currentOutstanding;
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, cfg.shortLabel.replace(/[/\\?*[\]]/g, '-').slice(0, 31));
  const safePeriod = periodKey.replace(/\s+/g, '-');
  XLSX.writeFile(wb, `MasterData_${cfg.id}_${safePeriod}.xlsx`);
}
