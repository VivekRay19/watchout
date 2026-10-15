/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          dark: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          amber: '#F59E0B',
          red: '#EF4444',
          emerald: '#10B981',
          lime: '#84CC16',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
