<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'
import { useAuthStore } from '~/stores/useAuthStore'

const { appName } = useAppInfo()
const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}

// Vérifier si l'utilisateur est staff ou admin
const isStaffOrAdmin = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  return role === 'superadmin' || role === 'admin' || role === 'staff'
})

// Obtenir le texte pour l'avatar (initiales)
const getAvatarText = computed(() => {
  if (!authStore.user) return 'U'
  if (authStore.user.firstName) {
    return authStore.user.firstName.charAt(0).toUpperCase()
  }
  if (authStore.user.lastName) {
    return authStore.user.lastName.charAt(0).toUpperCase()
  }
  return authStore.user.email?.charAt(0).toUpperCase() || 'U'
})

// Obtenir l'URL de l'avatar
const getAvatarUrl = computed(() => {
  if (!authStore.user?.avatarImage) return null
  return `http://localhost:3001${authStore.user.avatarImage}`
})

// Items du menu dropdown
const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  const profileItems: DropdownMenuItem[] = [
    {
      label: 'Mon espace',
      icon: 'i-heroicons-squares-2x2',
      to: '/account',
    },
    {
      label: 'Mon profil',
      icon: 'i-heroicons-user-circle',
      to: '/account/profile',
    },
  ]

  // Ajouter le lien Dashboard si l'utilisateur est staff ou admin
  if (isStaffOrAdmin.value) {
    profileItems.push({
      label: 'Dashboard',
      icon: 'i-heroicons-squares-2x2',
      to: '/admin/dashboard',
    })
  }

  return [
    [
      {
        label: authStore.user?.email || 'Utilisateur',
        avatar: getAvatarUrl.value
          ? {
              src: getAvatarUrl.value,
              alt: authStore.user?.email || 'User',
            }
          : {
              text: getAvatarText.value,
              alt: authStore.user?.email || 'User',
            },
        type: 'label',
      },
    ],
    profileItems,
    [
      {
        label: 'Déconnexion',
        icon: 'i-heroicons-arrow-right-on-rectangle',
        onSelect: handleLogout,
      },
    ],
  ]
})
</script>

<template>
  <header class="border-b border-white/10 bg-black/20 backdrop-blur">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="flex items-center gap-3">
          <img :src="logoUrl" :alt="appName" class="h-10 w-auto" />
          <div class="leading-tight">
            <div class="font-semibold">{{ appName }}</div>
            <div class="text-xs text-white/60">Nuxt 4 • Pinia • Nuxt UI • Nuxt Icon</div>
          </div>
        </NuxtLink>
      </div>

      <div class="flex items-center gap-2">
        <UButton to="/" color="neutral" variant="ghost" icon="i-heroicons-home">
          Home
        </UButton>
        <UButton
          v-if="!authStore.isAuthenticated"
          to="/login"
          color="primary"
          variant="solid"
          icon="i-heroicons-lock-closed"
        >
          Connexion
        </UButton>
        <UDropdownMenu v-else :items="userMenuItems">
          <UButton
            color="neutral"
            variant="ghost"
            class="p-0 rounded-full"
          >
            <UAvatar
              v-if="getAvatarUrl"
              :src="getAvatarUrl"
              :alt="authStore.user?.email || 'User'"
              size="md"
              class="hover:ring-2 hover:ring-primary-500 transition-all"
            />
            <UAvatar
              v-else
              :alt="authStore.user?.email || 'User'"
              :text="getAvatarText"
              size="md"
              class="hover:ring-2 hover:ring-primary-500 transition-all"
            />
          </UButton>
        </UDropdownMenu>
      </div>
    </div>
  </header>
</template>



