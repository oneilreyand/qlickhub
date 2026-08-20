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
          50: '#F5FDEB',
          100: '#E9FBCB',
          200: '#D7F79F',
          300: '#C5F371',
          400: '#B1E743',
          500: '#B1E743',
          600: '#8FBE2F',
          700: '#6E9322',
          800: '#4F6A17',
          900: '#34460E',
          950: '#1B2506',
        },
        success: '#B1E743',
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
          600: "#5565B7",
        },
        teal: {
          500: "#B1E743",
        },
        emerald: {
          50: '#F5FDEB',
          100: '#E9FBCB',
          200: '#D7F79F',
          300: '#C5F371',
          400: '#B1E743',
          500: '#B1E743',
          600: '#8FBE2F',
          700: '#6E9322',
          800: '#4F6A17',
          900: '#34460E',
          950: '#1B2506',
        },
        green: {
          50: '#F5FDEB',
          100: '#E9FBCB',
          200: '#D7F79F',
          300: '#C5F371',
          400: '#B1E743',
          500: '#B1E743',
          600: '#8FBE2F',
          700: '#6E9322',
          800: '#4F6A17',
          900: '#34460E',
          950: '#1B2506',
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
