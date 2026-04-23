/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: '#4F5F52',
        'sage-dark': '#3D4A40',
        'sage-light': '#6B7A6E',
        cream: '#F2EDE4',
        'cream-light': '#FFF3D9',
        'cream-white': '#FAF8F4',
        'warm-gray': '#A6A29A',
        gold: '#D4A574',
        red: '#C75B5B',
        amber: '#D4A03D',
        green: '#5B8A5E',
        blue: '#5B7A8A',
        purple: '#7A5B8A',
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
}