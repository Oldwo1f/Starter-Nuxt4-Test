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
  ui: {
    global: true
  },
  runtimeConfig: {
    public: {
      facebookAppId: process.env.FACEBOOK_APP_ID || '',
    },
  },
})