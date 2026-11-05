export interface ThemeDefinition {
  id: string;
  name: string;
  category: 'light' | 'dark';
  canvas: string;
  accent: string;
  description: string;
}

export const THEMES: ThemeDefinition[] = [
  // 5 Light Themes
  {
    id: 'zinc-light',
    name: 'Classic Zinc',
    category: 'light',
    canvas: '#EBEBEF',
    accent: '#0066D6',
    description: 'Clean monochrome greyscale with classic enterprise blue accent.',
  },
  {
    id: 'navy-light',
    name: 'Firm Signature',
    category: 'light',
    canvas: '#E0E9F4',
    accent: '#1D4ED8',
    description: 'Slate-blue desk inspired by the Shameer & Associates official navy logo.',
  },
  {
    id: 'paper-light',
    name: 'Warm Parchment',
    category: 'light',
    canvas: '#ECE6DB',
    accent: '#B45309',
    description: 'Soft book-paper ivory desk with warm bronze amber accents.',
  },
  {
    id: 'sage-light',
    name: 'Nordic Sage',
    category: 'light',
    canvas: '#DFEAE3',
    accent: '#0F766E',
    description: 'Distinct pale sage desk with forest pine accents for long audit review.',
  },
  {
    id: 'stone-light',
    name: 'Architectural Stone',
    category: 'light',
    canvas: '#E0E0E2',
    accent: '#121214',
    description: 'Concrete gray desk with stark architectural monochrome contrast.',
  },

  // 5 Dark Themes
  {
    id: 'zinc-dark',
    name: 'Midnight Zinc',
    category: 'dark',
    canvas: '#0C0C0E',
    accent: '#4D9AFF',
    description: 'Deep zinc surfaces with electric blue highlights for night work.',
  },
  {
    id: 'navy-dark',
    name: 'Firm Midnight',
    category: 'dark',
    canvas: '#0A101C',
    accent: '#60A5FA',
    description: 'Rich dark navy desk matching the firm identity in dark mode.',
  },
  {
    id: 'espresso-dark',
    name: 'Espresso Roast',
    category: 'dark',
    canvas: '#120F0D',
    accent: '#F59E0B',
    description: 'Dark roasted coffee bean background with rich amber gold accents.',
  },
  {
    id: 'forest-dark',
    name: 'Forest Night',
    category: 'dark',
    canvas: '#08120E',
    accent: '#34D399',
    description: 'Deep pine night desk with calming emerald mint highlights.',
  },
  {
    id: 'oled-dark',
    name: 'Pitch OLED',
    category: 'dark',
    canvas: '#000000',
    accent: '#38BDF8',
    description: 'Absolute true zero black canvas with vivid cyan contrast.',
  },
];

export const LIGHT_THEMES = THEMES.filter((t) => t.category === 'light');
export const DARK_THEMES = THEMES.filter((t) => t.category === 'dark');

export const DEFAULT_THEME = 'navy-light';
