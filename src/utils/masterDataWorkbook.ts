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

const isHeaderRow = (row: unknown[]): boolean => {
  const cells = (row || []).map((c) => str(c).toLowerCase());
  const hasClient = cells.some((c) => c === 'client' || c === 'client name');
  const hasOtherKnown = cells.some(
    (c) =>
      c.includes('constit') ||
      c.includes('constut') ||
      c.includes('user') ||
      c.includes('password') ||
      c.includes('itr')
  );
  return hasClient && hasOtherKnown;
};

const detectBlockCategory = (
  sheetName: string,
  headers: string[],
  sampleRows: { clientName: string; constitution: string; username: string }[],
  defaultCategory: MasterDataCategory,
  multiBlockMode: boolean
): MasterDataCategory => {
  const s = sheetName.toLowerCase();
  const h = headers.join(' ').toLowerCase();

  // Explicit sheet name signals
  if (s.includes('qrmp') || s.includes('tds') || s.includes('quarter')) return 'quarterly-tds';
  if (s.includes('company') || s.includes('roc') || s.includes('pvt')) return 'company-roc';
  if (s.includes('audit')) return 'tax-audit';
  if (s.includes('itr')) return 'annual-itr';
  if (s.includes('gst')) return 'monthly-gst';

  // Header column signals
  if (h.includes('itr 3') || h.includes('itr3') || h.includes('itr type')) return 'annual-itr';
  if (h.includes('email')) return 'monthly-gst';

  if (!multiBlockMode) return defaultCategory;

  // Infer from sample rows when stacked in a single sheet
  const corpPanCount = sampleRows.filter((r) => /^[A-Z]{3}C[A-Z]\d{4}[A-Z]$/i.test(r.username)).length;
  const pvtNameCount = sampleRows.filter(
    (r) => /\(p\)\s*ltd|pvt\s*ltd|private\s*limited/i.test(r.clientName) || /private\s*limited/i.test(r.constitution)
  ).length;
  if (corpPanCount >= 2 || (sampleRows.length > 0 && pvtNameCount / sampleRows.length >= 0.4)) {
    return 'company-roc';
  }

  if (sampleRows.length <= 8) return 'quarterly-tds';
  return 'tax-audit';
};

/**
 * Parses an uploaded Excel (.xlsx/.xls) or CSV workbook into MasterDataRecord[].
 * Reads all sheets AND supports multiple stacked header blocks inside a single sheet,
 * automatically routing each section to its matching Master Data tab.
 */
export async function parseMasterDataWorkbook(
  file: File,
  activeCategory: MasterDataCategory,
  activePeriod: string,
  importAllSheets = true
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

    // Find all header row indices in this sheet
    const headerIndices: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (isHeaderRow(rows[i])) headerIndices.push(i);
    }
    if (headerIndices.length === 0) continue;

    const multiBlockMode = importAllSheets && (wb.SheetNames.length > 1 || headerIndices.length > 1);

    for (let b = 0; b < headerIndices.length; b++) {
      const headerIdx = headerIndices[b];
      const nextHeaderIdx = b + 1 < headerIndices.length ? headerIndices[b + 1] : rows.length;
      const headers = (rows[headerIdx] || []).map((c) => str(c));

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
      const colOut = findCol(headers, [
        'current outstading balance',
        'current outstanding balance',
        'outstanding balance',
        'outstanding',
      ]);

      if (colClient < 0) continue;

      const rawBlockRows: {
        clientName: string;
        constitution: string;
        itrType?: string;
        username?: string;
        password?: string;
        email?: string;
        reference?: string;
        natureOfService?: string;
        periodVal: MasterPeriodValues;
      }[] = [];

      for (let r = headerIdx + 1; r < nextHeaderIdx; r++) {
        const row = rows[r] || [];
        const clientName = str(row[colClient]);
        if (!clientName) continue;
        if (clientName.toLowerCase() === 'client') continue;

        rawBlockRows.push({
          clientName,
          constitution: colConst >= 0 ? normalizeConstitution(str(row[colConst])) : '',
          itrType: colItrType >= 0 ? str(row[colItrType]) : undefined,
          username: colUser >= 0 ? str(row[colUser]) : undefined,
          password: colPass >= 0 ? str(row[colPass]) : undefined,
          email: colEmail >= 0 ? str(row[colEmail]) : undefined,
          reference: colRef >= 0 ? str(row[colRef]) : undefined,
          natureOfService: colNature >= 0 ? str(row[colNature]) : undefined,
          periodVal: {
            professionalFees: colFees >= 0 ? num(row[colFees]) : 0,
            taxPayable: colTax >= 0 ? num(row[colTax]) : 0,
            oopExpenses: colOop >= 0 ? num(row[colOop]) : 0,
            currentOutstanding: colOut >= 0 ? num(row[colOut]) : 0,
          },
        });
      }

      if (rawBlockRows.length === 0) continue;

      const category = detectBlockCategory(
        sheetName,
        headers,
        rawBlockRows.map((x) => ({
          clientName: x.clientName,
          constitution: x.constitution,
          username: x.username || '',
        })),
        activeCategory,
        multiBlockMode
      );

      const records: MasterDataRecord[] = rawBlockRows.map((item, idx) => ({
        id: `md-${category}-${Date.now()}-${b}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        category,
        clientName: item.clientName,
        legalConstitution: item.constitution,
        itrType: item.itrType,
        username: item.username,
        password: item.password,
        email: item.email,
        reference: item.reference,
        natureOfService: item.natureOfService,
        effectiveFrom: activePeriod,
        periodValues: { [activePeriod]: item.periodVal },
        updatedAt: new Date().toISOString(),
      }));

      const blockLabel =
        headerIndices.length > 1 ? `${sheetName} (Section ${b + 1})` : sheetName;
      parsedSheets.push({ category, sheetName: blockLabel, records });
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
