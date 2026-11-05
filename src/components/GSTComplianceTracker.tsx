import React, { useState } from 'react';
import { MessageSquare, Download } from 'lucide-react';
import { GSTComplianceItem, StaffMember } from '../types/crm';
import { exportDebtorsAndGSTWorkbook } from '../utils/excelExport';
import type { DebtorRecord, OfficeBillingEntry } from '../types/crm';
import { Badge, Button, DescriptionList, EmptyState, Field, IconButton, Input, Metric, MetricGrid, Modal, PageHeader, SearchInput, Segmented, Select, TableCard, Toolbar, formatDate, formatINR } from './ui';

interface GSTComplianceTrackerProps {
  complianceItems: GSTComplianceItem[];
  staffList: StaffMember[];
  selectedStaffId: string | null;
  returnTypes?: string[];
  onOpenWhatsApp: (item: GSTComplianceItem) => void;
  onMarkAsFiled: (id: string, arn: string) => void;
  /** Fee data to include in the Excel export; omitted for users without fee access. */
  onExport?: { debtors: DebtorRecord[]; billings: OfficeBillingEntry[] };
}

export const GSTComplianceTracker: React.FC<GSTComplianceTrackerProps> = ({
  complianceItems,
  staffList,
  selectedStaffId,
  returnTypes = ['GSTR-1', 'GSTR-3B', 'CMP-08', 'GSTR-9', 'GSTR-9C'],
  onOpenWhatsApp,
  onMarkAsFiled,
  onExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [returnTypeFilter, setReturnTypeFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [activeTabSection, setActiveTabSection] = useState<'all' | 'overdue' | 'due-2-days' | 'upcoming' | 'filed'>('all');

  // Modal for Mark as Filed
  const [filingModalItem, setFilingModalItem] = useState<GSTComplianceItem | null>(null);
  const [arnInput, setArnInput] = useState('');

  const activeStaffMember = staffList.find((s) => s.id === selectedStaffId);
  const effectiveStaffFilter = activeStaffMember ? activeStaffMember.name : staffFilter;

  // Filter items
  const filteredItems = complianceItems.filter((item) => {
    if (effectiveStaffFilter !== 'all' && item.assignedStaff !== effectiveStaffFilter) {
      return false;
    }
    if (returnTypeFilter !== 'all' && item.returnType !== returnTypeFilter) {
      return false;
    }
    if (monthFilter !== 'all' && item.filingMonth !== monthFilter) {
      return false;
    }
    if (activeTabSection !== 'all' && item.priorityLevel !== activeTabSection) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.clientName.toLowerCase().includes(q) ||
        item.gstin.toLowerCase().includes(q) ||
        item.returnType.toLowerCase().includes(q) ||
        (item.arnNumber && item.arnNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Strict Prioritization Groups
  const overdueFilings = filteredItems.filter((i) => i.priorityLevel === 'overdue');
  const dueIn2DaysFilings = filteredItems.filter((i) => i.priorityLevel === 'due-2-days');
  const upcomingFilings = filteredItems.filter((i) => i.priorityLevel === 'upcoming');
  const filedFilings = filteredItems.filter((i) => i.priorityLevel === 'filed');

  // Overall counts for badges
  const overdueCount = complianceItems.filter((i) => i.priorityLevel === 'overdue').length;
  const due2DaysCount = complianceItems.filter((i) => i.priorityLevel === 'due-2-days').length;
  const upcomingCount = complianceItems.filter((i) => i.priorityLevel === 'upcoming').length;
  const filedCount = complianceItems.filter((i) => i.priorityLevel === 'filed').length;

  const handleOpenFilingModal = (item: GSTComplianceItem) => {
    setFilingModalItem(item);
    setArnInput('');
  };

  const handleSubmitFiling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filingModalItem || !arnInput.trim()) return;
    onMarkAsFiled(filingModalItem.id, arnInput.trim());
    setFilingModalItem(null);
    setArnInput('');
  };

  const handleExportToExcel = () => {
    exportDebtorsAndGSTWorkbook(onExport?.debtors ?? [], onExport?.billings ?? [], complianceItems);
  };

  const renderTimeline = (item: GSTComplianceItem) => {
    if (item.priorityLevel === 'overdue')
      return <Badge tone="danger" dot className="num">{Math.abs(item.daysRemaining)}d late</Badge>;
    if (item.priorityLevel === 'due-2-days')
      return <Badge tone="warning" dot className="num">{item.daysRemaining === 1 ? 'Tomorrow' : `In ${item.daysRemaining}d`}</Badge>;
    if (item.priorityLevel === 'filed')
      return <Badge tone="success" dot className="num">Filed{item.filedDate ? ` ${formatDate(item.filedDate)}` : ''}</Badge>;
    return <span className="num text-xs text-fg-subtle">In {item.daysRemaining}d</span>;
  };

  const renderTableRows = (items: GSTComplianceItem[]) =>
    items.map((item) => (
      <tr key={item.id}>
        <td className="py-2">
          <div className="font-medium text-fg">{item.clientName}</div>
          {item.tradeName !== item.clientName && <div className="text-xs text-fg-subtle">{item.tradeName}</div>}
        </td>
        <td className="ident text-fg-muted whitespace-nowrap">{item.gstin}</td>
        <td className="whitespace-nowrap text-fg">{item.returnType}</td>
        <td className="whitespace-nowrap text-fg-muted">{item.filingMonth}</td>
        <td className="num whitespace-nowrap text-fg">{formatDate(item.dueDate)}</td>
        <td className="whitespace-nowrap">{renderTimeline(item)}</td>
        <td className="whitespace-nowrap text-fg-muted">{item.assignedStaff}</td>
        <td className="num text-right font-medium text-fg whitespace-nowrap">{formatINR(item.taxPayable)}</td>
        <td className="text-right">
          <div className="flex items-center justify-end gap-1">
            <IconButton icon={MessageSquare} label="Message on WhatsApp" size="sm" onClick={() => onOpenWhatsApp(item)} />
            {item.priorityLevel !== 'filed' ? (
              <Button size="sm" variant="primary" onClick={() => handleOpenFilingModal(item)}>
                Mark Filed
              </Button>
            ) : (
              <span className="ident text-2xs text-fg-subtle truncate max-w-[120px] px-1" title={item.arnNumber}>
                {item.arnNumber || 'ARN logged'}
              </span>
            )}
          </div>
        </td>
      </tr>
    ));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deadlines"
        description="GST return calendar, cut-off tracking and portal ARN records"
        actions={
          <Button icon={Download} onClick={handleExportToExcel}>
            Export
          </Button>
        }
      />

      <MetricGrid className="grid-cols-2 lg:grid-cols-4">
        <Metric label="Overdue" value={overdueCount} tone={overdueCount ? 'danger' : undefined} onClick={() => setActiveTabSection('overdue')} />
        <Metric label="Due within 2 days" value={due2DaysCount} tone={due2DaysCount ? 'warning' : undefined} onClick={() => setActiveTabSection('due-2-days')} />
        <Metric label="Upcoming" value={upcomingCount} onClick={() => setActiveTabSection('upcoming')} />
        <Metric label="Filed" value={filedCount} tone="success" onClick={() => setActiveTabSection('filed')} />
      </MetricGrid>

      <TableCard
        toolbar={
          <Toolbar className="justify-between">
            <Segmented
              size="sm"
              value={activeTabSection}
              onChange={setActiveTabSection}
              options={[
                { value: 'all', label: 'All', count: complianceItems.length },
                { value: 'overdue', label: 'Overdue', count: overdueCount },
                { value: 'due-2-days', label: 'Due soon', count: due2DaysCount },
                { value: 'upcoming', label: 'Upcoming', count: upcomingCount },
                { value: 'filed', label: 'Filed', count: filedCount },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                placeholder="Client, GSTIN or ARN"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                wrapperClassName="w-full sm:w-56"
                className="h-7 text-xs"
              />
              <Select value={returnTypeFilter} onChange={(e) => setReturnTypeFilter(e.target.value)} className="h-7 text-xs w-auto">
                <option value="all">All returns</option>
                {returnTypes.map((ret) => (
                  <option key={ret} value={ret}>
                    {ret}
                  </option>
                ))}
              </Select>
              <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-7 text-xs w-auto">
                <option value="all">All periods</option>
                <option value="October 2026">October 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="August 2026">August 2026</option>
              </Select>
              {!activeStaffMember && (
                <Select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="h-7 text-xs w-auto">
                  <option value="all">All staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </Toolbar>
        }
        footer={
          <div className="flex items-center px-3 h-11 border-t border-line text-xs text-fg-subtle num">
            {filteredItems.length} of {complianceItems.length} filings
          </div>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[200px]">Client</th>
              <th>GSTIN</th>
              <th>Return</th>
              <th>Period</th>
              <th>Due</th>
              <th>Timeline</th>
              <th>Owner</th>
              <th className="text-right">Tax payable</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeTabSection === 'all' ? (
              <>
                {renderTableRows(overdueFilings)}
                {renderTableRows(dueIn2DaysFilings)}
                {renderTableRows(upcomingFilings)}
                {renderTableRows(filedFilings)}
              </>
            ) : (
              renderTableRows(filteredItems)
            )}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={9} className="!h-auto">
                  <EmptyState title="No filings match these filters" description="Adjust the period, return type or search term." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>

      <Modal
        isOpen={!!filingModalItem}
        onClose={() => setFilingModalItem(null)}
        size="sm"
        title="Record portal filing"
        description={filingModalItem ? `${filingModalItem.clientName} · ${filingModalItem.returnType} · ${filingModalItem.filingMonth}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFilingModalItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="gst-filing-form">
              Save Filing
            </Button>
          </>
        }
      >
        {filingModalItem && (
          <form id="gst-filing-form" onSubmit={handleSubmitFiling} className="space-y-4">
            <Field label="Acknowledgement reference (ARN)" hint="Issued on OTP/DSC submission at gst.gov.in" required>
              <Input
                required
                autoFocus
                placeholder="AA321126109845Z"
                value={arnInput}
                onChange={(e) => setArnInput(e.target.value)}
                className="font-mono"
              />
            </Field>
            <div className="rounded-md border border-line bg-subtle px-3 py-2.5">
              <DescriptionList
                columns={3}
                items={[
                  { label: 'GSTIN', value: filingModalItem.gstin, mono: true },
                  { label: 'Owner', value: filingModalItem.assignedStaff },
                  { label: 'Tax payable', value: <span className="num">{formatINR(filingModalItem.taxPayable)}</span> },
                ]}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
