<script setup lang="ts">
import type { KikiriChatMessage } from '~/composables/useKikiriSocket'

const CHAT_SOUND_STORAGE_KEY = 'kikiri-chat-sound-enabled'

const props = defineProps<{
  messages: KikiriChatMessage[]
  currentUserId?: number | null
  /** En mode drawer (mobile), utilise h-full au lieu de h-[80vh] */
  compact?: boolean
}>()

const model = defineModel<string>('input', { default: '' })
const emit = defineEmits<{ send: [] }>()

const { getImageUrl } = useApi()
const { fromNow } = useDate()
const { play: playMessageSound } = useMessageSound()
const messagesEndRef = ref<HTMLElement | null>(null)

const chatSoundEnabled = ref(
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(CHAT_SOUND_STORAGE_KEY) !== 'false'
    : true,
)

function toggleChatSound() {
  chatSoundEnabled.value = !chatSoundEnabled.value
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CHAT_SOUND_STORAGE_KEY, String(chatSoundEnabled.value))
  }
}

const displayedMessages = computed(() =>
  props.messages.slice(-50),
)

function scrollToBottom() {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

watch(
  () => [props.messages.length, props.messages[props.messages.length - 1]?.id],
  () => scrollToBottom(),
  { flush: 'post' },
)

const prevMessagesLength = ref(-1)
watch(
  () => props.messages.length,
  (len) => {
    if (prevMessagesLength.value < 0) {
      prevMessagesLength.value = len
      return
    }
    if (len > prevMessagesLength.value && chatSoundEnabled.value) {
      const lastMsg = props.messages[len - 1]
      if (lastMsg && lastMsg.userId !== props.currentUserId) {
        playMessageSound()
      }
    }
    prevMessagesLength.value = len
  },
  { immediate: true },
)

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div
    class="w-full rounded-xl bg-white/5 border border-white/10 flex flex-col min-h-0 overflow-hidden"
    :class="compact ? 'h-full flex-1' : 'h-[80vh]'"
  >
    <div class="flex items-center justify-between gap-2 p-4 border-b border-white/10 shrink-0">
      <h3 class="text-lg font-semibold text-white">
        Chat
      </h3>
      <UButton
        :icon="chatSoundEnabled ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark'"
        color="neutral"
        variant="ghost"
        size="xs"
        :aria-label="chatSoundEnabled ? 'Désactiver le son' : 'Activer le son'"
        @click="toggleChatSound"
      />
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
      <div
        v-for="msg in displayedMessages"
        :key="msg.id"
        class="flex items-start gap-3"
        :class="msg.userId === currentUserId ? 'flex-row-reverse' : ''"
      >
        <div class="shrink-0">
          <img
            v-if="msg.user?.avatarImage"
            :src="getImageUrl(msg.user.avatarImage)"
            :alt="msg.user?.firstName ?? ''"
            class="w-8 h-8 rounded-full border-2 border-amber-800 object-cover"
          />
          <div
            v-else
            class="w-8 h-8 rounded-full border-2 border-amber-800 bg-amber-700/60 flex items-center justify-center text-xs font-bold text-amber-200"
          >
            {{ (msg.user?.firstName ?? msg.user?.email ?? '?')[0] }}
          </div>
        </div>
        <div
          class="flex flex-col gap-0.5 max-w-[85%]"
          :class="msg.userId === currentUserId ? 'items-end' : 'items-start'"
        >
          <div class="flex items-center gap-2 text-xs text-amber-400/80">
            <span>{{ msg.user?.firstName ?? msg.user?.email ?? 'Anon' }}</span>
            <span class="text-amber-500/60">·</span>
            <span>{{ fromNow(msg.createdAt) }}</span>
          </div>
          <div
            class="px-3 py-2 rounded-lg text-sm break-words"
            :class="msg.userId === currentUserId
              ? 'bg-blue-600/40 text-blue-100 border border-blue-500/30'
              : 'bg-amber-900/40 text-amber-100 border border-amber-700/40'"
          >
            {{ msg.content }}
          </div>
        </div>
      </div>
      <div ref="messagesEndRef" />
    </div>
    <form class="p-4 border-t border-white/10 flex gap-2 shrink-0" @submit.prevent="emit('send')">
      <UInput
        v-model="model"
        placeholder="Message..."
        class="flex-1"
        size="sm"
      />
      <UButton type="submit" size="sm" color="primary">
        Envoyer
      </UButton>
    </form>
  </div>
</template>
