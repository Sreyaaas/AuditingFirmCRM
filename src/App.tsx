import React, { useState, useEffect } from 'react';
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
import { IntegrationsModal } from './components/IntegrationsModal';
import { NewTaskModal } from './components/NewTaskModal';
import { NewTicketModal } from './components/NewTicketModal';
import { CommandPalette } from './components/CommandPalette';
import { LoginView } from './components/LoginView';
import { PracticeConfigManager } from './components/PracticeConfigManager';
import { Avatar, Button, Card, EmptyState, PageHeader } from './components/ui';
import { 
  fetchPracticeConfigs, 
  savePracticeConfigOption, 
  removePracticeConfigOption, 
  fetchClientsFromDb, 
  saveClientToDb, 
  updateClientInDb,
  fetchTasksFromDb, 
  saveTaskToDb, 
  updateTaskStatusInDb,
  fetchProfilesFromDb,
  saveProfileToDb,
  updateProfileInDb,
  fetchItrFilingsFromDb,
  saveItrFilingToDb,
  updateItrFilingStatusInDb,
  fetchDebtorsFromDb,
  updateDebtorPaymentInDb,
  fetchTicketsFromDb,
  saveTicketToDb,
  updateTicketInDb,
  fetchActivityLogsFromDb,
  saveActivityLogToDb,
  checkSupabaseHealth,
  DEFAULT_PRACTICE_CONFIGS 
} from './services/dbSyncService';

import { 
  ACTUAL_STAFF, 
  ACTUAL_DEBTOR_RECORDS, 
  ACTUAL_OFFICE_BILLINGS, 
  ACTUAL_GST_COMPLIANCE,
  INITIAL_PROFILES,
  INITIAL_ACTIVITY_LOGS,
  ACTUAL_ITR_RECORDS
} from './data/actualClientData';
import { 
  INITIAL_CLIENTS, 
  INITIAL_MONTHLY_TASKS, 
  INITIAL_ITR_FILINGS, 
  INITIAL_CLOUD_INTEGRATIONS,
  INITIAL_TICKETS
} from './data/mockData';
import { 
  Client, 
  MonthlyTask, 
  ITRFiling, 
  FilingStatus, 
  ITRStatus, 
  DebtorRecord, 
  OfficeBillingEntry, 
  GSTComplianceItem, 
  StaffTicket, 
  TicketStatus, 
  StaffMember,
  UserProfile,
  UserRole,
  ActivityLog
} from './types/crm';
import { Check, ShieldAlert } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Theme Management (Light Minimal / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('crm-theme') as 'light' | 'dark' | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('crm-theme', theme);
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.classList.remove('warm');
    root.removeAttribute('data-font');
    root.classList.remove('font-figtree');
    root.classList.remove('font-system');
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Global Command Palette (⌘K)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Authentication & Role-Based Access State
  const [profiles, setProfiles] = useState<UserProfile[]>(INITIAL_PROFILES);
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('shameer_crm_active_user_id') || 'user-admin-shameer';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('shameer_crm_is_authenticated') === 'true';
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);

  const currentUser = profiles.find((p) => p.id === currentUserId) || profiles[0];
  const isAdmin = currentUser.role === 'admin';

  // Domain Data State
  const [staffList, setStaffList] = useState<StaffMember[]>(ACTUAL_STAFF);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [monthlyTasks, setMonthlyTasks] = useState<MonthlyTask[]>(INITIAL_MONTHLY_TASKS);
  const [practiceConfigs, setPracticeConfigs] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('shameer_crm_practice_configs');
    return saved ? JSON.parse(saved) : DEFAULT_PRACTICE_CONFIGS;
  });

  // Live Supabase Database Data Synchronization
  useEffect(() => {
    let isMounted = true;
    const syncCloudData = async () => {
      try {
        const [
          cloudConfigs, 
          cloudClients, 
          cloudTasks,
          cloudProfiles,
          cloudITR,
          cloudDebtors,
          cloudTickets,
          cloudLogs
        ] = await Promise.all([
          fetchPracticeConfigs(),
          fetchClientsFromDb(),
          fetchTasksFromDb(),
          fetchProfilesFromDb(),
          fetchItrFilingsFromDb(),
          fetchDebtorsFromDb(),
          fetchTicketsFromDb(),
          fetchActivityLogsFromDb()
        ]);
        if (isMounted) {
          setPracticeConfigs(cloudConfigs);
          if (cloudClients && cloudClients.length > 0) {
            setClients(cloudClients);
          }
          if (cloudTasks && cloudTasks.length > 0) {
            setMonthlyTasks(cloudTasks);
          }
          if (cloudProfiles && cloudProfiles.length > 0) {
            setProfiles(cloudProfiles);
            setStaffList(cloudProfiles.map(p => ({
              id: p.id,
              name: p.name,
              role: p.designation,
              initials: p.initials || p.name.slice(0, 2).toUpperCase(),
              email: p.email,
              phone: p.phone,
              assignedRecurringCount: 6,
              assignedITRCount: 6,
              completedThisMonth: 6,
            })));
          }
          if (cloudITR && cloudITR.length > 0) {
            setItrFilings(cloudITR);
          }
          if (cloudDebtors && cloudDebtors.length > 0) {
            setDebtors(cloudDebtors);
          }
          if (cloudTickets && cloudTickets.length > 0) {
            setTickets(cloudTickets);
          }
          if (cloudLogs && cloudLogs.length > 0) {
            setActivityLogs(cloudLogs);
          }

          // Live cloud integration status
          setIntegrations((prev) => ({
            ...prev,
            supabase: {
              status: 'connected',
              url: import.meta.env.VITE_SUPABASE_URL || 'https://nnndhmwzrwbtmojflmma.supabase.co',
              lastSynced: 'Just now',
              tables: [
                { name: 'clients', count: cloudClients?.length || 6 },
                { name: 'tasks', count: cloudTasks?.length || 6 },
                { name: 'itr_filings', count: cloudITR?.length || 6 },
                { name: 'debtor_records', count: cloudDebtors?.length || 6 },
                { name: 'tickets', count: cloudTickets?.length || 4 },
                { name: 'profiles', count: cloudProfiles?.length || 3 },
              ]
            }
          }));
        }
      } catch (err) {
        console.error('Initial Supabase sync error:', err);
      }
    };
    syncCloudData();
    return () => { isMounted = false; };
  }, []);
  const [itrFilings, setItrFilings] = useState<ITRFiling[]>(() => {
    try {
      const saved = localStorage.getItem('shameer_crm_itr_filings_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize any legacy staff IDs to current 3 members
          return parsed.map((item: ITRFiling) => {
            if (item.assignedStaffId === 'staff-ashik' || item.assignedStaffId === 'staff-mathew') {
              return { ...item, assignedStaffId: 'staff-ameen' };
            }
            if (item.assignedStaffId === 'staff-ann') {
              return { ...item, assignedStaffId: 'staff-susmi' };
            }
            return item;
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    return ACTUAL_ITR_RECORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('shameer_crm_itr_filings_v2', JSON.stringify(itrFilings));
    } catch (e) {
      console.error(e);
    }
  }, [itrFilings]);
  const [debtors, setDebtors] = useState<DebtorRecord[]>(ACTUAL_DEBTOR_RECORDS);
  const [billings, setBillings] = useState<OfficeBillingEntry[]>(ACTUAL_OFFICE_BILLINGS);
  const [gstCompliance, setGstCompliance] = useState<GSTComplianceItem[]>(ACTUAL_GST_COMPLIANCE);
  const [tickets, setTickets] = useState<StaffTicket[]>(INITIAL_TICKETS);
  const [integrations, setIntegrations] = useState(INITIAL_CLOUD_INTEGRATIONS);

  // Modals & Drawers State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppTask, setWhatsAppTask] = useState<MonthlyTask | null>(null);
  const [whatsAppITR, setWhatsAppITR] = useState<ITRFiling | null>(null);
  const [whatsAppDebtor, setWhatsAppDebtor] = useState<DebtorRecord | null>(null);
  const [whatsAppTicket, setWhatsAppTicket] = useState<StaffTicket | null>(null);
  const [whatsAppGST, setWhatsAppGST] = useState<GSTComplianceItem | null>(null);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addActivityLog = (
    action: string, 
    details: string, 
    clientName?: string, 
    category: ActivityLog['category'] = 'Task'
  ) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      clientName,
      category,
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    saveActivityLogToDb(newLog).catch((err) => console.warn('Activity log sync note:', err));
  };

  // Authentication & Session Management
  const handleLogin = (userId: string) => {
    setCurrentUserId(userId);
    setIsAuthenticated(true);
    localStorage.setItem('shameer_crm_is_authenticated', 'true');
    localStorage.setItem('shameer_crm_active_user_id', userId);
    const target = profiles.find((p) => p.id === userId);
    showToast(`Signed in as ${target ? target.name : 'User'}`);
    addActivityLog(
      'Session Authenticated',
      `Signed in as ${target?.name} (${target?.role})`,
      undefined,
      'Security'
    );
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('shameer_crm_is_authenticated');
    showToast('Signed out of practice portal');
    addActivityLog(
      'Session Closed',
      `Signed out from practice session`,
      undefined,
      'Security'
    );
  };

  // Switch User Session (For quick role testing)
  const handleSwitchUser = (userId: string) => {
    const target = profiles.find((p) => p.id === userId);
    if (!target) return;
    setCurrentUserId(userId);
    localStorage.setItem('shameer_crm_active_user_id', userId);
    showToast(`Switched session to ${target.name} (${target.role})`);
    addActivityLog(
      'Session Switched',
      `Switched session to ${target.name} (${target.role})`,
      undefined,
      'Security'
    );
  };

  // Employee Management Handlers
  const handleAddEmployee = async (
    profileData: Omit<UserProfile, 'id' | 'assignedClientsCount' | 'assignedTasksCount' | 'completedThisMonth'>
  ) => {
    const newId = `emp-${Date.now()}`;
    const newProfile: UserProfile = {
      ...profileData,
      id: newId,
      assignedClientsCount: 0,
      assignedTasksCount: 0,
      completedThisMonth: 0,
    };
    setProfiles((prev) => [...prev, newProfile]);
    showToast(`Created employee account for ${newProfile.name}`);
    addActivityLog(
      'Employee Account Created',
      `Created ${newProfile.role} account for ${newProfile.name} (${newProfile.email})`,
      undefined,
      'Account'
    );
    await saveProfileToDb(newProfile);
  };

  const handleToggleEmployeeStatus = async (userId: string) => {
    let empName = '';
    let newStatus: 'Active' | 'Inactive' = 'Active';
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === userId) {
          empName = p.name;
          newStatus = p.status === 'Active' ? 'Inactive' : 'Active';
          return { ...p, status: newStatus };
        }
        return p;
      })
    );
    showToast(`${empName} account is now ${newStatus}`);
    addActivityLog(
      `Account ${newStatus}`,
      `Changed account status for ${empName} to ${newStatus}`,
      undefined,
      'Account'
    );
    await updateProfileInDb(userId, { status: newStatus });
  };

  const handleUpdateEmployeeRole = async (userId: string, newRole: UserRole) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
    );
    showToast(`Updated account role to ${newRole}`);
    await updateProfileInDb(userId, { role: newRole });
  };

  const handleResetEmployeePassword = (userId: string) => {
    const target = profiles.find((p) => p.id === userId);
    showToast(`Password reset link sent to ${target ? target.email : 'employee'}`);
    addActivityLog(
      'Password Reset Initiated',
      `Sent password reset code to ${target ? target.email : 'user'}`,
      undefined,
      'Security'
    );
  };

  // Task & Filing Handlers
  const handleUpdateMonthlyStatus = async (taskId: string, newStatus: FilingStatus) => {
    let clientName = '';
    let filingPeriod = '';
    let assignedArn = '';
    setMonthlyTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          clientName = t.clientName;
          filingPeriod = t.period;
          const isFiled = newStatus === 'Filed';
          assignedArn = isFiled ? (t.arnNumber || `AA321126${Math.floor(100000 + Math.random() * 900000)}Z`) : (t.arnNumber || '');
          return {
            ...t,
            status: newStatus,
            arnNumber: assignedArn,
            lastUpdated: 'Just now',
          };
        }
        return t;
      })
    );
    showToast(`Task status updated: ${newStatus}`);
    addActivityLog(
      `Task ${newStatus}`,
      `Updated filing status to ${newStatus} for ${filingPeriod}`,
      clientName,
      'Filing'
    );
    await updateTaskStatusInDb(taskId, newStatus, assignedArn);
  };

  const handleUpdateITRStatus = async (id: string, newStatus: ITRStatus, ackNo?: string) => {
    let clientName = '';
    let assignedAck = '';
    setItrFilings((prev) =>
      prev.map((itr) => {
        if (itr.id === id) {
          clientName = itr.clientName;
          const isFiled = newStatus === 'Filed & e-Verified';
          assignedAck = isFiled ? (ackNo || itr.acknowledgmentNo || `ACK982${Math.floor(100000000 + Math.random() * 900000000)}`) : (itr.acknowledgmentNo || '');
          return { 
            ...itr, 
            status: newStatus,
            acknowledgmentNo: assignedAck,
            lastActivity: 'Just now',
          };
        }
        return itr;
      })
    );
    showToast(`ITR status: ${newStatus}`);
    addActivityLog('ITR Status Updated', `Updated annual return status to ${newStatus}`, clientName, 'Filing');
    await updateItrFilingStatusInDb(id, newStatus, assignedAck);
  };

  const handleAddITR = async (newITR: Omit<ITRFiling, 'id' | 'lastActivity'>) => {
    const newId = `itr-${Date.now()}`;
    const record: ITRFiling = {
      ...newITR,
      id: newId,
      lastActivity: 'Just now',
    };
    setItrFilings((prev) => [record, ...prev]);
    showToast(`Created ITR record for ${record.clientName}`);
    addActivityLog(
      'New ITR Entry Added',
      `Scheduled ${record.itrForm} for ${record.clientName} (${record.assessmentYear}) • Due: ${record.dueDate}`,
      record.clientName,
      'Filing'
    );
    await saveItrFilingToDb(record);
  };

  const handleResetITRToDefault = () => {
    setItrFilings(ACTUAL_ITR_RECORDS);
    try {
      localStorage.setItem('shameer_crm_itr_filings_v2', JSON.stringify(ACTUAL_ITR_RECORDS));
    } catch (e) {
      console.error(e);
    }
    showToast('Reset to 6 Excel workbook ITR accounts');
    addActivityLog('ITR Dataset Reset', 'Restored master 6 client ITR records from workbook', undefined, 'Filing');
  };

  // Admin Practice Config Handlers
  const handleAddConfigOption = async (categoryKey: string, newOption: string): Promise<boolean> => {
    const result = await savePracticeConfigOption(categoryKey, newOption);
    if (result.success) {
      setPracticeConfigs((prev) => ({ ...prev, [categoryKey]: result.options }));
      showToast(`Added "${newOption}" to ${categoryKey.replace('_', ' ')} (Synced with Supabase)`);
      addActivityLog('Practice Config Updated', `Added option "${newOption}" to ${categoryKey}`, undefined, 'Task');
      return true;
    }
    showToast(result.error || 'Failed to save option');
    return false;
  };

  const handleRemoveConfigOption = async (categoryKey: string, optionToRemove: string): Promise<boolean> => {
    const result = await removePracticeConfigOption(categoryKey, optionToRemove);
    if (result.success) {
      setPracticeConfigs((prev) => ({ ...prev, [categoryKey]: result.options }));
      showToast(`Removed "${optionToRemove}" from ${categoryKey.replace('_', ' ')}`);
      return true;
    }
    return false;
  };

  // Admin New Client Registration Handler
  const handleAddNewClient = async (newClient: Client) => {
    setClients((prev) => [newClient, ...prev]);
    showToast(`Client ${newClient.name} registered`);
    addActivityLog('Client Registered', `Registered new entity ${newClient.name} (${newClient.clientCode})`, newClient.name, 'Client');

    const res = await saveClientToDb(newClient);
    if (res.success) {
      showToast(`✓ Client ${newClient.name} synced directly to Supabase cloud!`);
    } else {
      console.warn('Saved client locally, cloud sync pending:', res.error);
    }
  };

  const handleAddTask = async (newTask: MonthlyTask) => {
    setMonthlyTasks((prev) => [newTask, ...prev]);
    showToast(`Task created for ${newTask.tradeName}`);
    addActivityLog('New Task Created', `Scheduled ${newTask.filingType} for ${newTask.period}`, newTask.clientName, 'Task');

    const res = await saveTaskToDb(newTask);
    if (res.success) {
      showToast(`✓ Task synced directly to Supabase cloud!`);
    }
  };

  // WhatsApp reminder handlers
  const handleOpenWhatsAppForMonthly = (task: MonthlyTask) => {
    setWhatsAppTask(task);
    setWhatsAppITR(null);
    setWhatsAppDebtor(null);
    setWhatsAppTicket(null);
    setWhatsAppGST(null);
    setIsWhatsAppOpen(true);
  };

  const handleOpenWhatsAppForITR = (itr: ITRFiling) => {
    setWhatsAppITR(itr);
    setWhatsAppTask(null);
    setWhatsAppDebtor(null);
    setWhatsAppTicket(null);
    setWhatsAppGST(null);
    setIsWhatsAppOpen(true);
  };

  const handleOpenWhatsAppForDebtor = (debtor: DebtorRecord) => {
    setWhatsAppDebtor(debtor);
    setWhatsAppGST(null);
    setWhatsAppTask(null);
    setWhatsAppITR(null);
    setWhatsAppTicket(null);
    setIsWhatsAppOpen(true);
  };

  const handleOpenWhatsAppForGST = (item: GSTComplianceItem) => {
    setWhatsAppGST(item);
    setWhatsAppDebtor(null);
    setWhatsAppTask(null);
    setWhatsAppITR(null);
    setWhatsAppTicket(null);
    setIsWhatsAppOpen(true);
  };

  const handleOpenWhatsAppForTicket = (ticket: StaffTicket) => {
    setWhatsAppTicket(ticket);
    setWhatsAppGST(null);
    setWhatsAppTask(null);
    setWhatsAppITR(null);
    setWhatsAppDebtor(null);
    setIsWhatsAppOpen(true);
  };

  // Tickets & Calls Desk Handlers
  const handleAddTicket = async (newTicket: StaffTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    showToast(`Logged call ticket ${newTicket.ticketNo} for ${newTicket.tradeName}`);
    addActivityLog(
      'Client Call Logged',
      `Logged inquiry ${newTicket.ticketNo} regarding "${newTicket.subject}"`,
      newTicket.clientName,
      'Client'
    );
    await saveTicketToDb(newTicket);
  };

  const handleAssignTicket = async (ticketId: string, staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    let ticketSubject = '';
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          ticketSubject = t.subject;
          return {
            ...t,
            assignedStaffId: staffId,
            assignedAt: 'Just now',
            status: t.status === 'Unassigned' ? 'In Progress' : t.status,
          };
        }
        return t;
      })
    );
    showToast(`Assigned ticket to ${staff ? staff.name : 'staff'}`);
    addActivityLog(
      'Ticket Assigned',
      `Assigned inquiry "${ticketSubject}" to ${staff ? staff.name : 'staff'}`,
      undefined,
      'Client'
    );
    await updateTicketInDb(ticketId, {
      assignedStaffId: staffId,
      assignedAt: new Date().toISOString(),
      status: 'In Progress'
    });
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: TicketStatus, notes?: string) => {
    let ticketNo = '';
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          ticketNo = t.ticketNo;
          return {
            ...t,
            status: newStatus,
            resolvedAt: newStatus === 'Resolved' ? 'Just now' : t.resolvedAt,
            resolutionNotes: notes || t.resolutionNotes,
          };
        }
        return t;
      })
    );
    showToast(`Ticket status: ${newStatus}`);
    addActivityLog(
      `Ticket ${newStatus}`,
      `Marked call ticket ${ticketNo} as ${newStatus}${notes ? `: ${notes}` : ''}`,
      undefined,
      'Client'
    );
    await updateTicketInDb(ticketId, {
      status: newStatus,
      resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : undefined,
      resolutionNotes: notes
    });
  };

  // Debtors & Payments Handlers
  const handleRecordDebtorPayment = async (debtorId: string, amountCleared: number) => {
    let clientName = '';
    let calculatedBalance = 0;
    let newClearedTotal = 0;
    setDebtors((prev) =>
      prev.map((d) => {
        if (d.id === debtorId) {
          clientName = d.clientName;
          newClearedTotal = (d.november?.paymentCleared || 0) + amountCleared;
          const updatedNov = {
            ...d.november,
            paymentCleared: newClearedTotal,
          };
          calculatedBalance = Math.max(0, updatedNov.outstanding - updatedNov.paymentCleared + updatedNov.currentBilling);
          return {
            ...d,
            november: updatedNov,
            currentBalance: calculatedBalance,
            status: calculatedBalance === 0 ? 'Cleared' : (calculatedBalance < d.currentBalance ? 'Partially Paid' : d.status),
            agingBucket: calculatedBalance === 0 ? '0-30 Days' : d.agingBucket,
          };
        }
        return d;
      })
    );
    showToast(`Payment of ₹${amountCleared.toLocaleString('en-IN')} recorded`);
    addActivityLog(
      'Payment Received',
      `Credited ₹${amountCleared.toLocaleString('en-IN')} towards November fee dues`,
      clientName,
      'Payment'
    );
    await updateDebtorPaymentInDb(debtorId, newClearedTotal, 0, calculatedBalance);
  };

  const handleAddDebtorBilling = (debtorId: string, billingAmount: number, description: string) => {
    let clientName = '';
    let staffUser = 'Ameen';
    setDebtors((prev) =>
      prev.map((d) => {
        if (d.id === debtorId) {
          clientName = d.clientName;
          staffUser = d.assignedStaff;
          const newBilling = (d.november?.currentBilling || 0) + billingAmount;
          const updatedNov = {
            ...d.november,
            currentBilling: newBilling,
          };
          const newBalance = updatedNov.outstanding - updatedNov.paymentCleared + updatedNov.currentBilling;
          return {
            ...d,
            november: updatedNov,
            currentBalance: newBalance,
            status: 'Overdue',
          };
        }
        return d;
      })
    );

    const newEntry: OfficeBillingEntry = {
      serialNo: billings.length + 1,
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
      clientName: clientName || 'Client',
      natureOfService: description,
      filingMonth: 'November 2026',
      professionalIncome: billingAmount,
      oopExpenses: 0,
      user: staffUser,
    };
    setBillings((prev) => [newEntry, ...prev]);
    showToast(`Billing of ₹${billingAmount.toLocaleString('en-IN')} added for ${clientName}`);
    addActivityLog(
      'New Billing Posted',
      `Billed ₹${billingAmount.toLocaleString('en-IN')} for ${description}`,
      clientName,
      'Payment'
    );
  };

  const handleMarkGSTAsFiled = (id: string, arn: string) => {
    let clientName = '';
    let returnType = '';
    setGstCompliance((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          clientName = item.clientName;
          returnType = item.returnType;
          return {
            ...item,
            priorityLevel: 'filed' as const,
            filingStatus: 'Filed' as const,
            arnNumber: arn,
            filedDate: new Date().toISOString().slice(0, 10),
            daysRemaining: 0,
          };
        }
        return item;
      })
    );
    showToast(`Return marked filed with ARN: ${arn}`);
    addActivityLog(
      'Return Filed on Portal',
      `Filed ${returnType} with portal ARN ${arn}`,
      clientName,
      'Filing'
    );
  };

  const handleSelectClient = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setSelectedClient(found);
      setIsDrawerOpen(true);
    }
  };

  const activeStaffFilter = selectedStaffId
    ? staffList.find((s) => s.id === selectedStaffId)
    : null;

  const gstOverdueCount = gstCompliance.filter((i) => i.priorityLevel === 'overdue').length;

  if (!isAuthenticated) {
    return (
      <LoginView
        profiles={profiles}
        onLogin={handleLogin}
        onRegisterEmployee={handleAddEmployee}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-canvas text-fg">
      {/* Toast */}
      {toastMessage && (
        <div role="status" className="fixed bottom-5 right-5 z-[60] bg-ink text-ink-fg pl-3 pr-4 h-10 rounded-lg shadow-dialog flex items-center gap-2.5 text-sm font-medium animate-toast-in">
          <Check className="w-4 h-4 text-success" strokeWidth={2} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        staffList={staffList}
        currentUser={currentUser}
        selectedStaffId={selectedStaffId}
        setSelectedStaffId={setSelectedStaffId}
        monthlyTaskCount={monthlyTasks.length}
        itrCount={itrFilings.length}
        totalClientsCount={clients.length}
        debtorsCount={debtors.filter(d => d.currentBalance > 0).length}
        gstOverdueCount={gstOverdueCount}
        unassignedTicketsCount={tickets.filter(t => t.status === 'Unassigned').length}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          currentUser={currentUser}
          profiles={profiles}
          onSwitchUser={handleSwitchUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenNewTask={() => setIsNewTaskOpen(true)}
          onOpenIntegrations={() => setIsIntegrationsOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-7 space-y-6">
          {/* Active staff filter indicator */}
          {activeStaffFilter && (
            <div className="flex items-center justify-between gap-3 h-10 pl-2 pr-1.5 rounded-lg border border-line bg-surface text-sm shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar initials={activeStaffFilter.initials} size="xs" />
                <span className="text-fg-subtle">Showing work for</span>
                <span className="font-medium text-fg truncate">{activeStaffFilter.name}</span>
                <span className="text-fg-faint hidden sm:inline">· {activeStaffFilter.role}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedStaffId(null)}>
                Clear Filter
              </Button>
            </div>
          )}

          {/* VIEW: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <OverviewStats
                currentUser={currentUser}
                totalClients={clients.length}
                monthlyTasks={monthlyTasks}
                itrFilings={itrFilings}
                debtors={debtors}
                staffList={staffList}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onFilterStaff={(staffId) => setSelectedStaffId(staffId)}
              />

              <ComplianceTaskManager
                tasks={monthlyTasks}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                filingTypes={practiceConfigs.filing_types}
                onUpdateStatus={handleUpdateMonthlyStatus}
                onOpenWhatsApp={handleOpenWhatsAppForMonthly}
                onSelectClient={handleSelectClient}
              />
            </div>
          )}

          {/* VIEW: Upcoming Deadlines & Filings (GST Tracker) */}
          {activeTab === 'gst-tracker' && (
            <GSTComplianceTracker
              complianceItems={gstCompliance}
              staffList={staffList}
              selectedStaffId={selectedStaffId}
              returnTypes={practiceConfigs.return_types}
              onOpenWhatsApp={handleOpenWhatsAppForGST}
              onMarkAsFiled={handleMarkGSTAsFiled}
            />
          )}

          {/* VIEW: Monthly Work (GST & Audit) */}
          {activeTab === 'monthly' && (
            <ComplianceTaskManager
              tasks={monthlyTasks}
              staffList={staffList}
              selectedStaffId={selectedStaffId}
              filingTypes={practiceConfigs.filing_types}
              onUpdateStatus={handleUpdateMonthlyStatus}
              onOpenWhatsApp={handleOpenWhatsAppForMonthly}
              onSelectClient={handleSelectClient}
            />
          )}

          {/* VIEW: Annual Tax Returns (ITR) */}
          {activeTab === 'itr' && (
            <ITRFilingsManager
              itrFilings={itrFilings}
              staffList={staffList}
              clients={clients}
              selectedStaffId={selectedStaffId}
              onOpenWhatsApp={handleOpenWhatsAppForITR}
              onSelectClient={handleSelectClient}
              onUpdateITRStatus={handleUpdateITRStatus}
              onAddITR={handleAddITR}
              onResetToDefault={handleResetITRToDefault}
            />
          )}

          {/* VIEW: Client Accounts */}
          {activeTab === 'clients' && (
            <ClientDirectory
              clients={clients}
              staffList={staffList}
              isAdmin={isAdmin}
              entityTypes={practiceConfigs.entity_types}
              onAddClient={handleAddNewClient}
              onSelectClient={handleSelectClient}
              onOpenWhatsAppForClient={(c) => {
                const task = monthlyTasks.find((t) => t.clientId === c.id);
                if (task) handleOpenWhatsAppForMonthly(task);
              }}
            />
          )}

          {/* VIEW: Money Owed to Us (Debtors) */}
          {activeTab === 'debtors' && (
            <DebtorsManager
              debtors={debtors}
              billings={billings}
              staffList={staffList}
              selectedStaffId={selectedStaffId}
              onOpenWhatsApp={handleOpenWhatsAppForDebtor}
              onRecordPayment={handleRecordDebtorPayment}
              onAddBilling={handleAddDebtorBilling}
            />
          )}

          {/* VIEW: Client Calls & Follow-ups (Desk & Tickets) */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <StaffTicketDesk
                tickets={tickets}
                staffList={staffList}
                selectedStaffId={selectedStaffId}
                onAssignToStaff={handleAssignTicket}
                onUpdateStatus={handleUpdateTicketStatus}
                onOpenNewTicketModal={() => setIsNewTicketOpen(true)}
                onOpenWhatsAppForTicket={handleOpenWhatsAppForTicket}
                onSelectClient={handleSelectClient}
              />

              <div className="pt-2">
                <StaffWorkloadView
                  staffList={staffList}
                  tasks={monthlyTasks}
                  onSelectStaff={(id) => {
                    setSelectedStaffId(id);
                    setActiveTab('monthly');
                  }}
                />
              </div>
            </div>
          )}

          {/* VIEW: Employee Management (Admin Only) */}
          {activeTab === 'employees' && (
            isAdmin ? (
              <EmployeeManagement
                currentUser={currentUser}
                profiles={profiles}
                onAddEmployee={handleAddEmployee}
                onToggleStatus={handleToggleEmployeeStatus}
                onUpdateRole={handleUpdateEmployeeRole}
                onResetPassword={handleResetEmployeePassword}
                onSelectEmployeeWork={(staffName) => {
                  const staff = staffList.find((s) => s.name === staffName);
                  if (staff) {
                    setSelectedStaffId(staff.id);
                    setActiveTab('monthly');
                  }
                }}
              />
            ) : (
              <Card className="max-w-md mx-auto mt-10">
                <EmptyState icon={ShieldAlert} title="Restricted to administrators" description="Team management is available to Shameer and Ameen only." />
              </Card>
            )
          )}

          {/* VIEW: Activity History (Admin Only) */}
          {activeTab === 'activity' && (
            isAdmin ? (
              <ActivityHistory logs={activityLogs} />
            ) : (
              <Card className="max-w-md mx-auto mt-10">
                <EmptyState icon={ShieldAlert} title="Restricted to administrators" description="The audit trail is available to Shameer and Ameen only." />
              </Card>
            )
          )}

          {/* VIEW: Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <PageHeader
                title="Settings"
                description="Firm profile, dropdown lists, message templates and data backup."
              />

              <PracticeConfigManager
                configs={practiceConfigs}
                onAddOption={handleAddConfigOption}
                onRemoveOption={handleRemoveConfigOption}
                clients={clients}
                monthlyTasks={monthlyTasks}
                itrFilings={itrFilings}
                debtors={debtors}
                profiles={profiles}
                tickets={tickets}
                activityLogs={activityLogs}
              />
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        clients={clients}
        profiles={profiles}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsCommandPaletteOpen(false);
        }}
        onSelectClient={handleSelectClient}
        onSwitchUser={handleSwitchUser}
        onOpenNewTask={() => setIsNewTaskOpen(true)}
        onOpenNewTicket={() => setIsNewTicketOpen(true)}
      />

      {/* Modals & Drawers */}
      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        task={whatsAppTask}
        itrFiling={whatsAppITR}
        debtor={whatsAppDebtor}
        ticket={whatsAppTicket}
        gstItem={whatsAppGST}
        staffName={currentUser.name}
      />

      <ClientDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        client={selectedClient}
        task={selectedClient ? monthlyTasks.find((t) => t.clientId === selectedClient.id) : null}
        itrFiling={selectedClient ? itrFilings.find((i) => i.clientId === selectedClient.id || i.clientName === selectedClient.name) : null}
        debtor={selectedClient ? debtors.find((d) => d.clientName === selectedClient.name) : null}
        staff={selectedClient ? staffList.find((s) => s.id === selectedClient.assignedStaffId) : null}
        tickets={tickets}
        staffList={staffList}
        onOpenWhatsApp={(item) => {
          setIsDrawerOpen(false);
          handleOpenWhatsAppForMonthly(item);
        }}
      />

      <IntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        integrations={integrations}
        onSync={() => showToast('Sync triggered')}
      />

      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        staffList={staffList}
        filingTypes={practiceConfigs.filing_types}
        onAddTask={handleAddTask}
      />

      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        clients={clients}
        staffList={staffList}
        onAddTicket={handleAddTicket}
        currentStaffId={selectedStaffId}
      />
    </div>
  );
}

export default App;
