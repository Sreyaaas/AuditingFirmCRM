import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Client, MonthlyTask, ITRFiling, DebtorRecord } from '../types/crm';
import { INITIAL_CLIENTS, INITIAL_MONTHLY_TASKS } from '../data/mockData';
import { ACTUAL_DEBTOR_RECORDS, ACTUAL_ITR_RECORDS } from '../data/actualClientData';

export interface PracticeConfigItem {
  id: string; // 'filing_types' | 'return_types' | 'entity_types' | 'service_types'
  category: string;
  options: string[];
}

// Default options if database is not reachable yet
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

    if (error || !data || data.length === 0) {
      console.warn('Practice configs not yet in Supabase, using local defaults', error?.message);
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
        console.error('Supabase config update error:', error.message);
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
        console.error('Supabase config update error:', error.message);
      }
    }

    return { success: true, options: updatedOptions };
  } catch (err: any) {
    return { success: false, options: [], error: err.message };
  }
};

// ==============================================================================
// 2. CLIENT MASTER RECORDS SYNC
// ==============================================================================

export const fetchClientsFromDb = async (): Promise<Client[]> => {
  if (!isSupabaseConfigured()) {
    const saved = localStorage.getItem('shameer_crm_clients_local');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('client_code', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Clients query returned empty or error, falling back to initial data:', error?.message);
      return INITIAL_CLIENTS;
    }

    // Map database snake_case columns to CRM TypeScript CamelCase model
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
    return INITIAL_CLIENTS;
  }
};

export const saveClientToDb = async (client: Client): Promise<{ success: boolean; error?: string }> => {
  try {
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
        assigned_staff_id: client.assignedStaffId ? 'a0000000-0000-0000-0000-000000000002' : null,
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
        console.error('Supabase client save error:', error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ==============================================================================
// 3. COMPLIANCE TASKS SYNC
// ==============================================================================

export const fetchTasksFromDb = async (): Promise<MonthlyTask[]> => {
  if (!isSupabaseConfigured()) {
    const saved = localStorage.getItem('shameer_crm_tasks_local');
    return saved ? JSON.parse(saved) : INITIAL_MONTHLY_TASKS;
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, clients(name, trade_name, gstin)')
      .order('due_date', { ascending: true });

    if (error || !data || data.length === 0) {
      return INITIAL_MONTHLY_TASKS;
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
      lastUpdated: 'Synced from cloud'
    }));

    localStorage.setItem('shameer_crm_tasks_local', JSON.stringify(mapped));
    return mapped;
  } catch (err) {
    return INITIAL_MONTHLY_TASKS;
  }
};

export const saveTaskToDb = async (task: MonthlyTask, clientIdUuid?: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (isSupabaseConfigured()) {
      const dbPayload = {
        client_id: clientIdUuid || 'c0000000-0000-0000-0000-000000000001',
        filing_type: task.filingType,
        period: task.period,
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
        console.error('Supabase task save error:', error.message);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
