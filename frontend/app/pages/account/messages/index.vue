<script setup lang="ts">
import { useMessagesStore } from '~/stores/useMessagesStore'
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
const messagesStore = useMessagesStore()
const { unlock: unlockSound } = useMessageSound()
const { apiBaseUrl, getImageUrl } = useApi()
const { fromNow } = useDate()

const userIdFromQuery = computed(() => {
  const u = route.query.userId
  return u ? parseInt(String(u), 10) : null
})
const listingIdFromQuery = computed(() => {
  const l = route.query.listingId
  return l ? parseInt(String(l), 10) : null
})

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
})

onUnmounted(() => {
  messagesStore.cleanup()
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
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Messages</h1>
    </div>

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
