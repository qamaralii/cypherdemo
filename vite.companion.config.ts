// Slack companion (phone app). Shares package.json, node_modules, .env.local and the shared/ content with the booth demo.
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const repoRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: 'companion',
  envDir: repoRoot,
  publicDir: false,
  plugins: [react()],
  build: { outDir: '../dist-companion', emptyOutDir: true },
  server: { host: true, port: 5174, strictPort: true },
  preview: { host: true, port: Number(process.env.PORT) || 4174, allowedHosts: true },
})
