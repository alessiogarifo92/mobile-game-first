import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the same build works on any static host and inside Capacitor's WebView.
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    // Phaser (~1.4 MB) changes rarely: its own chunk is cached across game updates and parsed apart from the game code.
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) } },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/*.png'],
      manifest: {
        name: 'Mix & Splash',
        short_name: 'Mix & Splash',
        description: 'Dipingi immagini a pixel mescolando rosso, giallo e blu.',
        lang: 'it',
        start_url: '.',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#FFF6E9',
        theme_color: '#FFF6E9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
    }),
  ],
});
