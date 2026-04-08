<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'
import { useAuthStore } from '~/stores/useAuthStore'
import { useBillingStore } from '~/stores/useBillingStore'
import { useMessagesStore } from '~/stores/useMessagesStore'
import { useMyBadgeCountStore } from '~/stores/useMyBadgeCountStore'
import { useStripeStore } from '~/stores/useStripeStore'

const { appName } = useAppInfo()
const { t } = useI18n()
const isDrawerOpen = ref(false)

const isNavPill = (to: string) => to === '/marketplace'
const authStore = useAuthStore()
const stripeStore = useStripeStore()
const billingStore = useBillingStore()
const messagesStore = useMessagesStore()
const myBadgeCountStore = useMyBadgeCountStore()

// Même logique que account/cotisation : membre avec cotisation encore valide
const hasActivePaidMembership = computed(() => {
  if (!authStore.isAuthenticated || !authStore.user) {
    return false
  }
  const role = authStore.user.role?.toLowerCase()
  const hasValidRole = role === 'member' || role === 'premium' || role === 'vip'
  if (!hasValidRole) {
    return false
  }
  const expiresAt = authStore.user.paidAccessExpiresAt
    ?? stripeStore.userAccess?.paidAccessExpiresAt
    ?? billingStore.userAccess?.paidAccessExpiresAt
  if (!expiresAt) {
    return false
  }
  return new Date(expiresAt) > new Date()
})

/** Invités et comptes sans adhésion active : mettre « Nos packs » dans la barre principale */
const showNosPacksInPrimaryNav = computed(() => !hasActivePaidMembership.value)

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

// Menu pour la section Marketplace
const marketplaceMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      label: t('nav.marketplaceHome'),
      to: '/marketplace',
      icon: 'i-heroicons-home',
      active: route.path === '/marketplace',
    },
    {
      label: t('nav.howItWorks'),
      to: '/marketplace/how-it-works',
      icon: 'i-heroicons-question-mark-circle',
      active: route.path === '/marketplace/how-it-works',
    },
  ]
  if (authStore.isAuthenticated) {
    items.push({
      label: t('common.mySpace'),
      to: '/account',
      icon: 'i-heroicons-user-circle',
      active: route.path.startsWith('/account'),
    })
  }
  return items
})

// Desktop Heritage : liens principaux (drawer mobile : heritageMobileDrawerItems)
const heritageDesktopPrimaryItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      label: t('nav.culture'),
      to: '/culture',
      icon: 'i-heroicons-video-camera',
      active: route.path.startsWith('/culture'),
    },
    {
      label: t('nav.academy'),
      to: '/academy',
      icon: 'i-heroicons-academic-cap',
      active: route.path.startsWith('/academy'),
    },
    {
      label: t('nav.games'),
      to: '/games',
      icon: 'i-heroicons-play',
      active: route.path.startsWith('/games'),
    },
    {
      label: t('nav.troc'),
      to: '/marketplace',
      icon: 'i-heroicons-shopping-bag',
      active: route.path.startsWith('/marketplace'),
      color: 'primary' as const,
    },
  ]
  if (showNosPacksInPrimaryNav.value) {
    items.push({
      label: t('nav.packs'),
      to: '/tarifs',
      icon: 'i-heroicons-cube',
      active: route.path.startsWith('/tarifs'),
    })
  }
  if (authStore.isAuthenticated) {
    items.push({
      label: t('common.mySpace'),
      to: '/account',
      icon: 'i-heroicons-user-circle',
      active: route.path.startsWith('/account'),
    })
  }
  return items
})

const heritageMoreMenuActive = computed(() => {
  const p = route.path
  const tarifsOnlyInMore = !showNosPacksInPrimaryNav.value
  return (
    p.startsWith('/goodies')
    || p.startsWith('/blog')
    || p.startsWith('/partners')
    || (tarifsOnlyInMore && p.startsWith('/tarifs'))
    || p.startsWith('/te-natiraa')
    || p.startsWith('/polls')
  )
})

const heritageMoreMenuItems = computed<DropdownMenuItem[][]>(() => {
  const row: DropdownMenuItem[] = [
    {
      label: t('nav.teNatiraa'),
      icon: 'i-heroicons-sparkles',
      to: '/te-natiraa',
    },
    {
      label: t('nav.partners'),
      icon: 'i-heroicons-building-office-2',
      to: '/partners',
    },
    {
      label: t('nav.goodies'),
      icon: 'i-heroicons-gift',
      to: '/goodies',
    },
    {
      label: t('nav.blog'),
      icon: 'i-heroicons-document-text',
      to: '/blog',
    },
    {
      label: t('nav.polls'),
      icon: 'i-heroicons-chart-bar',
      to: '/polls',
    },
  ]
  if (!showNosPacksInPrimaryNav.value) {
    row.push({
      label: t('nav.packs'),
      icon: 'i-heroicons-cube',
      to: '/tarifs',
    })
  }
  return [row]
})

/** Drawer mobile (Heritage) : même ordre que la barre desktop + liens « Plus », sans doublon pour /tarifs */
const heritageMobileDrawerItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      label: t('nav.culture'),
      to: '/culture',
      icon: 'i-heroicons-video-camera',
      active: route.path.startsWith('/culture'),
    },
    {
      label: t('nav.academy'),
      to: '/academy',
      icon: 'i-heroicons-academic-cap',
      active: route.path.startsWith('/academy'),
    },
    {
      label: t('nav.games'),
      to: '/games',
      icon: 'i-heroicons-play',
      active: route.path.startsWith('/games'),
    },
    {
      label: t('nav.troc'),
      to: '/marketplace',
      icon: 'i-heroicons-shopping-bag',
      active: route.path.startsWith('/marketplace'),
      color: 'primary' as const,
    },
    {
      label: t('nav.packs'),
      to: '/tarifs',
      icon: 'i-heroicons-cube',
      active: route.path.startsWith('/tarifs'),
    },
  ]
  if (authStore.isAuthenticated) {
    items.push({
      label: t('common.mySpace'),
      to: '/account',
      icon: 'i-heroicons-user-circle',
      active: route.path.startsWith('/account'),
    })
  }
  items.push(
    {
      label: t('nav.teNatiraa'),
      to: '/te-natiraa',
      icon: 'i-heroicons-sparkles',
      active: route.path.startsWith('/te-natiraa'),
    },
    {
      label: t('nav.partners'),
      to: '/partners',
      icon: 'i-heroicons-building-office-2',
      active: route.path.startsWith('/partners'),
    },
    {
      label: t('nav.goodies'),
      to: '/goodies',
      icon: 'i-heroicons-gift',
      active: route.path.startsWith('/goodies'),
    },
    {
      label: t('nav.blog'),
      to: '/blog',
      icon: 'i-heroicons-document-text',
      active: route.path.startsWith('/blog'),
    },
    {
      label: t('nav.polls'),
      to: '/polls',
      icon: 'i-heroicons-chart-bar',
      active: route.path.startsWith('/polls'),
    },
  )
  return items
})

const drawerMenuItems = computed<MenuItem[]>(() => {
  if (currentSection.value === 'marketplace') {
    return marketplaceMenuItems.value
  }
  return heritageMobileDrawerItems.value
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
      label: t('common.mySpace'),
      icon: 'i-heroicons-home',
      to: '/account',
    },
    {
      label: t('common.myProfile'),
      icon: 'i-heroicons-user-circle',
      to: '/account/profile',
    },
    {
      label: t('common.support'),
      icon: 'i-heroicons-lifebuoy',
      to: '/account/support',
    },
  ]

  // Ajouter le lien Administration si l'utilisateur est staff ou admin
  if (isStaffOrAdmin.value) {
    profileItems.push({
      label: t('common.administration'),
      icon: 'i-heroicons-squares-2x2',
      to: '/admin/dashboard',
    })
  }

  return [
    [
      {
        label: authStore.user?.email || t('common.user'),
        avatar: getAvatarUrl.value
          ? {
              src: getAvatarUrl.value,
              alt: authStore.user?.email || t('common.userAlt'),
            }
          : {
              text: getAvatarText.value,
              alt: authStore.user?.email || t('common.userAlt'),
            },
        type: 'label',
      },
    ],
    profileItems,
    [
      {
        label: t('common.logout'),
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

      <!-- Navigation Menu (desktop) -->
      <nav class="hidden items-center gap-1 md:flex">
        <template v-if="currentSection === 'marketplace'">
          <template v-for="item in marketplaceMenuItems" :key="item.to || item.label">
            <UButton
              v-if="item.external"
              :href="item.to"
              :target="item.target || '_blank'"
              :color="item.color || (item.active ? 'primary' : 'neutral')"
              :variant="item.active ? 'solid' : 'ghost'"
              :icon="item.icon"
              size="sm"
              :class="[
                isNavPill(item.to)
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
                isNavPill(item.to)
                  ? (item.active ? '!text-black border border-green-500 rounded-md' : '!text-green-500 border border-green-500 rounded-md')
                  : (item.active ? '!text-black' : '!text-white/80')
              ]"
            >
              {{ item.label }}
            </UButton>
          </template>
        </template>
        <template v-else>
          <template v-for="item in heritageDesktopPrimaryItems" :key="item.to || item.label">
            <UButton
              v-if="item.external"
              :href="item.to"
              :target="item.target || '_blank'"
              :color="item.color || (item.active ? 'primary' : 'neutral')"
              :variant="item.active ? 'solid' : 'ghost'"
              :icon="item.icon"
              size="sm"
              :class="[
                isNavPill(item.to)
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
                isNavPill(item.to)
                  ? (item.active ? '!text-black border border-green-500 rounded-md' : '!text-green-500 border border-green-500 rounded-md')
                  : (item.active ? '!text-black' : '!text-white/80')
              ]"
            >
              {{ item.label }}
            </UButton>
          </template>
          <UDropdownMenu :items="heritageMoreMenuItems" :modal="false">
            <UButton
              :color="heritageMoreMenuActive ? 'primary' : 'neutral'"
              :variant="heritageMoreMenuActive ? 'solid' : 'ghost'"
              trailing-icon="i-heroicons-chevron-down"
              size="sm"
              :class="heritageMoreMenuActive ? '!text-black' : '!text-white/80'"
            >
              {{ t('nav.more') }}
            </UButton>
          </UDropdownMenu>
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
              <template v-for="item in drawerMenuItems" :key="item.to || item.label">
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

            <!-- Connexion (Mon espace est déjà dans la liste pour Heritage ; Marketplace inclut Mon espace dans drawerMenuItems) -->
            <div
              v-if="!authStore.isAuthenticated"
              class="p-4 border-t border-white/10"
            >
              <UButton
                to="/login"
                color="primary"
                variant="solid"
                icon="i-heroicons-lock-closed"
                size="sm"
                class="w-full justify-center"
                @click="isDrawerOpen = false"
              >
                {{ t('common.login') }}
              </UButton>
            </div>
          </div>
        </template>
      </UDrawer>

      <!-- Auth Section (Connexion cachée sur mobile, présente dans le drawer) -->
      <div class="flex items-center gap-2 md:ml-6">
        <LanguageSwitcher />
        <UButton
          v-if="!authStore.isAuthenticated"
          to="/login"
          color="primary"
          variant="solid"
          icon="i-heroicons-lock-closed"
          size="sm"
          class="hidden sm:flex"
        >
          {{ t('common.login') }}
        </UButton>
        <template v-else>
          <NuxtLink
            to="/account/messages"
            class="relative flex items-center justify-center rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            :aria-label="t('common.messages')"
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
          <UDropdownMenu :items="userMenuItems" :modal="false">
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
              :badge-level="myBadgeCountStore.count"
              avatar-class="hover:ring-2 hover:ring-primary-500 transition-all"
            />
          </UButton>
        </UDropdownMenu>
        </template>
      </div>
    </div>
  </header>
</template>



