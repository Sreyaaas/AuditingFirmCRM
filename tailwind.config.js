/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#0071E3',
          blueHover: '#0077ED',
          blueSubtle: '#EBF4FC',
          darkBlue: '#2997FF',
          darkBlueHover: '#409CFF',
          bg: '#FFFFFF',
          bgSecondary: '#FBFBFD',
          bgTertiary: '#F5F5F7',
          text: '#1D1D1F',
          secondary: '#6E6E73',
          tertiary: '#86868B',
          border: '#E5E5EA',
          borderSubtle: '#D1D1D6',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'Inter',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'monospace'
        ]
      },
      borderRadius: {
        apple: '6px',
        'apple-md': '8px',
        'apple-lg': '10px'
      },
      boxShadow: {
        'apple-popover': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'apple-sheet': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'apple-dark-popover': '0 4px 20px rgba(0, 0, 0, 0.35)',
        'apple-dark-sheet': '0 8px 32px rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
