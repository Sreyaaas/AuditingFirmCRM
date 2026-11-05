import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Wallet, Users, PhoneCall, Plus, Sun, Moon, LayoutGrid, CalendarClock, ListChecks, Building2, CornerDownLeft } from 'lucide-react';
import { Kbd, cn } from './ui';
import { Client, UserProfile } from '../types/crm';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  profiles: UserProfile[];
  currentUser: UserProfile;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectClient: (clientId: string) => void;
  onSwitchUser: (userId: string) => void;
  onOpenNewTask: () => void;
  onOpenNewTicket: () => void;
  onOpenQuickPayment?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  clients,
  profiles,
  currentUser,
  theme,
  onToggleTheme,
  onNavigateTab,
  onSelectClient,
  onSwitchUser,
  onOpenNewTask,
  onOpenNewTicket,
  onOpenQuickPayment,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build items list
  const navigationItems = [
    { id: 'nav-dashboard', label: 'Overview', category: 'Go to', icon: LayoutGrid, action: () => onNavigateTab('dashboard') },
    { id: 'nav-gst', label: 'Deadlines', category: 'Go to', icon: CalendarClock, action: () => onNavigateTab('gst-tracker') },
    { id: 'nav-monthly', label: 'GST & Audit', category: 'Go to', icon: ListChecks, action: () => onNavigateTab('monthly') },
    { id: 'nav-itr', label: 'ITR Returns', category: 'Go to', icon: FileText, action: () => onNavigateTab('itr') },
    { id: 'nav-clients', label: 'Clients', category: 'Go to', icon: Building2, action: () => onNavigateTab('clients') },
    { id: 'nav-debtors', label: 'Debtors', category: 'Go to', icon: Wallet, action: () => onNavigateTab('debtors') },
    { id: 'nav-calls', label: 'Calls & Tickets', category: 'Go to', icon: PhoneCall, action: () => onNavigateTab('staff') },
  ];

  if (currentUser.role === 'admin') {
    navigationItems.push({ id: 'nav-employees', label: 'Team', category: 'Go to', icon: Users, action: () => onNavigateTab('employees') });
  }

  const actionItems = [
    { id: 'act-task', label: 'New compliance task', category: 'Actions', icon: Plus, action: () => { onClose(); onOpenNewTask(); } },
    { id: 'act-call', label: 'Log client call', category: 'Actions', icon: PhoneCall, action: () => { onClose(); onOpenNewTicket(); } },
    { id: 'act-theme', label: `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`, category: 'Actions', icon: theme === 'light' ? Moon : Sun, action: () => { onToggleTheme(); onClose(); } },
  ];

  if (onOpenQuickPayment) {
    actionItems.unshift({ id: 'act-pay', label: 'Record fee payment', category: 'Actions', icon: Wallet, action: () => { onClose(); onOpenQuickPayment(); } });
  }

  // Client search items
  const clientItems = clients
    .filter((c) => {
      if (!query.trim()) return false;
      const q = query.toLowerCase();
      return (
        c.tradeName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q)
      );
    })
    .slice(0, 6)
    .map((c) => ({
      id: `client-${c.id}`,
      label: c.tradeName,
      category: 'Clients',
      meta: c.entityType,
      icon: Building2,
      action: () => {
        onClose();
        onSelectClient(c.id);
      },
    }));

  const combinedItems = [
    ...clientItems,
    ...navigationItems.filter((item) => !query.trim() || item.label.toLowerCase().includes(query.toLowerCase())),
    ...actionItems.filter((item) => !query.trim() || item.label.toLowerCase().includes(query.toLowerCase())),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, combinedItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedItems.length) % Math.max(1, combinedItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = combinedItems[selectedIndex];
      if (current) {
        current.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let runningIndex = -1;
  const groups = (['Clients', 'Go to', 'Actions'] as const)
    .map((cat) => ({ cat, items: combinedItems.filter((it) => it.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface rounded-xl shadow-dialog overflow-hidden animate-dialog-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center h-12 px-4 border-b border-line gap-3">
          <Search className="w-4 h-4 text-fg-subtle shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search clients or type a command"
            className="w-full bg-transparent text-base text-fg placeholder:text-fg-faint focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {combinedItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-fg-subtle">No results for “{query}”</div>
          ) : (
            groups.map((g) => (
              <div key={g.cat} className="pb-1">
                <div className="eyebrow px-2.5 pt-2 pb-1">{g.cat}</div>
                {g.items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isSelected = idx === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseMove={() => selectedIndex !== idx && setSelectedIndex(idx)}
                      className={cn(
                        'h-9 px-2.5 rounded-md flex items-center justify-between gap-3 cursor-pointer text-sm',
                        isSelected ? 'bg-hover text-fg' : 'text-fg-muted'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={cn('w-4 h-4 shrink-0', isSelected ? 'text-fg' : 'text-fg-subtle')} strokeWidth={1.75} />
                        <span className="truncate">{item.label}</span>
                        {'meta' in item && typeof item.meta === 'string' && <span className="text-xs text-fg-subtle truncate">{item.meta}</span>}
                      </div>
                      {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-fg-subtle shrink-0" strokeWidth={1.75} />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="h-9 px-4 border-t border-line bg-subtle/60 flex items-center gap-4 text-xs text-fg-subtle">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            Open
          </span>
        </div>
      </div>
    </div>
  );
};
