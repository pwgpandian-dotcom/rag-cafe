import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--green-700)',  // logo / brand primary
          600: 'var(--green-800)',      // hover on brand surfaces
          700: 'var(--green-900)',      // pressed / active
        },
        gold: {
          DEFAULT: 'var(--amber-500)',  // accent fills, ratings
          50: 'var(--amber-100)',       // highlight backgrounds
          600: 'var(--amber-600)',      // amber text (a11y safe on white)
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)',         'Inter', '-apple-system', '"Segoe UI"', 'Roboto', '"Noto Sans"', 'sans-serif'],
        display: ['var(--font-fraunces)',      'Georgia', 'serif'],
        mono:    ['var(--font-ibm-plex-mono)', '"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
