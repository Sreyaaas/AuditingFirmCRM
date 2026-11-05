import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Check, ShieldAlert, AlertCircle } from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewStats } from './components/OverviewStats';
import { ComplianceTaskManager } from './components/ComplianceTaskManager';
import { ITRFilingsManager } from './components/ITRFilingsManager';
import { ClientDirectory } from './components/ClientDirectory';
import { DebtorsManager } from './components/DebtorsManager';
import { GSTComplianceTracker } from './components/GSTComplianceTracker';
import { StaffWorkloadView } from './components/StaffWorkloadView';
import { StaffTicketDesk } from './components/StaffTicketDesk';
import { EmployeeManagement } from './components/EmployeeManagement';
import { ActivityHistory } from './components/ActivityHistory';
import { WhatsAppModal } from './components/WhatsAppModal';
import { ClientDetailDrawer } from './components/ClientDetailDrawer';
import { NewTaskModal } from './components/NewTaskModal';
import { NewTicketModal } from './components/NewTicketModal';
import { CommandPalette } from './components/CommandPalette';
import { LoginView, SetNewPasswordView } from './components/LoginView';
import { PracticeConfigManager } from './components/PracticeConfigManager';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { Avatar, Button, Card, EmptyState, PageHeader } from './components/ui';

import {
  fetchPracticeConfigs,
  savePracticeConfigOption,
  removePracticeConfigOption,
  fetchClientsFromDb,
  saveClientToDb,
  fetchTasksFromDb,
  saveTaskToDb,
  updateTaskStatusInDb,
  fetchProfilesFromDb,
  updateProfileInDb,
  updateClientInDb,
  deleteClientFromDb,
  deleteTaskFromDb,
  deleteItrFilingFromDb,
  deleteTicketFromDb,
  deleteDebtorFromDb,
  fetchItrFilingsFromDb,
  saveItrFilingToDb,
  updateItrFilingStatusInDb,
  fetchDebtorsFromDb,
  saveDebtorToDb,
  importDebtorWorkbookToDb,
  fetchBillingsFromDb,
  saveBillingToDb,
  fetchGstReturnsFromDb,
  markGstFiledInDb,
  withGstPriority,
  fetchTicketsFromDb,
  saveTicketToDb,
  updateTicketInDb,
  fetchActivityLogsFromDb,
  saveActivityLogToDb,
  DEFAULT_PRACTICE_CONFIGS,
} from './services/dbSyncService';
import { isSupabaseConfigured } from './services/supabaseClient';
import {
  adminCreateMember,
  adminSetActive,
  adminSetPassword,
  getSession,
  NewMemberInput,
  onAuthChange,
  profileForSession,
  signOut,
} from './services/authService';
import {
  AppPreferences,
  FirmProfileSettings,
  WhatsAppTemplateSettings,
  getStoredFirmProfile,
  getStoredPreferences,
  getStoredWhatsAppTemplates,
  loadRemoteSettings,
  savePreferences,
  saveStoredFirmProfile,
  saveStoredWhatsAppTemplates,
} from './services/firmConfigService';
import { applyBilling, applyPayment, currentMonthKey } from './utils/debtors';
import type { DebtorWorkbookResult } from './utils/debtorWorkbook';

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
} from './data/sampleData';
import type {
  ActivityLog,
  Client,
  DebtorRecord,
  FilingStatus,
  GSTComplianceItem,
  ITRFiling,
  ITRStatus,
  MonthlyTask,
  OfficeBillingEntry,
  StaffMember,
  StaffTicket,
  TicketStatus,
  UserProfile,
} from './types/crm';

/** In local mode or before remote tables are populated, the app runs on sample records. */
const LOCAL_MODE = !isSupabaseConfigured();
const seed = <T,>(sample: T[]): T[] => sample;

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // ---------------------------------------------------------------- theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('crm-theme') === 'dark' ? 'dark' : 'light'));
  useEffect(() => {
    localStorage.setItem('crm-theme', theme);
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // -------------------------------------------------------------- palette
  const [palette, setPalette] = useState(() => localStorage.getItem('crm-palette') || 'classic');
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
    localStorage.setItem('crm-palette', palette);
  }, [palette]);

  // ------------------------------------------------------- command palette
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // -------------------------------------------------------------- auth
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(LOCAL_MODE);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    if (LOCAL_MODE) return;
    let mounted = true;
    getSession().then((s) => {
      if (!mounted) return;
      setSession(s);
      setAuthReady(true);
    });
    const unsubscribe = onAuthChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      setSession(s);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // -------------------------------------------------------------- data
  const [profiles, setProfiles] = useState<UserProfile[]>(seed(SAMPLE_PROFILES));
  const [clients, setClients] = useState<Client[]>(seed(SAMPLE_CLIENTS));
  const [monthlyTasks, setMonthlyTasks] = useState<MonthlyTask[]>(seed(SAMPLE_TASKS));
  const [itrFilings, setItrFilings] = useState<ITRFiling[]>(seed(SAMPLE_ITR));
  const [debtors, setDebtors] = useState<DebtorRecord[]>(seed(SAMPLE_DEBTORS));
  const [billings, setBillings] = useState<OfficeBillingEntry[]>(seed(SAMPLE_BILLINGS));
  const [gstCompliance, setGstCompliance] = useState<GSTComplianceItem[]>(seed(SAMPLE_GST_RETURNS).map((i) => withGstPriority(i)));
  const [tickets, setTickets] = useState<StaffTicket[]>(seed(SAMPLE_TICKETS));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(seed(SAMPLE_ACTIVITY_LOGS));
  const [practiceConfigs, setPracticeConfigs] = useState<Record<string, string[]>>(DEFAULT_PRACTICE_CONFIGS);
  const [preferences, setPreferences] = useState<AppPreferences>(getStoredPreferences);
  const [firmProfile, setFirmProfile] = useState<FirmProfileSettings>(getStoredFirmProfile);
  const [templates, setTemplates] = useState<WhatsAppTemplateSettings>(getStoredWhatsAppTemplates);
  const [dataState, setDataState] = useState<'idle' | 'loading' | 'ready' | 'error'>(LOCAL_MODE ? 'ready' : 'idle');

  // In local mode the first sample admin is always signed in; otherwise the session decides.
  const currentUser: UserProfile | null = LOCAL_MODE ? profiles[0] || null : profileForSession(session, profiles);
  const isAdmin = currentUser?.role === 'admin';
  const canViewFees = Boolean(currentUser && (isAdmin || currentUser.canAccessFinancials));
  const canEditFees = Boolean(currentUser && (isAdmin || currentUser.canEditPayments));

  const loadAll = useCallback(async () => {
    setDataState('loading');
    try {
      const [cfg, cl, tk, pr, itr, deb, bil, gst, tix, logs, settings] = await Promise.all([
        fetchPracticeConfigs(),
        fetchClientsFromDb(),
        fetchTasksFromDb(),
        fetchProfilesFromDb(),
        fetchItrFilingsFromDb(),
        fetchDebtorsFromDb(),
        fetchBillingsFromDb(),
        fetchGstReturnsFromDb(),
        fetchTicketsFromDb(),
        fetchActivityLogsFromDb(),
        loadRemoteSettings(),
      ]);
      setPracticeConfigs(cfg);
      setClients(cl.length > 0 ? cl : SAMPLE_CLIENTS);
      setMonthlyTasks(tk.length > 0 ? tk : SAMPLE_TASKS);
      setProfiles(pr.length > 0 ? pr : SAMPLE_PROFILES);
      setItrFilings(itr.length > 0 ? itr : SAMPLE_ITR);
      setDebtors(deb.length > 0 ? deb : SAMPLE_DEBTORS);
      setBillings(bil.length > 0 ? bil : SAMPLE_BILLINGS);
      setGstCompliance((gst.length > 0 ? gst : SAMPLE_GST_RETURNS).map((i) => withGstPriority(i, settings.preferences.dueSoonDays)));
      setTickets(tix.length > 0 ? tix : SAMPLE_TICKETS);
      setActivityLogs(logs.length > 0 ? logs : SAMPLE_ACTIVITY_LOGS);
      setPreferences(settings.preferences);
      setFirmProfile(settings.firmProfile);
      setTemplates(settings.templates);
      setDataState('ready');
    } catch (err) {
      console.error('Initial load failed:', err);
      setDataState('error');
    }
  }, []);

  const sessionUserId = session?.user.id;
  useEffect(() => {
    if (LOCAL_MODE || !sessionUserId) return;
    loadAll();
  }, [sessionUserId, loadAll]);

  // Staff list and per-person counts are derived from live data, never hard-coded.
  const staffList: StaffMember[] = useMemo(
    () =>
      profiles
        .filter((p) => p.status === 'Active')
        .map((p) => ({
          id: p.id,
          name: p.name,
          role: p.designation,
          initials: p.initials || p.name.slice(0, 2).toUpperCase(),
          email: p.email,
          phone: p.phone,
          assignedRecurringCount: monthlyTasks.filter((t) => t.assignedStaffId === p.id).length,
          assignedITRCount: itrFilings.filter((i) => i.assignedStaffId === p.id).length,
          completedThisMonth: monthlyTasks.filter((t) => t.assignedStaffId === p.id && t.status === 'Filed').length,
        })),
    [profiles, monthlyTasks, itrFilings]
  );

  const profilesWithCounts: UserProfile[] = useMemo(
    () =>
      profiles.map((p) => ({
        ...p,
        assignedClientsCount: clients.filter((c) => c.assignedStaffId === p.id).length,
        assignedTasksCount: monthlyTasks.filter((t) => t.assignedStaffId === p.id).length,
        completedThisMonth: monthlyTasks.filter((t) => t.assignedStaffId === p.id && t.status === 'Filed').length,
      })),
    [profiles, clients, monthlyTasks]
  );

  // ------------------------------------------------------- UI state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppTask, setWhatsAppTask] = useState<MonthlyTask | null>(null);
  const [whatsAppITR, setWhatsAppITR] = useState<ITRFiling | null>(null);
  const [whatsAppDebtor, setWhatsAppDebtor] = useState<DebtorRecord | null>(null);
  const [whatsAppTicket, setWhatsAppTicket] = useState<StaffTicket | null>(null);
  const [whatsAppGST, setWhatsAppGST] = useState<GSTComplianceItem | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const toastTimer = useRef<number>();

  const showToast = (message: string, error = false) => {
    setToast({ message, error });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), error ? 6000 : 3000);
  };

  useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; error?: boolean }>).detail;
      if (detail?.message) showToast(detail.message, detail.error);
    };
    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  /** Shows a save error to the user instead of silently keeping an unsaved change. */
  const reportSave = (result: { error?: string; success?: boolean } | undefined, what: string) => {
    if (result?.error) showToast(`${what} was not saved: ${result.error}`, true);
  };

  const addActivityLog = (action: string, details: string, clientName?: string, category: ActivityLog['category'] = 'Task') => {
    if (!currentUser) return;
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }),
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      clientName,
      category,
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    saveActivityLogToDb(newLog).catch((err) => console.warn('Activity log not saved:', err));
  };

  // ------------------------------------------------------- session actions
  const handleLogout = useCallback(async () => {
    addActivityLog('Signed out', 'Session ended', undefined, 'Security');
    await signOut();
    setSession(null);
    setActiveTab('dashboard');
    setProfiles([]);
    setDataState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Sign out after the configured period of inactivity.
  useEffect(() => {
    const minutes = preferences.idleTimeoutMinutes;
    if (LOCAL_MODE || !session || !minutes) return;
    let timer = window.setTimeout(() => handleLogout(), minutes * 60_000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => handleLogout(), minutes * 60_000);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [preferences.idleTimeoutMinutes, session, handleLogout]);

  // ------------------------------------------------------- team
  const handleAddEmployee = async (input: NewMemberInput): Promise<{ error?: string }> => {
    if (LOCAL_MODE) return { error: 'Connect the database to create logins.' };
    const res = await adminCreateMember(input);
    if (res.error) return { error: res.error };
    setProfiles(await fetchProfilesFromDb());
    showToast(`Login created for ${input.name}`);
    addActivityLog('Team member added', `Created ${input.role === 'admin' ? 'administrator' : 'staff'} login for ${input.name} (${input.email})`, undefined, 'Account');
    return {};
  };

  const handleToggleEmployeeStatus = async (userId: string): Promise<{ error?: string }> => {
    const target = profiles.find((p) => p.id === userId);
    if (!target) return {};
    const nextActive = target.status !== 'Active';
    if (!LOCAL_MODE) {
      const res = await adminSetActive(userId, nextActive);
      if (res.error) {
        showToast(res.error, true);
        return { error: res.error };
      }
    }
    setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, status: nextActive ? 'Active' : 'Inactive' } : p)));
    showToast(`${target.name} ${nextActive ? 'can sign in again' : 'can no longer sign in'}`);
    addActivityLog(nextActive ? 'Account activated' : 'Account deactivated', `${target.name} (${target.email})`, undefined, 'Account');
    return {};
  };

  const handleUpdateEmployee = async (userId: string, patch: Partial<UserProfile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, ...patch } : p)));
    reportSave(await updateProfileInDb(userId, patch), 'Access change');
    const target = profiles.find((p) => p.id === userId);
    addActivityLog('Access updated', `Updated role or permissions for ${target?.name ?? 'member'}`, undefined, 'Account');
  };

  const handleSetEmployeePassword = async (userId: string, password: string): Promise<{ error?: string }> => {
    if (LOCAL_MODE) return { error: 'Connect the database to manage passwords.' };
    const res = await adminSetPassword(userId, password);
    if (res.error) return { error: res.error };
    const target = profiles.find((p) => p.id === userId);
    showToast(`Password updated for ${target?.name ?? 'member'}`);
    addActivityLog('Password set by administrator', `New password set for ${target?.email ?? userId}`, undefined, 'Security');
    return {};
  };

  // ------------------------------------------------------- filings
  const handleUpdateMonthlyStatus = async (taskId: string, newStatus: FilingStatus, arn?: string) => {
    const task = monthlyTasks.find((t) => t.id === taskId);
    if (!task) return;
    const arnNumber = newStatus === 'Filed' ? arn?.trim() || task.arnNumber || '' : task.arnNumber || '';
    setMonthlyTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, arnNumber, lastUpdated: 'Just now' } : t)));
    showToast(`${task.tradeName}: ${newStatus}`);
    addActivityLog(`Status set to ${newStatus}`, `${task.filingType} for ${task.period}${arnNumber && newStatus === 'Filed' ? ` · ARN ${arnNumber}` : ''}`, task.clientName, 'Filing');
    reportSave(await updateTaskStatusInDb(taskId, newStatus, arnNumber), 'Status change');
  };

  const handleUpdateITRStatus = async (id: string, newStatus: ITRStatus, ackNo?: string) => {
    const itr = itrFilings.find((i) => i.id === id);
    if (!itr) return;
    const acknowledgmentNo = newStatus === 'Filed & e-Verified' ? ackNo?.trim() || itr.acknowledgmentNo || '' : itr.acknowledgmentNo || '';
    setItrFilings((prev) => prev.map((i) => (i.id === id ? { ...i, status: newStatus, acknowledgmentNo, lastActivity: 'Just now' } : i)));
    showToast(`${itr.clientName}: ${newStatus}`);
    addActivityLog('ITR status updated', `${itr.itrForm} ${itr.assessmentYear} set to ${newStatus}`, itr.clientName, 'Filing');
    reportSave(await updateItrFilingStatusInDb(id, newStatus, acknowledgmentNo), 'ITR status');
  };

  const handleAddITR = async (newITR: Omit<ITRFiling, 'id' | 'lastActivity'>) => {
    const record: ITRFiling = { ...newITR, id: `itr-${Date.now()}`, lastActivity: 'Just now' };
    setItrFilings((prev) => [record, ...prev]);
    showToast(`ITR added for ${record.clientName}`);
    addActivityLog('ITR added', `${record.itrForm} for ${record.assessmentYear}, due ${record.dueDate}`, record.clientName, 'Filing');
    reportSave(await saveItrFilingToDb(record), 'ITR return');
  };

  const handleMarkGSTAsFiled = async (id: string, arn: string) => {
    const item = gstCompliance.find((i) => i.id === id);
    if (!item) return;
    setGstCompliance((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, priorityLevel: 'filed', filingStatus: 'Filed', arnNumber: arn, filedDate: new Date().toISOString().slice(0, 10), daysRemaining: 0 } : i
      )
    );
    showToast(`${item.returnType} filed for ${item.clientName}`);
    addActivityLog('Return filed', `${item.returnType} for ${item.filingMonth} · ARN ${arn}`, item.clientName, 'Filing');
    reportSave(await markGstFiledInDb(id, arn), 'Filing');
  };

  // ------------------------------------------------------- settings
  const handleAddConfigOption = async (categoryKey: string, newOption: string): Promise<boolean> => {
    const result = await savePracticeConfigOption(categoryKey, newOption);
    if (result.success) {
      setPracticeConfigs((prev) => ({ ...prev, [categoryKey]: result.options }));
      addActivityLog('List updated', `Added "${newOption}" to ${categoryKey.replace('_', ' ')}`, undefined, 'Task');
      return true;
    }
    showToast(result.error || 'Could not save the option', true);
    return false;
  };

  const handleRemoveConfigOption = async (categoryKey: string, optionToRemove: string): Promise<boolean> => {
    const result = await removePracticeConfigOption(categoryKey, optionToRemove);
    if (result.success) {
      setPracticeConfigs((prev) => ({ ...prev, [categoryKey]: result.options }));
      return true;
    }
    return false;
  };

  const handleSavePreferences = async (next: AppPreferences) => {
    setPreferences(next);
    setGstCompliance((prev) => prev.map((i) => withGstPriority(i, next.dueSoonDays)));
    const res = await savePreferences(next);
    reportSave(res, 'Preferences');
    if (!res.error) addActivityLog('Preferences updated', 'Changed firm preferences', undefined, 'Account');
    return res;
  };

  const handleSaveFirmProfile = async (next: FirmProfileSettings) => {
    setFirmProfile(next);
    const res = await saveStoredFirmProfile(next);
    reportSave(res, 'Firm details');
    return res;
  };

  const handleSaveTemplates = async (next: WhatsAppTemplateSettings) => {
    setTemplates(next);
    const res = await saveStoredWhatsAppTemplates(next);
    reportSave(res, 'Templates');
    return res;
  };

  // ------------------------------------------------------- clients & tasks
  const handleAddNewClient = async (newClient: Client) => {
    setClients((prev) => [newClient, ...prev]);
    showToast(`${newClient.tradeName} added`);
    addActivityLog('Client added', `${newClient.name} (${newClient.clientCode})`, newClient.name, 'Client');
    const res = await saveClientToDb(newClient);
    if (!res.success || res.error) showToast(`Client was not saved: ${res.error}`, true);
  };

  const handleAddTask = async (newTask: MonthlyTask) => {
    setMonthlyTasks((prev) => [newTask, ...prev]);
    showToast(`Task added for ${newTask.tradeName}`);
    addActivityLog('Task added', `${newTask.filingType} for ${newTask.period}`, newTask.clientName, 'Task');
    const res = await saveTaskToDb(newTask);
    if (!res.success || res.error) showToast(`Task was not saved: ${res.error}`, true);
  };

  // ------------------------------------------------------- delete / archive (administrators only)
  const activeClients = useMemo(() => clients.filter((c) => c.status !== 'Archived'), [clients]);

  const handleArchiveClient = async (id: string, archived: boolean) => {
    if (!isAdmin) return;
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    const status = archived ? 'Archived' : 'Active';
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    showToast(archived ? `${client.tradeName} archived` : `${client.tradeName} restored`);
    addActivityLog(archived ? 'Client archived' : 'Client restored', client.name, client.name, 'Client');
    reportSave(await updateClientInDb(id, { status }), 'Change');
  };

  const handleDeleteClient = async (id: string) => {
    if (!isAdmin) return;
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    const res = await deleteClientFromDb(id);
    if (res.error) return showToast(res.error, true);
    setClients((prev) => prev.filter((c) => c.id !== id));
    setMonthlyTasks((prev) => prev.filter((t) => t.clientId !== id));
    setItrFilings((prev) => prev.filter((i) => i.clientId !== id));
    showToast(`${client.tradeName} deleted`);
    addActivityLog('Client deleted', `${client.name} (${client.clientCode}) and its tasks and returns`, client.name, 'Client');
  };

  const handleDeleteTask = async (id: string) => {
    if (!isAdmin) return;
    const task = monthlyTasks.find((t) => t.id === id);
    const res = await deleteTaskFromDb(id);
    if (res.error) return showToast(res.error, true);
    setMonthlyTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Task deleted');
    addActivityLog('Task deleted', `${task?.filingType ?? ''} for ${task?.period ?? ''}`, task?.clientName, 'Task');
  };

  const handleDeleteITR = async (id: string) => {
    if (!isAdmin) return;
    const itr = itrFilings.find((i) => i.id === id);
    const res = await deleteItrFilingFromDb(id);
    if (res.error) return showToast(res.error, true);
    setItrFilings((prev) => prev.filter((i) => i.id !== id));
    showToast('Return deleted');
    addActivityLog('ITR deleted', `${itr?.itrForm ?? ''} ${itr?.assessmentYear ?? ''}`, itr?.clientName, 'Filing');
  };

  const handleDeleteTicket = async (id: string) => {
    if (!isAdmin) return;
    const ticket = tickets.find((t) => t.id === id);
    const res = await deleteTicketFromDb(id);
    if (res.error) return showToast(res.error, true);
    setTickets((prev) => prev.filter((t) => t.id !== id));
    showToast('Call deleted');
    addActivityLog('Call deleted', `${ticket?.ticketNo ?? ''} ${ticket?.subject ?? ''}`, ticket?.clientName, 'Client');
  };

  const handleDeleteDebtor = async (id: string) => {
    if (!isAdmin) return;
    const d = debtors.find((x) => x.id === id);
    const res = await deleteDebtorFromDb(id);
    if (res.error) return showToast(res.error, true);
    setDebtors((prev) => prev.filter((x) => x.id !== id));
    showToast(`${d?.clientName ?? 'Account'} removed from debtors`);
    addActivityLog('Debtor account deleted', `${d?.clientName ?? ''} (balance ₹${(d?.currentBalance ?? 0).toLocaleString('en-IN')})`, d?.clientName, 'Payment');
  };

  // ------------------------------------------------------- WhatsApp
  const openWhatsApp = (patch: {
    task?: MonthlyTask | null;
    itr?: ITRFiling | null;
    debtor?: DebtorRecord | null;
    ticket?: StaffTicket | null;
    gst?: GSTComplianceItem | null;
  }) => {
    setWhatsAppTask(patch.task ?? null);
    setWhatsAppITR(patch.itr ?? null);
    setWhatsAppDebtor(patch.debtor ?? null);
    setWhatsAppTicket(patch.ticket ?? null);
    setWhatsAppGST(patch.gst ?? null);
    setIsWhatsAppOpen(true);
  };

  // ------------------------------------------------------- calls
  const handleAddTicket = async (newTicket: StaffTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    showToast(`Call ${newTicket.ticketNo} logged`);
    addActivityLog('Call logged', `${newTicket.ticketNo}: ${newTicket.subject}`, newTicket.clientName, 'Client');
    reportSave(await saveTicketToDb(newTicket), 'Call');
  };

  const handleAssignTicket = async (ticketId: string, staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    const ticket = tickets.find((t) => t.id === ticketId);
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, assignedStaffId: staffId, assignedAt: 'Just now', status: t.status === 'Unassigned' ? 'In Progress' : t.status } : t))
    );
    showToast(`Assigned to ${staff?.name ?? 'staff'}`);
    addActivityLog('Call assigned', `${ticket?.subject ?? ''} → ${staff?.name ?? 'staff'}`, ticket?.clientName, 'Client');
    reportSave(await updateTicketInDb(ticketId, { assignedStaffId: staffId, assignedAt: new Date().toISOString(), status: 'In Progress' }), 'Assignment');
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: TicketStatus, notes?: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus, resolvedAt: newStatus === 'Resolved' ? 'Just now' : t.resolvedAt, resolutionNotes: notes || t.resolutionNotes } : t
      )
    );
    showToast(`${ticket?.ticketNo ?? 'Call'}: ${newStatus}`);
    addActivityLog(`Call ${newStatus.toLowerCase()}`, `${ticket?.ticketNo ?? ''}${notes ? ` — ${notes}` : ''}`, ticket?.clientName, 'Client');
    reportSave(
      await updateTicketInDb(ticketId, { status: newStatus, resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : undefined, resolutionNotes: notes }),
      'Call update'
    );
  };

  // ------------------------------------------------------- fees
  const handleRecordDebtorPayment = async (debtorId: string, amount: number) => {
    const record = debtors.find((d) => d.id === debtorId);
    if (!record) return;
    const updated = applyPayment(record, amount);
    setDebtors((prev) => prev.map((d) => (d.id === debtorId ? updated : d)));
    showToast(`₹${amount.toLocaleString('en-IN')} received from ${record.clientName}`);
    addActivityLog('Payment received', `₹${amount.toLocaleString('en-IN')} · balance now ₹${updated.currentBalance.toLocaleString('en-IN')}`, record.clientName, 'Payment');
    reportSave(await saveDebtorToDb(updated), 'Payment');
  };

  const handleAddDebtorBilling = async (debtorId: string, amount: number, description: string) => {
    const record = debtors.find((d) => d.id === debtorId);
    if (!record) return;
    const updated = applyBilling(record, amount);
    setDebtors((prev) => prev.map((d) => (d.id === debtorId ? updated : d)));

    const period = updated.months[updated.months.length - 1]?.month || currentMonthKey();
    const invoiceNumber = `${preferences.invoicePrefix}${String(preferences.nextInvoiceNumber).padStart(4, '0')}`;
    const entry: OfficeBillingEntry = {
      id: `bill-${Date.now()}`,
      serialNo: billings.filter((b) => b.period === period).length + 1,
      date: new Date().toISOString().slice(0, 10),
      clientName: record.clientName,
      natureOfService: description,
      professionalIncome: amount,
      oopExpenses: 0,
      user: currentUser?.name || '',
      billingStatus: 'Billed',
      invoiceNumber,
      period,
    };
    setBillings((prev) => [entry, ...prev]);
    handleSavePreferences({ ...preferences, nextInvoiceNumber: preferences.nextInvoiceNumber + 1 });
    showToast(`Invoice ${invoiceNumber} · ₹${amount.toLocaleString('en-IN')} billed to ${record.clientName}`);
    addActivityLog('Fee billed', `${invoiceNumber} · ₹${amount.toLocaleString('en-IN')} for ${description}`, record.clientName, 'Payment');
    const [a, b] = await Promise.all([saveDebtorToDb(updated), saveBillingToDb(entry)]);
    reportSave(a, 'Balance');
    reportSave(b, 'Invoice');
  };

  const handleAddDebtorAccount = async (newDebtor: DebtorRecord) => {
    setDebtors((prev) => [newDebtor, ...prev.filter((d) => d.id !== newDebtor.id && d.clientName.toLowerCase() !== newDebtor.clientName.toLowerCase())]);
    showToast(`${newDebtor.clientName} added to debtors`);
    addActivityLog('Debtor added', `${newDebtor.clientName} (opening balance ₹${newDebtor.currentBalance.toLocaleString('en-IN')})`, newDebtor.clientName, 'Payment');
    const res = await saveDebtorToDb(newDebtor);
    if (res.error) showToast(`Debtor was not saved: ${res.error}`, true);
  };

  const handleImportDebtors = async (result: DebtorWorkbookResult): Promise<{ error?: string }> => {
    const res = await importDebtorWorkbookToDb(result.records, result.billings);
    if (res.error) return { error: res.error };
    setDebtors(res.debtors);
    setBillings(res.billings);
    showToast(`Imported ${result.records.length} accounts and ${result.billings.length} billing entries`);
    addActivityLog('Debtors imported', `${result.records.length} accounts, ${result.billings.length} billing entries from Excel`, undefined, 'Payment');
    return {};
  };

  const handleSelectClient = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setSelectedClient(found);
      setIsDrawerOpen(true);
    }
  };

  // ======================================================= render gates
  if (!authReady) return <FullScreenMessage title="Loading…" />;

  if (recoveryMode) {
    return <SetNewPasswordView theme={theme} onToggleTheme={toggleTheme} onDone={() => setRecoveryMode(false)} />;
  }

  if (!LOCAL_MODE && !session) {
    return <LoginView theme={theme} onToggleTheme={toggleTheme} />;
  }

  if (!LOCAL_MODE && dataState !== 'ready') {
    return dataState === 'error' ? (
      <FullScreenMessage title="Could not load data" description="Check your connection and try again." action={<Button onClick={loadAll}>Retry</Button>} />
    ) : (
      <FullScreenMessage title="Loading…" />
    );
  }

  if (!currentUser || currentUser.status !== 'Active') {
    return (
      <FullScreenMessage
        title="Your account is not active"
        description="Ask Shameer or Ameen to activate your login, then sign in again."
        action={<Button onClick={handleLogout}>Sign Out</Button>}
      />
    );
  }

  const activeStaffFilter = selectedStaffId ? staffList.find((s) => s.id === selectedStaffId) : null;
  const gstOverdueCount = gstCompliance.filter((i) => i.priorityLevel === 'overdue').length;
  const restricted = (text: string) => (
    <Card className="max-w-md mx-auto mt-10">
      <EmptyState icon={ShieldAlert} title="Restricted" description={text} />
    </Card>
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-canvas text-fg">
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[60] max-w-md bg-ink text-ink-fg pl-3 pr-4 py-2.5 rounded-lg shadow-dialog flex items-center gap-2.5 text-sm font-medium animate-toast-in"
        >
          {toast.error ? <AlertCircle className="w-4 h-4 text-danger shrink-0" strokeWidth={2} /> : <Check className="w-4 h-4 text-success shrink-0" strokeWidth={2} />}
          <span>{toast.message}</span>
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        staffList={staffList}
        currentUser={currentUser}
        canViewFees={canViewFees}
        monthlyTaskCount={monthlyTasks.length}
        itrCount={itrFilings.length}
        totalClientsCount={activeClients.length}
        debtorsCount={debtors.filter((d) => d.currentBalance > 0).length}
        gstOverdueCount={gstOverdueCount}
        unassignedTicketsCount={tickets.filter((t) => t.status === 'Unassigned').length}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onChangePassword={() => setIsChangePasswordOpen(true)}
          canChangePassword={!LOCAL_MODE}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenNewTask={() => setIsNewTaskOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-7 space-y-6">
            {LOCAL_MODE && (
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-warning/30 text-sm text-fg-muted">
                <AlertCircle className="w-4 h-4 text-warning" strokeWidth={1.75} />
                Sample data — no database is configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
              </div>
            )}

            {activeStaffFilter && (
              <div className="flex items-center justify-between gap-3 h-10 pl-2 pr-1.5 rounded-lg border border-line bg-surface text-sm shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar initials={activeStaffFilter.initials} size="xs" />
                  <span className="text-fg-subtle">Showing work for</span>
                  <span className="font-medium text-fg truncate">{activeStaffFilter.name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedStaffId(null)}>
                  Clear Filter
                </Button>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <OverviewStats
                  currentUser={currentUser}
                  totalClients={activeClients.length}
                  monthlyTasks={monthlyTasks}
                  itrFilings={itrFilings}
                  debtors={canViewFees ? debtors : []}
                  showFees={canViewFees}
                  staffList={staffList}
                  financialYear={preferences.financialYear}
                  dueSoonDays={preferences.dueSoonDays}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onFilterStaff={(staffId) => setSelectedStaffId(staffId)}
                />
                <ComplianceTaskManager
                  tasks={monthlyTasks}
                  staffList={staffList}
                  selectedStaffId={selectedStaffId}
                  filingTypes={practiceConfigs.filing_types}
                  dueSoonDays={preferences.dueSoonDays}
                  onUpdateStatus={handleUpdateMonthlyStatus}
                  onDelete={isAdmin ? handleDeleteTask : undefined}
                  onOpenWhatsApp={(task) => openWhatsApp({ task })}
                  onSelectClient={handleSelectClient}
                />
              </div>
            )}

            {activeTab === 'gst-tracker' && (
              <GSTComplianceTracker
                complianceItems={gstCompliance}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                returnTypes={practiceConfigs.return_types}
                onOpenWhatsApp={(gst) => openWhatsApp({ gst })}
                onMarkAsFiled={handleMarkGSTAsFiled}
                onExport={canViewFees ? { debtors, billings } : undefined}
              />
            )}

            {activeTab === 'monthly' && (
              <ComplianceTaskManager
                tasks={monthlyTasks}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                filingTypes={practiceConfigs.filing_types}
                dueSoonDays={preferences.dueSoonDays}
                onUpdateStatus={handleUpdateMonthlyStatus}
                onDelete={isAdmin ? handleDeleteTask : undefined}
                onOpenWhatsApp={(task) => openWhatsApp({ task })}
                onSelectClient={handleSelectClient}
              />
            )}

            {activeTab === 'itr' && (
              <ITRFilingsManager
                itrFilings={itrFilings}
                staffList={staffList}
                clients={activeClients}
                selectedStaffId={selectedStaffId}
                assessmentYear={`AY ${preferences.financialYear}`}
                dueSoonDays={preferences.itrDueSoonDays}
                onOpenWhatsApp={(itr) => openWhatsApp({ itr })}
                onSelectClient={handleSelectClient}
                onUpdateITRStatus={handleUpdateITRStatus}
                onAddITR={handleAddITR}
                onDelete={isAdmin ? handleDeleteITR : undefined}
              />
            )}

            {activeTab === 'clients' && (
              <ClientDirectory
                clients={clients}
                staffList={staffList}
                isAdmin={isAdmin}
                entityTypes={practiceConfigs.entity_types}
                onAddClient={handleAddNewClient}
                onArchive={isAdmin ? handleArchiveClient : undefined}
                onDelete={isAdmin ? handleDeleteClient : undefined}
                onSelectClient={handleSelectClient}
                onOpenWhatsAppForClient={(c) => {
                  const task = monthlyTasks.find((t) => t.clientId === c.id);
                  if (task) openWhatsApp({ task });
                  else showToast(`No open filing for ${c.tradeName} to message about`);
                }}
              />
            )}

            {activeTab === 'debtors' &&
              (canViewFees ? (
                <DebtorsManager
                  debtors={debtors}
                  billings={billings}
                  staffList={staffList}
                  selectedStaffId={selectedStaffId}
                  clients={clients}
                  canEdit={canEditFees}
                  canImport={isAdmin}
                  gstCompliance={gstCompliance}
                  onOpenWhatsApp={(debtor) => openWhatsApp({ debtor })}
                  onRecordPayment={handleRecordDebtorPayment}
                  onAddBilling={handleAddDebtorBilling}
                  onAddAccount={canEditFees ? handleAddDebtorAccount : undefined}
                  onDelete={isAdmin ? handleDeleteDebtor : undefined}
                  onImport={handleImportDebtors}
                />
              ) : (
                restricted('Fee accounts are visible to administrators and staff given fee access.')
              ))}

            {activeTab === 'staff' && (
              <div className="space-y-6">
                <StaffTicketDesk
                  tickets={tickets}
                  staffList={staffList}
                  selectedStaffId={selectedStaffId}
                  onAssignToStaff={handleAssignTicket}
                  onUpdateStatus={handleUpdateTicketStatus}
                  onDelete={isAdmin ? handleDeleteTicket : undefined}
                  onOpenNewTicketModal={() => setIsNewTicketOpen(true)}
                  onOpenWhatsAppForTicket={(ticket) => openWhatsApp({ ticket })}
                  onSelectClient={handleSelectClient}
                />
                <StaffWorkloadView
                  staffList={staffList}
                  tasks={monthlyTasks}
                  onSelectStaff={(id) => {
                    setSelectedStaffId(id);
                    setActiveTab('monthly');
                  }}
                />
              </div>
            )}

            {activeTab === 'employees' &&
              (isAdmin ? (
                <EmployeeManagement
                  currentUser={currentUser}
                  profiles={profilesWithCounts}
                  preferences={preferences}
                  onAddEmployee={handleAddEmployee}
                  onToggleStatus={handleToggleEmployeeStatus}
                  onUpdateEmployee={handleUpdateEmployee}
                  onSetPassword={handleSetEmployeePassword}
                  onSelectEmployeeWork={(name) => {
                    const staff = staffList.find((s) => s.name === name);
                    if (staff) {
                      setSelectedStaffId(staff.id);
                      setActiveTab('monthly');
                    }
                  }}
                />
              ) : (
                restricted('Team management is available to administrators only.')
              ))}

            {activeTab === 'activity' && (isAdmin ? <ActivityHistory logs={activityLogs} /> : restricted('The audit trail is available to administrators only.'))}

            {activeTab === 'settings' &&
              (isAdmin ? (
                <div className="space-y-6">
                  <PageHeader title="Settings" description="Firm details, preferences, lists, message templates and backup." />
                  <PracticeConfigManager
                    configs={practiceConfigs}
                    onAddOption={handleAddConfigOption}
                    onRemoveOption={handleRemoveConfigOption}
                    preferences={preferences}
                    onSavePreferences={handleSavePreferences}
                    firmProfile={firmProfile}
                    onSaveFirmProfile={handleSaveFirmProfile}
                    whatsappTemplates={templates}
                    onSaveWhatsAppTemplates={handleSaveTemplates}
                    palette={palette}
                    onSelectPalette={setPalette}
                    clients={clients}
                    monthlyTasks={monthlyTasks}
                    itrFilings={itrFilings}
                    debtors={debtors}
                    billings={billings}
                    gstReturns={gstCompliance}
                    profiles={profiles}
                    tickets={tickets}
                    activityLogs={activityLogs}
                  />
                </div>
              ) : (
                restricted('Settings are available to administrators only.')
              ))}
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        clients={clients}
        currentUser={currentUser}
        canViewFees={canViewFees}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsCommandPaletteOpen(false);
        }}
        onSelectClient={handleSelectClient}
        onOpenNewTask={() => setIsNewTaskOpen(true)}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        task={whatsAppTask}
        itrFiling={whatsAppITR}
        debtor={whatsAppDebtor}
        ticket={whatsAppTicket}
        gstItem={whatsAppGST}
        staffName={currentUser.name}
        customTemplates={templates}
        firmProfile={firmProfile}
        countryCode={preferences.whatsappCountryCode}
      />

      <ClientDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        client={selectedClient}
        task={selectedClient ? monthlyTasks.find((t) => t.clientId === selectedClient.id) : null}
        itrFiling={selectedClient ? itrFilings.find((i) => i.clientId === selectedClient.id || i.clientName === selectedClient.name) : null}
        debtor={selectedClient && canViewFees ? debtors.find((d) => d.clientName.toLowerCase() === selectedClient.name.toLowerCase()) : null}
        staff={selectedClient ? staffList.find((s) => s.id === selectedClient.assignedStaffId) : null}
        tickets={tickets}
        staffList={staffList}
        onOpenWhatsApp={(item) => {
          setIsDrawerOpen(false);
          openWhatsApp({ task: item });
        }}
      />

      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        clients={activeClients}
        staffList={staffList}
        filingTypes={practiceConfigs.filing_types}
        onAddTask={handleAddTask}
      />

      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        clients={activeClients}
        staffList={staffList}
        onAddTicket={handleAddTicket}
        currentStaffId={currentUser.id}
      />

      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} email={currentUser.email} onChanged={() => showToast('Password changed')} />
    </div>
  );
}

function FullScreenMessage({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-canvas px-6">
      <div className="text-center max-w-sm">
        <p className="text-md font-medium text-fg">{title}</p>
        {description && <p className="text-sm text-fg-subtle mt-1">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export default App;
