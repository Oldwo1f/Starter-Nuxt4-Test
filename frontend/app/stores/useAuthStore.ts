import { defineStore } from 'pinia'

interface User {
  id: number
  email: string
  firstName?: string | null
  lastName?: string | null
  avatarImage?: string | null
  role: string
  emailVerified: boolean
  isActive: boolean
  paidAccessExpiresAt?: string | null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  // Initialize from localStorage (called by plugin on client side)
  const initialize = () => {
    if (!process.client) return
    
    try {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('auth_user')
      
      if (storedToken && storedUser) {
        accessToken.value = storedToken
        user.value = JSON.parse(storedUser)
      }
    } catch (error) {
      // En cas d'erreur de parsing, nettoyer les données corrompues
      console.error('Erreur lors de l\'initialisation de l\'authentification depuis localStorage:', error)
      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }
  }

  const setAuth = (token: string, userData: User) => {
    accessToken.value = token
    user.value = userData
    if (process.client) {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(userData))
    }
  }

  const clearAuth = () => {
    accessToken.value = null
    user.value = null
    if (process.client) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await $fetch<{ access_token: string; user: User }>(
        `${API_BASE_URL}/auth/login`,
        {
          method: 'POST',
          body: {
            email,
            password,
          },
        }
      )
      setAuth(response.access_token, response.user)
      return { success: true, data: response }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur de connexion',
      }
    }
  }

  const register = async (email: string, password: string, referralCode?: string) => {
    try {
      const body: any = {
        email,
        password,
      }
      if (referralCode) {
        body.referralCode = referralCode
      }
      const response = await $fetch<{ access_token: string; user: User }>(
        `${API_BASE_URL}/auth/register`,
        {
          method: 'POST',
          body,
        }
      )
      setAuth(response.access_token, response.user)
      return { success: true, data: response }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur lors de l\'inscription',
      }
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      const response = await $fetch<{ message: string }>(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: 'POST',
          body: {
            email,
          },
        }
      )
      return { success: true, message: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur lors de la demande de réinitialisation',
      }
    }
  }

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await $fetch<{ message: string }>(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: 'POST',
          body: {
            token,
            newPassword,
          },
        }
      )
      return { success: true, message: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur lors de la réinitialisation',
      }
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await $fetch<{ message: string }>(
        `${API_BASE_URL}/auth/change-password`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
          },
          body: {
            currentPassword,
            newPassword,
          },
        }
      )
      return { success: true, message: response.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur lors du changement de mot de passe',
      }
    }
  }

  const facebookLogin = async (facebookId: string, email: string, accessToken: string) => {
    try {
      const response = await $fetch<{ access_token: string; user: User }>(
        `${API_BASE_URL}/auth/facebook`,
        {
          method: 'POST',
          body: {
            facebookId,
            email,
            accessToken,
          },
        }
      )
      setAuth(response.access_token, response.user)
      return { success: true, data: response }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur lors de la connexion Facebook',
      }
    }
  }

  const logout = () => {
    clearAuth()
  }

  const fetchProfile = async () => {
    try {
      const response = await $fetch<User>(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
        },
      })
      user.value = response
      if (process.client) {
        localStorage.setItem('auth_user', JSON.stringify(response))
      }
      return { success: true, data: response }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur lors de la récupération du profil',
      }
    }
  }

  const updateProfile = async (updates: {
    firstName?: string
    lastName?: string
    avatarImage?: string
  }) => {
    try {
      const response = await $fetch<User>(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
        },
        body: updates,
      })
      user.value = response
      if (process.client) {
        localStorage.setItem('auth_user', JSON.stringify(response))
      }
      return { success: true, data: response }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur lors de la mise à jour du profil',
      }
    }
  }

  const uploadAvatar = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await $fetch<{
        avatarUrl: string
        message: string
        user: User
      }>(`${API_BASE_URL}/auth/upload-avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
        },
        body: formData,
      })

      // Mettre à jour le store avec le nouvel avatar
      if (response.user) {
        user.value = response.user
        if (process.client) {
          localStorage.setItem('auth_user', JSON.stringify(response.user))
        }
      }

      return { success: true, data: response }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Erreur lors de l\'upload de l\'avatar',
      }
    }
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    initialize,
    login,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
    facebookLogin,
    logout,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  }
})
