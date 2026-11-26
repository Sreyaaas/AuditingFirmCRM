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
import { NewClientModal } from './components/NewClientModal';
import { CommandPalette } from './components/CommandPalette';
import { LoginView, SetNewPasswordView } from './components/LoginView';
import { PracticeConfigManager } from './components/PracticeConfigManager';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { InvoiceGeneratorModal, InvoiceLineItem } from './components/InvoiceGeneratorModal';
import { InvoicesManager } from './components/InvoicesManager';
import { OtherAssignmentsManager } from './components/OtherAssignmentsManager';
import { MasterDataManager } from './components/MasterDataManager';
import { MasterDataCategory, MasterDataRecord, TaskCategory } from './types/crm';
import { Avatar, Button, Card, EmptyState, PageHeader } from './components/ui';
import { sendToGroup } from './utils/whatsapp';

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
  deleteBillingFromDb,
  fetchGstReturnsFromDb,
  markGstFiledInDb,
  withGstPriority,
  fetchTicketsFromDb,
  saveTicketToDb,
  updateTicketInDb,
  fetchActivityLogsFromDb,
  saveActivityLogToDb,
  pruneOldActivityLogsInDb,
  fetchMasterDataFromDb,
  saveMasterDataRecordToDb,
  bulkSaveMasterDataToDb,
  deleteMasterDataRecordFromDb,
  clearLocalDataCache,
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
import { applyBilling, applyPayment, autoAdvanceDebtorsToIST, currentMonthKey, monthLabel, nextMonthKey, startMonth } from './utils/debtors';
import { autoAdvanceMasterDataToIST, getValuesForPeriod, isVisibleInPeriod, startNextMasterPeriod } from './utils/masterData';
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

/** Sample records are used only when no database is configured (local preview). */
const LOCAL_MODE = !isSupabaseConfigured();
const seed = <T,>(sample: T[]): T[] => (LOCAL_MODE ? sample : []);

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // ---------------------------------------------------------------- theme
  const [activeTheme, setActiveTheme] = useState<string>(() => localStorage.getItem('crm-active-theme') || 'navy-light');
  // Section colours and coloured avatars; per device, like the theme.
  const [colourAccents, setColourAccents] = useState<boolean>(() => localStorage.getItem('crm-colour-accents') !== 'off');
  useEffect(() => {
    document.documentElement.setAttribute('data-accents', colourAccents ? 'on' : 'off');
    localStorage.setItem('crm-colour-accents', colourAccents ? 'on' : 'off');
  }, [colourAccents]);
  const isDark = activeTheme.endsWith('-dark');
  const theme: 'light' | 'dark' = isDark ? 'dark' : 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', activeTheme);
    // Sync dark class for logo swapping (dark vs light logo)
    root.classList.toggle('dark', isDark);
    localStorage.setItem('crm-active-theme', activeTheme);
  }, [activeTheme, isDark]);

  const toggleTheme = () => {
    const base = activeTheme.replace(/-(light|dark)$/, '');
    const target = isDark ? `${base}-light` : `${base}-dark`;
    setActiveTheme(target);
  };

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
  const [initialTaskCategory, setInitialTaskCategory] = useState<TaskCategory>('monthly');
  const [initialTaskService, setInitialTaskService] = useState<string | undefined>(undefined);
  const [isCategoryLocked, setIsCategoryLocked] = useState(false);
  const [activeMonthlyServiceTab, setActiveMonthlyServiceTab] = useState<string>('All');
  const [activeQuarterlyServiceTab, setActiveQuarterlyServiceTab] = useState<string>('All');
  const [activeAnnualPillarTab, setActiveAnnualPillarTab] = useState<string>('All');
  const [activeAnnualSubTab, setActiveAnnualSubTab] = useState<string>('All');

  const handleOpenNewTaskWithService = (category: TaskCategory, service?: string, lock = true) => {
    setInitialTaskCategory(category);
    setInitialTaskService(service);
    setIsCategoryLocked(lock);
    setIsNewTaskOpen(true);
  };

  const handleSelectTabWithService = (tabId: string, serviceName: string) => {
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);

    if (tabId === 'monthly') {
      const s = serviceName.toLowerCase();
      if (s.includes('gst')) setActiveMonthlyServiceTab('GST');
      else if (s.includes('tds')) setActiveMonthlyServiceTab('TDS Payment');
      else if (s.includes('pf')) setActiveMonthlyServiceTab('PF Filing');
      else if (s.includes('esi')) setActiveMonthlyServiceTab('ESI Filing');
      else if (s.includes('accounting') || s.includes('bookkeeping')) setActiveMonthlyServiceTab('Accounting and Bookkeeping');
      else if (s.includes('mis')) setActiveMonthlyServiceTab('Monthly MIS Report');
      else setActiveMonthlyServiceTab('All');
    } else if (tabId === 'quarterly') {
      const s = serviceName.toLowerCase();
      if (s.includes('gst') || s.includes('cmp') || s.includes('qrmp')) setActiveQuarterlyServiceTab('GST (QRMP / CMP-08)');
      else if (s.includes('tds')) setActiveQuarterlyServiceTab('TDS (24Q / 26Q / 27Q)');
      else setActiveQuarterlyServiceTab('All');
    } else if (tabId === 'itr') {
      const s = serviceName.toLowerCase();
      if (s.includes('itr - individual')) {
        setActiveAnnualPillarTab('Income Tax Return');
        setActiveAnnualSubTab('Individual');
      } else if (s.includes('itr - business')) {
        setActiveAnnualPillarTab('Income Tax Return');
        setActiveAnnualSubTab('Business');
      } else if (s.includes('itr - tax audit')) {
        setActiveAnnualPillarTab('Income Tax Return');
        setActiveAnnualSubTab('Tax Audit');
      } else if (s.includes('itr - company')) {
        setActiveAnnualPillarTab('Income Tax Return');
        setActiveAnnualSubTab('Company');
      } else if (s.includes('tax audit')) {
        setActiveAnnualPillarTab('Audit');
        setActiveAnnualSubTab('Tax Audit');
      } else if (s.includes('statutory audit')) {
        setActiveAnnualPillarTab('Audit');
        setActiveAnnualSubTab('Statutory Audit');
      } else if (s.includes('gstr-9c')) {
        setActiveAnnualPillarTab('Audit');
        setActiveAnnualSubTab('GSTR-9C');
      } else if (s.includes('gstr-9')) {
        setActiveAnnualPillarTab('Audit');
        setActiveAnnualSubTab('GSTR-9');
      } else if (s.includes('aoc') || s.includes('mgt')) {
        setActiveAnnualPillarTab('ROC Compliance');
        setActiveAnnualSubTab('AOC 4 & MGT 7/7A');
      } else if (s.includes('dpt')) {
        setActiveAnnualPillarTab('ROC Compliance');
        setActiveAnnualSubTab('DPT-3');
      } else {
        setActiveAnnualPillarTab('All');
        setActiveAnnualSubTab('All');
      }
    }
  };

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
  const [masterData, setMasterData] = useState<MasterDataRecord[]>([]);
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
      const [cfg, cl, tk, pr, itr, deb, bil, gst, tix, logs, settings, md] = await Promise.all([
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
        fetchMasterDataFromDb(),
      ]);
      const debRollover = autoAdvanceDebtorsToIST(deb);
      const mdRollover = autoAdvanceMasterDataToIST(md);

      setPracticeConfigs(cfg);
      setClients(cl);
      setMonthlyTasks(tk);
      setProfiles(pr);
      setItrFilings(itr);
      setDebtors(debRollover.updated);
      setBillings(bil);
      setGstCompliance(gst.map((i) => withGstPriority(i, settings.preferences.dueSoonDays)));
      setTickets(tix);
      setActivityLogs(logs);
      setMasterData(mdRollover.updated);
      setPreferences(settings.preferences);
      setFirmProfile(settings.firmProfile);
      setTemplates(settings.templates);
      setDataState('ready');

      // Persist automatic IST month/year rollovers in the background
      if (debRollover.changed.length > 0) {
        Promise.all(debRollover.changed.map((d) => saveDebtorToDb(d))).catch(() => {});
      }
      if (mdRollover.changed.length > 0) {
        bulkSaveMasterDataToDb(mdRollover.changed).catch(() => {});
      }
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

  const monthlyWorkTasks = useMemo(
    () => monthlyTasks.filter((t) => !t.category || t.category === 'monthly' || t.category === 'weekly'),
    [monthlyTasks]
  );
  const quarterlyTasks = useMemo(
    () => monthlyTasks.filter((t) => t.category === 'quarterly'),
    [monthlyTasks]
  );
  const otherAssignmentTasks = useMemo(
    () => monthlyTasks.filter((t) => t.category === 'other'),
    [monthlyTasks]
  );
  const annualTasks = useMemo(
    () => monthlyTasks.filter((t) => t.category === 'annual'),
    [monthlyTasks]
  );

  const mappedAnnualTasksToITR: ITRFiling[] = useMemo(() => {
    return annualTasks.map((t) => {
      const client = clients.find((c) => c.id === t.clientId);
      let status: ITRStatus = 'Draft Computation';
      if (t.status === 'Filed') status = 'Filed & e-Verified';
      else if (t.status === 'Docs Pending') status = 'Docs Pending';
      else if (t.status === 'Draft Ready') status = 'Client Confirmed';
      else if (t.status === 'In Progress') status = 'Draft Computation';

      return {
        id: t.id,
        clientId: t.clientId,
        clientName: t.clientName,
        pan: t.gstin ? (t.gstin.length >= 12 ? t.gstin.slice(2, 12) : t.gstin) : (client?.pan || 'PAN PENDING'),
        entityType: client?.entityType || 'Private Limited',
        itrForm: (t.filingType as any) || 'ITR-6',
        assessmentYear: t.financialYear ? `AY ${t.financialYear}` : (t.period.startsWith('AY') ? t.period : `AY 2026-27`),
        financialYear: t.period.startsWith('FY') ? t.period : (t.financialYear ? `FY ${t.financialYear}` : 'FY 2025-26'),
        assignedStaffId: t.assignedStaffId,
        status,
        dueDate: t.dueDate,
        regime: 'New Regime (115BAC)',
        taxLiabilityOrRefund: t.taxPayable || 0,
        acknowledgmentNo: t.arnNumber || undefined,
        lastActivity: t.lastUpdated || 'Recently added',
        phone: t.phone || client?.phone || '',
      };
    });
  }, [annualTasks, clients]);

  const combinedAnnualFilings = useMemo(() => {
    const taskIds = new Set(mappedAnnualTasksToITR.map((t) => t.id));
    return [...mappedAnnualTasksToITR, ...itrFilings.filter((i) => !taskIds.has(i.id))];
  }, [mappedAnnualTasksToITR, itrFilings]);

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
          assignedITRCount: combinedAnnualFilings.filter((i) => i.assignedStaffId === p.id).length,
          completedThisMonth: monthlyTasks.filter((t) => t.assignedStaffId === p.id && t.status === 'Filed').length,
        })),
    [profiles, monthlyTasks, combinedAnnualFilings]
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
  const [whatsAppClient, setWhatsAppClient] = useState<Client | null>(null);
  const [whatsAppTask, setWhatsAppTask] = useState<MonthlyTask | null>(null);
  const [whatsAppITR, setWhatsAppITR] = useState<ITRFiling | null>(null);
  const [whatsAppDebtor, setWhatsAppDebtor] = useState<DebtorRecord | null>(null);
  const [whatsAppTicket, setWhatsAppTicket] = useState<StaffTicket | null>(null);
  const [whatsAppGST, setWhatsAppGST] = useState<GSTComplianceItem | null>(null);
  const [whatsAppInitialPhone, setWhatsAppInitialPhone] = useState<string | undefined>(undefined);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalTarget, setInvoiceModalTarget] = useState<Client | DebtorRecord | null>(null);
  const [invoicePrefillBilling, setInvoicePrefillBilling] = useState<OfficeBillingEntry | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
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
    if (!LOCAL_MODE) clearLocalDataCache();
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
    const task = monthlyTasks.find((t) => t.id === id);
    if (task) {
      let filingStatus: FilingStatus = 'In Progress';
      if (newStatus === 'Filed & e-Verified') filingStatus = 'Filed';
      else if (newStatus === 'Docs Pending') filingStatus = 'Docs Pending';
      else if (newStatus === 'Client Confirmed') filingStatus = 'Draft Ready';
      else if (newStatus === 'Draft Computation') filingStatus = 'In Progress';
      return handleUpdateMonthlyStatus(id, filingStatus, ackNo);
    }
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

  const handleUpdateClient = async (updatedClient: Client) => {
    setClients((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    setSelectedClient((prev) => (prev && prev.id === updatedClient.id ? updatedClient : prev));
    showToast(`${updatedClient.tradeName} updated`);
    addActivityLog('Client updated', `${updatedClient.name} (${updatedClient.clientCode}) details updated`, updatedClient.name, 'Client');
    const res = await saveClientToDb(updatedClient);
    if (!res.success || res.error) showToast(`Client updates not saved: ${res.error}`, true);
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
    const task = monthlyTasks.find((t) => t.id === id);
    if (task) {
      return handleDeleteTask(id);
    }
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
    client?: Client | null;
    task?: MonthlyTask | null;
    itr?: ITRFiling | null;
    debtor?: DebtorRecord | null;
    ticket?: StaffTicket | null;
    gst?: GSTComplianceItem | null;
    initialPhone?: string;
  }) => {
    setWhatsAppClient(patch.client ?? null);
    setWhatsAppTask(patch.task ?? null);
    setWhatsAppITR(patch.itr ?? null);
    setWhatsAppDebtor(patch.debtor ?? null);
    setWhatsAppTicket(patch.ticket ?? null);
    setWhatsAppGST(patch.gst ?? null);
    setWhatsAppInitialPhone(patch.initialPhone);
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
  const handleRecordDebtorPayment = async (
    debtorId: string,
    amount: number,
    mode?: string,
    reference?: string,
    bankAccount?: string
  ) => {
    const record = debtors.find((d) => d.id === debtorId);
    if (!record) return;
    const updated = applyPayment(record, amount);
    setDebtors((prev) => prev.map((d) => (d.id === debtorId ? updated : d)));
    const bankDesc = bankAccount ? ` into ${bankAccount}` : '';
    const refDesc = reference ? ` (Ref: ${reference})` : '';
    showToast(`₹${amount.toLocaleString('en-IN')} received from ${record.clientName}${bankDesc}`);
    addActivityLog(
      'Payment received',
      `₹${amount.toLocaleString('en-IN')} via ${mode || 'Payment'}${bankDesc}${refDesc} · balance now ₹${updated.currentBalance.toLocaleString('en-IN')}`,
      record.clientName,
      'Payment'
    );
    reportSave(await saveDebtorToDb(updated), 'Payment');
  };

  const handleRecordBilling = async (billingData: {
    debtorId?: string;
    clientId?: string;
    clientName: string;
    amount: number;
    oopExpenses?: number;
    advanceReceived?: number;
    description: string;
    lineItems?: InvoiceLineItem[];
    invoiceNumber?: string;
    date?: string;
    oneDriveSynced?: boolean;
    oneDriveUrl?: string;
  }) => {
    const totalAmount = billingData.amount + (billingData.oopExpenses || 0);
    const invoiceNumber =
      billingData.invoiceNumber ||
      `${preferences.invoicePrefix}${String(preferences.nextInvoiceNumber).padStart(4, '0')}`;
    const date = billingData.date || new Date().toISOString().slice(0, 10);
    const period = date.slice(0, 7) || currentMonthKey();

    // Check if updating an existing invoice
    const existingIndex = billings.findIndex(
      (b) => (billingData.invoiceNumber && b.invoiceNumber === billingData.invoiceNumber) || (b.id && (billingData as any).id && b.id === (billingData as any).id)
    );

    let savedEntry: OfficeBillingEntry;

    if (existingIndex >= 0) {
      const existing = billings[existingIndex];
      savedEntry = {
        ...existing,
        clientName: billingData.clientName,
        natureOfService: billingData.description,
        professionalIncome: billingData.amount,
        oopExpenses: billingData.oopExpenses || 0,
        advanceReceived: billingData.advanceReceived ?? existing.advanceReceived,
        date,
        period,
        lineItems: billingData.lineItems || existing.lineItems,
        oneDriveSynced: billingData.oneDriveSynced ?? existing.oneDriveSynced,
        oneDriveUrl: billingData.oneDriveUrl ?? existing.oneDriveUrl,
        oneDriveSyncedAt: billingData.oneDriveSynced ? new Date().toISOString() : existing.oneDriveSyncedAt,
      };
      setBillings((prev) => prev.map((b, i) => (i === existingIndex ? savedEntry : b)));
      showToast(`Invoice ${invoiceNumber} updated`);
    } else {
      savedEntry = {
        id: `bill-${Date.now()}`,
        serialNo: billings.filter((b) => b.period === period).length + 1,
        date,
        clientName: billingData.clientName,
        natureOfService: billingData.description,
        professionalIncome: billingData.amount,
        oopExpenses: billingData.oopExpenses || 0,
        advanceReceived: billingData.advanceReceived || 0,
        user: currentUser?.name || 'Ameen',
        billingStatus: 'Billed',
        invoiceNumber,
        period,
        lineItems: billingData.lineItems,
        oneDriveSynced: !!billingData.oneDriveSynced,
        oneDriveUrl: billingData.oneDriveUrl || undefined,
        oneDriveSyncedAt: billingData.oneDriveSynced ? new Date().toISOString() : undefined,
      };
      setBillings((prev) => [savedEntry, ...prev]);

      if (!billingData.invoiceNumber || billingData.invoiceNumber === `${preferences.invoicePrefix}${String(preferences.nextInvoiceNumber).padStart(4, '0')}`) {
        handleSavePreferences({ ...preferences, nextInvoiceNumber: preferences.nextInvoiceNumber + 1 });
      }
      showToast(`Invoice ${invoiceNumber} · ₹${totalAmount.toLocaleString('en-IN')} billed to ${billingData.clientName}`);
      addActivityLog('Fee billed', `${invoiceNumber} · ₹${totalAmount.toLocaleString('en-IN')} for ${billingData.description}`, billingData.clientName, 'Payment');
    }

    // Always persist invoice unconditionally to database!
    const bRes = await saveBillingToDb(savedEntry);
    reportSave(bRes, 'Invoice');

    // If debtor account exists or matches, update ledger balance
    const matchedDebtor =
      (billingData.debtorId && debtors.find((d) => d.id === billingData.debtorId)) ||
      debtors.find((d) => d.clientName.toLowerCase() === billingData.clientName.trim().toLowerCase());

    if (matchedDebtor) {
      const updatedDebtor = applyBilling(matchedDebtor, totalAmount);
      setDebtors((prev) => prev.map((d) => (d.id === matchedDebtor.id ? updatedDebtor : d)));
      const dRes = await saveDebtorToDb(updatedDebtor);
      reportSave(dRes, 'Balance');
    }
  };

  const handleAddDebtorBilling = async (
    debtorId: string,
    amount: number,
    description: string,
    oopExpenses = 0,
    invoiceNoOverride?: string,
    oneDriveSynced?: boolean,
    oneDriveUrl?: string,
    lineItems?: InvoiceLineItem[]
  ) => {
    const record = debtors.find((d) => d.id === debtorId);
    await handleRecordBilling({
      debtorId,
      clientName: record ? record.clientName : 'Client',
      amount,
      description,
      oopExpenses,
      invoiceNumber: invoiceNoOverride,
      oneDriveSynced,
      oneDriveUrl,
      lineItems,
    });
  };

  const handleDeleteBilling = async (idOrInvoiceNo: string) => {
    setBillings((prev) => prev.filter((b) => b.id !== idOrInvoiceNo && b.invoiceNumber !== idOrInvoiceNo));
    showToast('Invoice deleted');
    addActivityLog('Invoice deleted', `Invoice ${idOrInvoiceNo} removed`, undefined, 'Payment');
    const res = await deleteBillingFromDb(idOrInvoiceNo);
    reportSave(res, 'Invoice deletion');
  };

  const handleAddDebtorAccount = async (newDebtor: DebtorRecord) => {
    setDebtors((prev) => [newDebtor, ...prev.filter((d) => d.id !== newDebtor.id && d.clientName.toLowerCase() !== newDebtor.clientName.toLowerCase())]);
    showToast(`${newDebtor.clientName} added to debtors`);
    addActivityLog('Debtor added', `${newDebtor.clientName} (opening balance ₹${newDebtor.currentBalance.toLocaleString('en-IN')})`, newDebtor.clientName, 'Payment');
    const res = await saveDebtorToDb(newDebtor);
    if (res.error) return showToast(`Debtor was not saved: ${res.error}`, true);
    if (!LOCAL_MODE) setDebtors(await fetchDebtorsFromDb());
  };

  const handleStartDebtorMonth = async (key: string): Promise<{ error?: string }> => {
    if (!isAdmin) return { error: 'Only administrators can start a new month.' };
    const rolled = startMonth(debtors, key);
    const res = await importDebtorWorkbookToDb(rolled, []);
    if (res.error) return { error: res.error };
    setDebtors(res.debtors);
    showToast(`${monthLabel(key)} started for ${rolled.length} accounts`);
    addActivityLog('Debtor month started', `${monthLabel(key)} opened for ${rolled.length} accounts, balances carried forward`, undefined, 'Payment');
    return {};
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
        selectedStaffId={selectedStaffId}
        setSelectedStaffId={setSelectedStaffId}
        canViewFees={canViewFees}
        monthlyTaskCount={monthlyWorkTasks.length}
        quarterlyTaskCount={quarterlyTasks.length}
        itrCount={combinedAnnualFilings.length}
        otherAssignmentsCount={otherAssignmentTasks.length}
        totalClientsCount={activeClients.length}
        debtorsCount={debtors.filter((d) => d.currentBalance > 0).length}
        invoicesCount={billings.length}
        gstOverdueCount={gstOverdueCount}
        unassignedTicketsCount={tickets.filter((t) => t.status === 'Unassigned').length}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenNewTaskWithService={handleOpenNewTaskWithService}
        onSelectTabWithService={handleSelectTabWithService}
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
          activeTheme={activeTheme}
          onSelectTheme={setActiveTheme}
          colourAccents={colourAccents}
          onToggleColourAccents={setColourAccents}
          onOpenNewTask={() => {
            setInitialTaskCategory('monthly');
            setInitialTaskService(undefined);
            setIsCategoryLocked(false);
            setIsNewTaskOpen(true);
          }}
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
                  <Avatar initials={activeStaffFilter.initials} seed={activeStaffFilter.name} size="xs" />
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
                  itrFilings={combinedAnnualFilings}
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
                tasks={monthlyWorkTasks}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                section="monthly"
                title="Monthly Compliance"
                description={`${monthlyWorkTasks.length} tasks · Monthly GST, TDS and payroll returns`}
                serviceTabs={['All', 'GST', 'TDS Payment', 'PF Filing', 'ESI Filing', 'Accounting and Bookkeeping', 'Monthly MIS Report']}
                activeServiceTab={activeMonthlyServiceTab}
                onServiceTabChange={setActiveMonthlyServiceTab}
                filingTypes={practiceConfigs.filing_types}
                dueSoonDays={preferences.dueSoonDays}
                onUpdateStatus={handleUpdateMonthlyStatus}
                onDelete={isAdmin ? handleDeleteTask : undefined}
                onOpenWhatsApp={(task) => openWhatsApp({ task })}
                onSelectClient={handleSelectClient}
                onAddNewTask={(service) => handleOpenNewTaskWithService('monthly', service, true)}
                dueDayConfig={{
                  gstr1: preferences.gstr1DueDay ?? 11,
                  gstr3b: preferences.gstr3bDueDay ?? 20,
                  tds: preferences.tdsDueDay ?? 7,
                }}
                onGenerateMonthTasks={async ({ period, includeGstr1, includeGstr3b, includeTds }) => {
                  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const [monName, yrStr] = period.split(/\s+/);
                  const mIdx = MONTH_SHORT.findIndex((m) => m.toLowerCase() === (monName || '').toLowerCase());
                  const periodKey =
                    mIdx >= 0 && yrStr ? `${yrStr}-${String(mIdx + 1).padStart(2, '0')}` : currentMonthKey();
                  const dueMonthKey = nextMonthKey(periodKey);

                  const dueIso = (day: number) => `${dueMonthKey}-${String(Math.max(1, Math.min(28, day))).padStart(2, '0')}`;
                  const daysFromIstToday = (iso: string) => {
                    const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                    istNow.setHours(0, 0, 0, 0);
                    const [y, m, d] = iso.split('-').map(Number);
                    const target = new Date(y, (m || 1) - 1, d || 1);
                    return Math.round((target.getTime() - istNow.getTime()) / 86400000);
                  };

                  const gstr1Due = dueIso(preferences.gstr1DueDay ?? 11);
                  const gstr3bDue = dueIso(preferences.gstr3bDueDay ?? 20);
                  const tdsDue = dueIso(preferences.tdsDueDay ?? 7);

                  // Active Monthly GST clients (Master Data + recurring GST clients from Directory)
                  const mdGst = masterData.filter((r) => r.category === 'monthly-gst' && isVisibleInPeriod(r, periodKey));
                  const gstTargets: { name: string; clientId: string; gstin: string; phone: string; staffId: string; taxPayable: number }[] = [];
                  const seenGst = new Set<string>();

                  for (const r of mdGst) {
                    const key = r.clientName.trim().toLowerCase();
                    if (seenGst.has(key)) continue;
                    seenGst.add(key);
                    const matched = clients.find(
                      (c) => c.tradeName.toLowerCase() === key || c.name.toLowerCase() === key
                    );
                    const vals = getValuesForPeriod(r, periodKey);
                    gstTargets.push({
                      name: r.clientName,
                      clientId: matched?.id || '',
                      gstin: matched?.gstin || '',
                      phone: matched?.phone || '',
                      staffId: matched?.assignedStaffId || staffList[0]?.id || '',
                      taxPayable: vals.taxPayable || 0,
                    });
                  }
                  for (const c of clients) {
                    if (!c.isRecurringGST) continue;
                    const key = (c.tradeName || c.name).trim().toLowerCase();
                    if (seenGst.has(key)) continue;
                    seenGst.add(key);
                    gstTargets.push({
                      name: c.tradeName || c.name,
                      clientId: c.id,
                      gstin: c.gstin || '',
                      phone: c.phone || '',
                      staffId: c.assignedStaffId || staffList[0]?.id || '',
                      taxPayable: 0,
                    });
                  }

                  const existingKeys = new Set(
                    monthlyTasks.map((t) => `${t.clientName.trim().toLowerCase()}::${t.filingType}::${t.period}`)
                  );

                  const toCreate: MonthlyTask[] = [];
                  const enqueue = (
                    target: { name: string; clientId: string; gstin: string; phone: string; staffId: string; taxPayable: number },
                    filingType: string,
                    dueDate: string
                  ) => {
                    const k = `${target.name.trim().toLowerCase()}::${filingType}::${period}`;
                    if (existingKeys.has(k)) return;
                    existingKeys.add(k);
                    const days = daysFromIstToday(dueDate);
                    toCreate.push({
                      id: `task-gen-${Date.now()}-${toCreate.length}-${Math.random().toString(36).slice(2, 6)}`,
                      clientId: target.clientId,
                      clientName: target.name,
                      tradeName: target.name,
                      gstin: target.gstin,
                      phone: target.phone,
                      category: 'monthly',
                      filingType,
                      period,
                      dueDate,
                      daysRemaining: days,
                      status: days < 0 ? 'Overdue' : 'Docs Pending',
                      docsReceived: false,
                      assignedStaffId: target.staffId,
                      taxPayable: target.taxPayable || undefined,
                      lastUpdated: new Date().toISOString().slice(0, 10),
                    });
                  };

                  if (includeGstr1) {
                    for (const t of gstTargets) enqueue(t, 'GSTR-1 (Sales)', gstr1Due);
                  }
                  if (includeGstr3b) {
                    for (const t of gstTargets) enqueue(t, 'GSTR-3B (Summary)', gstr3bDue);
                  }
                  if (includeTds) {
                    const mdTds = masterData.filter((r) => r.category === 'quarterly-tds' && isVisibleInPeriod(r, periodKey));
                    const tdsSource = mdTds.length > 0
                      ? mdTds.map((r) => {
                          const matched = clients.find(
                            (c) => c.tradeName.toLowerCase() === r.clientName.trim().toLowerCase()
                          );
                          return {
                            name: r.clientName,
                            clientId: matched?.id || '',
                            gstin: matched?.gstin || '',
                            phone: matched?.phone || '',
                            staffId: matched?.assignedStaffId || staffList[0]?.id || '',
                            taxPayable: getValuesForPeriod(r, periodKey).taxPayable || 0,
                          };
                        })
                      : gstTargets;
                    for (const t of tdsSource) enqueue(t, 'TDS Payment', tdsDue);
                  }

                  if (toCreate.length === 0) {
                    showToast(`All selected tasks for ${period} already exist`);
                    return 0;
                  }

                  setMonthlyTasks((prev) => [...toCreate, ...prev]);
                  await Promise.all(toCreate.map((task) => saveTaskToDb(task)));
                  showToast(`Generated ${toCreate.length} monthly tasks for ${period}`);
                  return toCreate.length;
                }}
                onClearGeneratedTasks={
                  isAdmin
                    ? async (period) => {
                        const targets = monthlyTasks.filter(
                          (t) =>
                            t.category === 'monthly' &&
                            t.period === period &&
                            t.status !== 'Filed' &&
                            t.status !== 'Completed' &&
                            !t.arnNumber
                        );
                        if (targets.length === 0) return 0;
                        const removeIds = new Set(targets.map((t) => t.id));
                        setMonthlyTasks((prev) => prev.filter((t) => !removeIds.has(t.id)));
                        await Promise.all(targets.map((t) => deleteTaskFromDb(t.id)));
                        showToast(`Cleared ${targets.length} unfiled tasks for ${period}`);
                        return targets.length;
                      }
                    : undefined
                }
              />
            )}

            {activeTab === 'quarterly' && (
              <ComplianceTaskManager
                tasks={quarterlyTasks}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                section="quarterly"
                title="Quarterly Compliance"
                description={`${quarterlyTasks.length} tasks · Quarterly GST (QRMP/CMP-08) and TDS returns`}
                periodOptions={['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)']}
                serviceTabs={['All', 'GST (QRMP / CMP-08)', 'TDS (24Q / 26Q / 27Q)']}
                activeServiceTab={activeQuarterlyServiceTab}
                onServiceTabChange={setActiveQuarterlyServiceTab}
                filingTypes={['GST (QRMP / CMP-08)', 'TDS Return (24Q - Salary)', 'TDS Return (26Q - Non-Salary)', 'TDS Return (27Q)', 'CMP-08']}
                dueSoonDays={preferences.dueSoonDays}
                onUpdateStatus={handleUpdateMonthlyStatus}
                onDelete={isAdmin ? handleDeleteTask : undefined}
                onOpenWhatsApp={(task) => openWhatsApp({ task })}
                onSelectClient={handleSelectClient}
                onAddNewTask={(service) => handleOpenNewTaskWithService('quarterly', service, true)}
                onClearGeneratedTasks={
                  isAdmin
                    ? async (period) => {
                        const targets = monthlyTasks.filter(
                          (t) =>
                            t.category === 'quarterly' &&
                            t.period === period &&
                            t.status !== 'Filed' &&
                            t.status !== 'Completed' &&
                            !t.arnNumber
                        );
                        if (targets.length === 0) return 0;
                        const removeIds = new Set(targets.map((t) => t.id));
                        setMonthlyTasks((prev) => prev.filter((t) => !removeIds.has(t.id)));
                        await Promise.all(targets.map((t) => deleteTaskFromDb(t.id)));
                        showToast(`Cleared ${targets.length} unfiled tasks for ${period}`);
                        return targets.length;
                      }
                    : undefined
                }
              />
            )}

            {activeTab === 'assignments' && (
              <OtherAssignmentsManager
                tasks={otherAssignmentTasks}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                isAdmin={isAdmin}
                onUpdateStatus={handleUpdateMonthlyStatus}
                onDelete={isAdmin ? handleDeleteTask : undefined}
                onOpenWhatsApp={(task) => openWhatsApp({ task })}
                onSelectClient={handleSelectClient}
                onNewAssignment={() => handleOpenNewTaskWithService('other', undefined, true)}
              />
            )}

            {activeTab === 'itr' && (
              <ITRFilingsManager
                title="Annual Compliance"
                itrFilings={combinedAnnualFilings}
                staffList={staffList}
                clients={activeClients}
                selectedStaffId={selectedStaffId}
                assessmentYear={`AY ${preferences.financialYear}`}
                dueSoonDays={preferences.itrDueSoonDays}
                activePillarTab={activeAnnualPillarTab}
                onPillarTabChange={setActiveAnnualPillarTab}
                activeSubTab={activeAnnualSubTab}
                onSubTabChange={setActiveAnnualSubTab}
                onOpenWhatsApp={(itr) => openWhatsApp({ itr })}
                onSelectClient={handleSelectClient}
                onUpdateITRStatus={handleUpdateITRStatus}
                onAddITR={handleAddITR}
                onAddNewTask={(service) => handleOpenNewTaskWithService('annual', service, true)}
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
                onEditClient={(client) => setEditingClient(client)}
                onArchive={isAdmin ? handleArchiveClient : undefined}
                onDelete={isAdmin ? handleDeleteClient : undefined}
                onSelectClient={handleSelectClient}
                onGenerateInvoice={(c) => {
                  setInvoiceModalTarget(c);
                  setIsInvoiceModalOpen(true);
                }}
                onOpenWhatsAppForClient={(c) => {
                  const task = monthlyTasks.find((t) => t.clientId === c.id);
                  if (task) openWhatsApp({ task });
                  else showToast(`No open filing for ${c.tradeName} to message about`);
                }}
              />
            )}

            {activeTab === 'master-data' && (
              <MasterDataManager
                records={masterData}
                clients={clients}
                canEdit={Boolean(currentUser)}
                onSaveRecord={async (rec) => {
                  setMasterData((prev) => {
                    const exists = prev.some((x) => x.id === rec.id);
                    return exists ? prev.map((x) => (x.id === rec.id ? rec : x)) : [...prev, rec];
                  });
                  const res = await saveMasterDataRecordToDb(rec);
                  if (res.error) showToast(`Saved locally (${res.error})`);
                }}
                onBulkSaveRecords={async (recs) => {
                  setMasterData((prev) => {
                    const map = new Map(prev.map((x) => [x.id, x]));
                    for (const r of recs) map.set(r.id, r);
                    return Array.from(map.values());
                  });
                  const res = await bulkSaveMasterDataToDb(recs);
                  showToast(
                    res.error
                      ? `Imported ${recs.length} clients locally (${res.error})`
                      : `Imported ${recs.length} clients to Master Data`
                  );
                }}
                onDeleteRecord={async (id) => {
                  setMasterData((prev) => prev.filter((x) => x.id !== id));
                  await deleteMasterDataRecordFromDb(id);
                  showToast('Client removed from Master Data');
                }}
                onStartNextPeriod={async (category: MasterDataCategory, nextKey: string) => {
                  const nextAll = startNextMasterPeriod(masterData, category, nextKey);
                  setMasterData(nextAll);
                  const changed = nextAll.filter((r) => r.category === category);
                  await bulkSaveMasterDataToDb(changed);
                  showToast(`Started ${nextKey} · Active clients carried forward`);
                }}
              />
            )}

            {activeTab === 'invoices' &&
              (canViewFees ? (
                <InvoicesManager
                  billings={billings}
                  clients={clients}
                  debtors={debtors}
                  monthlyTasks={monthlyWorkTasks}
                  quarterlyTasks={quarterlyTasks}
                  itrFilings={combinedAnnualFilings}
                  canEdit={canEditFees}
                  onOpenInvoiceModal={(clientOrDebtor, prefill) => {
                    setInvoiceModalTarget(clientOrDebtor || null);
                    setInvoicePrefillBilling(prefill || null);
                    setIsInvoiceModalOpen(true);
                  }}
                  onUpdateBilling={async (updated) => {
                    setBillings((prev) =>
                      prev.map((b) => (b.id === updated.id || b.invoiceNumber === updated.invoiceNumber ? updated : b))
                    );
                    saveBillingToDb(updated);
                  }}
                  onDeleteBilling={isAdmin ? handleDeleteBilling : undefined}
                />
              ) : (
                restricted('Invoices and billing registers are visible to administrators and staff given fee access.')
              ))}

            {activeTab === 'debtors' &&
              (canViewFees ? (
                <DebtorsManager
                  debtors={debtors}
                  billings={billings}
                  staffList={staffList}
                  selectedStaffId={selectedStaffId}
                  clients={clients}
                  preferences={preferences}
                  firmProfile={firmProfile}
                  canEdit={canEditFees}
                  canImport={isAdmin}
                  gstCompliance={gstCompliance}
                  onOpenWhatsApp={(debtor) => openWhatsApp({ debtor })}
                  onRecordPayment={handleRecordDebtorPayment}
                  onAddBilling={handleAddDebtorBilling}
                  onAddAccount={canEditFees ? handleAddDebtorAccount : undefined}
                  onDelete={isAdmin ? handleDeleteDebtor : undefined}
                  onImport={handleImportDebtors}
                  onStartMonth={isAdmin ? handleStartDebtorMonth : undefined}
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

            {activeTab === 'activity' &&
              (isAdmin ? (
                <ActivityHistory
                  logs={activityLogs}
                  onPruneOldLogs={async () => {
                    const res = await pruneOldActivityLogsInDb(6);
                    if (res.error) {
                      showToast(`Could not prune logs: ${res.error}`, true);
                      return 0;
                    }
                    const cutoff = new Date();
                    cutoff.setMonth(cutoff.getMonth() - 6);
                    const cutoffMs = cutoff.getTime();
                    setActivityLogs((prev) =>
                      prev.filter((l) => {
                        const d = l.rawTimestamp ? new Date(l.rawTimestamp) : new Date(l.timestamp);
                        return Number.isNaN(d.getTime()) || d.getTime() >= cutoffMs;
                      })
                    );
                    showToast(`Pruned ${res.deletedCount} audit logs older than 6 months`);
                    return res.deletedCount;
                  }}
                />
              ) : (
                restricted('The audit trail is available to administrators only.')
              ))}

            {activeTab === 'settings' &&
              (isAdmin ? (
                <div className="space-y-6">
                  <PageHeader section="settings" title="Settings" description="Firm details, preferences, lists, message templates and backup." />
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
                    activeTheme={activeTheme}
                    onSelectTheme={setActiveTheme}
                    colourAccents={colourAccents}
                    onToggleColourAccents={setColourAccents}
                    clients={clients}
                    monthlyTasks={monthlyTasks}
                    itrFilings={itrFilings}
                    debtors={debtors}
                    billings={billings}
                    gstReturns={gstCompliance}
                    profiles={profiles}
                    tickets={tickets}
                    activityLogs={activityLogs}
                    masterData={masterData}
                    onImportMasterData={async (recs) => {
                      setMasterData((prev) => {
                        const map = new Map(prev.map((x) => [x.id, x]));
                        for (const r of recs) map.set(r.id, r);
                        return Array.from(map.values());
                      });
                      const res = await bulkSaveMasterDataToDb(recs);
                      showToast(
                        res.error
                          ? `Imported ${recs.length} clients locally (${res.error})`
                          : `Imported ${recs.length} clients to Master Data`
                      );
                    }}
                    onImportDebtors={handleImportDebtors}
                    onBackupDownloaded={(format) => addActivityLog('Backup downloaded', `Full data backup (${format})`, undefined, 'Security')}
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
        client={whatsAppClient}
        task={whatsAppTask}
        itrFiling={whatsAppITR}
        debtor={whatsAppDebtor}
        ticket={whatsAppTicket}
        gstItem={whatsAppGST}
        initialPhone={whatsAppInitialPhone}
        staffName={currentUser.name}
        customTemplates={templates}
        firmProfile={firmProfile}
        countryCode={preferences.whatsappCountryCode}
        clients={clients}
      />

      <ClientDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        client={selectedClient}
        task={selectedClient ? monthlyTasks.find((t) => t.clientId === selectedClient.id) : null}
        itrFiling={selectedClient ? combinedAnnualFilings.find((i) => i.clientId === selectedClient.id || i.clientName === selectedClient.name) : null}
        debtor={selectedClient && canViewFees ? debtors.find((d) => d.clientName.toLowerCase() === selectedClient.name.toLowerCase()) : null}
        staff={selectedClient ? staffList.find((s) => s.id === selectedClient.assignedStaffId) : null}
        tickets={tickets}
        staffList={staffList}
        billings={billings}
        onViewInvoice={(billing) => {
          setInvoiceModalTarget(selectedClient);
          setInvoicePrefillBilling(billing);
          setIsInvoiceModalOpen(true);
        }}
        onOpenWhatsApp={(item, targetPhone, forceGroup) => {
          setIsDrawerOpen(false);
          if (forceGroup) {
            sendToGroup(`Hello ${selectedClient?.tradeName || selectedClient?.name || 'Client'},\n\nUpdate from Shameer & Associates.`);
            return;
          }
          if (item && 'entityType' in item) {
            openWhatsApp({ client: item, initialPhone: targetPhone });
          } else {
            openWhatsApp({ task: item, initialPhone: targetPhone });
          }
        }}
        onGenerateInvoice={(c) => {
          setIsDrawerOpen(false);
          setInvoiceModalTarget(c);
          setInvoicePrefillBilling(null);
          setIsInvoiceModalOpen(true);
        }}
        onEditClient={(client) => setEditingClient(client)}
      />

      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => {
          setIsNewTaskOpen(false);
          setInitialTaskService(undefined);
          setIsCategoryLocked(false);
        }}
        clients={activeClients}
        staffList={staffList}
        initialCategory={initialTaskCategory}
        initialService={initialTaskService}
        lockCategory={isCategoryLocked}
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

      <InvoiceGeneratorModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setInvoiceModalTarget(null);
          setInvoicePrefillBilling(null);
        }}
        initialClient={invoiceModalTarget}
        prefillBilling={invoicePrefillBilling}
        clients={clients}
        debtors={debtors}
        preferences={preferences}
        firmProfile={firmProfile}
        onRecordBilling={handleRecordBilling}
      />

      {editingClient && (
        <NewClientModal
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
          staffList={staffList}
          entityTypes={practiceConfigs.entity_types}
          clientToEdit={editingClient}
          onUpdateClient={handleUpdateClient}
        />
      )}
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
