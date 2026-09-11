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
          bg: '#0a0d0f',
          sidebar: '#07090b',
          panel: '#101418',
          card: '#141a20',
          hover: '#19222a',
          border: '#1c2630',
          'border-subtle': '#131c24',
          accent: '#1e7582',
          'accent-hover': '#2892a1',
          'accent-muted': '#102d35',
          'accent-light': '#62d8e6',
          danger: '#c74444',
          'danger-hover': '#db5252',
          'danger-muted': '#331515',
          gold: '#c99e32',
          'gold-muted': '#362a10',
          text: '#f2f6f7',
          muted: '#849aa6',
          faint: '#435764',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'elevated': '0 4px 20px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
