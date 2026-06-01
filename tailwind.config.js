/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          900: '#0f172a', // Deep slate
          800: '#1e293b', // Card background
          700: '#334155', // Borders/dividers
        },
        neon: {
          green: '#22c55e', // Normal
          red: '#ef4444', // Critical
          blue: '#3b82f6', // Info/Moisture
          yellow: '#eab308', // Warning
          purple: '#a855f7', // Special
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
