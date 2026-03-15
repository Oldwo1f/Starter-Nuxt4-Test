/**
 * Redirige vers la page succès si l'utilisateur arrive sur /te-natiraa/inscription avec session_id
 * (cas où Stripe redirige vers la mauvaise URL ou FRONTEND_URL incorrect)
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/te-natiraa/inscription' && to.query.session_id) {
    return navigateTo({
      path: '/te-natiraa/inscription/success',
      query: { session_id: to.query.session_id },
    })
  }
})
