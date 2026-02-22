import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)'],
        heading: ['var(--font-heading)'],
        mono: ['ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          primary: 'var(--primary)',
          accent: 'var(--accent)',
          muted: 'var(--muted)',
        },
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};

export default config;
