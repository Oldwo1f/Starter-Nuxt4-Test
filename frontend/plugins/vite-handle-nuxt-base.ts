/**
 * Vite plugin to handle GET /_nuxt and GET /_nuxt/ requests.
 * Some clients (DevTools, prefetch) request the base path without a filename,
 * which causes Vite to return 404 and triggers "unhandled" errors in the Nuxt dev server.
 * This plugin intercepts these requests and returns 204 No Content.
 */
import type { Plugin } from 'vite'

export default function handleNuxtBasePath(): Plugin {
  return {
    name: 'handle-nuxt-base-path',
    enforce: 'pre', // Run before other plugins so we intercept early
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (req.method === 'GET' && (url === '/_nuxt/' || url === '/_nuxt')) {
          res.statusCode = 204
          res.end()
          return
        }
        next()
      })
    },
  }
}
