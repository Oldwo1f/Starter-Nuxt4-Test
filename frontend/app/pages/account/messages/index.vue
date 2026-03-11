<script setup lang="ts">
import { useMessagesStore } from '~/stores/useMessagesStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { useMessageSound } from '~/composables/useMessageSound'
import { useDate } from '~/composables/useDate'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
})

useHead({
  title: 'Messages',
})

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'
const messagesStore = useMessagesStore()
const walletStore = useWalletStore()
const authStore = useAuthStore()
const toast = useToast()
const { unlock: unlockSound } = useMessageSound()
const { getImageUrl } = useApi()
const { fromNow } = useDate()

const userIdFromQuery = computed(() => {
  const u = route.query.userId
  return u ? parseInt(String(u), 10) : null
})
const listingIdFromQuery = computed(() => {
  const l = route.query.listingId
  return l ? parseInt(String(l), 10) : null
})

// New conversation modal
const isNewConversationOpen = ref(false)
const selectedUser = ref<any | null>(null)
const selectedListing = ref<{ id: number; title: string } | null>(null)
const userSearchTerm = ref('')
const listingSearchTerm = ref('')
const userSearchResults = ref<any[]>([])
const listingSearchResults = ref<{ id: number; title: string }[]>([])
const isSearchingUsers = ref(false)
const isSearchingListings = ref(false)
const showUserResults = ref(false)
const showListingResults = ref(false)
const isCreating = ref(false)

const getUserDisplayName = (user: any) => {
  if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`
  if (user?.firstName) return user.firstName
  if (user?.lastName) return user.lastName
  return user?.email || ''
}

const getAvatarText = (user: any) => {
  if (user?.firstName) return user.firstName.charAt(0).toUpperCase()
  if (user?.lastName) return user.lastName.charAt(0).toUpperCase()
  return user?.email?.charAt(0).toUpperCase() || 'U'
}

const getAvatarUrl = (user: any) => {
  if (user?.avatarImage) {
    const url = user.avatarImage
    return url.startsWith('http') ? url : getImageUrl(url)
  }
  return null
}

const searchUsers = async () => {
  if (userSearchTerm.value.length < 2) {
    userSearchResults.value = []
    showUserResults.value = false
    return
  }
  isSearchingUsers.value = true
  try {
    const result = await walletStore.searchUsers(userSearchTerm.value, 20)
    if (result.success && result.data) {
      userSearchResults.value = (result.data || []).filter(
        (u: any) => u.id !== authStore.user?.id
      )
      showUserResults.value = userSearchResults.value.length > 0
    }
  } catch {
    userSearchResults.value = []
  } finally {
    isSearchingUsers.value = false
  }
}

const searchListings = async () => {
  if (listingSearchTerm.value.length < 2) {
    listingSearchResults.value = []
    showListingResults.value = false
    return
  }
  isSearchingListings.value = true
  try {
    const res = await $fetch<{ data: { id: number; title: string }[] }>(
      `${apiBaseUrl}/marketplace/listings`,
      { query: { search: listingSearchTerm.value, pageSize: 15 } }
    )
    listingSearchResults.value = (res.data || []).map((l) => ({ id: l.id, title: l.title }))
    showListingResults.value = listingSearchResults.value.length > 0
  } catch {
    listingSearchResults.value = []
  } finally {
    isSearchingListings.value = false
  }
}

const selectUser = (user: any) => {
  selectedUser.value = user
  userSearchTerm.value = getUserDisplayName(user)
  showUserResults.value = false
}

const selectListing = (listing: { id: number; title: string }) => {
  selectedListing.value = listing
  listingSearchTerm.value = listing.title
  showListingResults.value = false
}

const clearUserSelection = () => {
  selectedUser.value = null
  userSearchTerm.value = ''
  showUserResults.value = false
}

const clearListingSelection = () => {
  selectedListing.value = null
  listingSearchTerm.value = ''
  showListingResults.value = false
}

let userSearchTimeout: ReturnType<typeof setTimeout> | null = null
let listingSearchTimeout: ReturnType<typeof setTimeout> | null = null

watch(userSearchTerm, () => {
  if (selectedUser.value) return
  if (userSearchTimeout) clearTimeout(userSearchTimeout)
  userSearchTimeout = setTimeout(searchUsers, 300)
})

watch(listingSearchTerm, () => {
  if (selectedListing.value) return
  if (listingSearchTimeout) clearTimeout(listingSearchTimeout)
  listingSearchTimeout = setTimeout(searchListings, 300)
})

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.user-search-container')) showUserResults.value = false
  if (!target.closest('.listing-search-container')) showListingResults.value = false
}

const openNewConversation = () => {
  selectedUser.value = null
  selectedListing.value = null
  userSearchTerm.value = ''
  listingSearchTerm.value = ''
  showUserResults.value = false
  showListingResults.value = false
  isNewConversationOpen.value = true
}

const createConversation = async () => {
  if (!selectedUser.value) {
    toast.add({
      title: 'Utilisateur requis',
      description: 'Veuillez sélectionner un utilisateur',
      color: 'red',
    })
    return
  }
  isCreating.value = true
  try {
    const conv = await messagesStore.getOrCreateConversation(
      selectedUser.value.id,
      selectedListing.value?.id
    )
    if (conv) {
      isNewConversationOpen.value = false
      toast.add({
        title: 'Conversation créée',
        description: `Conversation avec ${getUserDisplayName(selectedUser.value)}`,
        color: 'success',
      })
      router.push(`/account/messages/${conv.id}`)
    }
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de créer la conversation',
      color: 'red',
    })
  } finally {
    isCreating.value = false
  }
}

onMounted(async () => {
  messagesStore.initSocket()
  await messagesStore.fetchConversations()

  if (userIdFromQuery.value) {
    const conv = await messagesStore.getOrCreateConversation(
      userIdFromQuery.value,
      listingIdFromQuery.value ?? undefined,
    )
    if (conv) {
      router.replace(`/account/messages/${conv.id}`)
    }
  }

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const getParticipantAvatar = (participant: any) => {
  if (participant?.avatarImage) {
    const url = participant.avatarImage
    if (url.startsWith('http')) return url
    return getImageUrl(url)
  }
  return null
}

const getParticipantText = (participant: any) => {
  if (participant?.firstName) return participant.firstName.charAt(0).toUpperCase()
  if (participant?.lastName) return participant.lastName.charAt(0).toUpperCase()
  return participant?.email?.charAt(0).toUpperCase() || 'U'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold">Messages</h1>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="openNewConversation"
      >
        Nouvelle conversation
      </UButton>
    </div>

    <!-- Modal Nouvelle conversation -->
    <UModal v-model:open="isNewConversationOpen" title="Nouvelle conversation">
      <template #content>
        <form class="space-y-4 p-4" @submit.prevent="createConversation">
          <!-- Utilisateur -->
          <div class="user-search-container relative">
            <label class="mb-2 block text-sm font-medium">Utilisateur *</label>
            <div class="relative">
              <UInput
                v-model="userSearchTerm"
                placeholder="Rechercher un utilisateur..."
                size="lg"
                :disabled="!!selectedUser"
                :loading="isSearchingUsers"
                icon="i-heroicons-magnifying-glass"
                autocomplete="off"
              />
              <UButton
                v-if="selectedUser"
                variant="ghost"
                color="red"
                size="xs"
                icon="i-heroicons-x-mark"
                class="absolute right-2 top-1/2 -translate-y-1/2 z-10"
                @click.stop="clearUserSelection"
              />
            </div>
            <div
              v-if="showUserResults && userSearchResults.length > 0"
              class="absolute z-50 mt-2 w-full rounded-lg border-0 bg-gray-900 shadow-lg max-h-60 overflow-y-auto"
            >
              <div
                v-for="user in userSearchResults"
                :key="user.id"
                class="flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-white/10"
                @click="selectUser(user)"
              >
                <UAvatar
                  v-if="getAvatarUrl(user)"
                  :src="getAvatarUrl(user)"
                  :alt="getUserDisplayName(user)"
                  size="sm"
                />
                <UAvatar v-else :alt="getUserDisplayName(user)" :text="getAvatarText(user)" size="sm" />
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm">{{ getUserDisplayName(user) }}</div>
                  <div class="text-xs text-white/60">{{ user.email }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- À propos (optionnel) -->
          <div class="listing-search-container relative">
            <label class="mb-2 block text-sm font-medium">À propos de (optionnel)</label>
            <div class="relative">
              <UInput
                v-model="listingSearchTerm"
                placeholder="Rechercher une annonce..."
                size="lg"
                :disabled="!!selectedListing"
                :loading="isSearchingListings"
                icon="i-heroicons-magnifying-glass"
                autocomplete="off"
              />
              <UButton
                v-if="selectedListing"
                variant="ghost"
                color="red"
                size="xs"
                icon="i-heroicons-x-mark"
                class="absolute right-2 top-1/2 -translate-y-1/2 z-10"
                @click.stop="clearListingSelection"
              />
            </div>
            <div
              v-if="showListingResults && listingSearchResults.length > 0"
              class="absolute z-50 mt-2 w-full rounded-lg border-0 bg-gray-900 shadow-lg max-h-60 overflow-y-auto"
            >
              <div
                v-for="listing in listingSearchResults"
                :key="listing.id"
                class="flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-white/10"
                @click="selectListing(listing)"
              >
                <UIcon name="i-heroicons-rectangle-stack" class="h-5 w-5 text-primary-500" />
                <div class="flex-1 min-w-0 truncate">{{ listing.title }}</div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" @click="isNewConversationOpen = false">
              Annuler
            </UButton>
            <UButton
              type="submit"
              color="primary"
              :loading="isCreating"
              :disabled="!selectedUser"
            >
              Démarrer la conversation
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <div v-if="messagesStore.isLoading" class="flex justify-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>

    <div v-else-if="messagesStore.error" class="rounded-lg bg-red-500/10 p-4 text-red-400">
      {{ messagesStore.error }}
    </div>

    <div v-else-if="messagesStore.conversations.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-chat-bubble-left-right" class="mx-auto h-16 w-16 text-white/30" />
      <p class="mt-4 text-white/60">Aucune conversation</p>
      <p class="mt-1 text-sm text-white/40">
        Contacter un troqueur depuis une annonce pour démarrer une conversation.
      </p>
    </div>

    <div v-else class="space-y-2">
      <NuxtLink
        v-for="conv in messagesStore.conversations"
        :key="conv.id"
        :to="`/account/messages/${conv.id}`"
        class="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
        @click="unlockSound"
      >
        <CertifiedAvatar
          :src="getParticipantAvatar(messagesStore.getOtherParticipant(conv))"
          :alt="messagesStore.getOtherParticipant(conv)?.email"
          :text="getParticipantText(messagesStore.getOtherParticipant(conv))"
          size="lg"
          :is-certified="messagesStore.getOtherParticipant(conv)?.isCertified === true"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold truncate">
              {{ messagesStore.getOtherParticipant(conv)?.firstName || messagesStore.getOtherParticipant(conv)?.lastName || messagesStore.getOtherParticipant(conv)?.email }}
            </span>
            <div class="flex shrink-0 items-center gap-2">
              <UBadge
                v-if="(conv.unreadCount ?? 0) > 0"
                color="primary"
                variant="solid"
                size="xs"
                class="min-w-[1.25rem] justify-center"
              >
                {{ conv.unreadCount! > 99 ? '99+' : conv.unreadCount }}
              </UBadge>
              <span v-if="conv.lastMessage" class="text-xs text-white/50">
                {{ fromNow(conv.lastMessage.createdAt) }}
              </span>
            </div>
          </div>
          <p v-if="conv.lastMessage" class="mt-0.5 truncate text-sm text-white/60">
            {{ conv.lastMessage.content }}
          </p>
          <p v-if="conv.listing?.title" class="mt-1 text-xs text-primary-400">
            À propos de : {{ conv.listing.title }}
          </p>
        </div>
        <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 shrink-0 text-white/40" />
      </NuxtLink>
    </div>
  </div>
</template>
