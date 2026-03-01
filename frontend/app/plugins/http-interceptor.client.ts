import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtPlugin((nuxtApp) => {
  // Ce plugin intercepte les erreurs HTTP 401 globalement
  // Il s'exécute uniquement côté client
  
  const router = useRouter()
  const authStore = useAuthStore()
  
  // Variable pour éviter les redirections multiples simultanées
  let isRedirecting = false
  
  // Variable pour éviter les tentatives de refresh multiples simultanées
  let isRefreshing = false

  // Fonction pour gérer les erreurs 401
  // Tente d'abord de rafraîchir le token, puis déconnecte seulement si le refresh échoue
  const handle401Error = async (requestOptions?: any, originalRequest?: any) => {
    // Vérifier si l'utilisateur est actuellement authentifié
    if (!authStore.isAuthenticated) {
      // L'utilisateur n'est pas authentifié, donc pas besoin de déconnecter
      return
    }
    
    // Vérifier si la requête avait un header Authorization (token)
    // Si pas de token dans la requête, c'est probablement juste un manque de droits, pas une session expirée
    const hasAuthHeader = requestOptions?.headers?.Authorization || 
                         requestOptions?.headers?.authorization
    
    if (!hasAuthHeader) {
      // Pas de token dans la requête, donc c'est probablement juste un manque de droits
      // Ne pas déconnecter - l'utilisateur reste connecté mais n'a pas accès à cette ressource
      return
    }
    
    // Si on arrive ici, c'est que :
    // 1. L'utilisateur est authentifié (isAuthenticated === true)
    // 2. La requête avait un token (hasAuthHeader === true)
    // 3. Le serveur a retourné 401
    // Cela indique que le token est invalide/expiré → tenter de rafraîchir
    
    // Si on a un refresh token, tenter de rafraîchir
    if (authStore.refreshToken && !isRefreshing) {
      isRefreshing = true
      
      try {
        // Tenter de rafraîchir le token
        await authStore.refreshAccessToken()
        
        // Si le refresh réussit, réessayer la requête originale
        if (originalRequest && originalRequest.url) {
          // Réessayer la requête avec le nouveau token
          const newOptions = {
            ...originalRequest,
            headers: {
              ...originalRequest.headers,
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
          
          // Note: On ne peut pas réessayer automatiquement ici car on est dans un catch
          // L'utilisateur devra réessayer manuellement ou on peut retourner une indication
          isRefreshing = false
          return // Le token a été rafraîchi, ne pas déconnecter
        }
        
        isRefreshing = false
        return // Le token a été rafraîchi avec succès
      } catch (refreshError) {
        // Le refresh a échoué → déconnecter
        isRefreshing = false
        // Continuer vers la déconnexion
      }
    }
    
    // Si on arrive ici, soit on n'a pas de refresh token, soit le refresh a échoué
    // → Déconnecter l'utilisateur
    
    // Éviter les redirections multiples
    if (!isRedirecting) {
      isRedirecting = true
      
      // Nettoyer l'authentification
      authStore.clearAuth()
      
      // Rediriger vers la page de connexion seulement si on n'y est pas déjà
      const currentRoute = router.currentRoute.value
      if (currentRoute.path !== '/login') {
        router.push('/login')
      }
      
      // Réinitialiser le flag après un court délai
      setTimeout(() => {
        isRedirecting = false
      }, 1000)
    }
  }
  
  // Remplacer $fetch dans le contexte Nuxt
  // Dans Nuxt 3, on peut remplacer $fetch en modifiant nuxtApp.$fetch
  // Mais pour intercepter toutes les erreurs, on doit aussi wrapper globalThis.$fetch
  const originalFetch = globalThis.$fetch
  
  // Wrapper pour intercepter les erreurs et tenter de rafraîchir le token
  const wrappedFetch = async (...args: any[]) => {
    // Extraire les options de la requête
    let requestOptions: any = {}
    if (args.length > 1) {
      // Format: $fetch(url, options)
      requestOptions = args[1] || {}
      requestOptions.url = args[0]
    } else if (args.length === 1 && typeof args[0] === 'object' && args[0]?.url) {
      // Format: $fetch({ url, ...options })
      requestOptions = args[0]
    } else if (args.length === 1 && typeof args[0] === 'string') {
      // Format: $fetch(url) - pas d'options
      requestOptions = { url: args[0] }
    }
    
    // Fonction pour faire la requête avec retry après refresh
    const makeRequest = async (retryCount = 0): Promise<any> => {
      try {
        // Utiliser l'original fetch
        return await originalFetch(...args)
      } catch (error: any) {
        // Vérifier si c'est une erreur 401
        const status = error?.status || error?.statusCode || error?.response?.status
        if (status === 401 && retryCount === 0) {
          // Tenter de rafraîchir le token une seule fois
          if (authStore.refreshToken && !isRefreshing) {
            isRefreshing = true
            try {
              await authStore.refreshAccessToken()
              isRefreshing = false
              
              // Mettre à jour le token dans les headers de la requête
              if (requestOptions.headers) {
                requestOptions.headers.Authorization = `Bearer ${authStore.accessToken}`
              } else {
                requestOptions.headers = {
                  Authorization: `Bearer ${authStore.accessToken}`,
                }
              }
              
              // Réessayer la requête avec le nouveau token
              if (args.length > 1) {
                args[1] = requestOptions
              } else {
                args[0] = requestOptions
              }
              
              return await makeRequest(1) // Retry une fois
            } catch (refreshError) {
              // Le refresh a échoué
              isRefreshing = false
              await handle401Error(requestOptions, requestOptions)
              throw error // Propager l'erreur originale
            }
          } else {
            // Pas de refresh token ou refresh en cours
            await handle401Error(requestOptions, requestOptions)
            throw error
          }
        }
        
        // Pour les autres erreurs ou si on a déjà retry, propager l'erreur
        throw error
      }
    }
    
    return await makeRequest()
  }
  
  // Copier les propriétés statiques de l'original (comme create, raw, etc.)
  if (originalFetch && typeof originalFetch === 'function') {
    Object.setPrototypeOf(wrappedFetch, Object.getPrototypeOf(originalFetch))
    // Copier les méthodes statiques si elles existent
    if ('create' in originalFetch) {
      (wrappedFetch as any).create = originalFetch.create
    }
    if ('raw' in originalFetch) {
      (wrappedFetch as any).raw = originalFetch.raw
    }
  }
  
  // Remplacer $fetch global et dans le contexte Nuxt
  globalThis.$fetch = wrappedFetch
  nuxtApp.$fetch = wrappedFetch
})
