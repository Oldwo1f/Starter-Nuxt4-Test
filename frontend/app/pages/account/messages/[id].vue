<script setup lang="ts">
import { useMessagesStore } from '~/stores/useMessagesStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { useDate } from '~/composables/useDate'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
})

useHead({
  title: 'Conversation',
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const messagesStore = useMessagesStore()
const { apiBaseUrl, getImageUrl } = useApi()
const { fromNow } = useDate()

const conversationId = computed(() => parseInt(route.params.id as string, 10))
const messageInput = ref('')
const messagesEndRef = ref<HTMLElement | null>(null)

const otherParticipant = computed(() =>
  messagesStore.activeConversation
    ? messagesStore.getOtherParticipant(messagesStore.activeConversation)
    : null,
)

const scrollToBottom = () => {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

watch(
  () => messagesStore.messages,
  () => scrollToBottom(),
  { deep: true },
)

onMounted(async () => {
  messagesStore.initSocket()
  await messagesStore.fetchConversations()

  let conv = messagesStore.conversations.find((c) => c.id === conversationId.value)
  if (!conv) {
    conv = await messagesStore.fetchConversation(conversationId.value)
  }
  if (conv) {
    messagesStore.setActiveConversation(conv)
  } else {
    router.replace('/account/messages')
  }
})

onUnmounted(() => {
  messagesStore.setActiveConversation(null)
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

const isOwnMessage = (msg: any) => msg.senderId === authStore.user?.id

const { unlock: unlockSound } = useMessageSound()

const handleSend = async () => {
  unlockSound()
  const content = messageInput.value.trim()
  if (!content || !messagesStore.activeConversation) return

  const sent = await messagesStore.sendMessage(messagesStore.activeConversation.id, content)
  if (sent) {
    messageInput.value = ''
    scrollToBottom()
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-12rem)] flex-col" @click="unlockSound">
    <div v-if="messagesStore.activeConversation" class="flex items-center gap-4 border-b border-white/10 pb-4">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        size="sm"
        to="/account/messages"
      />
      <CertifiedAvatar
        :src="getParticipantAvatar(otherParticipant)"
        :alt="otherParticipant?.email"
        :text="getParticipantText(otherParticipant)"
        size="md"
        :is-certified="otherParticipant?.isCertified === true"
      />
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold truncate">
          {{ otherParticipant?.firstName || otherParticipant?.lastName || otherParticipant?.email }}
        </h2>
        <p v-if="messagesStore.activeConversation.listing?.title" class="text-xs text-primary-400">
          {{ messagesStore.activeConversation.listing.title }}
        </p>
      </div>
    </div>

    <div
      v-if="messagesStore.activeConversation"
      class="flex-1 space-y-4 overflow-y-auto py-4"
    >
      <div v-if="messagesStore.isLoadingMessages" class="flex justify-center py-8">
        <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>

      <div v-else-if="messagesStore.messages.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon name="i-heroicons-chat-bubble-left-right" class="h-12 w-12 text-white/30" />
        <p class="mt-4 text-white/60">Aucun message</p>
        <p class="mt-1 text-sm text-white/40">Envoyez le premier message pour démarrer la conversation.</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="msg in messagesStore.messages"
          :key="msg.id"
          :class="[
            'flex',
            isOwnMessage(msg) ? 'justify-end' : 'justify-start',
          ]"
        >
          <div
            :class="[
              'max-w-[80%] rounded-2xl px-4 py-2',
              isOwnMessage(msg)
                ? 'bg-primary-500/20 text-primary-100'
                : 'bg-white/10 text-white/90',
            ]"
          >
            <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
            <p :class="['mt-1 text-xs', isOwnMessage(msg) ? 'text-primary-300/70' : 'text-white/50']">
              {{ fromNow(msg.createdAt) }}
            </p>
          </div>
        </div>
      </div>
      <div ref="messagesEndRef" />
    </div>

    <div v-if="messagesStore.activeConversation" class="border-t border-white/10 pt-4">
      <form @submit.prevent="handleSend" class="flex gap-2">
        <UInput
          v-model="messageInput"
          placeholder="Écrivez votre message..."
          class="flex-1"
          :disabled="messagesStore.isLoadingMessages"
          autocomplete="off"
          @focus="unlockSound"
        />
        <UButton
          type="submit"
          color="primary"
          icon="i-heroicons-paper-airplane"
          :disabled="!messageInput.trim()"
        />
      </form>
    </div>
  </div>
</template>
