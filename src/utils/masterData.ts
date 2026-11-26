import { MasterDataCadence, MasterDataCategory, MasterDataRecord, MasterPeriodValues } from '../types/crm';
import { currentMonthKey, monthLabel, nextMonthKey } from './debtors';

export interface MasterTabConfig {
  id: MasterDataCategory;
  label: string;
  shortLabel: string;
  cadence: MasterDataCadence;
  description: string;
  showItrType?: boolean;
  showEmail?: boolean;
  showReference?: boolean;
  showNatureOfService?: boolean;
}

export const MASTER_TABS: MasterTabConfig[] = [
  {
    id: 'monthly-gst',
    label: 'Monthly GST',
    shortLabel: 'Monthly GST',
    cadence: 'monthly',
    description: 'Monthly GST filing clients, portal credentials, fees, tax payable, and balances.',
    showEmail: true,
  },
  {
    id: 'annual-itr',
    label: 'ITR (Individual & Business)',
    shortLabel: 'Annual ITR',
    cadence: 'yearly',
    description: 'Yearly Income Tax Return register covering Individual (Other than business) and Business Income.',
    showItrType: true,
    showReference: true,
    showNatureOfService: true,
  },
  {
    id: 'quarterly-tds',
    label: 'Quarterly / TDS',
    shortLabel: 'Quarterly / TDS',
    cadence: 'monthly',
    description: 'Quarterly GST (QRMP) and TDS compliance clients with recurring fee tracking.',
    showReference: true,
  },
  {
    id: 'tax-audit',
    label: 'Tax Audit & Firms',
    shortLabel: 'Tax Audit',
    cadence: 'yearly',
    description: 'Annual Tax Audit, society, and firm compliance clients.',
    showReference: true,
  },
  {
    id: 'company-roc',
    label: 'Company / ROC',
    shortLabel: 'Company / ROC',
    cadence: 'yearly',
    description: 'Private Limited companies and LLP annual ROC & corporate tax clients.',
    showReference: true,
  },
];

export const getTabConfig = (cat: MasterDataCategory): MasterTabConfig =>
  MASTER_TABS.find((t) => t.id === cat) || MASTER_TABS[0];

/** Current Indian Financial Year key in IST (Asia/Kolkata), e.g. 'FY 2026-27'. */
export const currentFyKey = (d = new Date()): string => {
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(d);
    const y = Number(parts.find((p) => p.type === 'year')?.value);
    const m = Number(parts.find((p) => p.type === 'month')?.value);
    if (y && m) {
      year = y;
      month = m;
    }
  } catch {}
  const startYear = month >= 4 ? year : year - 1;
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
};

/** Next FY key after e.g. 'FY 2026-27' -> 'FY 2027-28'. */
export const nextFyKey = (key: string): string => {
  const match = key.match(/(\d{4})/);
  const start = match ? Number(match[1]) + 1 : new Date().getFullYear() + 1;
  return `FY ${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

export const defaultPeriodForCadence = (cadence: MasterDataCadence): string =>
  cadence === 'monthly' ? currentMonthKey() : currentFyKey();

export const nextPeriodKey = (key: string, cadence: MasterDataCadence): string =>
  cadence === 'monthly' ? nextMonthKey(key) : nextFyKey(key);

export const formatPeriodLabel = (key: string, cadence: MasterDataCadence, short = false): string =>
  cadence === 'monthly' ? monthLabel(key, short) : key;

/** Compare two period keys chronologically. Works for both 'YYYY-MM' and 'FY YYYY-YY'. */
export const comparePeriodKeys = (a: string, b: string): number => a.localeCompare(b);

/** True if the record is active (visible) in `periodKey`. */
export const isVisibleInPeriod = (record: MasterDataRecord, periodKey: string): boolean => {
  if (comparePeriodKeys(periodKey, record.effectiveFrom) < 0) return false;
  if (record.removedFrom && comparePeriodKeys(periodKey, record.removedFrom) >= 0) return false;
  return true;
};

export const EMPTY_PERIOD_VALUES: MasterPeriodValues = {
  professionalFees: 0,
  taxPayable: 0,
  oopExpenses: 0,
  currentOutstanding: 0,
};

/**
 * Returns the period values for `periodKey`.
 * If `periodKey` has no explicit entry yet, carries forward recurring `professionalFees`
 * and `currentOutstanding` from the most recent prior period, while resetting
 * `taxPayable` and `oopExpenses` to 0 for the new period.
 */
export const getValuesForPeriod = (record: MasterDataRecord, periodKey: string): MasterPeriodValues => {
  const exact = record.periodValues?.[periodKey];
  if (exact) {
    return {
      professionalFees: Number(exact.professionalFees) || 0,
      taxPayable: Number(exact.taxPayable) || 0,
      oopExpenses: Number(exact.oopExpenses) || 0,
      currentOutstanding: Number(exact.currentOutstanding) || 0,
    };
  }

  const priorKeys = Object.keys(record.periodValues || {})
    .filter((k) => comparePeriodKeys(k, periodKey) < 0)
    .sort(comparePeriodKeys);

  if (priorKeys.length === 0) return { ...EMPTY_PERIOD_VALUES };

  const latestPrior = record.periodValues[priorKeys[priorKeys.length - 1]];
  return {
    professionalFees: Number(latestPrior?.professionalFees) || 0,
    taxPayable: 0,
    oopExpenses: 0,
    currentOutstanding: Number(latestPrior?.currentOutstanding) || 0,
  };
};

/** Collects all distinct periods present in records for a category, plus at least the current period. */
export const collectPeriodsForCategory = (
  records: MasterDataRecord[],
  category: MasterDataCategory
): string[] => {
  const cadence = getTabConfig(category).cadence;
  const set = new Set<string>([defaultPeriodForCadence(cadence)]);
  for (const r of records) {
    if (r.category !== category) continue;
    if (r.effectiveFrom) set.add(r.effectiveFrom);
    for (const k of Object.keys(r.periodValues || {})) {
      set.add(k);
    }
  }
  return Array.from(set).sort((a, b) => comparePeriodKeys(b, a)); // newest first
};

/** Materializes `periodKey` values onto every active record in `category` when starting a new period. */
export const startNextMasterPeriod = (
  records: MasterDataRecord[],
  category: MasterDataCategory,
  newPeriodKey: string
): MasterDataRecord[] =>
  records.map((r) => {
    if (r.category !== category || !isVisibleInPeriod(r, newPeriodKey)) return r;
    if (r.periodValues?.[newPeriodKey]) return r;
    const carried = getValuesForPeriod(r, newPeriodKey);
    return {
      ...r,
      periodValues: {
        ...r.periodValues,
        [newPeriodKey]: carried,
      },
      updatedAt: new Date().toISOString(),
    };
  });

/**
 * Automatically advances each Master Data category to the current IST month / FY
 * when the calendar rolls forward, carrying active clients & recurring fees.
 */
export const autoAdvanceMasterDataToIST = (
  records: MasterDataRecord[]
): { updated: MasterDataRecord[]; changed: MasterDataRecord[] } => {
  if (records.length === 0) return { updated: records, changed: [] };

  let nextRecords = records;
  const changedIds = new Set<string>();

  for (const tab of MASTER_TABS) {
    const catRecords = nextRecords.filter((r) => r.category === tab.id);
    if (catRecords.length === 0) continue;

    const targetPeriod = defaultPeriodForCadence(tab.cadence);
    const periods = collectPeriodsForCategory(catRecords, tab.id);
    const latest = periods[periods.length - 1] || targetPeriod;
    if (comparePeriodKeys(latest, targetPeriod) >= 0) continue;

    const prevSnapshot = nextRecords;
    nextRecords = startNextMasterPeriod(nextRecords, tab.id, targetPeriod);
    for (let i = 0; i < nextRecords.length; i++) {
      if (nextRecords[i] !== prevSnapshot[i]) changedIds.add(nextRecords[i].id);
    }
  }

  const changed = nextRecords.filter((r) => changedIds.has(r.id));
  return { updated: nextRecords, changed };
};

/** Normalize common spelling variants in Legal Constitution from office Excel sheets. */
export const normalizeConstitution = (raw: string): string => {
  const v = (raw || '').trim();
  if (!v) return '';
  const low = v.toLowerCase();
  if (low.startsWith('propr')) return 'Proprietorship';
  if (low.startsWith('partner')) return 'Partnership';
  if (low.includes('private') || low.includes('pvt')) return 'Private Limited';
  if (low === 'llp') return 'LLP';
  if (low.startsWith('indiv')) return 'Individual';
  return v;
};
