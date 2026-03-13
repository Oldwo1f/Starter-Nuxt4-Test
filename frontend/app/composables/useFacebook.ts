/**
 * Détecte si l'utilisateur est sur un appareil mobile.
 * Sur mobile, les popups FB.login sont souvent bloquées (Safari, navigateurs in-app).
 * On utilise le flux de redirection OAuth à la place.
 */
const isMobile = (): boolean => {
  if (!process.client) return false
  const ua = navigator.userAgent || navigator.vendor
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase()) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
}

export const useFacebook = () => {
  const config = useRuntimeConfig()
  const appId = config.public.facebookAppId

  const initFacebook = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!process.client) {
        reject(new Error('Facebook SDK can only be initialized on client side'))
        return
      }

      if (!appId) {
        reject(new Error('Facebook App ID is not configured'))
        return
      }

      // Check if already initialized
      if (window.FB) {
        window.FB.getLoginStatus(() => {
          resolve()
        })
        return
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script#facebook-jssdk')
      if (existingScript) {
        // Wait for existing script to load and fbAsyncInit to be called
        const checkInterval = setInterval(() => {
          if (window.FB) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval)
          reject(new Error('Facebook SDK loading timeout'))
        }, 10000)
        return
      }

      // Use Facebook's recommended approach with fbAsyncInit
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0',
        })
        window.FB.AppEvents.logPageView()
        resolve()
      }

      // Load Facebook SDK script (Facebook's recommended way)
      ;(function(d, s, id) {
        var js: HTMLScriptElement,
          fjs = d.getElementsByTagName(s)[0]
        if (d.getElementById(id)) {
          return
        }
        js = d.createElement(s) as HTMLScriptElement
        js.id = id
        js.src = 'https://connect.facebook.net/en_US/sdk.js'
        js.async = true
        js.defer = true
        if (fjs && fjs.parentNode) {
          fjs.parentNode.insertBefore(js, fjs)
        } else {
          document.body.appendChild(js)
        }
      })(document, 'script', 'facebook-jssdk')
    })
  }

  const login = (): Promise<{
    accessToken: string
    userID: string
    email?: string
    firstName?: string
    lastName?: string
    picture?: string
  }> => {
    return new Promise((resolve, reject) => {
      if (!process.client || !window.FB) {
        reject(new Error('Facebook SDK not initialized'))
        return
      }

      // Login with email and public_profile permissions
      window.FB.login(
        (response: any) => {
          if (response.authResponse) {
            const accessToken = response.authResponse.accessToken
            const userID = response.authResponse.userID

            // Get user info with email
            window.FB.api(
              '/me',
              { fields: 'id,email,first_name,last_name,picture' },
              (userInfo: any) => {
                if (userInfo.error) {
                  // If email permission is still not available, try without it
                  if (userInfo.error.code === 200 || userInfo.error.message?.includes('email') || userInfo.error.message?.includes('Invalid Scopes')) {
                    // Retry without email field as fallback
                    window.FB.api(
                      '/me',
                      { fields: 'id,first_name,last_name,picture' },
                      (userInfoWithoutEmail: any) => {
                        if (userInfoWithoutEmail.error) {
                          reject(new Error(userInfoWithoutEmail.error.message || 'Failed to get user info'))
                          return
                        }

                        resolve({
                          accessToken,
                          userID,
                          email: undefined, // Email not available
                          firstName: userInfoWithoutEmail.first_name,
                          lastName: userInfoWithoutEmail.last_name,
                          picture: userInfoWithoutEmail.picture?.data?.url,
                        })
                      }
                    )
                    return
                  }
                  reject(new Error(userInfo.error.message || 'Failed to get user info'))
                  return
                }

                resolve({
                  accessToken,
                  userID,
                  email: userInfo.email,
                  firstName: userInfo.first_name,
                  lastName: userInfo.last_name,
                  picture: userInfo.picture?.data?.url,
                })
              }
            )
          } else {
            // User cancelled or error occurred
            if (response.error) {
              const errorMsg = response.error.error_message || response.error.message || 'User cancelled login or did not fully authorize'
              reject(new Error(errorMsg))
            } else {
              reject(new Error('User cancelled login or did not fully authorize'))
            }
          }
        },
        { scope: 'email,public_profile' } // Request both email and public_profile
      )
    })
  }

  /**
   * Redirige vers Facebook OAuth (flux redirect).
   * Utilisé sur mobile car les popups sont souvent bloquées.
   * @param returnTo - URL de retour après connexion (ex: '/' ou '/login?returnUrl=/dashboard')
   * @param flow - 'login' ou 'register' pour le message d'erreur
   */
  const redirectToFacebookLogin = (returnTo: string, flow: 'login' | 'register' = 'login'): void => {
    if (!process.client || !appId) {
      throw new Error('Facebook App ID is not configured')
    }
    const redirectUri = `${window.location.origin}/auth/facebook-callback`
    const state = encodeURIComponent(JSON.stringify({ returnTo, flow }))
    const scope = encodeURIComponent('email,public_profile')
    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=token&state=${state}`
    window.location.href = url
  }

  /**
   * Parse le hash retourné par Facebook après le flux redirect.
   * Facebook ne renvoie que access_token et expires_in dans le fragment.
   * Retourne { accessToken, state } ou null si pas de token.
   */
  const parseFacebookCallbackFromHash = (): {
    accessToken: string
    state?: { returnTo: string; flow: string }
  } | null => {
    if (!process.client || !window.location.hash) return null
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const stateStr = params.get('state')
    if (!accessToken) return null
    let state: { returnTo: string; flow: string } | undefined
    if (stateStr) {
      try {
        state = JSON.parse(decodeURIComponent(stateStr)) as { returnTo: string; flow: string }
      } catch {
        state = { returnTo: '/', flow: 'login' }
      }
    } else {
      state = { returnTo: '/', flow: 'login' }
    }
    return { accessToken, state }
  }

  /**
   * Récupère les infos utilisateur via l'API Graph Facebook avec le token.
   */
  const fetchUserInfoWithToken = async (accessToken: string): Promise<{
    userID: string
    email?: string
    firstName?: string
    lastName?: string
    picture?: string
  }> => {
    const url = `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) {
      throw new Error(data.error.message || 'Failed to get user info from Facebook')
    }
    return {
      userID: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      picture: data.picture?.data?.url,
    }
  }

  return {
    initFacebook,
    login,
    isMobile,
    redirectToFacebookLogin,
    parseFacebookCallbackFromHash,
    fetchUserInfoWithToken,
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    FB: any
    fbAsyncInit?: () => void
  }
}
