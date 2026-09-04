import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ContaHora',
        short_name: 'ContaHora',
        description: 'Controle de horas extras por mês',
        theme_color: '#1867C0',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // libs de PDF são grandes e usadas só sob demanda — não entram no precache
        globIgnores: [
          '**/jspdf*.js',
          '**/html2canvas*.js',
          '**/purify.es*.js',
          '**/index.es-*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(jspdf|html2canvas|purify|index\.es)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-libs',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  // Railway serve o SPA via `vite preview` atrás de um domínio *.up.railway.app
  preview: { allowedHosts: true },
});
