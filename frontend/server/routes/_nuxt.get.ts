/**
 * Handle GET /_nuxt and GET /_nuxt/ to avoid unhandled 404 errors.
 * Some clients (DevTools, prefetch) request the base path without a filename.
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 204)
  return null
})
