/**
 * Design System for Fueling App
 * Modern, mobile-first design with gamification elements
 */

export const colors = {
  // Primary brand colors - Premium Purple
  primary: '#A855F7', // Vibrant purple (premium, luxury)
  primaryLight: '#E9D5FF',
  primaryDark: '#7E22CE',

  // Secondary colors - Gold accents
  success: '#FBBF24', // Gold (premium accent)
  warning: '#F59E0B', // Amber (warnings)
  danger: '#DC2626', // Red (critical alerts, brand connection)
  info: '#06B6D4', // Cyan (informational)

  // Neutral palette
  black: '#000000',
  white: '#FFFFFF',
  
  // Dark mode grays (primary palette)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // Dark theme specific
  dark: {
    bg: '#0F172A', // Slate-900
    surface: '#1E293B', // Slate-800
    surfaceLight: '#334155', // Slate-700
    text: '#F1F5F9', // Slate-100
    textSecondary: '#CBD5E1', // Slate-300
    border: '#475569', // Slate-600
  },
};

export const typography = {
  // Font sizes
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',

  // Font weights
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};

export const borderRadius = {
  none: '0px',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

export const animations = {
  // Smooth transitions
  fast: 'all 150ms ease-in-out',
  base: 'all 200ms ease-in-out',
  slow: 'all 300ms ease-in-out',

  // Keyframes for animations
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  slideUp: `
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
};

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

// Component-specific styles
export const componentStyles = {
  button: {
    base: `
      px-4 py-3 rounded-lg font-semibold text-base
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    primary: `
      bg-green-500 text-white hover:bg-green-600 active:scale-95
      focus:ring-green-500
    `,
    secondary: `
      bg-slate-700 text-white hover:bg-slate-600 active:scale-95
      focus:ring-slate-500
    `,
    ghost: `
      bg-transparent text-green-500 hover:bg-green-500/10
      focus:ring-green-500
    `,
  },
  card: `
    bg-slate-800 rounded-xl border border-slate-700
    p-4 transition-all duration-200
    hover:border-slate-600 hover:shadow-md
  `,
  input: `
    w-full bg-slate-700 border border-slate-600 text-white
    rounded-lg px-4 py-3 placeholder-slate-400
    focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20
    transition-all duration-200
  `,
};
