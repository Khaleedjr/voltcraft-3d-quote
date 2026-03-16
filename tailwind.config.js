/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        voltcraft: {
          primary: '#F0503D', // Coral Red from your screenshot
          secondary: '#F87060', 
          dark: '#141414', // Inner component black
          darker: '#0D0D0D', // Very deep base background
          border: '#333333', // Thicker gray used in brutalist grids
          gray: {
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1e1e1e', // Mapped cleanly for brutalist
            900: '#141414'
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
