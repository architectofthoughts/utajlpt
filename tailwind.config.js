/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        jp: ['"Noto Sans JP"', '"Hiragino Sans"', '"Yu Gothic"', 'sans-serif'],
        ko: ['"Noto Sans KR"', '"Pretendard"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
