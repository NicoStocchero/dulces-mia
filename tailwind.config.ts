import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f4',
          100: '#fbe5e9',
          200: '#f7ced7',
          300: '#f2a7b8',
          400: '#ea7892',
          500: '#e8476a',
          600: '#d52852',
          700: '#b31c41',
          800: '#941b3a',
          900: '#7d1b35',
          950: '#45091a',
        },
        cream: {
          50: '#fffdfa',
          100: '#fffaf0',
          200: '#fef3db',
          300: '#fde6b8',
        },
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        outfit: ['var(--font-outfit)', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}

export default config
