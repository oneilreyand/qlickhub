/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B1E743',
          foreground: '#141413',
          hover: '#9ed434',
          active: '#8cc026',
        },
        brand: {
          50: '#F7FEE7',
          100: '#ECFCCB',
          200: '#D9F99D',
          300: '#BEF264',
          400: '#A3E635',
          500: '#B1E743',
          600: '#9ed434',
          700: '#8cc026',
          800: '#4D7C0F',
          900: '#3F6212',
          950: '#1A2E05',
        },
        success: '#10B981',
        warning: '#F59E0B',
        neutral: '#64748B',
        sidebar: '#0B1C30',
        obsidian: {
          950: "#06090F",
          900: "#0B0F17",
          850: "#101522",
          800: "#161B26",
          700: "#222938",
          600: "#323B4E",
        },
        violet: {
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        indigo: {
          500: "#6366F1",
          600: "#4F46E5",
        },
        emerald: {
          500: "#10B981",
          600: "#059669",
        },
        amber: {
          500: "#F59E0B",
        },
        rose: {
          500: "#F43F5E",
        },
        slate: {
          850: "#1E293B",
          900: "#0F172A",
        }
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
