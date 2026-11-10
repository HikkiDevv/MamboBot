/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#4c1d95',
        },
        dark: {
          bg: '#0b0f19',
          card: '#111827',
          surface: '#1f2937',
          border: '#374151'
        }
      }
    },
  },
  plugins: [],
}
