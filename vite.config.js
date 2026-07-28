import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest: use our custom src/sw.js so push event handlers work.
      // VitePWA injects the precache manifest into it at build time.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      // Do NOT set registerType here — we register the SW manually in main.jsx
      // to avoid the virtual:pwa-register import that fails on Vercel/Netlify.

      includeAssets: [
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'maskable-icon-512x512.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'logo.png',
        'astronaut.png',
      ],

      manifest: {
        name: 'Sakshar AI - Universal Literacy Platform',
        short_name: 'Sakshar AI',
        description: 'AI-powered adaptive literacy learning platform for multilingual education and voice-interactive practice.',
        theme_color: '#5C67F2',
        background_color: '#05060c',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        id: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // Workbox config for injectManifest mode
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
      },

      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})