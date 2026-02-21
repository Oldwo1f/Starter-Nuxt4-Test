// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxt/icon', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  imports: {
    dirs: ['app/stores', 'app/composables']
  },
  pinia: {
    storesDirs: ['./app/stores']
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
      facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID || '',
    },
  },
  app: {
    head: {
      link: [
        // SVG favicon en premier pour les navigateurs modernes
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // Fallback ICO pour les anciens navigateurs
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // PNG pour les navigateurs qui préfèrent PNG
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
        // Apple Touch Icon pour iOS
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        // Web App Manifest pour PWA
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  }
})