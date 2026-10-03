/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        // Primary brand ramp — driven by CSS variables so the accent color is
        // themeable at runtime (see index.css :root + src/lib/theme.ts).
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        // Sidebar surface (deep navy-slate).
        sidebar: {
          DEFAULT: '#0b1220',
          hover: 'rgb(255 255 255 / 0.06)',
          active: '#1d4ed8',
          muted: '#8b9bb4',
          border: 'rgb(255 255 255 / 0.08)',
        },
      },
      boxShadow: {
        // Layered, low-contrast shadows read as depth without looking heavy.
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 2px 8px -2px rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 16px -4px rgb(15 23 42 / 0.12), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
        header: '0 1px 0 0 rgb(15 23 42 / 0.05)',
        pop: '0 12px 32px -8px rgb(15 23 42 / 0.18), 0 4px 12px -4px rgb(15 23 42 / 0.08)',
        glow: '0 8px 24px -8px rgb(var(--brand-600) / 0.45)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'pop-in': 'pop-in 0.18s ease-out both',
      },
    },
  },
  plugins: [],
};
