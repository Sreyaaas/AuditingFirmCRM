import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  CheckCircle2, 
  UserPlus, 
  KeyRound,
  ShieldAlert,
  Building2
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/crm';

interface LoginViewProps {
  profiles: UserProfile[];
  onLogin: (userId: string) => void;
  onRegisterEmployee: (profile: Omit<UserProfile, 'id' | 'assignedClientsCount' | 'assignedTasksCount' | 'completedThisMonth'>) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  profiles,
  onLogin,
  onRegisterEmployee,
  theme,
  onToggleTheme,
}) => {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<string>('user-admin-shameer');
  const [email, setEmail] = useState<string>('shameer@shameerassociates.in');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('employee');
  const [regDesignation, setRegDesignation] = useState('Audit Executive');
  const [regSuccess, setRegSuccess] = useState(false);

  // When a quick-login pill/card is clicked:
  const handleQuickSelect = (user: UserProfile) => {
    setSelectedUserForLogin(user.id);
    setEmail(user.email);
    setPassword('••••••••••••');
    setLoginError(null);
    onLogin(user.id);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const user = profiles.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (user) {
      onLogin(user.id);
    } else {
      setLoginError('No registered account found with this email. Please check your spelling or select a quick-login profile below.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;

    onRegisterEmployee({
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      role: regRole,
      designation: regDesignation.trim(),
      phone: regPhone.trim() || '+91 98200 00000',
      status: 'Active',
      joinedDate: new Date().toISOString().slice(0, 10),
      canEditPayments: regRole === 'admin',
      canAccessFinancials: regRole === 'admin',
      initials: regName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
    });

    setRegSuccess(true);
    setTimeout(() => {
      setRegSuccess(false);
      setTab('signin');
      setEmail(regEmail.trim().toLowerCase());
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#121214] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col justify-between selection:bg-[#0071E3]/20 font-sans antialiased transition-colors">
      {/* Top Bar with Firm Name & Theme Toggle */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src="/logo-light.png"
            alt="Shameer and Associates"
            className="h-8 w-auto object-contain block dark:hidden"
          />
          <img
            src="/logo-dark.png"
            alt="Shameer and Associates"
            className="h-8 w-auto object-contain hidden dark:block"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] hidden sm:inline">
            Internal Practice Portal
          </span>
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="w-8 h-8 rounded-[6px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#E5E5EA]/50 dark:hover:bg-[#2C2C2E] flex items-center justify-center transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 stroke-[1.5]" />
            ) : (
              <Sun className="w-4 h-4 stroke-[1.5]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Card Container */}
          <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[12px] p-6 sm:p-8 shadow-sm">
            {/* Header */}
            <div className="text-center space-y-1.5 pb-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <h2 className="text-[19px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                {tab === 'signin' ? 'Sign In to Practice' : 'Request Staff Account'}
              </h2>
              <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93]">
                {tab === 'signin' 
                  ? 'Shameer & Associates • Practice Management CRM' 
                  : 'Submit credentials for admin verification'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-[#F2F2F7] dark:bg-[#242426] rounded-[7px] my-5 text-[12px] font-medium">
              <button
                type="button"
                onClick={() => { setTab('signin'); setLoginError(null); }}
                className={`py-1.5 rounded-[5px] transition-all ${
                  tab === 'signin'
                    ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setLoginError(null); }}
                className={`py-1.5 rounded-[5px] transition-all ${
                  tab === 'register'
                    ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm font-semibold'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Notification */}
            {loginError && (
              <div className="mb-4 p-3 rounded-[6px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-start gap-2 text-[12px] text-[#FF3B30] dark:text-[#FF453A]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Success Notification */}
            {regSuccess && (
              <div className="mb-4 p-3 rounded-[6px] bg-[#34C759]/10 border border-[#34C759]/20 flex items-center gap-2 text-[12px] text-[#34C759]">
                <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[1.5]" />
                <span>Account created successfully! Redirecting to sign in...</span>
              </div>
            )}

            {/* FORM: Sign In */}
            {tab === 'signin' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                    Firm Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#86868B] stroke-[1.5]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@shameerassociates.in"
                      className="w-full pl-9 pr-3 py-2 text-[13px] bg-white dark:bg-[#242426] border border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                      Password
                    </label>
                    <span className="text-[11px] text-[#0071E3] dark:text-[#2997FF] hover:underline cursor-pointer">
                      Forgot?
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#86868B] stroke-[1.5]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-9 py-2 text-[13px] bg-white dark:bg-[#242426] border border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 stroke-[1.5]" />
                      ) : (
                        <Eye className="w-4 h-4 stroke-[1.5]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#D1D1D6] text-[#0071E3] focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Remember this session</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-[6px] text-[13px] font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
                </button>
              </form>
            )}

            {/* FORM: Create Account */}
            {tab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Rahul V"
                    className="w-full px-3 py-2 text-[13px] bg-white dark:bg-[#242426] border border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@shameerassociates.in"
                    className="w-full px-3 py-2 text-[13px] bg-white dark:bg-[#242426] border border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                      Account Role
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 text-[12px] bg-white dark:bg-[#242426] border border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none"
                    >
                      <option value="employee">Audit Employee</option>
                      <option value="admin">Practice Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                      placeholder="e.g. Audit Senior"
                      className="w-full px-3 py-2 text-[12px] bg-white dark:bg-[#242426] border border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98470 00000"
                    className="w-full px-3 py-2 text-[13px] bg-white dark:bg-[#242426] border border-[#D1D1D6] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none"
                  />
                </div>

                <div className="p-2.5 rounded-[6px] bg-[#F2F2F7] dark:bg-[#242426] text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                  Admin rights are verified by CA Shameer or Ameen.
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-[6px] text-[13px] font-medium flex items-center justify-center gap-2 shadow-sm transition-colors mt-2"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span>Create Account</span>
                </button>
              </form>
            )}

            {/* Quick-Access Demo Personas */}
            <div className="mt-6 pt-5 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                <span>One-Click Practice Sign In</span>
                <span>Select User</span>
              </div>

              <div className="space-y-1.5">
                {profiles.map((p) => {
                  const isAdmin = p.role === 'admin';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQuickSelect(p)}
                      className="w-full flex items-center justify-between p-2.5 rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#333336] transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isAdmin 
                            ? 'bg-[#0071E3] text-white' 
                            : 'bg-[#34C759] text-white'
                        }`}>
                          {p.initials || p.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="truncate">
                          <div className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1.5 truncate">
                            <span>{p.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-normal ${
                              isAdmin 
                                ? 'bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF]' 
                                : 'bg-[#34C759]/10 text-[#34C759] dark:bg-[#34C759]/20 dark:text-[#30D158]'
                            }`}>
                              {isAdmin ? 'Admin' : 'Employee'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] truncate">
                            {p.designation}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#86868B] group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] group-hover:translate-x-0.5 transition-all shrink-0 stroke-[1.5]" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Practice Segregation Note */}
          <div className="text-center text-[12px] text-[#86868B] space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[#6E6E73] dark:text-[#8E8E93]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34C759] stroke-[1.5]" />
              <span>Multi-User Role-Based Access Control Enabled</span>
            </div>
            <p>
              Admins (CA Shameer &amp; Ameen) hold full firm authority. Employee (Susmi) handles assigned filings.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-[11px] text-[#86868B] border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
        Shameer &amp; Associates • Accountants and Practitioners • Confidential &amp; Proprietary
      </footer>
    </div>
  );
};
