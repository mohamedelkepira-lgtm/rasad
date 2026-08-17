import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'رَصَد — إدارة سلوك ومخالفات الطلاب',
        short_name: 'رَصَد',
        description: 'نظام رَصَد — منصة مدرسية لرصد سلوك الطلاب وتسجيل المخالفات',
        id: './',
        lang: 'ar',
        dir: 'rtl',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        start_url: './',
        scope: './',
        orientation: 'portrait',
        theme_color: '#123061',
        background_color: '#123061',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          {
            name: 'تسجيل مخالفة',
            short_name: 'مخالفة جديدة',
            description: 'تسجيل مخالفة جديدة للطالب',
            url: './add',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'قائمة الطلاب',
            short_name: 'الطلاب',
            description: 'عرض جميع الطلاب',
            url: './students',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // تحميل الصفحات من الشبكة أولًا لضمان أحدث البيانات، مع رجوع للـ cache عند عدم الاتصال
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              networkTimeoutSeconds: 3,
              cacheName: 'pages-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 }
            }
          },
          {
            // الخطوط والأصول الثابتة: من الـ cache أولًا مع تحديث خلفي
            urlPattern: ({ request }) => request.destination === 'font' || request.destination === 'style' || request.destination === 'script',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],
  base: '/',
  build: {
    target: 'es2019',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'excel-vendor': ['xlsx']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
