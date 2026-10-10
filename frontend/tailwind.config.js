import defaultTheme from 'tailwindcss/defaultTheme'
import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // One neutral typeface for everything; hierarchy comes from size and weight.
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
        display: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // The interface is black, white and true greys: every "slate" in the code resolves to a
        // neutral grey with no blue tint.
        slate: colors.neutral,
        // The single accent, used sparingly: links, live states and focus.
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      // Tighter corners than Tailwind's defaults: crisp rather than bubbly.
      borderRadius: {
        lg: '0.5rem',
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      boxShadow: {
        card: '0 0 0 1px rgb(0 0 0 / 0.03), 0 1px 2px rgb(0 0 0 / 0.04)',
        lift: '0 0 0 1px rgb(0 0 0 / 0.04), 0 8px 28px -6px rgb(0 0 0 / 0.14)',
        sheet: '0 -1px 0 rgb(0 0 0 / 0.05), 0 -12px 40px -8px rgb(0 0 0 / 0.18)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'pop-in': 'pop-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
