/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#1E3A8A',
        'brand-yellow': '#FACC15',
        'brand-light': '#F3F4F6'
      }
    },
  },
  plugins: [],
}