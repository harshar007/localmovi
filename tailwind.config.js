/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#131314',
        surface: '#1E1F20',
        card: '#1E1F20',
        'card-hover': '#303134',
        secondary: '#28292A',
        elevated: '#303134',
        primary: {
          DEFAULT: '#A8C7FA',
          hover: '#C2E7FF',
          light: '#D3E3FD',
          dark: '#0842A0',
          container: '#004A77',
        },
        accent: {
          DEFAULT: '#C2E7FF',
          hover: '#A8C7FA',
          warm: '#FFDDB3',
        },
        muted: '#A0A0A0',
        border: '#3C4043',
        subtle: 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Google Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 25px -5px rgba(168, 199, 250, 0.3)',
        'glow-accent': '0 0 25px -5px rgba(194, 231, 255, 0.3)',
        'elevation-1': '0 1px 3px 1px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'elevation-2': '0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'elevation-3': '0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'm3-sm': '8px',
        'm3-md': '12px',
        'm3-lg': '16px',
        'm3-xl': '24px',
        'm3-full': '9999px',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.25s cubic-bezier(0, 0, 0.2, 1)',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
