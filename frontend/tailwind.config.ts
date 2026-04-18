import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0A0A',
          sidebar: '#111111',
          surface: '#1A1A1A',
          hover: '#1E1E1E',
          border: '#262626',
        },
        text: {
          primary: '#EFEFEF',
          secondary: '#888888',
          tertiary: '#555555',
          disabled: '#333333',
        },
        red: {
          accent: '#E53935',
          hover: '#C62828',
        },
        green: {
          accent: '#2EC486',
        },
        amber: {
          accent: '#F59E0B',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'page-title': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        section: ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-lg': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        meta: ['12px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
        btn: ['13px', { lineHeight: '1', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-out',
      },
    },
  },
  plugins: [],
}

export default config
