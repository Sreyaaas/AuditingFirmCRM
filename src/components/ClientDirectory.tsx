import React, { useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { Client, StaffMember } from '../types/crm';
import { NewClientModal } from './NewClientModal';
import { Avatar, Badge, Button, EmptyState, IconButton, PageHeader, Pagination, SearchInput, Segmented, Select, TableCard, Toolbar, formatINR } from './ui';

interface ClientDirectoryProps {
  clients: Client[];
  staffList: StaffMember[];
  isAdmin?: boolean;
  entityTypes?: string[];
  onSelectClient: (clientId: string) => void;
  onOpenWhatsAppForClient: (client: Client) => void;
  onAddClient?: (newClient: Client) => Promise<void>;
}

export const ClientDirectory: React.FC<ClientDirectoryProps> = ({
  clients,
  staffList,
  isAdmin = false,
  entityTypes = ['Private Limited', 'LLP', 'Partnership', 'Proprietorship', 'Individual'],
  onSelectClient,
  onOpenWhatsAppForClient,
  onAddClient,
}) => {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const itemsPerPage = 12;

  // Auto-generate next sequential code e.g. C-007
  const nextClientCode = `C-00${clients.length + 1}`;

  const filteredClients = clients.filter((c) => {
    if (entityFilter !== 'all' && c.entityType !== entityFilter) return false;
    if (typeFilter === 'recurring' && !c.isRecurringGST) return false;
    if (typeFilter === 'itr-only' && c.isRecurringGST) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.tradeName.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.pan.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStaff = (id: string) => staffList.find((s) => s.id === id);

  const recurringCount = clients.filter((c) => c.isRecurringGST || c.isRecurringStatutory).length;
  const itrOnlyCount = clients.filter((c) => !c.isRecurringGST && !c.isRecurringStatutory).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description={`${clients.length} companies, firms and individuals under engagement`}
        actions={
          isAdmin &&
          onAddClient && (
            <Button variant="primary" icon={Plus} onClick={() => setIsNewClientModalOpen(true)}>
              Add Client
            </Button>
          )
        }
      />

      <TableCard
        toolbar={
          <Toolbar className="justify-between">
            <Segmented
              size="sm"
              value={typeFilter}
              onChange={(v) => {
                setTypeFilter(v);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All', count: clients.length },
                { value: 'recurring', label: 'Monthly retainer', count: recurringCount },
                { value: 'itr-only', label: 'Annual ITR only', count: itrOnlyCount },
              ]}
            />
            <div className="flex items-center gap-2">
              <Select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-7 text-xs w-auto"
              >
                <option value="all">All entities</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <SearchInput
                placeholder="Name, GSTIN, PAN or city"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                wrapperClassName="w-40 sm:w-56"
                className="h-7 text-xs"
              />
            </div>
          </Toolbar>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredClients.length}
            pageSize={itemsPerPage}
            onChange={setCurrentPage}
            noun="clients"
          />
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[240px]">Client</th>
              <th>Entity</th>
              <th>GSTIN / PAN</th>
              <th>Owner</th>
              <th>Engagement</th>
              <th className="text-right">Monthly fee</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClients.length === 0 && (
              <tr>
                <td colSpan={7} className="!h-auto">
                  <EmptyState title="No clients found" description="Try a different name, identifier or entity type." />
                </td>
              </tr>
            )}
            {paginatedClients.map((client) => {
              const staff = getStaff(client.assignedStaffId);
              return (
                <tr key={client.id}>
                  <td className="py-2">
                    <button
                      onClick={() => onSelectClient(client.id)}
                      className="block max-w-xs truncate text-left font-medium text-fg hover:underline underline-offset-2"
                    >
                      {client.tradeName}
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-fg-subtle mt-0.5 min-w-0">
                      <span className="ident text-2xs">{client.clientCode}</span>
                      <span className="text-fg-faint">·</span>
                      <span className="truncate">{client.name}</span>
                    </div>
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <div className="text-fg">{client.entityType}</div>
                    <div className="text-xs text-fg-subtle">{client.city}</div>
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <div className="ident text-fg">{client.gstin}</div>
                    <div className="ident text-fg-subtle">{client.pan}</div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {staff && <Avatar initials={staff.initials} size="xs" />}
                      <span className={staff ? 'text-fg' : 'text-fg-faint'}>{staff?.name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td>
                    <Badge tone={client.isRecurringGST ? 'info' : 'neutral'}>{client.isRecurringGST ? 'Monthly GST' : 'Annual ITR'}</Badge>
                  </td>
                  <td className="num text-right text-fg whitespace-nowrap">{formatINR(client.monthlyAuditFee)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton icon={MessageSquare} label="Message on WhatsApp" size="sm" onClick={() => onOpenWhatsAppForClient(client)} />
                      <Button size="sm" onClick={() => onSelectClient(client.id)}>
                        View Account
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      {isAdmin && onAddClient && (
        <NewClientModal
          isOpen={isNewClientModalOpen}
          onClose={() => setIsNewClientModalOpen(false)}
          staffList={staffList}
          entityTypes={entityTypes}
          nextClientCode={nextClientCode}
          onAddClient={onAddClient}
        />
      )}
    </div>
  );
};
