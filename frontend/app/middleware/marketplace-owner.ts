import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  // This middleware should be used on pages that require ownership
  // The actual ownership check should be done in the page component
  // by comparing the listing sellerId with authStore.user.id
})
