/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          dark: '#121214',
          panel: '#18181c',
          elevated: '#222228',
          hover: '#2a2a32',
          inset: '#141417',
          border: 'rgba(245, 239, 235, 0.08)',
          'border-medium': 'rgba(245, 239, 235, 0.16)',
        },
        pi: {
          sage: '#4e8263',
          'sage-soft': 'rgba(78, 130, 99, 0.16)',
          terracotta: '#c86446',
          'terracotta-soft': 'rgba(200, 100, 70, 0.16)',
          oat: '#dfd7ca',
          linen: '#f5efeb',
        }
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
        tiny5: ['Tiny5', 'monospace'],
      }
    },
  },
  plugins: [],
}
