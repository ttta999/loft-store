/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // ✅ Включаем тёмную тему через класс
  theme: {
    extend: {
      colors: {
        // ✅ Тёмно-синяя палитра для тёмной темы
        'dark-bg': '#1a1a2e',
        'dark-card': '#16213e',
        'dark-accent': '#0f3460',
        'dark-border': '#2d3561',
      },
    },
  },
  plugins: [],
}