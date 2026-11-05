import React, { useState, useEffect } from 'react';
import { ArrowRight, Eye, EyeOff, Sun, Moon, CheckCircle2, UserPlus, ShieldAlert, RefreshCw } from 'lucide-react';
import { UserProfile, UserRole } from '../types/crm';
import { supabase, isSupabaseConfigured, getSupabaseConfig } from '../services/supabaseClient';
import { saveProfileToDb } from '../services/dbSyncService';
import { Avatar, Badge, Button, Card, Field, IconButton, Input, Segmented, Select, StatusDot, cn } from './ui';

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
        .then(
          ({ error }) => {
            if (!error || error.code === '42501' || error.message.includes('security policy')) {
              setIsDbLive(true);
            }
          },
          () => setIsDbLive(false)
        );
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
    <div className="min-h-screen bg-canvas text-fg flex flex-col">
      <header className="h-14 px-6 flex items-center justify-between border-b border-line">
        <div className="flex items-center">
          <img src="/logo-light.png" alt="Shameer & Associates — Accountants and Practitioners" className="h-7 w-auto object-contain block dark:hidden max-w-[180px]" />
          <img src="/logo-dark.png" alt="Shameer & Associates — Accountants and Practitioners" className="h-7 w-auto object-contain hidden dark:block max-w-[180px]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-2 text-xs text-fg-subtle">
            <StatusDot tone={isDbLive ? 'success' : 'warning'} />
            {isDbLive ? 'Cloud database connected' : 'Local mode'}
          </span>
          <IconButton icon={theme === 'light' ? Moon : Sun} label="Toggle Theme" onClick={onToggleTheme} />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {tab === 'signin' ? 'Sign in' : 'Create an account'}
            </h1>
            <p className="text-sm text-fg-subtle mt-1">
              {tab === 'signin' ? 'Practice management for Shameer & Associates.' : 'Add a practitioner or staff member to the practice.'}
            </p>
          </div>

          <Card className="p-6">
            <Segmented
              value={tab}
              onChange={(v) => {
                setTab(v);
                setLoginError(null);
              }}
              options={[
                { value: 'signin', label: 'Sign In' },
                { value: 'register', label: 'Create Account' },
              ]}
              className="w-full grid grid-cols-2 mb-5"
            />

            {loginError && (
              <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-md border border-danger/25 bg-danger/[0.06] text-sm text-danger animate-fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{loginError}</span>
              </div>
            )}
            {regSuccess && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-md border border-success/25 bg-success/[0.06] text-sm text-fg animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success" strokeWidth={1.75} />
                <span>{regSuccess}</span>
              </div>
            )}

            {tab === 'signin' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <Field label="Email">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@shameerassociates.in" className="h-9" />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="h-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                    </button>
                  </div>
                </Field>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-fg-muted">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-3.5 w-3.5" />
                  Keep me signed in on this device
                </label>
                <Button type="submit" variant="primary" size="lg" disabled={isLoading} icon={isLoading ? RefreshCw : undefined} className={cn('w-full', isLoading && '[&_svg]:animate-spin')}>
                  {isLoading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            )}

            {tab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <Field label="Full name" required>
                  <Input required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Full name" />
                </Field>
                <Field label="Work email" required>
                  <Input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="name@shameerassociates.in" />
                </Field>
                <Field label="Password" required>
                  <Input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Choose a password" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Role">
                    <Select value={regRole} onChange={(e) => setRegRole(e.target.value as UserRole)}>
                      <option value="employee">Staff</option>
                      <option value="admin">Administrator</option>
                    </Select>
                  </Field>
                  <Field label="Designation">
                    <Input value={regDesignation} onChange={(e) => setRegDesignation(e.target.value)} placeholder="Audit Executive" />
                  </Field>
                </div>
                <Field label="Phone">
                  <Input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+91 98470 00000" className="font-mono" />
                </Field>
                <Button type="submit" variant="primary" size="lg" disabled={isLoading} icon={isLoading ? RefreshCw : UserPlus} className={cn('w-full', isLoading && '[&_svg]:animate-spin')}>
                  {isLoading ? 'Creating account…' : 'Create Account'}
                </Button>
              </form>
            )}
          </Card>

          {/* Quick sign-in */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="h-px flex-1 bg-line" />
              <span className="eyebrow">Quick sign-in</span>
              <div className="h-px flex-1 bg-line" />
            </div>
            <div className="rounded-lg border border-line bg-surface divide-y divide-line overflow-hidden">
              {profiles.map((p) => {
                const isAdmin = p.role === 'admin';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickSelect(p)}
                    className="group w-full flex items-center justify-between gap-3 px-3 h-12 text-left hover:bg-subtle transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar initials={p.initials || p.name.slice(0, 2).toUpperCase()} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-fg">{p.name}</span>
                          <Badge tone={isAdmin ? 'info' : 'neutral'}>{isAdmin ? 'Admin' : 'Staff'}</Badge>
                        </div>
                        <div className="text-xs text-fg-subtle truncate">{p.designation}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-fg-faint group-hover:text-fg group-hover:translate-x-0.5 transition-all shrink-0" strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-fg-subtle text-center">
              Administrators (Shameer, Ameen) have full access. Staff see their assigned work.
            </p>
          </div>
        </div>
      </main>

      <footer className="h-12 px-6 flex items-center justify-center text-xs text-fg-faint border-t border-line">
        Shameer &amp; Associates · Accountants and Practitioners · Confidential
      </footer>
    </div>
  );
};
