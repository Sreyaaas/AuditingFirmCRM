import React, { useEffect, useState } from 'react';
import { Search, Plus, Sun, Moon, Check, ChevronDown, Menu, LogOut } from 'lucide-react';
import { UserProfile } from '../types/crm';
import { Avatar, Button, IconButton, Kbd, cn } from './ui';

interface HeaderProps {
  activeTab: string;
  onOpenCommandPalette: () => void;
  currentUser: UserProfile;
  profiles: UserProfile[];
  onSwitchUser: (userId: string) => void;
  onLogout?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenNewTask: () => void;
  onOpenIntegrations: () => void;
  onToggleMobileSidebar?: () => void;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Overview',
  'gst-tracker': 'Deadlines',
  monthly: 'GST & Audit',
  itr: 'ITR Returns',
  clients: 'Clients',
  debtors: 'Debtors',
  staff: 'Calls & Tickets',
  employees: 'Team',
  activity: 'Audit Trail',
  settings: 'Settings',
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenCommandPalette,
  currentUser,
  profiles,
  onSwitchUser,
  onLogout,
  theme,
  onToggleTheme,
  onOpenNewTask,
  onToggleMobileSidebar,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const title = TAB_TITLES[activeTab] || 'Overview';

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsUserMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isUserMenuOpen]);

  return (
    <header className="h-14 px-4 sm:px-6 flex items-center gap-4 border-b border-line bg-canvas shrink-0 z-20">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onToggleMobileSidebar && (
          <IconButton icon={Menu} label="Toggle navigation menu" onClick={onToggleMobileSidebar} className="lg:hidden -ml-1.5" />
        )}
        <nav className="flex items-center gap-1.5 min-w-0 text-sm">
          <span className="hidden sm:inline text-fg-subtle truncate">Shameer &amp; Associates</span>
          <span className="hidden sm:inline text-fg-faint">/</span>
          <h1 className="font-medium text-fg truncate">{title}</h1>
        </nav>
      </div>

      {/* Right — h-8 controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex w-64 lg:w-72 h-8 pl-2.5 pr-1.5 rounded-md bg-surface border border-line hover:border-line-strong items-center justify-between text-sm text-fg-faint transition-colors"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="truncate">Search clients, filings…</span>
          </span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <IconButton icon={Search} label="Search" onClick={onOpenCommandPalette} className="md:hidden" />

        <IconButton
          icon={theme === 'light' ? Moon : Sun}
          label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          onClick={onToggleTheme}
        />

        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen((v) => !v)}
            className={cn(
              'h-8 flex items-center gap-2 pl-1 pr-2 rounded-md text-sm font-medium text-fg hover:bg-hover transition-colors',
              isUserMenuOpen && 'bg-hover'
            )}
          >
            <Avatar initials={initialsOf(currentUser.name)} size="sm" />
            <span className="hidden sm:inline truncate max-w-[120px]">{currentUser.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-fg-subtle" strokeWidth={1.75} />
          </button>

          {isUserMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-64 bg-surface rounded-lg shadow-pop z-50 p-1 animate-pop-in" onClick={(e) => e.stopPropagation()}>
                <div className="px-2.5 py-2.5 flex items-center gap-2.5">
                  <Avatar initials={initialsOf(currentUser.name)} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg truncate">{currentUser.name}</div>
                    <div className="text-xs text-fg-subtle truncate">{currentUser.designation}</div>
                  </div>
                </div>
                <div className="h-px bg-line my-1" />
                <div className="eyebrow px-2.5 pt-1.5 pb-1">Switch user</div>
                {profiles.map((p) => {
                  const selected = p.id === currentUser.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSwitchUser(p.id);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left hover:bg-hover transition-colors"
                    >
                      <Avatar initials={initialsOf(p.name)} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-fg truncate">{p.name}</div>
                        <div className="text-xs text-fg-subtle truncate capitalize">{p.role} · {p.designation}</div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-fg shrink-0" strokeWidth={2} />}
                    </button>
                  );
                })}
                <div className="h-px bg-line my-1" />
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm text-fg-muted hover:text-danger hover:bg-hover transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>

        <Button variant="primary" icon={Plus} onClick={onOpenNewTask} className="ml-1">
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>
    </header>
  );
};
