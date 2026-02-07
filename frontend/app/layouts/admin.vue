<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/stores/useAuthStore'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const { appName } = useAppInfo()
const isSidebarOpen = ref(true)

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
const { getImageUrl } = useApi()
const getAvatarUrl = computed(() => {
  if (!authStore.user?.avatarImage) return null
  return getImageUrl(authStore.user.avatarImage)
})

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}

// Rediriger si l'utilisateur n'est pas autorisé
onMounted(() => {
  // Vérification d'autorisation
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  if (!isStaffOrAdmin.value) {
    router.push('/')
    return
  }
})

// Items du menu dropdown
const userMenuItems = computed<DropdownMenuItem[][]>(() => [
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
  [
    {
      label: 'Mon profil',
      icon: 'i-heroicons-user-circle',
      to: '/account/profile',
    },
    {
      label: 'Déconnexion',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: handleLogout,
    },
  ],
])

const adminMenuItems = [
  {
    label: 'Dashboard',
    icon: 'i-heroicons-squares-2x2',
    to: '/admin/dashboard',
  },
  {
    label: 'Gestion des utilisateurs',
    icon: 'i-heroicons-users',
    to: '/admin/users',
  },
  {
    label: 'Gestion du blog',
    icon: 'i-heroicons-document-text',
    to: '/admin/blog',
  },
  {
    label: 'Gestion des partenaires',
    icon: 'i-heroicons-building-office',
    to: '/admin/partners',
  },
  {
    label: 'Gestion des goodies',
    icon: 'i-heroicons-gift',
    to: '/admin/goodies',
  },
  {
    label: 'Gestion des vidéos Culture',
    icon: 'i-heroicons-video-camera',
    to: '/admin/culture',
  },
]

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <div class="min-h-dvh flex">
    <!-- Sidebar -->
    <aside
      :class="[
        'bg-gray-900 border-r border-white/10 transition-all duration-300',
        isSidebarOpen ? 'w-64' : 'w-20',
      ]"
    >
      <div class="flex flex-col h-full">
        <!-- Logo / Header -->
        <div class="p-4 border-b border-white/10 h-[61px]">
          <div class="flex items-center justify-between">
            <NuxtLink
              v-if="isSidebarOpen"
              to="/"
              class="flex items-center gap-3"
            >
              <img :src="logoUrl" :alt="appName" class="h-8 w-auto" />
              <span class="font-semibold text-sm">{{ appName }}</span>
            </NuxtLink>
            <NuxtLink v-else to="/" class="flex justify-center">
              <img :src="logoUrl" :alt="appName" class="h-8 w-auto" />
            </NuxtLink>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              :icon="isSidebarOpen ? 'i-heroicons-chevron-left' : 'i-heroicons-chevron-right'"
              @click="isSidebarOpen = !isSidebarOpen"
            />
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4 space-y-1">
          <NuxtLink
            v-for="item in adminMenuItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive(item.to)
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
              !isSidebarOpen && 'justify-center',
            ]"
            :title="!isSidebarOpen ? item.label : ''"
          >
            <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="isSidebarOpen" class="truncate">{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top bar -->
      <header class="bg-gray-900/50 border-b border-white/10 backdrop-blur">
        <div class="px-6 py-2">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-semibold">
              {{ route.meta?.title || 'Administration' }}
            </h1>
            <div class="flex items-center gap-2">
              <!-- User menu -->
              <UDropdownMenu :items="userMenuItems">
                <UButton
                  color="neutral"
                  variant="ghost"
                  class="p-0 rounded-lg"
                >
                  <div class="flex items-center gap-3 px-3 py-2">
                    <UAvatar
                      v-if="getAvatarUrl"
                      :src="getAvatarUrl"
                      :alt="authStore.user?.email || 'User'"
                      size="sm"
                    />
                    <UAvatar
                      v-else
                      :alt="authStore.user?.email || 'User'"
                      :text="getAvatarText"
                      size="sm"
                    />
                    <!-- <div class="flex-1 min-w-0 text-left">
                      <p class="text-sm font-medium text-white truncate">
                        {{ authStore.user?.email }}
                      </p>
                      <p class="text-xs text-white/60 capitalize">
                        {{ authStore.user?.role }}
                      </p>
                    </div> -->
                    <!-- <UIcon
                      name="i-heroicons-chevron-down"
                      class="w-4 h-4 text-white/70"
                    /> -->
                  </div>
                </UButton>
              </UDropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto bg-gray-950">
        <div class="p-6">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
