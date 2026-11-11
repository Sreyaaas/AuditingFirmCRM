import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  Client, 
  MonthlyTask, 
  ITRFiling, 
  DebtorRecord, 
  StaffTicket, 
  UserProfile, 
  ActivityLog, 
  TicketStatus, 
  FilingStatus, 
  ITRStatus, 
  UserRole,
  DebtorMonth,
  OfficeBillingEntry,
  GSTComplianceItem
} from '../types/crm';
import {
  SAMPLE_ACTIVITY_LOGS,
  SAMPLE_BILLINGS,
  SAMPLE_CLIENTS,
  SAMPLE_DEBTORS,
  SAMPLE_GST_RETURNS,
  SAMPLE_ITR,
  SAMPLE_PROFILES,
  SAMPLE_TASKS,
  SAMPLE_TICKETS,
} from '../data/sampleData';
import { recalcDebtor } from '../utils/debtors';

// ==============================================================================
// UUID COMPATIBILITY MAPPINGS (Bridging frontend IDs with Supabase PostgreSQL UUIDs)
// ==============================================================================

export const CLIENT_ID_MAP: Record<string, string> = {
  'client-havos': 'c0000000-0000-0000-0000-000000000001',
  'client-km-traders': 'c0000000-0000-0000-0000-000000000002',
  'client-semicolon': 'c0000000-0000-0000-0000-000000000003',
  'client-rafeek': 'c0000000-0000-0000-0000-000000000004',
  'client-jinu': 'c0000000-0000-0000-0000-000000000005',
  'client-spanish': 'c0000000-0000-0000-0000-000000000006',
};

export const STAFF_ID_MAP: Record<string, string> = {
  'staff-shameer': 'a0000000-0000-0000-0000-000000000001',
  'user-admin-shameer': 'a0000000-0000-0000-0000-000000000001',
  'staff-ameen': 'a0000000-0000-0000-0000-000000000002',
  'user-admin-ameen': 'a0000000-0000-0000-0000-000000000002',
  'staff-susmi': 'a0000000-0000-0000-0000-000000000003',
  'user-staff-susmi': 'a0000000-0000-0000-0000-000000000003',
};

// Validates whether string is a standard RFC UUID
export const isUuid = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

// Converts an arbitrary CRM slug ID to a valid Supabase PostgreSQL UUID
export const ensureUuid = (id: string, type: 'client' | 'staff' | 'general' = 'general'): string => {
  if (isUuid(id)) return id;
  if (type === 'client' && CLIENT_ID_MAP[id]) return CLIENT_ID_MAP[id];
  if (type === 'staff' && STAFF_ID_MAP[id]) return STAFF_ID_MAP[id];

  // Try reverse lookups
  if (CLIENT_ID_MAP[id]) return CLIENT_ID_MAP[id];
  if (STAFF_ID_MAP[id]) return STAFF_ID_MAP[id];

  // Derive stable UUID from string timestamp or random
  const hex = id.replace(/[^a-f0-9]/gi, '').toLowerCase();
  const padded = (hex + '00000000000000000000000000000000').slice(0, 32);
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-4${padded.slice(13, 16)}-a${padded.slice(17, 20)}-${padded.slice(20, 32)}`;
};

export const readLocalListOrSeed = <T>(key: string, seed: T[]): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seed;
  } catch {
    return seed;
  }
};

export interface PracticeConfigItem {
  id: string;
  category: string;
  options: string[];
}

export const DEFAULT_PRACTICE_CONFIGS: Record<string, string[]> = {
  filing_types: [
    'GSTR-1 (Sales)',
    'GSTR-3B (Summary)',
    'Statutory Audit',
    'TDS Payment',
    'PF & ESI',
    'CMP-08',
    'IFF'
  ],
  return_types: [
    'GSTR-1',
    'GSTR-3B',
    'CMP-08',
    'GSTR-9',
    'GSTR-9C'
  ],
  entity_types: [
    'Private Limited',
    'LLP',
    'Partnership',
    'Proprietorship',
    'Individual'
  ],
  service_types: [
    'GST Filing',
    'Statutory Audit Advance',
    'GST & MCA Advisory',
    'ITR-2 Filing & Computation',
    'ITR-3 Business Return'
  ]
};

// ==============================================================================
// 1. PRACTICE CONFIGURATIONS (Dynamic Dropdowns)
// ==============================================================================

export const fetchPracticeConfigs = async (): Promise<Record<string, string[]>> => {
  if (!isSupabaseConfigured()) {
    const saved = localStorage.getItem('shameer_crm_practice_configs');
    return saved ? JSON.parse(saved) : DEFAULT_PRACTICE_CONFIGS;
  }

  try {
    const { data, error } = await supabase
      .from('practice_configs')
      .select('id, options');

    if (error || !data) {
      const saved = localStorage.getItem('shameer_crm_practice_configs');
      return saved ? JSON.parse(saved) : DEFAULT_PRACTICE_CONFIGS;
    }

    const configs: Record<string, string[]> = { ...DEFAULT_PRACTICE_CONFIGS };
    data.forEach((row: { id: string; options: string[] }) => {
      if (Array.isArray(row.options)) {
        configs[row.id] = row.options;
      }
    });

    localStorage.setItem('shameer_crm_practice_configs', JSON.stringify(configs));
    return configs;
  } catch (err) {
    console.error('Failed to fetch practice configs:', err);
    return DEFAULT_PRACTICE_CONFIGS;
  }
};

export const savePracticeConfigOption = async (
  configId: string,
  newOption: string
): Promise<{ success: boolean; options: string[]; error?: string }> => {
  try {
    const currentConfigs = await fetchPracticeConfigs();
    const existing = currentConfigs[configId] || [];
    const trimmed = newOption.trim();

    if (!trimmed) {
      return { success: false, options: existing, error: 'Option cannot be empty' };
    }

    if (existing.includes(trimmed)) {
      return { success: false, options: existing, error: 'Option already exists' };
    }

    const updatedOptions = [...existing, trimmed];
    currentConfigs[configId] = updatedOptions;
    localStorage.setItem('shameer_crm_practice_configs', JSON.stringify(currentConfigs));

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('practice_configs')
        .upsert({
          id: configId,
          category: configId.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          options: updatedOptions,
          updated_at: new Date().toISOString()
        });

      if (error) {
        return { success: true, options: updatedOptions, error: `Saved locally: ${error.message}` };
      }
    }

    return { success: true, options: updatedOptions };
  } catch (err: any) {
    return { success: false, options: [], error: err.message };
  }
};

export const removePracticeConfigOption = async (
  configId: string,
  optionToRemove: string
): Promise<{ success: boolean; options: string[]; error?: string }> => {
  try {
    const currentConfigs = await fetchPracticeConfigs();
    const existing = currentConfigs[configId] || [];
    const updatedOptions = existing.filter((opt) => opt !== optionToRemove);

    currentConfigs[configId] = updatedOptions;
    localStorage.setItem('shameer_crm_practice_configs', JSON.stringify(currentConfigs));

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('practice_configs')
        .upsert({
          id: configId,
          category: configId.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          options: updatedOptions,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Supabase config update warning:', error.message);
      }
    }

    return { success: true, options: updatedOptions };
  } catch (err: any) {
    return { success: false, options: [], error: err.message };
  }
};

// ==============================================================================
// 2. USER PROFILES & STAFF SYNC
// ==============================================================================

export const fetchProfilesFromDb = async (): Promise<UserProfile[]> => {
  if (!isSupabaseConfigured()) {
    return readLocalListOrSeed('shameer_crm_profiles_local', SAMPLE_PROFILES);
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) {
      console.error('Load failed (shameer_crm_profiles_local):', error?.message);
      return [];
    }

    const mapped: UserProfile[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as UserRole,
      designation: row.designation || 'Staff Practitioner',
      phone: row.phone || '',
      status: row.status || 'Active',
      joinedDate: row.joined_date || row.created_at?.slice(0, 10) || '2026-01-01',
      assignedClientsCount: 0,
      assignedTasksCount: 0,
      completedThisMonth: 0,
      authUserId: row.auth_user_id ?? null,
      canEditPayments: Boolean(row.can_edit_payments || row.role === 'admin'),
      canAccessFinancials: Boolean(row.can_access_financials || row.role === 'admin'),
      initials: row.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
    }));

    localStorage.setItem('shameer_crm_profiles_local', JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    console.error('Fetch profiles error:', err);
    return [];
  }
};

export const saveProfileToDb = async (profile: UserProfile): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_profiles_local');
    const existing: UserProfile[] = local ? JSON.parse(local) : SAMPLE_PROFILES;
    const updated = [profile, ...existing.filter(p => p.id !== profile.id && p.email !== profile.email)];
    localStorage.setItem('shameer_crm_profiles_local', JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      const dbPayload = {
        id: ensureUuid(profile.id, 'staff'),
        name: profile.name,
        email: profile.email.toLowerCase(),
        role: profile.role,
        designation: profile.designation,
        phone: profile.phone,
        status: profile.status,
        can_edit_payments: profile.canEditPayments,
        can_access_financials: profile.canAccessFinancials,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('profiles').upsert(dbPayload, { onConflict: 'email' });
      if (error) {
        console.warn('Supabase profile save notice:', error.message);
        return { success: true, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const updateProfileInDb = async (userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_profiles_local');
    if (local) {
      const parsed: UserProfile[] = JSON.parse(local);
      const updated = parsed.map(p => p.id === userId ? { ...p, ...updates } : p);
      localStorage.setItem('shameer_crm_profiles_local', JSON.stringify(updated));
    }

    if (isSupabaseConfigured()) {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.role) dbUpdates.role = updates.role;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.designation) dbUpdates.designation = updates.designation;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.canAccessFinancials !== undefined) dbUpdates.can_access_financials = updates.canAccessFinancials;
      if (updates.canEditPayments !== undefined) dbUpdates.can_edit_payments = updates.canEditPayments;
      if (updates.name) dbUpdates.name = updates.name;

      const uuid = ensureUuid(userId, 'staff');
      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', uuid);
      if (error) {
        console.warn('Supabase profile update notice:', error.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ==============================================================================
// 3. CLIENT MASTER RECORDS SYNC
// ==============================================================================

export const fetchClientsFromDb = async (): Promise<Client[]> => {
  if (!isSupabaseConfigured()) {
    return readLocalListOrSeed('shameer_crm_clients_local', SAMPLE_CLIENTS);
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('client_code', { ascending: true });

    if (error || !data) {
      console.error('Load failed (shameer_crm_clients_local):', error?.message);
      return [];
    }

    const mapped: Client[] = data.map((row: any) => ({
      id: row.id,
      clientCode: row.client_code,
      name: row.name,
      tradeName: row.trade_name || row.name,
      entityType: row.entity_type,
      gstin: row.gstin || '',
      pan: row.pan || '',
      contactPerson: row.contact_person || '',
      phone: row.phone || '',
      email: row.email || '',
      isRecurringGST: Boolean(row.is_recurring_gst),
      isRecurringStatutory: Boolean(row.is_recurring_statutory),
      assignedStaffId: row.assigned_staff_id || 'staff-ameen',
      monthlyAuditFee: Number(row.monthly_audit_fee) || 0,
      city: row.city || 'Kerala',
      oneDriveFolderUrl: row.onedrive_folder_url || '',
      status: row.status || 'Active'
    }));

    localStorage.setItem('shameer_crm_clients_local', JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    console.error('Fetch clients error:', err);
    return [];
  }
};

export const saveClientToDb = async (client: Client): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_clients_local');
    const existing: Client[] = local ? JSON.parse(local) : SAMPLE_CLIENTS;
    const updated = [client, ...existing.filter(c => c.clientCode !== client.clientCode)];
    localStorage.setItem('shameer_crm_clients_local', JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      const dbPayload = {
        client_code: client.clientCode,
        name: client.name,
        trade_name: client.tradeName,
        entity_type: client.entityType,
        gstin: client.gstin,
        pan: client.pan,
        contact_person: client.contactPerson,
        phone: client.phone,
        email: client.email,
        is_recurring_gst: client.isRecurringGST,
        is_recurring_statutory: client.isRecurringStatutory,
        assigned_staff_id: ensureUuid(client.assignedStaffId, 'staff'),
        monthly_audit_fee: client.monthlyAuditFee,
        city: client.city,
        onedrive_folder_url: client.oneDriveFolderUrl,
        status: client.status,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('clients')
        .upsert(dbPayload, { onConflict: 'client_code' });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const updateClientInDb = async (clientId: string, updates: Partial<Client>): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_clients_local');
    if (local) {
      const parsed: Client[] = JSON.parse(local);
      const updated = parsed.map(c => c.id === clientId ? { ...c, ...updates } : c);
      localStorage.setItem('shameer_crm_clients_local', JSON.stringify(updated));
    }

    if (isSupabaseConfigured()) {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.tradeName) dbUpdates.trade_name = updates.tradeName;
      if (updates.gstin) dbUpdates.gstin = updates.gstin;
      if (updates.pan) dbUpdates.pan = updates.pan;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.monthlyAuditFee !== undefined) dbUpdates.monthly_audit_fee = updates.monthlyAuditFee;
      if (updates.oneDriveFolderUrl) dbUpdates.onedrive_folder_url = updates.oneDriveFolderUrl;

      const uuid = ensureUuid(clientId, 'client');
      const { error } = await supabase.from('clients').update(dbUpdates).eq('id', uuid);
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ==============================================================================
// 4. COMPLIANCE TASKS SYNC
// ==============================================================================

const TASKS_LOCAL_KEY = 'shameer_crm_tasks_v2';

export const fetchTasksFromDb = async (): Promise<MonthlyTask[]> => {
  if (!isSupabaseConfigured()) {
    return readLocalListOrSeed(TASKS_LOCAL_KEY, SAMPLE_TASKS);
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, clients(name, trade_name, gstin)')
      .order('due_date', { ascending: true });

    if (error || !data) {
      console.error('Load failed (tasks):', error?.message);
      return [];
    }

    const mapped: MonthlyTask[] = data.map((t: any) => ({
      id: t.id,
      clientId: t.client_id,
      clientName: t.clients?.name || t.client_name || 'Client',
      tradeName: t.clients?.trade_name || t.clients?.name || 'Client',
      gstin: t.clients?.gstin || t.gstin || '',
      filingType: t.filing_type,
      period: t.period,
      assignedStaffId: t.assigned_staff_id || 'staff-ameen',
      status: t.status,
      dueDate: t.due_date,
      daysRemaining: Math.ceil((new Date(t.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      arnNumber: t.arn_number,
      taxPayable: Number(t.tax_payable) || 0,
      turnoverReported: Number(t.turnover_reported) || 0,
      docsReceived: Boolean(t.docs_received),
      phone: t.phone || '',
      notes: t.notes || '',
      lastUpdated: 'Synced with Supabase cloud'
    }));

    localStorage.setItem(TASKS_LOCAL_KEY, JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    console.error('Fetch tasks error:', err);
    return [];
  }
};

export const saveTaskToDb = async (task: MonthlyTask): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem(TASKS_LOCAL_KEY);
    const existing: MonthlyTask[] = local ? JSON.parse(local) : SAMPLE_TASKS;
    const updated = [task, ...existing.filter(t => t.id !== task.id)];
    localStorage.setItem(TASKS_LOCAL_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      const clientUuid = ensureUuid(task.clientId, 'client');
      const staffUuid = ensureUuid(task.assignedStaffId, 'staff');

      const dbPayload = {
        client_id: clientUuid,
        filing_type: task.filingType,
        period: task.period,
        assigned_staff_id: staffUuid,
        status: task.status,
        due_date: task.dueDate,
        arn_number: task.arnNumber || null,
        tax_payable: task.taxPayable || 0,
        turnover_reported: task.turnoverReported || 0,
        docs_received: task.docsReceived || false,
        phone: task.phone || null,
        notes: task.notes || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('tasks').insert([dbPayload]);
      if (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const updateTaskStatusInDb = async (
  taskId: string, 
  newStatus: FilingStatus, 
  arnNumber?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem(TASKS_LOCAL_KEY);
    if (local) {
      const parsed: MonthlyTask[] = JSON.parse(local);
      const updated = parsed.map(t => t.id === taskId ? {
        ...t,
        status: newStatus,
        arnNumber: arnNumber || t.arnNumber,
        lastUpdated: 'Just now'
      } : t);
      localStorage.setItem(TASKS_LOCAL_KEY, JSON.stringify(updated));
    }

    if (isSupabaseConfigured() && isUuid(taskId)) {
      const updates: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (arnNumber) updates.arn_number = arnNumber;

      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) {
        console.warn('Supabase task status update notice:', error.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ==============================================================================
// 5. ANNUAL TAX RETURNS (ITR) SYNC
// ==============================================================================

export const fetchItrFilingsFromDb = async (): Promise<ITRFiling[]> => {
  if (!isSupabaseConfigured()) {
    return readLocalListOrSeed('shameer_crm_itr_filings_v2', SAMPLE_ITR);
  }

  try {
    const { data, error } = await supabase
      .from('itr_filings')
      .select('*, clients(name, trade_name, entity_type)')
      .order('due_date', { ascending: true });

    if (error || !data) {
      console.error('Load failed (itr_filings):', error?.message);
      return [];
    }

    const mapped: ITRFiling[] = data.map((row: any) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.clients?.name || 'Client',
      pan: row.pan,
      entityType: row.clients?.entity_type || 'Private Limited',
      itrForm: row.itr_form,
      assessmentYear: row.assessment_year,
      financialYear: row.financial_year || 'FY 2025-26',
      assignedStaffId: row.assigned_staff_id || 'staff-ameen',
      status: row.status as ITRStatus,
      dueDate: row.due_date,
      regime: row.regime || 'New Regime (115BAC)',
      taxLiabilityOrRefund: Number(row.tax_liability_or_refund) || 0,
      acknowledgmentNo: row.acknowledgment_no || '',
      lastActivity: 'Synced with Supabase',
      phone: row.phone || ''
    }));

    localStorage.setItem('shameer_crm_itr_filings_v2', JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    console.error('Fetch ITR error:', err);
    return [];
  }
};

export const saveItrFilingToDb = async (itr: ITRFiling): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_itr_filings_v2');
    const existing: ITRFiling[] = local ? JSON.parse(local) : SAMPLE_ITR;
    const updated = [itr, ...existing.filter(i => i.id !== itr.id)];
    localStorage.setItem('shameer_crm_itr_filings_v2', JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      const clientUuid = ensureUuid(itr.clientId, 'client');
      const staffUuid = ensureUuid(itr.assignedStaffId, 'staff');

      const dbPayload = {
        client_id: clientUuid,
        pan: itr.pan,
        itr_form: itr.itrForm,
        assessment_year: itr.assessmentYear,
        financial_year: itr.financialYear,
        assigned_staff_id: staffUuid,
        status: itr.status,
        due_date: itr.dueDate,
        regime: itr.regime,
        tax_liability_or_refund: itr.taxLiabilityOrRefund,
        acknowledgment_no: itr.acknowledgmentNo || null,
        phone: itr.phone || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('itr_filings').insert([dbPayload]);
      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const updateItrFilingStatusInDb = async (
  id: string,
  newStatus: ITRStatus,
  ackNo?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_itr_filings_v2');
    if (local) {
      const parsed: ITRFiling[] = JSON.parse(local);
      const updated = parsed.map(itr => itr.id === id ? {
        ...itr,
        status: newStatus,
        acknowledgmentNo: ackNo || itr.acknowledgmentNo,
        lastActivity: 'Just now'
      } : itr);
      localStorage.setItem('shameer_crm_itr_filings_v2', JSON.stringify(updated));
    }

    if (isSupabaseConfigured() && isUuid(id)) {
      const updates: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (ackNo) updates.acknowledgment_no = ackNo;

      const { error } = await supabase.from('itr_filings').update(updates).eq('id', id);
      if (error) {
        console.warn('Supabase ITR status update notice:', error.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ==============================================================================
// 6. DEBTORS & MONEY OWED LEDGER SYNC
// ==============================================================================

const DEBTORS_LOCAL_KEY = 'sa_crm_debtors';
const BILLINGS_LOCAL_KEY = 'sa_crm_billings';
const GST_LOCAL_KEY = 'sa_crm_gst_returns';

const readLocalList = readLocalListOrSeed;
const writeLocalList = (key: string, list: unknown[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

/** Builds monthly history from the JSONB ledger, or from the legacy Aug–Nov columns. */
const ledgerFromRow = (row: any): DebtorMonth[] => {
  if (Array.isArray(row.ledger) && row.ledger.length > 0) {
    return row.ledger.map((m: any) => ({
      month: String(m.month),
      opening: Number(m.opening) || 0,
      received: Number(m.received) || 0,
      billed: Number(m.billed) || 0,
    }));
  }
  const legacy: [string, string][] = [['2026-08', 'aug'], ['2026-09', 'sep'], ['2026-10', 'oct'], ['2026-11', 'nov']];
  return legacy.map(([month, p]) => ({
    month,
    opening: Number(row[`${p}_outstanding`]) || 0,
    received: Number(row[`${p}_cleared`]) || 0,
    billed: Number(row[`${p}_billing`]) || 0,
  }));
};

export const fetchDebtorsFromDb = async (): Promise<DebtorRecord[]> => {
  if (!isSupabaseConfigured()) return readLocalList(DEBTORS_LOCAL_KEY, SAMPLE_DEBTORS);

  try {
    const { data, error } = await supabase.from('debtor_records').select('*').order('s_no', { ascending: true, nullsFirst: false });
    if (error || !data) {
      console.error('Load failed (debtor_records):', error?.message);
      return [];
    }
    return data.map((row: any, idx: number) =>
      recalcDebtor({
        sNo: row.s_no || idx + 1,
        id: row.id,
        clientName: row.client_name,
        phone: row.phone || '',
        entityType: row.entity_type || '',
        assignedStaff: row.assigned_staff || '',
        months: ledgerFromRow(row),
        currentBalance: Number(row.current_balance) || 0,
        status: row.status || 'Pending',
        agingBucket: row.aging_bucket || '0-30 Days',
        lastReminderSent: row.last_reminder_sent || undefined,
      })
    );
  } catch (err) {
    console.error('Fetch debtors error:', err);
    return [];
  }
};

const debtorPayload = (d: DebtorRecord) => ({
  ...(isUuid(d.id) ? { id: d.id } : {}),
  s_no: d.sNo,
  client_name: d.clientName,
  phone: d.phone,
  entity_type: d.entityType,
  assigned_staff: d.assignedStaff,
  ledger: d.months,
  current_balance: d.currentBalance,
  status: d.status,
  aging_bucket: d.agingBucket,
  updated_at: new Date().toISOString(),
});

/** Saves one debtor account (after a payment or bill). */
export const saveDebtorToDb = async (debtor: DebtorRecord): Promise<{ error?: string }> => {
  if (!isSupabaseConfigured()) {
    const list = readLocalList<DebtorRecord>(DEBTORS_LOCAL_KEY, SAMPLE_DEBTORS);
    writeLocalList(DEBTORS_LOCAL_KEY, [debtor, ...list.filter((d) => d.id !== debtor.id)].sort((a, b) => a.sNo - b.sNo));
    return {};
  }
  const payload = debtorPayload(debtor);
  const { error } = isUuid(debtor.id)
    ? await supabase.from('debtor_records').update(payload).eq('id', debtor.id)
    : await supabase.from('debtor_records').insert(payload);
  return error ? { error: error.message } : {};
};

/**
 * Replaces debtor accounts and billing entries with the contents of an imported workbook.
 * Accounts are matched by client name; billing rows by their workbook position, so
 * re-importing an updated file does not create duplicates.
 */
export const importDebtorWorkbookToDb = async (
  debtors: DebtorRecord[],
  billings: OfficeBillingEntry[]
): Promise<{ debtors: DebtorRecord[]; billings: OfficeBillingEntry[]; error?: string }> => {
  if (!isSupabaseConfigured()) {
    writeLocalList(DEBTORS_LOCAL_KEY, debtors);
    writeLocalList(BILLINGS_LOCAL_KEY, billings);
    return { debtors, billings };
  }

  const { data: existing, error: readErr } = await supabase.from('debtor_records').select('id, client_name');
  if (readErr) return { debtors: [], billings: [], error: readErr.message };
  const idByName = new Map((existing || []).map((r: any) => [String(r.client_name).toLowerCase(), r.id]));

  const rows = debtors.map((d) => {
    const id = idByName.get(d.clientName.toLowerCase());
    return { ...debtorPayload(d), ...(id ? { id } : {}) };
  });
  const updates = rows.filter((r: any) => r.id);
  const inserts = rows.filter((r: any) => !r.id);
  if (updates.length) {
    const { error } = await supabase.from('debtor_records').upsert(updates, { onConflict: 'id' });
    if (error) return { debtors: [], billings: [], error: error.message };
  }
  if (inserts.length) {
    const { error } = await supabase.from('debtor_records').insert(inserts);
    if (error) return { debtors: [], billings: [], error: error.message };
  }

  if (billings.length) {
    const billingRows = billings.map((b) => ({
      external_id: b.id,
      serial_no: b.serialNo,
      date: b.date || null,
      client_name: b.clientName,
      nature_of_service: b.natureOfService || '',
      filing_month: b.filingMonth || '',
      professional_income: b.professionalIncome || 0,
      oop_expenses: b.oopExpenses || 0,
      rcm: b.rcm || 0,
      tax_amount: b.taxAmount || 0,
      billing_status: b.billingStatus || '',
      invoice_number: b.invoiceNumber || '',
      period: b.period || '',
      user_name: b.user || '',
    }));
    const { error } = await supabase.from('office_billings').upsert(billingRows, { onConflict: 'external_id' });
    if (error) return { debtors: [], billings: [], error: error.message };
  }

  const [freshDebtors, freshBillings] = await Promise.all([fetchDebtorsFromDb(), fetchBillingsFromDb()]);
  return { debtors: freshDebtors, billings: freshBillings };
};

// ------------------------------------------------------------- billing register

export const fetchBillingsFromDb = async (): Promise<OfficeBillingEntry[]> => {
  if (!isSupabaseConfigured()) return readLocalList(BILLINGS_LOCAL_KEY, SAMPLE_BILLINGS);
  try {
    const { data, error } = await supabase.from('office_billings').select('*').order('period', { ascending: false }).order('serial_no', { ascending: true });
    if (error || !data) {
      console.error('Load failed (office_billings):', error?.message);
      return [];
    }
    return data.map((r: any) => ({
      id: r.id,
      serialNo: r.serial_no,
      date: r.date || '',
      clientName: r.client_name,
      natureOfService: r.nature_of_service || '',
      filingMonth: r.filing_month || '',
      professionalIncome: Number(r.professional_income) || 0,
      oopExpenses: Number(r.oop_expenses) || 0,
      rcm: Number(r.rcm) || undefined,
      taxAmount: Number(r.tax_amount) || undefined,
      billingStatus: r.billing_status || '',
      invoiceNumber: r.invoice_number || '',
      period: r.period || '',
      user: r.user_name || '',
    }));
  } catch (err) {
    console.error('Fetch billings error:', err);
    return [];
  }
};

export const saveBillingToDb = async (entry: OfficeBillingEntry): Promise<{ error?: string }> => {
  if (!isSupabaseConfigured()) {
    writeLocalList(BILLINGS_LOCAL_KEY, [entry, ...readLocalList(BILLINGS_LOCAL_KEY, SAMPLE_BILLINGS)]);
    return {};
  }
  const { error } = await supabase.from('office_billings').insert({
    serial_no: entry.serialNo,
    date: entry.date || null,
    client_name: entry.clientName,
    nature_of_service: entry.natureOfService,
    filing_month: entry.filingMonth || '',
    professional_income: entry.professionalIncome,
    oop_expenses: entry.oopExpenses || 0,
    billing_status: entry.billingStatus || 'Billed',
    invoice_number: entry.invoiceNumber || '',
    period: entry.period || '',
    user_name: entry.user || '',
  });
  return error ? { error: error.message } : {};
};

// ---------------------------------------------------------------- GST returns

const daysUntil = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  const due = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
};

/** Recomputes days remaining and priority from the due date. */
export const withGstPriority = (item: GSTComplianceItem, dueSoonDays = 2): GSTComplianceItem => {
  if (item.arnNumber || item.filingStatus === 'Filed') return { ...item, priorityLevel: 'filed', filingStatus: 'Filed', daysRemaining: 0 };
  const days = /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) ? daysUntil(item.dueDate) : item.daysRemaining;
  const priorityLevel = days < 0 ? 'overdue' : days <= dueSoonDays ? 'due-2-days' : 'upcoming';
  return { ...item, daysRemaining: days, priorityLevel, filingStatus: days < 0 ? 'Overdue' : days <= dueSoonDays ? 'Due Soon' : item.filingStatus };
};

export const fetchGstReturnsFromDb = async (): Promise<GSTComplianceItem[]> => {
  if (!isSupabaseConfigured()) return readLocalList(GST_LOCAL_KEY, SAMPLE_GST_RETURNS).map((i) => withGstPriority(i));
  try {
    const { data, error } = await supabase.from('gst_returns').select('*').order('due_date', { ascending: true });
    if (error || !data) {
      console.error('Load failed (gst_returns):', error?.message);
      return [];
    }
    return data.map((r: any) =>
      withGstPriority({
        id: r.id,
        clientName: r.client_name,
        tradeName: r.trade_name || r.client_name,
        gstin: r.gstin || '',
        returnType: r.return_type,
        filingMonth: r.filing_month,
        dueDate: r.due_date,
        daysRemaining: 0,
        priorityLevel: 'upcoming',
        filingStatus: r.status === 'Filed' ? 'Filed' : 'In Progress',
        assignedStaff: r.assigned_staff || '',
        arnNumber: r.arn_number || undefined,
        filedDate: r.filed_date || undefined,
        phone: r.phone || '',
        taxPayable: Number(r.tax_payable) || 0,
      })
    );
  } catch (err) {
    console.error('Fetch GST returns error:', err);
    return [];
  }
};

export const markGstFiledInDb = async (id: string, arn: string): Promise<{ error?: string }> => {
  const filedDate = new Date().toISOString().slice(0, 10);
  if (!isSupabaseConfigured()) {
    const list = readLocalList<GSTComplianceItem>(GST_LOCAL_KEY, SAMPLE_GST_RETURNS);
    writeLocalList(GST_LOCAL_KEY, list.map((i) => (i.id === id ? { ...i, arnNumber: arn, filedDate, filingStatus: 'Filed' } : i)));
    return {};
  }
  const { error } = await supabase
    .from('gst_returns')
    .update({ status: 'Filed', arn_number: arn, filed_date: filedDate, updated_at: new Date().toISOString() })
    .eq('id', id);
  return error ? { error: error.message } : {};
};

// ==============================================================================
// 7. CLIENT CALL DESK & TICKETS SYNC
// ==============================================================================

export const fetchTicketsFromDb = async (): Promise<StaffTicket[]> => {
  if (!isSupabaseConfigured()) {
    return readLocalListOrSeed('shameer_crm_tickets_local', SAMPLE_TICKETS);
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, clients(trade_name)')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Load failed (shameer_crm_tickets_local):', error?.message);
      return [];
    }

    const mapped: StaffTicket[] = data.map((row: any) => ({
      id: row.id,
      ticketNo: row.ticket_no,
      clientId: row.client_id || 'client-havos',
      clientName: row.client_name,
      tradeName: row.clients?.trade_name || row.client_name,
      callerName: row.caller_name,
      callerPhone: row.caller_phone,
      callType: row.call_type || 'Inbound Phone Call',
      subject: row.subject,
      description: row.description || '',
      category: row.category,
      priority: row.priority,
      status: row.status as TicketStatus,
      loggedByStaffId: row.logged_by_staff_id || 'staff-ameen',
      loggedAt: row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Today',
      assignedStaffId: row.assigned_staff_id,
      assignedAt: row.assigned_at,
      resolvedAt: row.resolved_at,
      resolutionNotes: row.resolution_notes
    }));

    localStorage.setItem('shameer_crm_tickets_local', JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    console.error('Fetch tickets error:', err);
    return [];
  }
};

export const saveTicketToDb = async (ticket: StaffTicket): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_tickets_local');
    const existing: StaffTicket[] = local ? JSON.parse(local) : SAMPLE_TICKETS;
    const updated = [ticket, ...existing.filter(t => t.id !== ticket.id)];
    localStorage.setItem('shameer_crm_tickets_local', JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      const clientUuid = ensureUuid(ticket.clientId, 'client');
      const staffUuid = ticket.assignedStaffId ? ensureUuid(ticket.assignedStaffId, 'staff') : null;
      const loggedByUuid = ensureUuid(ticket.loggedByStaffId, 'staff');

      const dbPayload = {
        ticket_no: ticket.ticketNo,
        client_id: clientUuid,
        client_name: ticket.clientName,
        caller_name: ticket.callerName,
        caller_phone: ticket.callerPhone,
        call_type: ticket.callType,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        logged_by_staff_id: loggedByUuid,
        assigned_staff_id: staffUuid,
        assigned_at: ticket.assignedAt ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('tickets').insert([dbPayload]);
      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const updateTicketInDb = async (
  ticketId: string, 
  updates: Partial<StaffTicket>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_tickets_local');
    if (local) {
      const parsed: StaffTicket[] = JSON.parse(local);
      const updated = parsed.map(t => t.id === ticketId ? { ...t, ...updates } : t);
      localStorage.setItem('shameer_crm_tickets_local', JSON.stringify(updated));
    }

    if (isSupabaseConfigured() && isUuid(ticketId)) {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.assignedStaffId) dbUpdates.assigned_staff_id = ensureUuid(updates.assignedStaffId, 'staff');
      if (updates.assignedAt) dbUpdates.assigned_at = new Date().toISOString();
      if (updates.resolvedAt) dbUpdates.resolved_at = new Date().toISOString();
      if (updates.resolutionNotes) dbUpdates.resolution_notes = updates.resolutionNotes;

      const { error } = await supabase.from('tickets').update(dbUpdates).eq('id', ticketId);
      if (error) {
        console.warn('Supabase ticket update notice:', error.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ==============================================================================
// 8. ACTIVITY LOG & AUDIT TRAIL SYNC
// ==============================================================================

export const fetchActivityLogsFromDb = async (): Promise<ActivityLog[]> => {
  if (!isSupabaseConfigured()) {
    return readLocalListOrSeed('shameer_crm_activity_logs_local', SAMPLE_ACTIVITY_LOGS);
  }

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error || !data) {
      console.error('Load failed (shameer_crm_activity_logs_local):', error?.message);
      return [];
    }

    const mapped: ActivityLog[] = data.map((row: any) => ({
      id: row.id,
      timestamp: new Date(row.timestamp).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      userName: row.user_name,
      userRole: row.user_role as UserRole,
      action: row.action,
      details: row.details,
      clientName: row.client_name || undefined,
      category: row.category,
    }));

    localStorage.setItem('shameer_crm_activity_logs_local', JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    console.error('Fetch activity logs error:', err);
    return [];
  }
};

export const saveActivityLogToDb = async (log: ActivityLog): Promise<{ success: boolean; error?: string }> => {
  try {
    const local = localStorage.getItem('shameer_crm_activity_logs_local');
    const existing: ActivityLog[] = local ? JSON.parse(local) : SAMPLE_ACTIVITY_LOGS;
    const updated = [log, ...existing].slice(0, 100);
    localStorage.setItem('shameer_crm_activity_logs_local', JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      const dbPayload = {
        user_name: log.userName,
        user_role: log.userRole,
        action: log.action,
        details: log.details,
        client_name: log.clientName || null,
        category: log.category,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase.from('activity_logs').insert([dbPayload]);
      if (error) {
        console.warn('Supabase activity log save notice:', error.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ==============================================================================
// 9. CLOUD HEALTH & MASTER DATA SYNC SEEDER
// ==============================================================================

export interface SupabaseHealthReport {
  isConfigured: boolean;
  canConnect: boolean;
  tableCounts: Record<string, number>;
  rlsBlocked: boolean;
  message: string;
}

export const checkSupabaseHealth = async (): Promise<SupabaseHealthReport> => {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      canConnect: false,
      tableCounts: {},
      rlsBlocked: false,
      message: 'Supabase URL or Anon key is not set.'
    };
  }

  const report: SupabaseHealthReport = {
    isConfigured: true,
    canConnect: false,
    tableCounts: {},
    rlsBlocked: false,
    message: ''
  };

  try {
    const tables = ['profiles', 'clients', 'tasks', 'itr_filings', 'debtor_records', 'tickets', 'activity_logs', 'practice_configs'];
    let anySuccess = false;
    let rlsTriggered = false;

    for (const t of tables) {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (!error) {
        anySuccess = true;
        report.tableCounts[t] = count || 0;
      } else {
        report.tableCounts[t] = 0;
        if (error.code === '42501' || error.message?.includes('security policy')) {
          rlsTriggered = true;
        }
      }
    }

    report.canConnect = anySuccess;
    report.rlsBlocked = rlsTriggered;
    report.message = anySuccess 
      ? 'Supabase PostgreSQL live instance connected.' 
      : 'Could not access Supabase tables. Run enable_crm_sync.sql in Supabase SQL editor.';
    return report;
  } catch (err: any) {
    report.message = err.message || 'Connection failed.';
    return report;
  }
};

// ==============================================================================
// DELETE (administrators only — enforced by Row Level Security in the database)
// ==============================================================================

type DeletableTable = 'clients' | 'tasks' | 'itr_filings' | 'tickets' | 'debtor_records';

const deleteRow = async (table: DeletableTable, id: string): Promise<{ error?: string }> => {
  if (!isSupabaseConfigured()) return {};
  const { error, count } = await supabase.from(table).delete({ count: 'exact' }).eq('id', id);
  if (error) return { error: error.message };
  if (count === 0) return { error: 'Nothing was deleted. Only administrators can delete records.' };
  return {};
};

export const deleteClientFromDb = (id: string) => deleteRow('clients', id);
export const deleteTaskFromDb = (id: string) => deleteRow('tasks', id);
export const deleteItrFilingFromDb = (id: string) => deleteRow('itr_filings', id);
export const deleteTicketFromDb = (id: string) => deleteRow('tickets', id);
export const deleteDebtorFromDb = (id: string) => deleteRow('debtor_records', id);

/**
 * Removes locally cached copies of firm data (clients, tasks, fees, logs…).
 * Called on sign-out so nothing remains in the browser of a shared office computer.
 * Theme and settings caches are kept.
 */
export const clearLocalDataCache = () => {
  try {
    const keep = new Set(['sa_crm_preferences', 'sa_crm_firm_profile', 'sa_crm_whatsapp_templates', 'crm-active-theme']);
    for (const key of Object.keys(localStorage)) {
      if ((key.startsWith('shameer_crm_') || key.startsWith('sa_crm_')) && !keep.has(key)) localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable */
  }
};
