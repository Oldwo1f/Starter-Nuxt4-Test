/**
 * Handle GET /_nuxt/ to avoid unhandled 404 errors.
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 204)
  return null
})
