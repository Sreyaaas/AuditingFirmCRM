/** @type {import('tailwindcss').Config} */

// Design tokens.
// Every colour resolves to a CSS variable defined in src/index.css, so a single
// class (e.g. `bg-surface`, `text-fg-muted`) is correct in both light and dark
// themes — no `dark:` pairs required.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        subtle: token('subtle'),
        hover: token('hover'),
        muted: token('muted'),
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
          faint: token('fg-faint'),
        },
        ink: {
          DEFAULT: token('ink'),
          hover: token('ink-hover'),
          fg: token('on-ink'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          fg: token('on-accent'),
        },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Type scale — body is 13px, never below 11px.
        '2xs': ['11px', { lineHeight: '16px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '20px' }],
        md: ['15px', { lineHeight: '22px' }],
        lg: ['17px', { lineHeight: '24px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '34px' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        xs: '0 1px 0 0 rgb(0 0 0 / 0.03)',
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        pop: '0 0 0 1px rgb(var(--c-line) / 1), 0 8px 24px -6px rgb(0 0 0 / 0.12)',
        dialog: '0 0 0 1px rgb(var(--c-line) / 1), 0 24px 64px -12px rgb(0 0 0 / 0.28)',
      },
      ringColor: {
        DEFAULT: token('accent'),
      },
      transitionDuration: {
        DEFAULT: '120ms',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'dialog-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(-2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out',
        'dialog-in': 'dialog-in 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pop-in': 'pop-in 120ms ease-out',
        'toast-in': 'toast-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
