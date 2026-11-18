// Slack companion (phone app). Shares package.json, node_modules, .env.local and the shared/ content with the booth demo.
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const repoRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: 'companion',
  envDir: repoRoot,
  // Own dependency cache: sharing node_modules/.vite with the laptop dev server makes them invalidate each other (504 Outdated Optimize Dep).
  cacheDir: fileURLToPath(new URL('./node_modules/.vite-companion', import.meta.url)),
  publicDir: false,
  plugins: [react()],
  build: { outDir: '../dist-companion', emptyOutDir: true },
  server: { host: true, port: 5174, strictPort: true },
  preview: { host: true, port: Number(process.env.PORT) || 4174, allowedHosts: true },
})
