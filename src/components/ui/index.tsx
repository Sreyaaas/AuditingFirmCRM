/**
 * Shared UI primitives.
 * All styling resolves to theme tokens (see tailwind.config.js / index.css).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, Search, Check, type LucideIcon } from 'lucide-react';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/* ---------------------------------------------------------------- Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-ink-fg hover:bg-ink-hover shadow-xs',
  accent: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-xs',
  secondary: 'bg-surface text-fg border border-line-strong hover:bg-subtle shadow-xs',
  ghost: 'text-fg-muted hover:text-fg hover:bg-hover',
  danger: 'bg-surface text-danger border border-line-strong hover:bg-danger/5 hover:border-danger/40',
  link: 'text-accent hover:underline underline-offset-2 px-0 h-auto',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-1.5',
  lg: 'h-9 px-4 text-sm gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, className, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-md font-medium transition-colors',
        'disabled:opacity-45 disabled:pointer-events-none select-none',
        buttonSizes[size],
        buttonVariants[variant],
        className
      )}
      {...rest}
    >
      {Icon && <Icon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', '-ml-0.5')} strokeWidth={1.75} />}
      {children}
      {IconRight && <IconRight className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', '-mr-0.5')} strokeWidth={1.75} />}
    </button>
  )
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: 'sm' | 'md';
  bordered?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon: Icon, label, size = 'md', bordered, className, type = 'button', ...rest }) => (
  <button
    type={type}
    aria-label={label}
    title={rest.title ?? label}
    className={cn(
      'inline-flex items-center justify-center shrink-0 rounded-md text-fg-subtle transition-colors hover:text-fg hover:bg-hover',
      'disabled:opacity-40 disabled:pointer-events-none',
      size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
      bordered && 'border border-line bg-surface',
      className
    )}
    {...rest}
  >
    <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} strokeWidth={1.75} />
  </button>
);

/* ----------------------------------------------------------- Form fields */

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} className={cn('control', className)} {...rest} />
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea ref={ref} className={cn('control h-auto min-h-[84px] py-2 leading-5 resize-y', className)} {...rest} />
  )
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn(
        'control appearance-none pr-8 cursor-pointer bg-no-repeat bg-[length:14px] bg-[right_8px_center]',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E\")]",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...rest }) => (
  <label className={cn('block text-xs font-medium text-fg-muted mb-1.5', className)} {...rest} />
);

export interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, hint, error, required, htmlFor, className, children }) => (
  <div className={cn('min-w-0', className)}>
    {label && (
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </Label>
    )}
    {children}
    {error ? (
      <p className="mt-1 text-xs text-danger">{error}</p>
    ) : hint ? (
      <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
    ) : null}
  </div>
);

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ wrapperClassName, className, ...rest }) => (
  <div className={cn('relative min-w-0', wrapperClassName)}>
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-faint pointer-events-none" strokeWidth={1.75} />
    <input className={cn('control pl-8', className)} {...rest} />
  </div>
);

/* --------------------------------------------------------- Badge / Dot */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** Text colour for tags. Info stays neutral — blue is reserved for focus and links. */
const toneText: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  info: 'text-fg-muted',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

const toneDot: Record<Tone, string> = {
  neutral: 'bg-fg-faint',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-accent',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

/**
 * Two forms:
 * - `dot` → a status: plain medium-weight text in the tone colour. No dot, fill or border.
 * - no dot → a tag: hairline outline, no tint; tone only affects the text colour.
 */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', dot, className, children, ...rest }) =>
  dot ? (
    <span className={cn('inline-flex items-center text-xs font-medium whitespace-nowrap leading-none', toneText[tone], tone === 'info' && 'text-fg', className)} {...rest}>
      {children}
    </span>
  ) : (
    <span
      className={cn(
        'inline-flex items-center h-5 px-1.5 rounded-[4px] border border-line text-2xs font-medium whitespace-nowrap leading-none',
        toneText[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );

export const StatusDot: React.FC<{ tone?: Tone; className?: string; title?: string }> = ({ tone = 'neutral', className, title }) => (
  <span title={title} className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', toneDot[tone], className)} />
);

/** Maps the CRM's free-text statuses to a tone. */
export const statusTone = (status?: string | null): Tone => {
  const s = (status || '').toLowerCase();
  if (/(filed|cleared|paid|complete|resolved|active|verified|connected|done|closed|settled)/.test(s)) return 'success';
  if (/(overdue|critical|rejected|failed|defaulted|inactive|disabled|suspended|error)/.test(s)) return 'danger';
  if (/(pending|due|review|progress|awaiting|partial|draft|hold|waiting|assigned|follow)/.test(s)) return 'warning';
  if (/(new|open|unassigned|scheduled|ready)/.test(s)) return 'info';
  return 'neutral';
};

/* ------------------------------------------------------------- Avatar */

const avatarHue = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `av-${h % 8}`;
};

export const Avatar: React.FC<{ initials: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string; title?: string; seed?: string }> = ({
  initials,
  size = 'sm',
  className,
  title,
  seed,
}) => (
  <span
    title={title}
    className={cn(
      'inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none',
      avatarHue((seed || initials || '?').trim().toLowerCase()),
      size === 'lg' && 'w-10 h-10 text-sm',
      size === 'xs' && 'w-5 h-5 text-[10px]',
      size === 'sm' && 'w-6 h-6 text-2xs',
      size === 'md' && 'w-8 h-8 text-xs',
      className
    )}
  >
    {initials}
  </span>
);

export const Kbd: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <kbd
    className={cn(
      'inline-flex items-center h-5 px-1.5 rounded-sm border border-line bg-subtle font-mono text-[10.5px] font-medium text-fg-subtle',
      className
    )}
  >
    {children}
  </kbd>
);

/* --------------------------------------------------------------- Card */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('bg-surface border border-line rounded-lg shadow-xs', className)} {...rest} />
);

export interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, description, actions, icon: Icon, className }) => (
  <div className={cn('flex items-center justify-between gap-3 px-4 h-12 border-b border-line', className)}>
    <div className="flex items-center gap-2 min-w-0">
      {Icon && <Icon className="w-4 h-4 text-fg-subtle shrink-0" strokeWidth={1.75} />}
      <h3 className="text-sm font-semibold text-fg truncate">{title}</h3>
      {description && <span className="text-xs text-fg-subtle truncate hidden sm:inline">{description}</span>}
    </div>
    {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
  </div>
);

/* --------------------------------------------------------- PageHeader */

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className }) => (
  <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3', className)}>
    <div className="min-w-0">
      <h1 className="text-xl font-semibold text-fg tracking-tight">{title}</h1>
      {description && <p className="text-sm text-fg-subtle mt-0.5">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

/* ----------------------------------------------------------- Metric */

export interface MetricProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
  /** Thin progress bar, 0–100. */
  progress?: { value: number; tone?: Tone };
  /** Stacked bar, e.g. receivables by age. Values are relative. */
  segments?: { value: number; tone: Tone; label: string }[];
}

const barTone: Record<Tone, string> = {
  neutral: 'bg-fg-faint',
  info: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export const Metric: React.FC<MetricProps> = ({ label, value, hint, tone, onClick, className, progress, segments }) => {
  const segTotal = segments?.reduce((a, s) => a + Math.max(0, s.value), 0) || 0;
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'text-left bg-surface px-4 py-3.5 min-w-0 flex flex-col justify-start items-stretch',
        onClick && 'transition-colors hover:bg-subtle focus-visible:z-10',
        className
      )}
    >
      <div className="text-xs font-medium text-fg-subtle truncate">{label}</div>
      <div className="mt-2 text-[22px] font-semibold text-fg num tracking-[-0.02em] leading-none">{value}</div>
      {hint && (
        <div className={cn('mt-2 text-xs truncate', tone === 'danger' || tone === 'warning' ? toneText[tone] : 'text-fg-subtle')}>{hint}</div>
      )}
      {progress && (
        <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden" role="presentation">
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', barTone[progress.tone || 'info'])}
            style={{ width: `${Math.max(0, Math.min(100, progress.value))}%` }}
          />
        </div>
      )}
      {segments && segTotal > 0 && (
        <div className="mt-3 flex h-1 w-full gap-px rounded-full overflow-hidden bg-muted" role="presentation">
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${Math.round((s.value / segTotal) * 100)}%`}
                className={cn('h-full', barTone[s.tone])}
                style={{ width: `${(s.value / segTotal) * 100}%` }}
              />
            ))}
        </div>
      )}
    </Comp>
  );
};

/** Joined metric strip: cells share hairline dividers inside one bordered card. */
export const MetricGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('grid gap-px bg-line border border-line rounded-lg overflow-hidden shadow-xs', className)}>{children}</div>
);

/* ------------------------------------------------- Segmented / Tabs */

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('inline-flex items-center p-0.5 rounded-md bg-subtle border border-line max-w-full overflow-x-auto scrollbar-none', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 rounded-[4px] font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-6 text-xs' : 'h-7 text-sm',
              active ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-fg-subtle hover:text-fg'
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn('num text-2xs', active ? 'text-fg-muted' : 'text-fg-faint')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Underline tabs for section-level navigation. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-5 border-b border-line overflow-x-auto scrollbar-none', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'relative h-9 inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              active ? 'text-fg' : 'text-fg-subtle hover:text-fg'
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="num text-2xs text-fg-faint">{o.count}</span>}
            {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- Toolbar */

export const Toolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-line', className)}>{children}</div>
);

/* ------------------------------------------------------- EmptyState */

export const EmptyState: React.FC<{
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
    {Icon && (
      <div className="w-9 h-9 rounded-lg border border-line bg-subtle flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-fg-subtle" strokeWidth={1.75} />
      </div>
    )}
    <p className="text-sm font-medium text-fg">{title}</p>
    {description && <p className="text-xs text-fg-subtle mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ------------------------------------------------------------ Modal */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  /** Rendered flush beneath the header (e.g. Tabs). */
  subheader?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  size = 'md',
  footer,
  headerExtra,
  subheader,
  children,
  bodyClassName,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'w-full max-h-[92vh] bg-surface rounded-xl shadow-dialog flex flex-col overflow-hidden animate-dialog-in',
          modalSizes[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3.5 border-b border-line shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-md border border-line bg-subtle flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-fg-muted" strokeWidth={1.75} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-md font-semibold text-fg leading-6 truncate">{title}</h3>
              {description && <div className="text-xs text-fg-subtle mt-0.5">{description}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 -mr-1.5">
            {headerExtra}
            <IconButton icon={X} label="Close dialog" onClick={onClose} />
          </div>
        </div>
        {subheader && <div className="px-5 border-b border-line shrink-0">{subheader}</div>}
        <div className={cn('flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line bg-subtle/60 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
};

/* ---------------------------------------------------- Detail list */

export const DescriptionList: React.FC<{
  items: { label: React.ReactNode; value: React.ReactNode; mono?: boolean }[];
  columns?: 1 | 2 | 3;
  className?: string;
}> = ({ items, columns = 2, className }) => (
  <dl
    className={cn(
      'grid gap-x-6 gap-y-3.5',
      columns === 1 && 'grid-cols-1',
      columns === 2 && 'grid-cols-1 sm:grid-cols-2',
      columns === 3 && 'grid-cols-1 sm:grid-cols-3',
      className
    )}
  >
    {items.map((it, i) => (
      <div key={i} className="min-w-0">
        <dt className="eyebrow">{it.label}</dt>
        <dd className={cn('mt-1 text-sm text-fg truncate', it.mono && 'ident text-sm')}>{it.value}</dd>
      </div>
    ))}
  </dl>
);

/* ---------------------------------------------------- Progress */

export const Progress: React.FC<{ value: number; tone?: Tone; className?: string }> = ({ value, tone = 'neutral', className }) => (
  <div className={cn('h-1 w-full rounded-full bg-muted overflow-hidden', className)}>
    <div
      className={cn('h-full rounded-full transition-[width] duration-300', tone === 'neutral' ? 'bg-accent' : toneDot[tone])}
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

/* ---------------------------------------------------- Pagination */

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
  noun?: string;
}> = ({ page, totalPages, totalItems, pageSize, onChange, noun = 'records' }) => {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between gap-3 px-3 h-11 border-t border-line text-xs text-fg-subtle">
      <span className="num">
        {from}–{to} of {totalItems} {noun}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => onChange(Math.max(1, page - 1))}>
            Previous
          </Button>
          <span className="num px-1.5 text-fg-muted">
            {page} / {totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => onChange(Math.min(totalPages, page + 1))}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------- Menu */

export interface MenuItem {
  label: React.ReactNode;
  value: string;
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
}

/** Lightweight anchored popover list. Render inside a `relative` wrapper. Uses React Portal to prevent overflow clipping. */
export const Menu: React.FC<{
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  onSelect: (value: string) => void;
  align?: 'left' | 'right';
  width?: string;
  title?: React.ReactNode;
}> = ({ open, onClose, items, onSelect, align = 'left', width = 'w-44', title }) => {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPositionStyle(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const trigger = (anchor.previousElementSibling as HTMLElement) || anchor.parentElement;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Flip upwards if space below is tight (< 220px) and there is more room above
      const placeTop = spaceBelow < 220 && spaceAbove > spaceBelow;

      const style: React.CSSProperties = {
        position: 'fixed',
      };

      if (placeTop) {
        style.bottom = `${Math.max(8, window.innerHeight - rect.top + 4)}px`;
      } else {
        style.top = `${Math.max(8, rect.bottom + 4)}px`;
      }

      if (align === 'right') {
        const rightVal = Math.max(8, window.innerWidth - rect.right);
        style.right = `${rightVal}px`;
      } else {
        const leftVal = Math.max(8, Math.min(rect.left, window.innerWidth - 180));
        style.left = `${leftVal}px`;
      }

      setPositionStyle(style);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {open &&
        positionStyle &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={onClose} />
            <div
              style={positionStyle}
              className={cn(
                'fixed z-[70] bg-surface rounded-lg shadow-pop p-1 animate-pop-in max-h-[min(320px,calc(100vh-16px))] overflow-y-auto',
                width
              )}
            >
              {title && <div className="eyebrow px-2 pt-1.5 pb-1">{title}</div>}
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.value}
                    type="button"
                    disabled={it.disabled}
                    onClick={() => {
                      if (it.disabled) return;
                      onSelect(it.value);
                      onClose();
                    }}
                    className={cn(
                      'w-full h-7 flex items-center gap-2 px-2 rounded-[4px] text-sm text-left transition-colors',
                      it.disabled
                        ? 'opacity-40 cursor-not-allowed text-fg-faint'
                        : it.danger
                        ? 'text-danger hover:bg-danger/5'
                        : 'text-fg-muted hover:text-fg hover:bg-hover',
                      it.selected && 'text-fg font-medium'
                    )}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.selected && <Check className="w-3.5 h-3.5 shrink-0 text-fg" strokeWidth={2} />}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </>
  );
};

/* ---------------------------------------------------- Table shell */

/** Bordered card container for a `.data-table`, with optional toolbar and footer. */
export const TableCard: React.FC<{
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ toolbar, footer, children, className }) => (
  <Card className={cn('overflow-hidden', className)}>
    {toolbar}
    <div className="overflow-x-auto">{children}</div>
    {footer}
  </Card>
);

/** Formats an ISO (yyyy-mm-dd) or display date as "05 Nov 2026". */
export const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return dateStr;
};

export const formatINR = (n?: number | null) => `₹${(n || 0).toLocaleString('en-IN')}`;

/* ------------------------------------------------------ ConfirmDialog */

export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ isOpen, title, description, confirmLabel = 'Confirm', danger, onConfirm, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size="sm"
    title={title}
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          className={danger ? '!bg-danger !text-white !border-danger hover:!bg-danger/90' : undefined}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </>
    }
  >
    {description && <p className="text-sm text-fg-muted">{description}</p>}
  </Modal>
);

/* ------------------------------------------------------------ BrandLogo */

const LOGO_ALT = 'Shameer & Associates — Accountants and Practitioners';

/** Logo heights per placement. The artwork is 426×161, so width follows automatically. */
const logoHeights = {
  sm: 'h-9', // 36px — compact bars (mobile header)
  md: 'h-11', // 44px — sidebar brand bar (64px tall), 10px above and below
  lg: 'h-16', // 64px — sign-in panel
} as const;

/**
 * The firm's wordmark — one component so the logo is identical everywhere.
 * Uses the navy artwork and turns it pure white on dark surfaces (dark themes,
 * or `inverse` for dark panels in light themes), so it stays crisp and full-strength.
 */
export const BrandLogo: React.FC<{ size?: keyof typeof logoHeights; inverse?: boolean; className?: string }> = ({
  size = 'md',
  inverse = false,
  className,
}) => (
  <span className={cn('inline-flex items-center min-w-0', className)}>
    <img
      src="/logo-light.png"
      alt={LOGO_ALT}
      draggable={false}
      className={cn(
        'w-auto max-w-full object-contain select-none',
        logoHeights[size],
        inverse ? 'brightness-0 invert dark:filter-none' : 'dark:brightness-0 dark:invert'
      )}
    />
  </span>
);
