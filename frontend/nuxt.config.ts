// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxt/icon', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  imports: {
    dirs: ['app/stores']
  },
  pinia: {
    storesDirs: ['./app/stores']
  }
})