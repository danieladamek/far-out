/** @type {import('tailwindcss').Config} */
// Categorical palette = manifest.palette.groups (compound classes), so cat.* is keyed by palette_group:
// a = tryptamine · b = ergoline · c = phenethylamine · d = entactogen · e = dissociative · f = atypical
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', '"Book Antiqua"', 'Georgia', 'serif'],
        body: ['"Avenir Next"', 'Avenir', '"Segoe UI"', '"Gill Sans"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ink: { DEFAULT: '#1f1b16', muted: '#5d5750' },
        paper: { DEFAULT: '#faf8f4', 2: '#f1ede6' },
        night: { DEFAULT: '#15130f', 2: '#211d18', ink: '#efeae2', muted: '#b3aca1' },
        cat: { a: '#2a5aa6', b: '#7b2c5e', c: '#1f7a63', d: '#a85a1f', e: '#4a4a8a', f: '#8a6d1f' },
      },
    },
  },
  plugins: [],
};
