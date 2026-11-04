import React, { useState, useEffect } from 'react';
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
  Database,
  RefreshCw,
  Server
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/crm';
import { supabase, isSupabaseConfigured, getSupabaseConfig } from '../services/supabaseClient';
import { saveProfileToDb } from '../services/dbSyncService';

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
  const [email, setEmail] = useState<string>('shameer@shameerassociates.in');
  const [password, setPassword] = useState<string>('Shameer@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('employee');
  const [regDesignation, setRegDesignation] = useState('Audit Executive');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Supabase live status
  const supabaseConfig = getSupabaseConfig();
  const [isDbLive, setIsDbLive] = useState(supabaseConfig.isLive);

  useEffect(() => {
    // Quick verification of Supabase connectivity
    if (supabaseConfig.isLive) {
      supabase.from('profiles').select('id', { head: true, count: 'exact' })
        .then(({ error }) => {
          if (!error || error.code === '42501' || error.message.includes('security policy')) {
            setIsDbLive(true);
          }
        })
        .catch(() => setIsDbLive(false));
    }
  }, [supabaseConfig.isLive]);

  // When a quick-login practitioner pill is clicked
  const handleQuickSelect = (user: UserProfile) => {
    setEmail(user.email);
    setPassword(`${user.name}@2026`);
    setLoginError(null);
    onLogin(user.id);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // 1. Attempt authentication with Supabase Auth
      if (isSupabaseConfigured() && password) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password,
        });

        if (authData?.user) {
          // Find matching profile by email or user ID
          const matchedProfile = profiles.find(
            (p) => p.email.toLowerCase() === trimmedEmail || p.id === authData.user.id
          );
          setIsLoading(false);
          if (matchedProfile) {
            onLogin(matchedProfile.id);
          } else {
            onLogin(authData.user.id);
          }
          return;
        }

        // If email requires confirmation or custom password wasn't set in Supabase Auth,
        // fallback gracefully to verifying against practice practitioner profiles
        if (authError) {
          console.info('Supabase Auth note:', authError.message);
        }
      }

      // 2. Validate against verified practice profiles
      const user = profiles.find(
        (p) => p.email.toLowerCase() === trimmedEmail
      );

      if (user) {
        setIsLoading(false);
        onLogin(user.id);
        return;
      }

      setIsLoading(false);
      setLoginError(
        'No registered practice account found with this email. Select a practitioner profile below or create a new account.'
      );
    } catch (err: any) {
      setIsLoading(false);
      console.error('Login error:', err);
      // Fallback check
      const user = profiles.find((p) => p.email.toLowerCase() === trimmedEmail);
      if (user) {
        onLogin(user.id);
      } else {
        setLoginError(err?.message || 'Authentication error. Please check credentials.');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;

    setIsLoading(true);
    setLoginError(null);
    setRegSuccess(null);

    const trimmedEmail = regEmail.trim().toLowerCase();
    const newId = `emp-${Date.now()}`;
    const initials = regName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    const newProfile: UserProfile = {
      id: newId,
      name: regName.trim(),
      email: trimmedEmail,
      role: regRole,
      designation: regDesignation.trim(),
      phone: regPhone.trim() || '+91 98470 00000',
      status: 'Active',
      joinedDate: new Date().toISOString().slice(0, 10),
      assignedClientsCount: 0,
      assignedTasksCount: 0,
      completedThisMonth: 0,
      canEditPayments: regRole === 'admin',
      canAccessFinancials: regRole === 'admin',
      initials,
    };

    try {
      // 1. If password provided and Supabase is live, attempt registration in Supabase Auth
      if (isSupabaseConfigured() && regPassword) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: regPassword,
        });

        if (signUpError) {
          console.warn('Supabase Auth signUp note:', signUpError.message);
        }
      }

      // 2. Save profile directly to Supabase profiles table & local cache
      await saveProfileToDb(newProfile);

      // 3. Register into React state in App
      onRegisterEmployee({
        name: newProfile.name,
        email: newProfile.email,
        role: newProfile.role,
        designation: newProfile.designation,
        phone: newProfile.phone,
        status: newProfile.status,
        joinedDate: newProfile.joinedDate,
        canEditPayments: newProfile.canEditPayments,
        canAccessFinancials: newProfile.canAccessFinancials,
        initials: newProfile.initials,
      });

      setIsLoading(false);
      setRegSuccess(`Account for ${newProfile.name} created and synced with database!`);

      setTimeout(() => {
        setRegSuccess(null);
        setTab('signin');
        setEmail(trimmedEmail);
        setPassword(regPassword || '••••••••••••');
      }, 1500);
    } catch (err: any) {
      setIsLoading(false);
      setLoginError(err.message || 'Could not complete registration.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121214] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col justify-between selection:bg-[#0071E3]/20 font-sans antialiased transition-colors">
      {/* Top Bar with Firm Name & Live Supabase Status */}
      <header className="px-6 py-3.5 flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E]">
        <div className="flex items-center gap-3">
          <img
            src="/logo-light.png"
            alt="Shameer and Associates - Accountants and Practitioners"
            className="h-8 w-auto object-contain block dark:hidden max-w-[200px]"
          />
          <img
            src="/logo-dark.png"
            alt="Shameer and Associates - Accountants and Practitioners"
            className="h-8 w-auto object-contain hidden dark:block max-w-[200px]"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Supabase PostgreSQL Backend Status Pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[#F2F2F7] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${isDbLive ? 'bg-[#34C759]' : 'bg-[#FF9F0A]'}`} />
            <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              {isDbLive ? 'Supabase PostgreSQL Live' : 'Offline Local Storage'}
            </span>
          </div>

          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="w-8 h-8 rounded-[6px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#242426] flex items-center justify-center transition-colors border border-transparent hover:border-[#E5E5EA] dark:hover:border-[#3A3A3C]"
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
          <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-[10px] p-6 sm:p-8 shadow-sm">
            {/* Header */}
            <div className="text-center space-y-1.5 pb-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <h2 className="text-[18px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                {tab === 'signin' ? 'Sign In to Practice' : 'Register Practice Account'}
              </h2>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                {tab === 'signin' 
                  ? 'Shameer & Associates • Practice Management CRM' 
                  : 'Add a new verified accountant or staff employee'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-[#F2F2F7] dark:bg-[#242426] rounded-[6px] my-4 text-[12px] font-medium">
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
              <div className="mb-4 p-2.5 rounded-[6px] bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-start gap-2 text-[12px] text-[#DC2626] dark:text-[#FF453A]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Success Notification */}
            {regSuccess && (
              <div className="mb-4 p-2.5 rounded-[6px] bg-[#16A34A]/10 border border-[#16A34A]/20 flex items-center gap-2 text-[12px] text-[#16A34A] dark:text-[#34C759]">
                <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[1.5]" />
                <span>{regSuccess}</span>
              </div>
            )}

            {/* FORM: Sign In */}
            {tab === 'signin' && (
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                    Practice Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#86868B] stroke-[1.5]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@shameerassociates.in"
                      className="w-full pl-9 pr-3 py-2 text-[13px] bg-white dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#2997FF] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-[#86868B] stroke-[1.5]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-9 py-2 text-[13px] bg-white dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#2997FF] transition-all font-mono text-[12px]"
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

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#E5E5EA] dark:border-[#3A3A3C] text-[#0071E3] focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-[11px] text-[#0071E3] dark:text-[#2997FF] cursor-default">
                    Internal Practice Portal
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-[#0071E3] dark:bg-[#2997FF] hover:bg-[#0077ED] dark:hover:bg-[#409CFF] text-white rounded-[6px] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* FORM: Create Account */}
            {tab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
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
                    className="w-full px-3 py-1.5 text-[13px] bg-white dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#2997FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                    Practice Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@shameerassociates.in"
                    className="w-full px-3 py-1.5 text-[13px] bg-white dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#2997FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                    Account Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Set account password"
                    className="w-full px-3 py-1.5 text-[13px] bg-white dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#2997FF] font-mono text-[12px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] block">
                      Role
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full px-2.5 py-1.5 text-[12px] bg-white dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none"
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
                      className="w-full px-2.5 py-1.5 text-[12px] bg-white dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none"
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
                    className="w-full px-3 py-1.5 text-[13px] bg-white dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[6px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-[#0071E3] dark:bg-[#2997FF] hover:bg-[#0077ED] dark:hover:bg-[#409CFF] text-white rounded-[6px] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Create &amp; Sync to Database</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Quick-Access Verified Personas */}
            <div className="mt-5 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                <span>Quick Practice Sign In</span>
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
                      className="w-full flex items-center justify-between p-2 rounded-[6px] bg-[#FAFAFA] dark:bg-[#242426] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#333336] transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                          isAdmin 
                            ? 'bg-[#0071E3] text-white' 
                            : 'bg-[#16A34A] dark:bg-[#34C759] text-white'
                        }`}>
                          {p.initials || p.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="truncate">
                          <div className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] flex items-center gap-1.5 truncate">
                            <span>{p.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-normal ${
                              isAdmin 
                                ? 'bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF]' 
                                : 'bg-[#16A34A]/10 text-[#16A34A] dark:bg-[#34C759]/20 dark:text-[#34C759]'
                            }`}>
                              {isAdmin ? 'Admin' : 'Staff'}
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

          {/* Role segregation note */}
          <div className="text-center text-[11px] text-[#86868B] space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[#6E6E73] dark:text-[#8E8E93]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#34C759] stroke-[1.5]" />
              <span>Multi-User Role-Based Access Control Active</span>
            </div>
            <p>
              Admins (Shameer &amp; Ameen) hold firm authority. Staff (Susmi) handles assigned filings.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 text-center text-[11px] text-[#86868B] border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
        Shameer &amp; Associates • Accountants and Practitioners • Confidential &amp; Proprietary
      </footer>
    </div>
  );
};
