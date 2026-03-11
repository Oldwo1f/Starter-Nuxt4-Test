<script setup lang="ts">
import { useMessagesStore } from '~/stores/useMessagesStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { useDate } from '~/composables/useDate'
import { useDebounceFn } from '@vueuse/core'

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

const TYPING_STOP_DELAY = 2000

const emitTypingStopDebounced = useDebounceFn(() => {
  if (messagesStore.activeConversation) {
    messagesStore.emitTypingStop(messagesStore.activeConversation.id)
  }
}, TYPING_STOP_DELAY)

const onInputTyping = () => {
  const conv = messagesStore.activeConversation
  if (!conv) return
  messagesStore.emitTypingStart(conv.id)
  emitTypingStopDebounced()
}

const handleSend = async () => {
  unlockSound()
  const content = messageInput.value.trim()
  if (!content || !messagesStore.activeConversation) return

  messagesStore.emitTypingStop(messagesStore.activeConversation.id)
  emitTypingStopDebounced.cancel?.()

  const sent = await messagesStore.sendMessage(messagesStore.activeConversation.id, content)
  if (sent) {
    messageInput.value = ''
    scrollToBottom()
  }
}
</script>

<template>
  <div class="flex flex-1 min-h-0 flex-col overflow-hidden" @click="unlockSound">
    <div v-if="messagesStore.activeConversation" class="shrink-0 flex items-center gap-4 border-b border-white/10 pb-4">
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
      class="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 pl-2 pr-4"
    >
      <div v-if="messagesStore.isLoadingMessages" class="flex justify-center py-8">
        <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>

      <div v-else-if="messagesStore.messages.length === 0 && !messagesStore.isOtherTyping" class="flex flex-col items-center justify-center py-12 text-center">
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

    <div v-if="messagesStore.activeConversation" class="shrink-0 border-t border-white/10">
      <div
        v-if="messagesStore.isOtherTyping"
        class="px-2 py-1.5 text-sm text-white/60 flex items-center gap-1"
      >
        <span>{{ otherParticipant?.firstName || otherParticipant?.lastName || 'Quelqu\'un' }}</span>
        <span>est en train d'écrire</span>
        <span class="typing-dots">...</span>
      </div>
      <form @submit.prevent="handleSend" class="flex gap-3 items-center py-2">
        <UInput
          v-model="messageInput"
          placeholder="Écrivez votre message..."
          size="lg"
          class="flex-1 min-h-12"
          :disabled="messagesStore.isLoadingMessages"
          autocomplete="off"
          @focus="unlockSound"
          @input="onInputTyping"
        />
        <UButton
          type="submit"
          color="primary"
          size="lg"
          :disabled="!messageInput.trim()"
          class="shrink-0 min-h-12 min-w-12 flex items-center justify-center p-0"
        >
          <UIcon name="i-heroicons-paper-airplane" class="h-7 w-7" />
        </UButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.typing-dots {
  display: inline-block;
  animation: typing-blink 1.4s infinite;
}

@keyframes typing-blink {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}
</style>
