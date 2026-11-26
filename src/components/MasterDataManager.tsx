import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Client,
  MasterDataCategory,
  MasterDataRecord,
  MasterPeriodValues,
} from '../types/crm';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Metric,
  MetricGrid,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Segmented,
  Select,
  TableCard,
  Tabs,
  Toolbar,
  cn,
  formatINR,
} from './ui';
import {
  MASTER_TABS,
  collectPeriodsForCategory,
  formatPeriodLabel,
  getTabConfig,
  getValuesForPeriod,
  isVisibleInPeriod,
  nextPeriodKey,
  normalizeConstitution,
} from '../utils/masterData';
import {
  ParsedMasterSheet,
  exportMasterDataToExcel,
  parseMasterDataWorkbook,
} from '../utils/masterDataWorkbook';

interface MasterDataManagerProps {
  records: MasterDataRecord[];
  clients: Client[];
  canEdit?: boolean;
  onSaveRecord: (record: MasterDataRecord) => Promise<void> | void;
  onBulkSaveRecords: (records: MasterDataRecord[]) => Promise<void> | void;
  onDeleteRecord: (id: string) => Promise<void> | void;
  onStartNextPeriod: (category: MasterDataCategory, nextKey: string) => Promise<void> | void;
}

const CONSTITUTION_OPTIONS = [
  'Proprietorship',
  'Partnership',
  'Private Limited',
  'Individual',
  'LLP',
];

const InlineAmountCell: React.FC<{
  value: number;
  disabled?: boolean;
  onCommit: (next: number) => void;
  highlightZero?: boolean;
}> = ({ value, disabled, onCommit, highlightZero = false }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ? String(value) : '');

  useEffect(() => {
    if (!editing) setDraft(value ? String(value) : '');
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const cleaned = draft.replace(/[^0-9.-]/g, '').trim();
    const parsed = cleaned === '' ? 0 : Number(cleaned);
    const safe = Number.isFinite(parsed) ? parsed : 0;
    if (safe !== value) onCommit(safe);
  };

  if (disabled) {
    return (
      <span className={cn('num text-xs', value === 0 && highlightZero ? 'text-fg-faint' : 'text-fg')}>
        {value === 0 ? '—' : formatINR(value)}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(value ? String(value) : '');
            setEditing(false);
          }
        }}
        className="w-24 h-7 px-2 text-right text-xs num rounded border border-accent bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ? String(value) : '');
        setEditing(true);
      }}
      title="Click to edit amount"
      className={cn(
        'num text-xs px-2 py-1 rounded hover:bg-hover transition-colors text-right min-w-[72px] inline-block',
        value === 0 && highlightZero ? 'text-fg-faint' : 'text-fg font-medium'
      )}
    >
      {value === 0 ? '—' : formatINR(value)}
    </button>
  );
};

export const MasterDataManager: React.FC<MasterDataManagerProps> = ({
  records,
  clients,
  canEdit = true,
  onSaveRecord,
  onBulkSaveRecords,
  onDeleteRecord,
  onStartNextPeriod,
}) => {
  const [activeCategory, setActiveCategory] = useState<MasterDataCategory>('monthly-gst');
  const tabConfig = getTabConfig(activeCategory);

  const periods = useMemo(
    () => collectPeriodsForCategory(records, activeCategory),
    [records, activeCategory]
  );

  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0]);

  useEffect(() => {
    if (!periods.includes(selectedPeriod)) {
      setSelectedPeriod(periods[0]);
    }
  }, [periods, selectedPeriod]);

  const latestPeriod = periods[0];
  const nextPeriod = nextPeriodKey(latestPeriod, tabConfig.cadence);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [constitutionFilter, setConstitutionFilter] = useState('all');
  const [itrTypeFilter, setItrTypeFilter] = useState<'all' | 'Other than business' | 'Business Income'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setPage(1);
  }, [activeCategory, selectedPeriod, search, constitutionFilter, itrTypeFilter]);

  // Password reveal & clipboard copy feedback
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, text?: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
  };

  // Category counts for tabs
  const tabCounts = useMemo(() => {
    const map: Record<MasterDataCategory, number> = {
      'monthly-gst': 0,
      'annual-itr': 0,
      'quarterly-tds': 0,
      'tax-audit': 0,
      'company-roc': 0,
    };
    for (const t of MASTER_TABS) {
      const pList = collectPeriodsForCategory(records, t.id);
      const latest = pList[0];
      map[t.id] = records.filter((r) => r.category === t.id && isVisibleInPeriod(r, latest)).length;
    }
    return map;
  }, [records]);

  // Active rows for selected category + period
  const periodRows = useMemo(() => {
    return records
      .filter((r) => r.category === activeCategory && isVisibleInPeriod(r, selectedPeriod))
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [records, activeCategory, selectedPeriod]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return periodRows.filter((r) => {
      if (constitutionFilter !== 'all' && normalizeConstitution(r.legalConstitution) !== constitutionFilter) {
        return false;
      }
      if (tabConfig.showItrType && itrTypeFilter !== 'all' && (r.itrType || '') !== itrTypeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        r.clientName.toLowerCase().includes(q) ||
        (r.username && r.username.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.reference && r.reference.toLowerCase().includes(q)) ||
        (r.legalConstitution && r.legalConstitution.toLowerCase().includes(q))
      );
    });
  }, [periodRows, search, constitutionFilter, itrTypeFilter, tabConfig.showItrType]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  // KPI metrics for current view
  const totals = useMemo(() => {
    let fees = 0;
    let tax = 0;
    let oop = 0;
    let outstanding = 0;
    for (const r of filteredRows) {
      const v = getValuesForPeriod(r, selectedPeriod);
      fees += v.professionalFees;
      tax += v.taxPayable;
      oop += v.oopExpenses;
      outstanding += v.currentOutstanding;
    }
    return { fees, tax, oop, outstanding };
  }, [filteredRows, selectedPeriod]);

  // Modals state
  const [editingRecord, setEditingRecord] = useState<MasterDataRecord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<MasterDataRecord | null>(null);
  const [confirmStartNext, setConfirmStartNext] = useState(false);

  // Excel import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMultiSheet, setImportMultiSheet] = useState(true);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    sheets: ParsedMasterSheet[];
    totalRows: number;
  } | null>(null);

  const handleFileChange = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = await parseMasterDataWorkbook(file, activeCategory, selectedPeriod, importMultiSheet);
      setImportPreview({
        fileName: file.name,
        sheets: parsed.sheets,
        totalRows: parsed.totalRows,
      });
    } catch (err) {
      console.error('Excel parse failed:', err);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    const byKey = new Map<string, MasterDataRecord>();

    // Seed with existing records so duplicates across sheets/sections merge cleanly
    for (const r of records) {
      byKey.set(`${r.category}::${r.clientName.trim().toLowerCase()}`, r);
    }

    const touched: MasterDataRecord[] = [];
    for (const sheet of importPreview.sheets) {
      const sheetPeriod =
        getTabConfig(sheet.category).cadence === tabConfig.cadence
          ? selectedPeriod
          : collectPeriodsForCategory(records, sheet.category)[0];

      for (const incoming of sheet.records) {
        const key = `${incoming.category}::${incoming.clientName.trim().toLowerCase()}`;
        const existing = byKey.get(key);
        const incomingVals = incoming.periodValues[selectedPeriod] || Object.values(incoming.periodValues)[0];
        if (existing) {
          const updated: MasterDataRecord = {
            ...existing,
            legalConstitution: incoming.legalConstitution || existing.legalConstitution,
            itrType: incoming.itrType || existing.itrType,
            username: incoming.username || existing.username,
            password: incoming.password || existing.password,
            email: incoming.email || existing.email,
            reference: incoming.reference || existing.reference,
            natureOfService: incoming.natureOfService || existing.natureOfService,
            removedFrom: undefined,
            periodValues: {
              ...existing.periodValues,
              [sheetPeriod]: incomingVals,
            },
            updatedAt: new Date().toISOString(),
          };
          byKey.set(key, updated);
          touched.push(updated);
        } else {
          const created: MasterDataRecord = {
            ...incoming,
            effectiveFrom: sheetPeriod,
            periodValues: { [sheetPeriod]: incomingVals },
          };
          byKey.set(key, created);
          touched.push(created);
        }
      }
    }

    // Deduplicate touched by id
    const uniqueTouched = Array.from(new Map(touched.map((r) => [r.id, r])).values());
    await onBulkSaveRecords(uniqueTouched);
    setImportPreview(null);
  };

  const handleInlineAmountChange = (
    record: MasterDataRecord,
    field: keyof MasterPeriodValues,
    value: number
  ) => {
    const current = getValuesForPeriod(record, selectedPeriod);
    const updated: MasterDataRecord = {
      ...record,
      periodValues: {
        ...record.periodValues,
        [selectedPeriod]: {
          ...current,
          [field]: value,
        },
      },
      updatedAt: new Date().toISOString(),
    };
    onSaveRecord(updated);
  };

  const handleRemoveClient = async (record: MasterDataRecord) => {
    if (record.effectiveFrom === selectedPeriod) {
      await onDeleteRecord(record.id);
    } else {
      await onSaveRecord({
        ...record,
        removedFrom: selectedPeriod,
        updatedAt: new Date().toISOString(),
      });
    }
    setConfirmRemove(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        section="master-data"
        title="Master Data"
        description={`${tabConfig.description} Changes in a period carry forward automatically.`}
        actions={
          <>
            {canEdit && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingRecord(null);
                  setIsAddOpen(true);
                }}
              >
                Add Client
              </Button>
            )}
            {canEdit && (
              <Button
                variant="secondary"
                icon={CalendarPlus}
                onClick={() => setConfirmStartNext(true)}
              >
                Start {formatPeriodLabel(nextPeriod, tabConfig.cadence, true)}
              </Button>
            )}
            {canEdit && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <Button
                  variant="secondary"
                  icon={Upload}
                  onClick={() => {
                    setImportMultiSheet(true);
                    fileRef.current?.click();
                  }}
                >
                  Import Excel
                </Button>
              </>
            )}
            {filteredRows.length > 0 && (
              <Button
                variant="secondary"
                icon={Download}
                onClick={() => exportMasterDataToExcel(records, activeCategory, selectedPeriod)}
              >
                Export
              </Button>
            )}
          </>
        }
      />

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onChange={(v) => setActiveCategory(v as MasterDataCategory)}
        options={MASTER_TABS.map((t) => ({
          value: t.id,
          label: t.label,
          count: tabCounts[t.id],
        }))}
      />

      {/* Period Selector + ITR Sub-filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          <span className="text-xs font-medium text-fg-subtle shrink-0">
            {tabConfig.cadence === 'monthly' ? 'Month:' : 'Financial Year:'}
          </span>
          <Segmented
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={periods.map((p) => ({
              value: p,
              label: formatPeriodLabel(p, tabConfig.cadence, true),
            }))}
          />
        </div>

        {tabConfig.showItrType && (
          <Segmented
            value={itrTypeFilter}
            onChange={(v) => setItrTypeFilter(v as typeof itrTypeFilter)}
            options={[
              { value: 'all', label: 'All ITR' },
              { value: 'Other than business', label: 'Individual' },
              { value: 'Business Income', label: 'Business Income' },
            ]}
          />
        )}
      </div>

      {/* KPI Metrics */}
      <MetricGrid className="grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Active Clients"
          value={filteredRows.length}
          hint={`${tabConfig.shortLabel} · ${formatPeriodLabel(selectedPeriod, tabConfig.cadence, true)}`}
        />
        <Metric
          label="Professional Fees"
          value={formatINR(totals.fees)}
          hint="Recurring monthly/annual fees"
        />
        <Metric
          label="Tax Payable"
          value={formatINR(totals.tax)}
          hint={`For ${formatPeriodLabel(selectedPeriod, tabConfig.cadence, true)}`}
        />
        <Metric
          label="Outstanding + OOP"
          value={formatINR(totals.outstanding + totals.oop)}
          hint={`OOP: ${formatINR(totals.oop)} · Bal: ${formatINR(totals.outstanding)}`}
        />
      </MetricGrid>

      {/* Main Editable Table */}
      <TableCard
        toolbar={
          <Toolbar>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, username, email, reference…"
              className="w-full sm:w-72"
            />
            <Select
              value={constitutionFilter}
              onChange={(e) => setConstitutionFilter(e.target.value)}
              className="w-44"
              aria-label="Filter by legal constitution"
            >
              <option value="all">All Constitutions</option>
              {CONSTITUTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
            <span className="text-xs text-fg-subtle ml-auto">
              Click any amount cell to edit inline
            </span>
          </Toolbar>
        }
        footer={
          filteredRows.length > 0 ? (
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(filteredRows.length / pageSize))}
              totalItems={filteredRows.length}
              pageSize={pageSize}
              onChange={setPage}
              noun="clients"
            />
          ) : undefined
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10 text-right">#</th>
              <th>Client</th>
              {tabConfig.showItrType && <th>ITR Type</th>}
              <th>Legal Constitution</th>
              <th>Username</th>
              <th>Password</th>
              {tabConfig.showEmail && <th>Email ID</th>}
              {tabConfig.showReference && <th>Reference</th>}
              {tabConfig.showNatureOfService && <th>Nature of Service</th>}
              <th className="text-right">Prof. Fees</th>
              <th className="text-right">Tax Payable</th>
              <th className="text-right">OOP Expenses</th>
              <th className="text-right">Outstanding</th>
              {canEdit && <th className="text-right w-20">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={14} className="!h-auto py-12">
                  <EmptyState
                    icon={Database}
                    title="No clients in this register"
                    description={
                      search || constitutionFilter !== 'all'
                        ? 'Try clearing your search or constitution filter.'
                        : `Add clients or import your ${tabConfig.shortLabel} Excel sheet to get started.`
                    }
                    action={
                      canEdit && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            icon={Plus}
                            onClick={() => {
                              setEditingRecord(null);
                              setIsAddOpen(true);
                            }}
                          >
                            Add Client
                          </Button>
                          <Button
                            variant="secondary"
                            icon={Upload}
                            onClick={() => fileRef.current?.click()}
                          >
                            Import Excel
                          </Button>
                        </div>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              paginatedRows.map((record, idx) => {
                const rowNum = (page - 1) * pageSize + idx + 1;
                const vals = getValuesForPeriod(record, selectedPeriod);
                const isRevealed = !!revealedIds[record.id];

                return (
                  <tr key={record.id}>
                    <td className="num text-right text-fg-faint text-xs">{rowNum}</td>
                    <td>
                      <div className="font-medium text-fg text-sm whitespace-nowrap">
                        {record.clientName}
                      </div>
                      {record.effectiveFrom === selectedPeriod && (
                        <span className="text-2xs text-accent font-medium">
                          Added {formatPeriodLabel(selectedPeriod, tabConfig.cadence, true)}
                        </span>
                      )}
                    </td>
                    {tabConfig.showItrType && (
                      <td className="whitespace-nowrap">
                        {record.itrType ? (
                          <Badge tone={record.itrType === 'Business Income' ? 'info' : 'neutral'}>
                            {record.itrType}
                          </Badge>
                        ) : (
                          <span className="text-fg-faint">—</span>
                        )}
                      </td>
                    )}
                    <td className="text-fg-muted text-xs whitespace-nowrap">
                      {record.legalConstitution || <span className="text-fg-faint">—</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      {record.username ? (
                        <div className="inline-flex items-center gap-1">
                          <span className="ident text-fg">{record.username}</span>
                          <IconButton
                            size="sm"
                            icon={copiedKey === `u-${record.id}` ? Check : Copy}
                            label="Copy username"
                            onClick={() => copyText(`u-${record.id}`, record.username)}
                            className="h-6 w-6 text-fg-faint hover:text-fg"
                          />
                        </div>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {record.password ? (
                        <div className="inline-flex items-center gap-1">
                          <span className="ident text-fg">
                            {isRevealed ? record.password : '••••••••'}
                          </span>
                          <IconButton
                            size="sm"
                            icon={isRevealed ? EyeOff : Eye}
                            label={isRevealed ? 'Hide password' : 'Show password'}
                            onClick={() =>
                              setRevealedIds((prev) => ({ ...prev, [record.id]: !prev[record.id] }))
                            }
                            className="h-6 w-6 text-fg-faint hover:text-fg"
                          />
                          <IconButton
                            size="sm"
                            icon={copiedKey === `p-${record.id}` ? Check : Copy}
                            label="Copy password"
                            onClick={() => copyText(`p-${record.id}`, record.password)}
                            className="h-6 w-6 text-fg-faint hover:text-fg"
                          />
                        </div>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </td>
                    {tabConfig.showEmail && (
                      <td className="text-xs text-fg-muted whitespace-nowrap">
                        {record.email || <span className="text-fg-faint">—</span>}
                      </td>
                    )}
                    {tabConfig.showReference && (
                      <td className="text-xs text-fg-muted whitespace-nowrap">
                        {record.reference || <span className="text-fg-faint">—</span>}
                      </td>
                    )}
                    {tabConfig.showNatureOfService && (
                      <td className="text-xs text-fg-muted max-w-[180px] truncate" title={record.natureOfService}>
                        {record.natureOfService || <span className="text-fg-faint">—</span>}
                      </td>
                    )}
                    <td className="text-right">
                      <InlineAmountCell
                        value={vals.professionalFees}
                        disabled={!canEdit}
                        highlightZero
                        onCommit={(v) => handleInlineAmountChange(record, 'professionalFees', v)}
                      />
                    </td>
                    <td className="text-right">
                      <InlineAmountCell
                        value={vals.taxPayable}
                        disabled={!canEdit}
                        highlightZero
                        onCommit={(v) => handleInlineAmountChange(record, 'taxPayable', v)}
                      />
                    </td>
                    <td className="text-right">
                      <InlineAmountCell
                        value={vals.oopExpenses}
                        disabled={!canEdit}
                        highlightZero
                        onCommit={(v) => handleInlineAmountChange(record, 'oopExpenses', v)}
                      />
                    </td>
                    <td className="text-right">
                      <InlineAmountCell
                        value={vals.currentOutstanding}
                        disabled={!canEdit}
                        highlightZero
                        onCommit={(v) => handleInlineAmountChange(record, 'currentOutstanding', v)}
                      />
                    </td>
                    {canEdit && (
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">
                          <IconButton
                            size="sm"
                            icon={Pencil}
                            label="Edit client details"
                            onClick={() => {
                              setEditingRecord(record);
                              setIsAddOpen(true);
                            }}
                          />
                          <IconButton
                            size="sm"
                            icon={Trash2}
                            label="Remove client from this period"
                            onClick={() => setConfirmRemove(record)}
                            className="hover:text-danger"
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {/* Add / Edit Client Modal */}
      {isAddOpen && (
        <MasterDataEntryModal
          isOpen={isAddOpen}
          onClose={() => {
            setIsAddOpen(false);
            setEditingRecord(null);
          }}
          category={activeCategory}
          periodKey={selectedPeriod}
          clients={clients}
          initialRecord={editingRecord}
          onSave={async (saved) => {
            await onSaveRecord(saved);
            setIsAddOpen(false);
            setEditingRecord(null);
          }}
        />
      )}

      {/* Remove Client Confirm */}
      <ConfirmDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && handleRemoveClient(confirmRemove)}
        title={`Remove ${confirmRemove?.clientName}?`}
        description={
          confirmRemove?.effectiveFrom === selectedPeriod
            ? `This client was added in ${formatPeriodLabel(selectedPeriod, tabConfig.cadence)}. Removing it will permanently delete the entry.`
            : `This will remove ${confirmRemove?.clientName} starting from ${formatPeriodLabel(selectedPeriod, tabConfig.cadence)} and all future ${tabConfig.cadence === 'monthly' ? 'months' : 'years'}. Earlier historical periods will remain intact.`
        }
        confirmLabel="Remove Client"
        danger
      />

      {/* Start Next Period Confirm */}
      <ConfirmDialog
        isOpen={confirmStartNext}
        onClose={() => setConfirmStartNext(false)}
        onConfirm={async () => {
          await onStartNextPeriod(activeCategory, nextPeriod);
          setSelectedPeriod(nextPeriod);
          setConfirmStartNext(false);
        }}
        title={`Start ${formatPeriodLabel(nextPeriod, tabConfig.cadence)}?`}
        description={`All active clients in ${formatPeriodLabel(latestPeriod, tabConfig.cadence)} will carry forward into ${formatPeriodLabel(nextPeriod, tabConfig.cadence)} with their recurring Professional Fees and Outstanding Balance. Tax Payable and OOP Expenses will reset to ₹0 for the new period.`}
        confirmLabel={`Start ${formatPeriodLabel(nextPeriod, tabConfig.cadence, true)}`}
      />

      {/* Excel Import Preview Modal */}
      <Modal
        isOpen={!!importPreview}
        onClose={() => setImportPreview(null)}
        title="Import Master Data Excel"
        description={
          importPreview
            ? `${importPreview.fileName} · ${importPreview.totalRows} rows ready for ${formatPeriodLabel(selectedPeriod, tabConfig.cadence)}`
            : ''
        }
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!importPreview || importPreview.totalRows === 0}
              onClick={handleConfirmImport}
            >
              Import {importPreview?.totalRows || 0} Clients
            </Button>
          </>
        }
      >
        {importPreview && (
          <div className="space-y-4">
            {importPreview.sheets.length === 0 ? (
              <p className="text-sm text-danger">
                No valid rows with a "Client" column header were found in this file.
              </p>
            ) : (
              importPreview.sheets.map((s) => (
                <div key={`${s.category}-${s.sheetName}`} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-fg">
                      Sheet: {s.sheetName} → {getTabConfig(s.category).label}
                    </span>
                    <Badge tone="info">{s.records.length} clients</Badge>
                  </div>
                  <div className="border border-line rounded-md overflow-hidden">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Constitution</th>
                          <th>Username</th>
                          <th className="text-right">Fees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.records.slice(0, 5).map((r) => {
                          const v = getValuesForPeriod(r, selectedPeriod);
                          return (
                            <tr key={r.id}>
                              <td className="font-medium text-fg text-xs">{r.clientName}</td>
                              <td className="text-xs text-fg-muted">{r.legalConstitution || '—'}</td>
                              <td className="ident text-xs">{r.username || '—'}</td>
                              <td className="num text-right text-xs">{v.professionalFees ? formatINR(v.professionalFees) : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {s.records.length > 5 && (
                      <div className="px-3 py-1.5 bg-subtle text-2xs text-fg-subtle border-t border-line">
                        + {s.records.length - 5} more rows
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ----------------------------------------------------------- Add/Edit Modal */

interface MasterDataEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: MasterDataCategory;
  periodKey: string;
  clients: Client[];
  initialRecord: MasterDataRecord | null;
  onSave: (record: MasterDataRecord) => Promise<void> | void;
}

const MasterDataEntryModal: React.FC<MasterDataEntryModalProps> = ({
  isOpen,
  onClose,
  category,
  periodKey,
  clients,
  initialRecord,
  onSave,
}) => {
  const cfg = getTabConfig(category);
  const initialVals = initialRecord ? getValuesForPeriod(initialRecord, periodKey) : null;

  const [clientName, setClientName] = useState(initialRecord?.clientName || '');
  const [legalConstitution, setLegalConstitution] = useState(
    initialRecord?.legalConstitution || (category === 'company-roc' ? 'Private Limited' : 'Proprietorship')
  );
  const [itrType, setItrType] = useState(initialRecord?.itrType || 'Other than business');
  const [username, setUsername] = useState(initialRecord?.username || '');
  const [password, setPassword] = useState(initialRecord?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(initialRecord?.email || '');
  const [reference, setReference] = useState(initialRecord?.reference || '');
  const [natureOfService, setNatureOfService] = useState(initialRecord?.natureOfService || '');
  const [fees, setFees] = useState(initialVals?.professionalFees ? String(initialVals.professionalFees) : '');
  const [taxPayable, setTaxPayable] = useState(initialVals?.taxPayable ? String(initialVals.taxPayable) : '');
  const [oopExpenses, setOopExpenses] = useState(initialVals?.oopExpenses ? String(initialVals.oopExpenses) : '');
  const [outstanding, setOutstanding] = useState(initialVals?.currentOutstanding ? String(initialVals.currentOutstanding) : '');

  const handlePickExistingClient = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (!found) return;
    setClientName(found.tradeName || found.name);
    if (found.entityType) setLegalConstitution(found.entityType);
    if (found.email) setEmail(found.email);
    if (category === 'monthly-gst') {
      if (found.gstUsername) setUsername(found.gstUsername);
      if (found.gstPassword) setPassword(found.gstPassword);
    } else {
      if (found.itUsername || found.pan) setUsername(found.itUsername || found.pan);
      if (found.itPassword) setPassword(found.itPassword);
    }
    if (found.monthlyAuditFee && !fees) setFees(String(found.monthlyAuditFee));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const cleanNum = (s: string) => {
      const n = Number(s.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    const nextValues: MasterPeriodValues = {
      professionalFees: cleanNum(fees),
      taxPayable: cleanNum(taxPayable),
      oopExpenses: cleanNum(oopExpenses),
      currentOutstanding: cleanNum(outstanding),
    };

    const record: MasterDataRecord = {
      id: initialRecord?.id || `md-${category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      clientName: clientName.trim(),
      legalConstitution: normalizeConstitution(legalConstitution),
      itrType: cfg.showItrType ? itrType : undefined,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      email: email.trim() || undefined,
      reference: reference.trim() || undefined,
      natureOfService: natureOfService.trim() || undefined,
      effectiveFrom: initialRecord?.effectiveFrom || periodKey,
      removedFrom: initialRecord?.removedFrom,
      periodValues: {
        ...(initialRecord?.periodValues || {}),
        [periodKey]: nextValues,
      },
      updatedAt: new Date().toISOString(),
    };

    await onSave(record);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialRecord ? `Edit ${initialRecord.clientName}` : `Add Client to ${cfg.shortLabel}`}
      description={
        initialRecord
          ? `Updating details & ${formatPeriodLabel(periodKey, cfg.cadence)} values`
          : `Effective from ${formatPeriodLabel(periodKey, cfg.cadence)} and carried forward automatically`
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="master-data-entry-form" variant="primary">
            {initialRecord ? 'Save Changes' : 'Add Client'}
          </Button>
        </>
      }
    >
      <form id="master-data-entry-form" onSubmit={handleSubmit} className="space-y-4">
        {!initialRecord && clients.length > 0 && (
          <Field label="Quick-fill from Client Directory (Optional)">
            <Select defaultValue="" onChange={(e) => handlePickExistingClient(e.target.value)}>
              <option value="">Select an existing client to auto-fill…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName} ({c.entityType})
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Client Name" required>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Sinan Electricals"
              required
            />
          </Field>

          <Field label="Legal Constitution">
            <Select value={legalConstitution} onChange={(e) => setLegalConstitution(e.target.value)}>
              {CONSTITUTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>

          {cfg.showItrType && (
            <Field label="ITR Type">
              <Select value={itrType} onChange={(e) => setItrType(e.target.value)}>
                <option value="Other than business">Other than business (Individual)</option>
                <option value="Business Income">Business Income (Proprietorship)</option>
              </Select>
            </Field>
          )}

          <Field label={category === 'monthly-gst' ? 'Portal Username' : 'Username / PAN'}>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Portal username or PAN"
              className="ident"
            />
          </Field>

          <Field label="Portal Password">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Portal password"
                className="pr-9 ident"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </Field>

          {cfg.showEmail && (
            <Field label="Email ID">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </Field>
          )}

          {cfg.showReference && (
            <Field label="Reference">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Mavathuparambil, Sanjeevan KSFE"
              />
            </Field>
          )}

          {cfg.showNatureOfService && (
            <Field label="Nature of Service">
              <Input
                value={natureOfService}
                onChange={(e) => setNatureOfService(e.target.value)}
                placeholder="e.g. ITR Filing"
              />
            </Field>
          )}
        </div>

        <div className="pt-2 border-t border-line">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-3">
            {formatPeriodLabel(periodKey, cfg.cadence)} Financials (₹)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Professional Fees">
              <Input
                type="text"
                inputMode="decimal"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0"
                className="num text-right"
              />
            </Field>
            <Field label="Tax Payable">
              <Input
                type="text"
                inputMode="decimal"
                value={taxPayable}
                onChange={(e) => setTaxPayable(e.target.value)}
                placeholder="0"
                className="num text-right"
              />
            </Field>
            <Field label="OOP Expenses">
              <Input
                type="text"
                inputMode="decimal"
                value={oopExpenses}
                onChange={(e) => setOopExpenses(e.target.value)}
                placeholder="0"
                className="num text-right"
              />
            </Field>
            <Field label="Outstanding Bal.">
              <Input
                type="text"
                inputMode="decimal"
                value={outstanding}
                onChange={(e) => setOutstanding(e.target.value)}
                placeholder="0"
                className="num text-right"
              />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
};
