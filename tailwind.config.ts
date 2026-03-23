import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm literary background palette
        lit: {
          bg:      '#faf8f5',
          surface: '#ffffff',
          border:  '#e8e3db',
          muted:   '#f4f1ec',
        },
        dark: {
          bg:      '#141210',
          surface: '#1e1c19',
          border:  '#2e2b27',
          muted:   '#252220',
        },
        // Type colors
        wine:  { DEFAULT: '#be2d2b', light: '#ef5350', muted: '#fce8e8' },
        sage:  { DEFAULT: '#2a7d5e', light: '#4caf87', muted: '#e6f4ee' },
        gold:  { DEFAULT: '#b06820', light: '#e8933a', muted: '#fdf3e7' },
        // Accent
        accent: { DEFAULT: '#6c5ce7', light: '#8b7cf6', muted: '#ede9ff' },
      },
      fontFamily: {
        sans: ['Albert Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card':  '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        'modal': '0 20px 60px -10px rgb(0 0 0 / 0.25)',
      },
      animation: {
        'fade-up':   'fadeUp 0.3s ease both',
        'fade-in':   'fadeIn 0.2s ease both',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
  safelist: [
    // Type border colors
    'border-l-wine', 'border-l-sage', 'border-l-gold', 'border-l-accent',
    'border-t-wine', 'border-t-sage', 'border-t-gold',
    // Text colors
    'text-wine', 'text-wine-light', 'text-sage', 'text-sage-light',
    'text-gold', 'text-gold-light', 'text-accent', 'text-accent-light',
    // Muted backgrounds
    'bg-wine-muted', 'bg-sage-muted', 'bg-gold-muted', 'bg-accent-muted',
    // Dynamic bg with opacity
    'bg-wine/10', 'bg-sage/10', 'bg-gold/10', 'bg-accent/10',
    'bg-wine/15', 'bg-sage/15', 'bg-gold/15',
    // Dots for type indicators
    'bg-wine', 'bg-sage', 'bg-gold', 'bg-accent',
  ],
}

export default config
