import { useAuthStore } from '~/stores/useAuthStore'

function isLaunchBypassPath(path: string): boolean {
  const prefixes = [
    '/lancement',
    '/admin',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/auth/facebook-callback',
  ]
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`))
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (isLaunchBypassPath(to.path)) {
    return
  }

  const config = useRuntimeConfig()
  const apiBase = config.public.apiBaseUrl || 'http://localhost:3001'

  const forwardHeaders: Record<string, string> = {}
  if (import.meta.server) {
    const event = useRequestEvent()
    const req = event?.node.req
    const xf = req?.headers['x-forwarded-for']
    const xri = req?.headers['x-real-ip']
    if (typeof xf === 'string') forwardHeaders['x-forwarded-for'] = xf
    if (typeof xri === 'string') forwardHeaders['x-real-ip'] = xri
  }

  try {
    const pub = await $fetch<{ enabled: boolean; launchOpensAt: string }>(
      `${apiBase}/launch-mode/public`,
      { headers: { ...forwardHeaders } },
    )

    if (!pub.enabled) return

    if (Date.now() >= new Date(pub.launchOpensAt).getTime()) return

    const accessHeaders: Record<string, string> = { ...forwardHeaders }
    if (import.meta.client) {
      const authStore = useAuthStore()
      authStore.initialize()
      if (authStore.accessToken) {
        accessHeaders.Authorization = `Bearer ${authStore.accessToken}`
      }
    }

    const { allowed } = await $fetch<{ allowed: boolean }>(
      `${apiBase}/launch-mode/access`,
      { headers: accessHeaders },
    )

    if (allowed) return

    return navigateTo('/lancement')
  } catch {
    // Ne pas bloquer le site si l'API est indisponible
    return
  }
})
