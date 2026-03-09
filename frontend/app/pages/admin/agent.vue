<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Agent IA',
})

import { marked } from 'marked'
import { useSpeechRecognition, useIntervalFn } from '@vueuse/core'
import { useAuthStore } from '~/stores/useAuthStore'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'admin-agent-chat'
const CONTEXT_MESSAGE_LIMIT = 15

const authStore = useAuthStore()
const config = useRuntimeConfig()
const toast = useToast()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'

const messages = ref<ChatMessage[]>([])
const input = ref('')
const isLoading = ref(false)
const messagesEnd = ref<HTMLElement | null>(null)

const {
  isSupported: isSpeechSupported,
  isListening,
  result: speechResult,
  error: speechError,
  start: startSpeech,
  stop: stopSpeech,
} = useSpeechRecognition({
  lang: 'fr-FR',
  continuous: true,
  interimResults: true,
})

const isPaused = ref(false)
const accumulatedText = ref('')
const recordElapsedSeconds = ref(0)

const { pause: pauseTimer, resume: resumeTimer } = useIntervalFn(() => {
  recordElapsedSeconds.value++
}, 1000, { immediate: false })

const formattedRecordTime = computed(() => {
  const s = recordElapsedSeconds.value
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
})

const isRecording = computed(() => isListening.value || isPaused.value)

watch(speechError, (err) => {
  if (err) {
    toast.add({
      title: 'Erreur micro',
      description: err instanceof Error ? err.message : 'Accès au micro refusé ou indisponible.',
      color: 'red',
    })
  }
})

const startRecording = () => {
  if (!isSpeechSupported.value) return
  accumulatedText.value = ''
  speechResult.value = ''
  recordElapsedSeconds.value = 0
  isPaused.value = false
  startSpeech()
  resumeTimer()
}

const pauseRecording = () => {
  if (!isListening.value) return
  stopSpeech()
  pauseTimer()
  isPaused.value = true
  setTimeout(() => {
    const text = speechResult.value?.trim()
    if (text) {
      accumulatedText.value = accumulatedText.value ? `${accumulatedText.value} ${text}` : text
    }
  }, 100)
}

const resumeRecording = () => {
  if (!isPaused.value) return
  speechResult.value = ''
  isPaused.value = false
  startSpeech()
  resumeTimer()
}

const closeRecording = (textToInput: string) => {
  stopSpeech()
  pauseTimer()
  isPaused.value = false
  if (textToInput.trim()) {
    input.value = input.value ? `${input.value} ${textToInput}` : textToInput
  }
  accumulatedText.value = ''
}

const stopRecording = () => {
  stopSpeech()
  setTimeout(() => {
    const fullText = (accumulatedText.value + (speechResult.value?.trim() ? ` ${speechResult.value.trim()}` : '')).trim()
    closeRecording(fullText)
  }, 100)
}

const sendRecording = () => {
  stopSpeech()
  setTimeout(() => {
    const fullText = (accumulatedText.value + (speechResult.value?.trim() ? ` ${speechResult.value.trim()}` : '')).trim()
    closeRecording('')
    if (fullText) {
      input.value = fullText
      nextTick(() => sendMessage())
    }
  }, 100)
}

const displayedTranscript = computed(() => {
  const acc = accumulatedText.value?.trim() || ''
  const cur = speechResult.value?.trim() || ''
  return acc && cur ? `${acc} ${cur}` : acc || cur
})

const sendMessage = async () => {
  const text = input.value.trim()
  if (!text || isLoading.value) return

  if (!authStore.accessToken) {
    toast.add({
      title: 'Non connecté',
      description: 'Veuillez vous reconnecter.',
      color: 'red',
    })
    return
  }

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  isLoading.value = true

  try {
    const response = await $fetch<string>(`${API_BASE_URL}/admin/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify({
        message: text,
        history: messages.value.slice(0, -1).slice(-CONTEXT_MESSAGE_LIMIT),
      }),
    })

    messages.value.push({ role: 'assistant', content: response })
  } catch (err: any) {
    const msg = err.data?.message || err.message || 'Erreur lors de l\'envoi'
    messages.value.push({
      role: 'assistant',
      content: `Erreur : ${msg}`,
    })
    toast.add({
      title: 'Erreur',
      description: msg,
      color: 'red',
    })
  } finally {
    isLoading.value = false
    nextTick(() => {
      messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
    })
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const renderMarkdown = (text: string) => {
  if (!text) return ''
  return marked.parse(text, { async: false }) as string
}

const resetConversation = () => {
  messages.value = []
  if (import.meta.client) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }
  toast.add({
    title: 'Nouvelle conversation',
    description: 'La conversation a été réinitialisée.',
    color: 'primary',
  })
}

// Indicateur de contexte (style Cursor)
const contextMessageCount = computed(() => messages.value.length)
const contextProgress = computed(() =>
  Math.min(100, (contextMessageCount.value / CONTEXT_MESSAGE_LIMIT) * 100),
)
const isContextOverflow = computed(() => contextMessageCount.value >= CONTEXT_MESSAGE_LIMIT)
const contextTooltip = computed(() => {
  const n = contextMessageCount.value
  if (n >= CONTEXT_MESSAGE_LIMIT) {
    return `${n} messages — contexte saturé. Ouvrez une nouvelle conversation pour réinitialiser.`
  }
  return `${n}/${CONTEXT_MESSAGE_LIMIT} messages dans le contexte`
})

onMounted(() => {
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[]
        if (Array.isArray(parsed)) {
          messages.value = parsed
        }
      }
    } catch {}
  }
  nextTick(() => messagesEnd.value?.scrollIntoView())
})

watch(
  messages,
  (val) => {
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {}
    }
  },
  { deep: true },
)
</script>

<template>
  <div class="flex h-[calc(100dvh-8rem)] flex-col">
    <div class="mb-4 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-white">Agent IA</h1>
        <p class="text-sm text-white/60">
          Discutez avec l'assistant pour gérer les utilisateurs et le blog. Ex: « Liste les 5 derniers utilisateurs » ou « Crée un article de blog ».
        </p>
      </div>
      <UButton
        v-if="messages.length > 0"
        variant="outline"
        color="neutral"
        size="sm"
        icon="i-heroicons-arrow-path"
        @click="resetConversation"
      >
        Nouvelle conversation
      </UButton>
    </div>

    <div class="flex flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5">
      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="messages.length === 0" class="flex h-full items-center justify-center text-white/50">
          <p>Aucun message. Tapez une question pour commencer.</p>
        </div>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="[
            'flex',
            msg.role === 'user' ? 'justify-end' : 'justify-start',
          ]"
        >
          <div
            :class="[
              'max-w-[85%] rounded-lg px-4 py-2',
              msg.role === 'user'
                ? 'bg-primary-500/20 text-white'
                : 'bg-white/10 text-white/90',
            ]"
          >
            <p
              v-if="msg.role === 'user'"
              class="whitespace-pre-wrap text-sm"
            >
              {{ msg.content }}
            </p>
            <div
              v-else
              class="chat-prose prose prose-invert prose-sm max-w-none text-white/90 [&_a]:text-primary-400 [&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_pre]:bg-white/10 [&_pre]:p-3 [&_pre]:rounded-lg"
              v-html="renderMarkdown(msg.content)"
            />
          </div>
        </div>
        <div v-if="isLoading" class="flex justify-start">
          <div class="rounded-lg bg-white/10 px-4 py-2">
            <span class="text-sm text-white/70">Réflexion...</span>
          </div>
        </div>
        <div ref="messagesEnd" />
      </div>

      <!-- Input -->
      <div class="border-t border-white/10 p-4 space-y-3">
        <!-- Barre d'enregistrement -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="isRecording"
            class="flex flex-col gap-3 rounded-lg border border-primary-500/50 bg-primary-500/10 p-3"
          >
            <div class="flex items-center gap-4">
              <!-- Oscilloscope / waveform -->
              <div class="flex items-end gap-1 h-8">
                <span
                  v-for="i in 12"
                  :key="i"
                  class="w-1 min-h-[4px] rounded-full bg-primary-500"
                  :class="isListening ? 'animate-wave' : 'opacity-40'"
                  :style="{ '--wave-delay': `${(i - 1) * 0.08}s` }"
                />
              </div>
              <!-- Timer -->
              <span class="font-mono text-lg font-medium text-primary-400 tabular-nums">
                {{ formattedRecordTime }}
              </span>
              <span v-if="isPaused" class="text-sm text-white/60">(en pause)</span>
            </div>
            <!-- Transcription en direct -->
            <p v-if="displayedTranscript" class="min-h-[2rem] text-sm text-white/80 line-clamp-2">
              {{ displayedTranscript }}
            </p>
            <!-- Boutons -->
            <div class="flex gap-2">
              <UButton
                v-if="isPaused"
                color="primary"
                variant="soft"
                size="sm"
                icon="i-heroicons-play"
                @click="resumeRecording"
              >
                Reprendre
              </UButton>
              <UButton
                v-else
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-heroicons-pause"
                @click="pauseRecording"
              >
                Pause
              </UButton>
              <UButton
                color="error"
                variant="soft"
                size="sm"
                icon="i-heroicons-stop"
                @click="stopRecording"
              >
                Arrêter
              </UButton>
              <UButton
                color="primary"
                size="sm"
                icon="i-heroicons-paper-airplane"
                :disabled="!displayedTranscript.trim()"
                @click="sendRecording"
              >
                Envoyer
              </UButton>
            </div>
          </div>
        </Transition>

        <div class="flex items-center gap-2">
          <UTooltip
            v-if="isSpeechSupported && !isRecording"
            text="Parler (capture vocale)"
          >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-microphone"
              :disabled="isLoading"
              @click="startRecording"
            />
          </UTooltip>
          <UTextarea
            v-model="input"
            placeholder="Votre message..."
            :rows="2"
            class="flex-1"
            :disabled="isLoading"
            @keydown="handleKeydown"
          />
          <UTooltip :text="contextTooltip">
            <div
              class="relative flex shrink-0 items-center justify-center"
              role="img"
              :aria-label="contextTooltip"
            >
              <svg
                class="size-9 -rotate-90"
                viewBox="0 0 36 36"
                aria-hidden="true"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  class="text-white/15"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  :class="isContextOverflow ? 'text-red-500' : 'text-primary-500'"
                  stroke-dasharray="100"
                  :stroke-dashoffset="100 - contextProgress"
                  class="transition-[stroke-dashoffset] duration-300 ease-out"
                />
              </svg>
              <span
                class="absolute inset-0 flex items-center justify-center text-[10px] font-medium tabular-nums"
                :class="isContextOverflow ? 'text-red-400' : 'text-white/70'"
              >
                {{ contextMessageCount }}
              </span>
            </div>
          </UTooltip>
          <UButton
            color="primary"
            :loading="isLoading"
            :disabled="!input.trim()"
            @click="sendMessage"
          >
            Envoyer
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes wave {
  0%, 100% { height: 6px; }
  50% { height: 22px; }
}
.animate-wave {
  animation: wave 0.5s ease-in-out infinite;
  animation-delay: var(--wave-delay, 0s);
  align-self: flex-end;
}

/* Chat markdown: tables & images */
.chat-prose :deep(table) {
  border-collapse: collapse;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 1rem 0;
  width: 100%;
}
.chat-prose :deep(th),
.chat-prose :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
.chat-prose :deep(th) {
  background: rgba(255, 255, 255, 0.08);
  font-weight: 600;
}
.chat-prose :deep(img) {
  max-height: 100px;
  max-width: 100px;
  object-fit: contain;
  vertical-align: middle;
}
.chat-prose :deep(img[alt="avatar"]) {
  max-height: 32px;
  max-width: 32px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
