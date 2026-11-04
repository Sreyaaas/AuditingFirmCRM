import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ArrowRight, 
  FileText, 
  Receipt, 
  Users, 
  ShieldCheck, 
  PhoneCall, 
  Plus, 
  Sun, 
  Moon, 
  User, 
  Check, 
  Calendar,
  X
} from 'lucide-react';
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build items list
  const navigationItems = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', category: 'Navigation', icon: Calendar, action: () => onNavigateTab('dashboard') },
    { id: 'nav-gst', label: 'Go to Upcoming Deadlines & Filings', category: 'Navigation', icon: ShieldCheck, action: () => onNavigateTab('gst-tracker') },
    { id: 'nav-monthly', label: 'Go to Monthly Work (GST & Audit)', category: 'Navigation', icon: FileText, action: () => onNavigateTab('monthly') },
    { id: 'nav-itr', label: 'Go to Annual Tax Returns (ITR)', category: 'Navigation', icon: FileText, action: () => onNavigateTab('itr') },
    { id: 'nav-clients', label: 'Go to Clients', category: 'Navigation', icon: Users, action: () => onNavigateTab('clients') },
    { id: 'nav-debtors', label: 'Go to Debtors', category: 'Navigation', icon: Receipt, action: () => onNavigateTab('debtors') },
    { id: 'nav-calls', label: 'Go to Client Calls & Follow-ups', category: 'Navigation', icon: PhoneCall, action: () => onNavigateTab('staff') },
  ];

  if (currentUser.role === 'admin') {
    navigationItems.push({ id: 'nav-employees', label: 'Go to Team', category: 'Navigation', icon: User, action: () => onNavigateTab('employees') });
  }

  const actionItems = [
    { id: 'act-task', label: 'Add New Monthly Task', category: 'Actions', icon: Plus, action: () => { onClose(); onOpenNewTask(); } },
    { id: 'act-call', label: 'Log Inbound Client Call', category: 'Actions', icon: PhoneCall, action: () => { onClose(); onOpenNewTicket(); } },
    { id: 'act-theme', label: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, category: 'Actions', icon: theme === 'light' ? Moon : Sun, action: () => { onToggleTheme(); onClose(); } },
  ];

  if (onOpenQuickPayment) {
    actionItems.unshift({ id: 'act-pay', label: 'Record Client Fee Payment', category: 'Actions', icon: Receipt, action: () => { onClose(); onOpenQuickPayment(); } });
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
      label: `${c.tradeName} (${c.clientCode})`,
      category: 'Clients',
      meta: c.entityType,
      icon: Users,
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#1C1C1E] rounded-apple-md border border-[#E5E5EA] dark:border-[#38383A] shadow-apple-sheet dark:shadow-apple-dark-sheet overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Spotlight Input */}
        <div className="flex items-center px-4 py-3 border-b border-[#E5E5EA] dark:border-[#38383A] gap-3">
          <Search className="w-4 h-4 text-[#86868B]" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search clients..."
            className="w-full bg-transparent text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#86868B] focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#86868B] bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto py-1">
          {combinedItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-[#86868B]">
              No commands or clients matching "{query}"
            </div>
          ) : (
            combinedItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-2 flex items-center justify-between cursor-pointer text-[13px] transition-colors ${
                    isSelected 
                      ? 'bg-[#0071E3] text-white' 
                      : 'text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#86868B]'}`} strokeWidth={1.5} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-mono ${isSelected ? 'text-white/80' : 'text-[#86868B]'}`}>
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#E5E5EA] dark:border-[#38383A] bg-[#FAFAFA] dark:bg-[#141416] flex items-center justify-between text-[11px] text-[#86868B] font-mono">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; Navigate</span>
            <span>&crarr; Select</span>
            <span>ESC Close</span>
          </div>
          <span>Shameer &amp; Associates</span>
        </div>
      </div>
    </div>
  );
};

