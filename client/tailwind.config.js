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
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#36abf7',
          500: '#0c8ee9',
          600: '#0070c7',
          700: '#0159a2',
          800: '#054b85',
          900: '#0a3f6f',
          950: '#072749',
        },
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#080d1a'
        }
      }
    },
  },
  plugins: [],
}
