/**
 * Proxy vers le backend pour traiter le paiement Te Natira'a après redirection Stripe.
 * Utilise l'URL interne en Docker (backend:8081) pour éviter les problèmes CORS.
 */
export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')
  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'session_id manquant' })
  }

  const config = useRuntimeConfig()
  const backendUrl =
    config.backendInternalUrl || config.public.apiBaseUrl || 'http://localhost:3001'
  if (!backendUrl) {
    throw createError({ statusCode: 500, message: 'Backend URL non configurée' })
  }

  try {
    const url = `${backendUrl}/te-natiraa/process-pending/${encodeURIComponent(sessionId)}`
    console.log('[Te Natiraa] Processing payment:', { sessionId, backendUrl: backendUrl.replace(/:[^:@]+@/, ':****@') })
    const response = await $fetch(url, {
      method: 'POST',
    })
    console.log('[Te Natiraa] Payment processed successfully:', sessionId)
    return response
  } catch (err: any) {
    const statusCode = err?.statusCode ?? err?.status ?? err?.response?.status ?? 500
    const message = err?.data?.message ?? err?.data?.error ?? err?.message ?? 'Erreur lors du traitement'
    console.error('[Te Natiraa] Process failed:', {
      sessionId,
      statusCode,
      message,
      backendUrl: backendUrl.replace(/:[^:@]+@/, ':****@'),
    })
    throw createError({ statusCode, message })
  }
})
