<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'
import { useAuthStore } from '~/stores/useAuthStore'
import { useMessagesStore } from '~/stores/useMessagesStore'

const { appName } = useAppInfo()
const isDrawerOpen = ref(false)
const authStore = useAuthStore()
const messagesStore = useMessagesStore()

onMounted(() => {
  if (authStore.isAuthenticated) {
    messagesStore.initSocket()
    messagesStore.fetchUnreadCount()
  }
})
const router = useRouter()
const route = useRoute()

// Type pour les items du menu
type MenuItem = {
  label: string
  to: string
  icon: string
  active: boolean
  external?: boolean
  target?: string
  color?: 'primary' | 'neutral' | 'success' | 'info' | 'warning' | 'error'
}

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}

// Vérifier si l'utilisateur est staff ou admin
const isStaffOrAdmin = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  return role === 'superadmin' || role === 'admin' || role === 'staff' || role === 'moderator'
})

// Détecter la section actuelle
const currentSection = computed(() => {
  const path = route.path
  if (path.startsWith('/marketplace')) {
    return 'marketplace'
  }
  if (path.startsWith('/account') || path.startsWith('/admin')) {
    return 'account' // Ces sections ont leur propre layout, mais on peut quand même détecter
  }
  return 'heritage'
})

// Menu pour la section Nuna'a Heritage
const heritageMenuItems = computed<MenuItem[]>(() => [
  {
    label: 'Accueil',
    to: '/',
    icon: 'i-heroicons-home',
    active: route.path === '/',
  },
  {
    label: 'Blog',
    to: '/blog',
    icon: 'i-heroicons-document-text',
    active: route.path.startsWith('/blog'),
  },
  {
    label: 'Goodies',
    to: '/goodies',
    icon: 'i-heroicons-gift',
    active: route.path.startsWith('/goodies'),
  },
  {
    label: 'Culture',
    to: '/culture',
    icon: 'i-heroicons-video-camera',
    active: route.path.startsWith('/culture'),
  },
  {
    label: 'Partenaires',
    to: '/partners',
    icon: 'i-heroicons-building-office-2',
    active: route.path.startsWith('/partners'),
  },
  {
    label: 'Nos packs',
    to: '/tarifs',
    icon: 'i-heroicons-cube',
    active: route.path.startsWith('/tarifs'),
  },
  {
    label: 'Te Natira\'a',
    to: '/te-natiraa',
    icon: 'i-heroicons-sparkles',
    active: route.path.startsWith('/te-natiraa'),
  },
  {
    label: "Nuna'a Troc",
    to: '/marketplace',
    icon: 'i-heroicons-shopping-bag',
    active: route.path.startsWith('/marketplace'),
    color: 'primary' as const,
  },
  {
    label: 'Academy',
    to: '/academy',
    icon: 'i-heroicons-academic-cap',
    active: route.path.startsWith('/academy'),
  },
  {
    label: 'Jeux',
    to: '/games',
    icon: 'i-heroicons-play',
    active: route.path.startsWith('/games'),
  },
])

// Menu pour la section Marketplace
const marketplaceMenuItems = computed<MenuItem[]>(() => [
  {
    label: 'Place de TROC',
    to: '/marketplace',
    icon: 'i-heroicons-home',
    active: route.path === '/marketplace',
  },
  {
    label: 'Comment ça marche',
    to: '/marketplace/how-it-works',
    icon: 'i-heroicons-question-mark-circle',
    active: route.path === '/marketplace/how-it-works',
  },
  {
    label: 'Mon espace',
    to: '/account',
    icon: 'i-heroicons-user-circle',
    active: route.path.startsWith('/account'),
  },
])

// Menu actif selon la section
const activeMenuItems = computed(() => {
  if (currentSection.value === 'marketplace') {
    return marketplaceMenuItems.value
  }
  return heritageMenuItems.value
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

  // Ajouter le lien Administration si l'utilisateur est staff ou admin
  if (isStaffOrAdmin.value) {
    profileItems.push({
      label: 'Administration',
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

const isActive = (item: MenuItem) => item.active
</script>

<template>
  <header class="border-b border-white/10 bg-black/20 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        <!-- Burger mobile (drawer) -->
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-bars-3"
          size="sm"
          class="md:hidden flex-shrink-0"
          @click="isDrawerOpen = true"
        />
        <NuxtLink to="/" class="flex items-center gap-3 min-w-0">
          <img :src="logoUrl" :alt="appName" class="h-10 w-auto flex-shrink-0" />
          <div class="font-semibold hidden sm:block truncate">{{ appName }}</div>
        </NuxtLink>
      </div>

      <!-- Navigation Menu -->
      <nav class="hidden items-center gap-1 md:flex">
        <template v-for="item in activeMenuItems" :key="item.to || item.label">
          <UButton
            v-if="item.external"
            :href="item.to"
            :target="item.target || '_blank'"
            :color="item.color || (item.active ? 'primary' : 'neutral')"
            :variant="item.active ? 'solid' : 'ghost'"
            :icon="item.icon"
            size="sm"
            :class="[
              (item.label === 'Nuna\'a Troc' || item.label === 'Academy') 
                ? (item.active ? '!text-black border border-green-500 rounded-md' : '!text-green-500 border border-green-500 rounded-md')
                : (item.active ? '!text-black' : '!text-white/80')
            ]"
            rel="noopener noreferrer"
          >
            {{ item.label }}
          </UButton>
          <UButton
            v-else
            :to="item.to"
            :color="item.color || (item.active ? 'primary' : 'neutral')"
            :variant="item.active ? 'solid' : 'ghost'"
            :icon="item.icon"
            size="sm"
            :class="[
              (item.label === 'Nuna\'a Troc' || item.label === 'Academy') 
                ? (item.active ? '!text-black border border-green-500 rounded-md' : '!text-green-500 border border-green-500 rounded-md')
                : (item.active ? '!text-black' : '!text-white/80')
            ]"
          >
            {{ item.label }}
          </UButton>
        </template>
      </nav>

      <!-- Mobile Menu: Drawer à gauche (comme layout account) -->
      <UDrawer
        v-model:open="isDrawerOpen"
        direction="left"
        :handle="false"
      >
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
              <template v-for="item in activeMenuItems" :key="item.to || item.label">
                <a
                  v-if="item.external"
                  :href="item.to"
                  :target="item.target || '_blank'"
                  rel="noopener noreferrer"
                  :class="[
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item)
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  ]"
                  @click="isDrawerOpen = false"
                >
                  <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                  <span class="truncate flex-1">{{ item.label }}</span>
                </a>
                <NuxtLink
                  v-else
                  :to="item.to"
                  :class="[
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item)
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  ]"
                  @click="isDrawerOpen = false"
                >
                  <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                  <span class="truncate flex-1">{{ item.label }}</span>
                </NuxtLink>
              </template>
            </nav>

            <!-- Auth en bas du drawer (mobile) -->
            <div class="p-4 border-t border-white/10">
              <UButton
                v-if="!authStore.isAuthenticated"
                to="/login"
                color="primary"
                variant="solid"
                icon="i-heroicons-lock-closed"
                size="sm"
                class="w-full justify-center"
                @click="isDrawerOpen = false"
              >
                Connexion
              </UButton>
              <NuxtLink
                v-else
                to="/account"
                class="block"
                @click="isDrawerOpen = false"
              >
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-user-circle"
                  size="sm"
                  class="w-full justify-start"
                >
                  Mon espace
                </UButton>
              </NuxtLink>
            </div>
          </div>
        </template>
      </UDrawer>

      <!-- Auth Section (Connexion cachée sur mobile, présente dans le drawer) -->
      <div class="flex items-center gap-2">
        <UButton
          v-if="!authStore.isAuthenticated"
          to="/login"
          color="primary"
          variant="solid"
          icon="i-heroicons-lock-closed"
          size="sm"
          class="hidden sm:flex"
        >
          Connexion
        </UButton>
        <template v-else>
          <NuxtLink
            to="/account/messages"
            class="relative flex items-center justify-center rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Messages"
          >
            <UIcon name="i-heroicons-chat-bubble-left-right" class="h-5 w-5" />
            <UBadge
              v-if="messagesStore.totalUnreadCount > 0"
              color="primary"
              variant="solid"
              size="xs"
              class="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 text-[10px] leading-none !rounded-full justify-center px-1.5"
            >
              {{ messagesStore.totalUnreadCount > 99 ? '99+' : messagesStore.totalUnreadCount }}
            </UBadge>
          </NuxtLink>
          <UDropdownMenu :items="userMenuItems">
          <UButton
            color="neutral"
            variant="ghost"
            class="p-0 rounded-full"
          >
            <CertifiedAvatar
              :src="getAvatarUrl"
              :alt="authStore.user?.email || 'User'"
              :text="getAvatarText"
              size="md"
              :is-certified="authStore.user?.isCertified === true"
              avatar-class="hover:ring-2 hover:ring-primary-500 transition-all"
            />
          </UButton>
        </UDropdownMenu>
        </template>
      </div>
    </div>
  </header>
</template>



