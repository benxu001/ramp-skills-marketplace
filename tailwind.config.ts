import type { Config } from 'tailwindcss';

const skillColors = [
  'emerald',
  'rose',
  'sky',
  'violet',
  'amber',
  'fuchsia',
];

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: skillColors.flatMap((c) => [
    `text-${c}-300`,
    `text-${c}-400`,
    `border-${c}-500/40`,
    `border-${c}-500/60`,
    `bg-${c}-500/10`,
    `bg-${c}-500/15`,
    `ring-${c}-500/30`,
    `hover:border-${c}-500/60`,
  ]),
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
