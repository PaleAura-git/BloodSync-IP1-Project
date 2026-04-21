// Tailwind v4 uses CSS @theme in index.css — this file is not used by the Vite plugin
import type { Config } from 'tailwindcss'
const config: Config = { content: ['./src/**/*.{ts,tsx}'] }
export default config
