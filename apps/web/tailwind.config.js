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
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
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
