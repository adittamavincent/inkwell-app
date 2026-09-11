/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          bg: '#080a0c',
          sidebar: '#0c0f12',
          panel: '#11151a',
          card: '#151a20',
          hover: '#1b222b',
          border: '#1c242d',
          'border-subtle': '#131920',
          accent: '#2b7886',
          'accent-hover': '#358e9f',
          'accent-muted': '#12252a',
          'accent-light': '#6fd3e3',
          danger: '#d15b5b',
          'danger-hover': '#dd6b6b',
          'danger-muted': '#241214',
          'danger-border': '#4a2024',
          success: '#6bbf9b',
          'success-muted': '#0f2119',
          'success-border': '#204636',
          warning: '#d8a24e',
          'warning-muted': '#231b0f',
          'warning-border': '#4a3a1c',
          warm: '#e6ded4',
          'warm-muted': '#2a2620',
          text: '#f3f6f8',
          muted: '#8797a4',
          faint: '#6e7f8d',
        },
        code: {
          comment: '#5f7180',
          string: '#7fc7a3',
          keyword: '#7cc4d6',
          literal: '#d8b06a',
          number: '#caa76a',
          fn: '#8fd0c7',
          punct: '#5f7180',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '7px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'elevated': '0 12px 32px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'overlay': '0 24px 64px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 140ms ease-out',
        'scale-in': 'scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'blink': 'blink 1.05s steps(2, start) infinite',
      },
    },
  },
  plugins: [],
};
