/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cny-red': '#D9230F', // Red
        'cny-gold': '#F2C94C', // Gold text
        'cny-bg': '#8B0000', // Darker background
        'cny-accent': '#FFD700', // Bright gold
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
