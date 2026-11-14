/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        discord: {
          darkest: '#1e1f22',
          darker: '#232428',
          dark: '#2b2d31',
          chat: '#313338',
          card: '#383a40',
          hover: '#404249',
          border: '#3f4147',
          blurple: 'var(--color-discord-blurple, #5865f2)',
          blurpleHover: 'var(--color-discord-blurple-hover, #4752c4)',
          cyan: '#00f0ff',
          green: '#23a55a',
          red: '#f23f43',
          yellow: '#f0b232',
          muted: '#949ba4',
          light: '#dbdee1',
          white: '#f2f3f5',
        }
      },
      fontFamily: {
        sans: ['"gg sans"', '"Noto Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
