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

  // Apple Theme Management (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('crm-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('crm-theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
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
  const handleAddEmployee = (
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
  };

  const handleToggleEmployeeStatus = (userId: string) => {
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
  };

  const handleUpdateEmployeeRole = (userId: string, newRole: UserRole) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
    );
    showToast(`Updated account role to ${newRole}`);
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
  const handleUpdateMonthlyStatus = (taskId: string, newStatus: FilingStatus) => {
    let clientName = '';
    let filingPeriod = '';
    setMonthlyTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          clientName = t.clientName;
          filingPeriod = t.period;
          const isFiled = newStatus === 'Filed';
          return {
            ...t,
            status: newStatus,
            arnNumber: isFiled ? (t.arnNumber || `AA321126${Math.floor(100000 + Math.random() * 900000)}Z`) : t.arnNumber,
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
  };

  const handleUpdateITRStatus = (id: string, newStatus: ITRStatus, ackNo?: string) => {
    let clientName = '';
    setItrFilings((prev) =>
      prev.map((itr) => {
        if (itr.id === id) {
          clientName = itr.clientName;
          const isFiled = newStatus === 'Filed & e-Verified';
          const assignedAck = isFiled ? (ackNo || itr.acknowledgmentNo || `ACK982${Math.floor(100000000 + Math.random() * 900000000)}`) : itr.acknowledgmentNo;
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
  };

  const handleAddITR = (newITR: Omit<ITRFiling, 'id' | 'lastActivity'>) => {
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

  const handleAddTask = (newTask: MonthlyTask) => {
    setMonthlyTasks((prev) => [newTask, ...prev]);
    showToast(`Task created for ${newTask.tradeName}`);
    addActivityLog('New Task Created', `Scheduled ${newTask.filingType} for ${newTask.period}`, newTask.clientName, 'Task');
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
  const handleAddTicket = (newTicket: StaffTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    showToast(`Logged call ticket ${newTicket.ticketNo} for ${newTicket.tradeName}`);
    addActivityLog(
      'Client Call Logged',
      `Logged inquiry ${newTicket.ticketNo} regarding "${newTicket.subject}"`,
      newTicket.clientName,
      'Client'
    );
  };

  const handleAssignTicket = (ticketId: string, staffId: string) => {
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
  };

  const handleUpdateTicketStatus = (ticketId: string, newStatus: TicketStatus, notes?: string) => {
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
  };

  // Debtors & Payments Handlers
  const handleRecordDebtorPayment = (debtorId: string, amountCleared: number) => {
    let clientName = '';
    setDebtors((prev) =>
      prev.map((d) => {
        if (d.id === debtorId) {
          clientName = d.clientName;
          const newCleared = (d.november?.paymentCleared || 0) + amountCleared;
          const updatedNov = {
            ...d.november,
            paymentCleared: newCleared,
          };
          const newBalance = Math.max(0, updatedNov.outstanding - updatedNov.paymentCleared + updatedNov.currentBilling);
          return {
            ...d,
            november: updatedNov,
            currentBalance: newBalance,
            status: newBalance === 0 ? 'Cleared' : (newBalance < d.currentBalance ? 'Partially Paid' : d.status),
            agingBucket: newBalance === 0 ? '0-30 Days' : d.agingBucket,
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
    <div className="min-h-screen flex bg-[#FAFAFA] dark:bg-[#121214] text-[#1D1D1F] dark:text-[#F5F5F7] font-sans antialiased">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1D1D1F] dark:bg-[#FFFFFF] text-white dark:text-[#1D1D1F] px-3.5 py-2 rounded-[8px] shadow-2xl flex items-center gap-2 text-[13px] font-medium animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-3.5 h-3.5 text-[#34C759]" strokeWidth={2} />
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
      <div className="flex-1 flex flex-col min-w-0">
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

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-6">
          {/* Active staff filter indicator */}
          {activeStaffFilter && (
            <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[6px] px-3 py-2 flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] font-medium text-[10px] flex items-center justify-center">
                  {activeStaffFilter.initials}
                </span>
                <span className="text-[#6E6E73] dark:text-[#8E8E93]">Filtered by:</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{activeStaffFilter.name}</span>
                <span className="text-[#6E6E73] dark:text-[#8E8E93]">({activeStaffFilter.role})</span>
              </div>
              <button
                onClick={() => setSelectedStaffId(null)}
                className="text-[12px] text-[#0071E3] dark:text-[#2997FF] hover:underline"
              >
                Clear Filter
              </button>
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

              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Monthly Filing Queue
                  </h3>
                  <button
                    onClick={() => setActiveTab('monthly')}
                    className="text-[12px] text-[#0071E3] dark:text-[#2997FF] hover:underline"
                  >
                    View All Filings &rarr;
                  </button>
                </div>

                <ComplianceTaskManager
                  tasks={monthlyTasks}
                  staffList={staffList}
                  selectedStaffId={selectedStaffId}
                  onUpdateStatus={handleUpdateMonthlyStatus}
                  onOpenWhatsApp={handleOpenWhatsAppForMonthly}
                  onSelectClient={handleSelectClient}
                />
              </div>
            </div>
          )}

          {/* VIEW: Upcoming Deadlines & Filings (GST Tracker) */}
          {activeTab === 'gst-tracker' && (
            <GSTComplianceTracker
              complianceItems={gstCompliance}
              staffList={staffList}
              selectedStaffId={selectedStaffId}
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

              <div className="pt-6 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
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
              <div className="p-8 bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#FF3B30]/30 text-center max-w-md mx-auto mt-10">
                <ShieldAlert className="w-8 h-8 text-[#FF3B30] mx-auto mb-2 stroke-[1.5]" />
                <h2 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Access Restricted</h2>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                  Employee account management is restricted to Practice Administrators.
                </p>
              </div>
            )
          )}

          {/* VIEW: Activity History (Admin Only) */}
          {activeTab === 'activity' && (
            isAdmin ? (
              <ActivityHistory logs={activityLogs} />
            ) : (
              <div className="p-8 bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-[8px] border border-[#FF3B30]/30 text-center max-w-md mx-auto mt-10">
                <ShieldAlert className="w-8 h-8 text-[#FF3B30] mx-auto mb-2 stroke-[1.5]" />
                <h2 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Access Restricted</h2>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                  Activity logs are restricted to Practice Administrators.
                </p>
              </div>
            )
          )}

          {/* VIEW: Settings */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-5 text-[13px]">
              <div>
                <h1 className="text-[22px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                  Firm Settings
                </h1>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                  Practice details, storage connections, and database parameters
                </p>
              </div>

              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] p-4 rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                <h3 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Practice Profile</h3>
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <span className="text-[#6E6E73] dark:text-[#8E8E93] text-[11px] block">Practice Name</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Shameer and Associates</span>
                  </div>
                  <div>
                    <span className="text-[#6E6E73] dark:text-[#8E8E93] text-[11px] block">Category</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Accountants &amp; Practitioners</span>
                  </div>
                  <div>
                    <span className="text-[#6E6E73] dark:text-[#8E8E93] text-[11px] block">Active Clients</span>
                    <span className="font-tabular text-[#1D1D1F] dark:text-[#F5F5F7]">120 Accounts (50 Monthly Recurring)</span>
                  </div>
                  <div>
                    <span className="text-[#6E6E73] dark:text-[#8E8E93] text-[11px] block">Staff Accounts</span>
                    <span className="font-tabular text-[#1D1D1F] dark:text-[#F5F5F7]">{profiles.length} Verified Users</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] p-4 rounded-[8px] border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Storage &amp; Database Backends</h3>
                  <button
                    onClick={() => setIsIntegrationsOpen(true)}
                    className="text-[12px] text-[#0071E3] dark:text-[#2997FF] hover:underline"
                  >
                    Configure
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px]">
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">Supabase (PostgreSQL with RLS)</span>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block mt-0.5">
                      Client accounts, tasks, debtors ledger, and profiles
                    </span>
                  </div>
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px]">
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">OneDrive (SharePoint Folders)</span>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block mt-0.5">
                      Client folders, invoices, tax acknowledgments
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
