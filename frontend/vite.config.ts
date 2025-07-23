import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from "vite-plugin-svgr"
import viteCompression from 'vite-plugin-compression';
import { analyzer as bundleAnalyzer } from 'vite-bundle-analyzer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    viteCompression({
      algorithm: "brotliCompress"
    }),
    bundleAnalyzer({
      analyzerMode: "static",
      openAnalyzer: false,
      summary: false,
    }),
  ],
})
