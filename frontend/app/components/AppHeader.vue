<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'
import { useAuthStore } from '~/stores/useAuthStore'

const { appName, tagline } = useAppInfo()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}

// Vérifier si l'utilisateur est staff ou admin
const isStaffOrAdmin = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  return role === 'superadmin' || role === 'admin' || role === 'staff'
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
const heritageMenuItems = computed(() => [
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
    to: 'https://nunaaheritage.schoolmaker.co/products',
    icon: 'i-heroicons-academic-cap',
    external: true,
    target: '_blank',
  },
])

// Menu pour la section Marketplace
const marketplaceMenuItems = computed(() => [
  {
    label: 'Accueil Marketplace',
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

// Mobile menu items
const mobileMenuItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[] = activeMenuItems.value.map((item) => {
    if (item.external) {
      return {
        label: item.label,
        icon: item.icon,
        href: item.to,
        target: item.target || '_blank',
        rel: 'noopener noreferrer',
      }
    }
    return {
      label: item.label,
      icon: item.icon,
      to: item.to,
    }
  })

  return [items]
})
</script>

<template>
  <header class="border-b border-white/10 bg-black/20 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="flex items-center gap-3">
          <img :src="logoUrl" :alt="appName" class="h-10 w-auto" />
          <div class="leading-tight">
            <div class="font-semibold">{{ appName }}</div>
            <div class="text-xs text-white/60">
              {{ tagline }}
            </div>
          </div>
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
          >
            {{ item.label }}
          </UButton>
        </template>
      </nav>

      <!-- Mobile Menu -->
      <UDropdownMenu :items="mobileMenuItems" class="md:hidden">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-bars-3"
        />
      </UDropdownMenu>

      <!-- Auth Section -->
      <div class="flex items-center gap-2">
        <UButton
          v-if="!authStore.isAuthenticated"
          to="/login"
          color="primary"
          variant="solid"
          icon="i-heroicons-lock-closed"
          size="sm"
        >
          <span class="hidden sm:inline">Connexion</span>
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



