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

  return {
    initFacebook,
    login,
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    FB: any
    fbAsyncInit?: () => void
  }
}
