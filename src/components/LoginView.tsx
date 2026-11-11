import React, { useState } from 'react';
import { Eye, EyeOff, Sun, Moon, ShieldAlert, CheckCircle2, RefreshCw, CalendarClock, Wallet, Users } from 'lucide-react';
import { changePassword, sendPasswordReset, signIn, passwordProblem, MIN_PASSWORD_LENGTH } from '../services/authService';
import { BrandLogo, Button, Card, Field, IconButton, Input, cn } from './ui';

interface ShellProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  children: React.ReactNode;
}

const HIGHLIGHTS = [
  { icon: CalendarClock, title: 'Every due date in one place', text: 'GSTR-1, GSTR-3B, TDS and ITR deadlines, flagged before they slip.' },
  { icon: Wallet, title: 'Fees followed up', text: 'Month-by-month balances with one-tap WhatsApp reminders.' },
  { icon: Users, title: 'The whole team, in step', text: 'Clear owners for every client, task and call.' },
];

const AuthShell: React.FC<ShellProps> = ({ theme, onToggleTheme, children }) => (
  <div className="min-h-screen bg-canvas text-fg flex">
    {/* Firm panel — solid theme ink, typography only */}
    <aside className="hidden lg:flex w-[44%] max-w-[560px] shrink-0 flex-col justify-between bg-ink text-ink-fg px-12 py-10">
      {/* Inverse logo: light artwork on the navy panel in light themes, dark artwork on the light panel in dark themes */}
      <BrandLogo size="lg" inverse />

      <div className="max-w-sm">
        <h2 className="text-3xl font-semibold tracking-tight leading-tight">Your clients, filings and fees — calmly in order.</h2>
        <ul className="mt-10 space-y-6">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5">
              <span className="w-8 h-8 rounded-md bg-ink-fg/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-sm font-medium">{title}</div>
                <div className="text-sm opacity-65 mt-0.5 leading-5">{text}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs opacity-50">© {new Date().getFullYear()} Shameer &amp; Associates · Kerala</p>
    </aside>

    {/* Sign-in side */}
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 px-6 flex items-center justify-between">
        <BrandLogo size="sm" className="lg:invisible" />
        <IconButton icon={theme === 'light' ? Moon : Sun} label="Toggle Theme" onClick={onToggleTheme} />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
      <footer className="h-12 px-6 flex items-center justify-center text-xs text-fg-faint lg:hidden">
        Shameer &amp; Associates · Accountants and Practitioners
      </footer>
    </div>
  </div>
);

const Notice: React.FC<{ tone: 'error' | 'success'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    className={cn(
      'mb-4 flex items-start gap-2 px-3 py-2.5 rounded-md border text-sm animate-fade-in',
      tone === 'error' ? 'border-danger/25 text-danger' : 'border-success/25 text-fg'
    )}
  >
    {tone === 'error' ? <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-success" strokeWidth={1.75} />}
    <span>{children}</span>
  </div>
);

const PasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className={cn('h-9 pr-9', props.className)} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
      </button>
    </div>
  );
};

/** Email + password sign-in against Supabase Auth. There is no sign-up: admins create logins. */
export const LoginView: React.FC<{ theme: 'light' | 'dark'; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (next: 'signin' | 'reset') => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
    // On success the auth listener in App takes over.
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await sendPasswordReset(email);
    setBusy(false);
    if (res.error) setError(res.error);
    else setInfo('If an account exists for this email, a reset link is on its way.');
  };

  return (
    <AuthShell theme={theme} onToggleTheme={onToggleTheme}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{mode === 'signin' ? 'Sign in' : 'Reset password'}</h1>
        <p className="text-sm text-fg-subtle mt-1">
          {mode === 'signin' ? 'Use the email and password your administrator gave you.' : 'We will email you a link to choose a new password.'}
        </p>
      </div>

      <Card className="p-6">
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}

        {mode === 'signin' ? (
          <form onSubmit={submitSignIn} className="space-y-4">
            <Field label="Email">
              <Input type="email" required autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-fg-muted">Password</label>
                <button type="button" onClick={() => switchMode('reset')} className="text-xs text-fg-subtle hover:text-fg">
                  Forgot password?
                </button>
              </div>
              <PasswordInput required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={busy} icon={busy ? RefreshCw : undefined} className={cn('w-full', busy && '[&_svg]:animate-spin')}>
              {busy ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="space-y-4">
            <Field label="Email">
              <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
            </Field>
            <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
              {busy ? 'Sending…' : 'Send Reset Link'}
            </Button>
            <button type="button" onClick={() => switchMode('signin')} className="w-full text-sm text-fg-subtle hover:text-fg">
              Back to sign in
            </button>
          </form>
        )}
      </Card>
    </AuthShell>
  );
};

/** Shown after following a password-reset email link. */
export const SetNewPasswordView: React.FC<{ theme: 'light' | 'dark'; onToggleTheme: () => void; onDone: () => void }> = ({ theme, onToggleTheme, onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    const res = await changePassword('', null, password);
    setBusy(false);
    if (res.error) setError(res.error);
    else onDone();
  };

  const problem = password ? passwordProblem(password) : null;

  return (
    <AuthShell theme={theme} onToggleTheme={onToggleTheme}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Choose a new password</h1>
        <p className="text-sm text-fg-subtle mt-1">At least {MIN_PASSWORD_LENGTH} characters, with letters and numbers.</p>
      </div>
      <Card className="p-6">
        {error && <Notice tone="error">{error}</Notice>}
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" error={problem || undefined}>
            <PasswordInput required autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm password">
            <PasswordInput required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
            {busy ? 'Saving…' : 'Save Password'}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
};
