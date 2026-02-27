<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/stores/useAuthStore'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const { appName } = useAppInfo()
const isSidebarOpen = ref(true)
const isDrawerOpen = ref(false)

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

// Rediriger si l'utilisateur n'est pas authentifié
onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
})

// Vérifier si l'utilisateur est staff ou admin
const isStaffOrAdmin = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  return role === 'superadmin' || role === 'admin' || role === 'staff' || role === 'moderator'
})

// Items du menu dropdown
const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  const profileItems: DropdownMenuItem[] = [
    {
      label: 'Mon espace',
      icon: 'i-heroicons-home',
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

const accountMenuItems = [
  {
    label: 'Dashboard',
    icon: 'i-heroicons-squares-2x2',
    to: '/account',
  },
  {
    label: 'Cotisation',
    icon: 'i-heroicons-banknotes',
    to: '/account/cotisation',
  },
  {
    label: 'Mes annonces',
    icon: 'i-heroicons-rectangle-stack',
    to: '/account/listings',
  },
  {
    label: 'Mon portefeuille',
    icon: 'i-heroicons-wallet',
    to: '/account/wallet',
  },
  {
    label: 'Transactions',
    icon: 'i-heroicons-arrow-path',
    to: '/account/transactions',
  },
  {
    label: 'Parrainage',
    icon: 'i-heroicons-user-plus',
    to: '/account/referral',
  },
  {
    label: 'Mon profil',
    icon: 'i-heroicons-user-circle',
    to: '/account/profile',
  }
]

// Menu de navigation rapide en bas (mobile uniquement)
const bottomNavItems = [
  {
    label: 'Annonces',
    icon: 'i-heroicons-rectangle-stack',
    to: '/account/listings',
  },

  {
    label: 'TROC',
    icon: 'i-heroicons-shopping-bag',
    to: '/marketplace',
  },
  {
    label: 'Portefeuille',
    icon: 'i-heroicons-wallet',
    to: '/account/wallet',
  },
  {
    label: 'Transactions',
    icon: 'i-heroicons-arrow-path',
    to: '/account/transactions',
  },
]

const isActive = (path: string) => {
  // For dashboard (/account), only match exact path
  if (path === '/account') {
    return route.path === '/account'
  }
  // For other pages, match exact path or sub-paths
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <div class="min-h-dvh flex">
    <!-- Sidebar Desktop (cachée sur mobile) -->
    <aside
      :class="[
        'bg-gray-900 border-r border-white/10 transition-all duration-300',
        isSidebarOpen ? 'w-64' : 'w-20',
        'hidden md:block',
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
            v-for="item in accountMenuItems"
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
            @click="isDrawerOpen = false"
          >
            <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="isSidebarOpen" class="truncate">{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </div>
    </aside>

    <!-- Drawer Mobile -->
    <UDrawer
      v-model:open="isDrawerOpen"
      direction="left"
      :handle="false"
    >
      <!-- Trigger caché (on utilise le bouton du header) -->
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-bars-3"
        size="sm"
        class="hidden"
      />

      <template #content>
        <div class="flex flex-col h-full bg-gray-900">
          <!-- Logo / Header -->
          <div class="p-4 border-b border-white/10">
            <div class="flex items-center justify-between">
              <NuxtLink
                to="/"
                class="flex items-center gap-3"
                @click="isDrawerOpen = false"
              >
                <img :src="logoUrl" :alt="appName" class="h-8 w-auto" />
                <span class="font-semibold text-sm">{{ appName }}</span>
              </NuxtLink>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-x-mark"
                @click="isDrawerOpen = false"
              />
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
            <NuxtLink
              v-for="item in accountMenuItems"
              :key="item.to"
              :to="item.to"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive(item.to)
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              ]"
              @click="isDrawerOpen = false"
            >
              <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
              <span class="truncate">{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <!-- Boutons Place de TROC et Academy en bas du drawer (mobile uniquement) -->
          <div class="p-4 border-t border-white/10 space-y-2">
            <UButton
              to="/marketplace"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-shopping-bag"
              size="sm"
              :class="[
                route.path.startsWith('/marketplace')
                  ? '!text-white border border-green-500 rounded-md'
                  : '!text-green-500 border border-green-500 rounded-md',
                'w-full justify-start'
              ]"
              @click="isDrawerOpen = false"
            >
              Place de TROC
            </UButton>
            <UButton
              to="/academy"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-academic-cap"
              size="sm"
              :class="[
                route.path.startsWith('/academy')
                  ? '!text-white border border-green-500 rounded-md'
                  : '!text-green-500 border border-green-500 rounded-md',
                'w-full justify-start'
              ]"
              @click="isDrawerOpen = false"
            >
              Academy
            </UButton>
          </div>
        </div>
      </template>
    </UDrawer>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0 w-full md:w-auto">
      <!-- Top bar -->
      <header class="bg-gray-900/50 border-b border-white/10 backdrop-blur">
        <div class="px-4 md:px-6 py-2">
          <div class="flex items-center justify-between gap-2 md:gap-4">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <!-- Menu button mobile -->
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-bars-3"
                size="sm"
                class="md:hidden"
                @click="isDrawerOpen = true"
              />
              <h1 class="text-lg md:text-xl font-semibold truncate">
                {{ route.meta?.title || 'Mon espace' }}
              </h1>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <!-- Buttons container: cachés sur mobile, visibles sur desktop -->
              <div class="hidden md:flex md:flex-row gap-2">
                <!-- Place de TROC button -->
                <UButton
                  to="/marketplace"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-shopping-bag"
                  size="sm"
                  :class="[
                    route.path.startsWith('/marketplace')
                      ? '!text-white border border-green-500 rounded-md'
                      : '!text-green-500 border border-green-500 rounded-md',
                  ]"
                >
                  Place de TROC
                </UButton>
                <!-- Academy button -->
                <UButton
                  to="/academy"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-academic-cap"
                  size="sm"
                  :class="[
                    route.path.startsWith('/academy')
                      ? '!text-white border border-green-500 rounded-md'
                      : '!text-green-500 border border-green-500 rounded-md',
                  ]"
                >
                  Academy
                </UButton>
              </div>
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
                  </div>
                </UButton>
              </UDropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto bg-gray-950 w-full pb-20 md:pb-0">
        <div class="p-4 md:p-6">
          <slot />
        </div>
      </main>
    </div>

    <!-- Bottom Navigation Bar (Mobile uniquement) -->
    <nav class="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-white/10 md:hidden z-50 safe-area-inset-bottom">
      <div class="flex items-center justify-around h-16 px-1">
        <NuxtLink
          v-for="item in bottomNavItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-all',
            isActive(item.to) || (item.to === '/marketplace' && route.path.startsWith('/marketplace'))
              ? 'text-primary-400 bg-primary-500/10'
              : 'text-white/70 active:bg-white/5'
          ]"
        >
          <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
          <span class="text-[10px] leading-tight text-center px-1 truncate max-w-full">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
