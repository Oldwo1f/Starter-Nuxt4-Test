<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useKikiriSocket } from '~/composables/useKikiriSocket'
import type { KikiriDraw, KikiriChatMessage } from '~/composables/useKikiriSocket'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  meta: { title: 'Kikiri' },
})

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
const walletStore = useWalletStore()
const toast = useToast()

const {
  connect,
  disconnect,
  placeBet,
  sendChat,
  onState,
  onDrawNew,
  onDrawEnding,
  onDrawReveal,
  onDrawResolved,
  onDrawMyResult,
  onBetPlaced,
  onBetError,
  onChatMessage,
} = useKikiriSocket()

const currentDraw = ref<KikiriDraw | null>(null)
const drawHistory = ref<KikiriDraw[]>([])
const chatMessages = ref<KikiriChatMessage[]>([])
const balance = ref(0)
const countdown = ref<number | null>(null)
const chatInput = ref('')
const hasSubmittedForCurrentDraw = ref(false)
const hasTriggeredFinishAtZero = ref(false)
const isFinishLoading = ref(false)
const isTriggerLoading = ref(false)
const isPlacing = ref(false)
const lastKnownUserBets = ref<Record<number, number>>({})

const betAmounts = ref<Record<number, number>>({})
const lastResultNotification = ref<{ userNet: number; drawId: number } | null>(null)
let resultNotificationTimeout: ReturnType<typeof setTimeout> | null = null

const canBet = computed(() => currentDraw.value?.status === 'betting')
const canFinish = computed(() => currentDraw.value?.status === 'betting')
const canTrigger = computed(() => !currentDraw.value)

const placeBets = (forceAll = false) => {
  const draw = currentDraw.value
  if (!draw || draw.status !== 'betting' || hasSubmittedForCurrentDraw.value) return
  if (isPlacing.value) return

  const toSend: { num: number; amount: number }[] = []
  for (let num = 1; num <= 6; num++) {
    const current = betAmounts.value[num] ?? 0
    const known = lastKnownUserBets.value[num] ?? 0
    const delta = current - known
    if (delta > 0) toSend.push({ num, amount: delta })
  }

  if (toSend.length === 0) {
    if (forceAll) hasSubmittedForCurrentDraw.value = true
    return
  }

  isPlacing.value = true
  for (const { num, amount } of toSend) {
    placeBet(draw.id, num, amount)
    lastKnownUserBets.value = { ...lastKnownUserBets.value, [num]: (lastKnownUserBets.value[num] ?? 0) + amount }
  }
  if (forceAll) hasSubmittedForCurrentDraw.value = true
  isPlacing.value = false
}

const finishDraw = async () => {
  if (!canFinish.value || isFinishLoading.value) return
  isFinishLoading.value = true
  placeBets(true)
  try {
    const res = await fetch(`${apiBaseUrl}/kikiri/finish-draw`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.add({ title: 'Erreur', description: err.message || 'Impossible de finir le tirage', color: 'error' })
    }
  } catch (e) {
    toast.add({ title: 'Erreur', description: 'Impossible de finir le tirage', color: 'error' })
  } finally {
    isFinishLoading.value = false
  }
}

const triggerDraw = async () => {
  if (!canTrigger.value || isTriggerLoading.value) return
  isTriggerLoading.value = true
  try {
    const res = await fetch(`${apiBaseUrl}/kikiri/trigger-draw`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.add({ title: 'Erreur', description: err.message || 'Impossible de lancer le tirage', color: 'error' })
    }
  } catch (e) {
    toast.add({ title: 'Erreur', description: 'Impossible de lancer le tirage', color: 'error' })
  } finally {
    isTriggerLoading.value = false
  }
}

const sendChatMessage = () => {
  const msg = chatInput.value?.trim()
  if (!msg) return
  sendChat(msg)
  chatInput.value = ''
}

const countdownFormatted = computed(() => {
  const s = countdown.value
  if (s === null || s < 0) return null
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
})

const updateCountdown = () => {
  const draw = currentDraw.value
  if (!draw || draw.status !== 'betting' || !draw.bettingEndsAt) {
    countdown.value = null
    return
  }
  const end = new Date(draw.bettingEndsAt).getTime()
  const diff = Math.max(0, Math.ceil((end - Date.now()) / 1000))
  countdown.value = diff
  if (diff <= 0 && !hasTriggeredFinishAtZero.value) {
    hasTriggeredFinishAtZero.value = true
    finishDraw()
  }
}

let countdownInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  connect()
  onState((s) => {
    currentDraw.value = s.currentDraw
    drawHistory.value = s.drawHistory ?? []
    chatMessages.value = s.chatMessages ?? []
    balance.value = s.balance ?? 0
    lastKnownUserBets.value = { ...(s.currentDraw?.userBets ?? {}) }
    betAmounts.value = { ...lastKnownUserBets.value }
    updateCountdown()
  })
  onDrawNew(({ draw }) => {
    currentDraw.value = draw
    hasSubmittedForCurrentDraw.value = false
    hasTriggeredFinishAtZero.value = false
    lastKnownUserBets.value = {}
    betAmounts.value = {}
    updateCountdown()
  })
  onDrawEnding(({ drawId }) => {
    placeBets(true)
  })
  onDrawReveal(({ draw }) => {
    currentDraw.value = { ...currentDraw.value!, ...draw }
  })
  onDrawResolved(({ draw }) => {
    currentDraw.value = { ...currentDraw.value!, ...draw }
    countdown.value = null
  })
  onDrawMyResult(({ drawId, userNet, userBets }) => {
    const idx = drawHistory.value.findIndex((d) => d.id === drawId)
    if (idx >= 0) {
      drawHistory.value = drawHistory.value.map((item, i) =>
        i === idx ? ({ ...item, userNet, userBets } as KikiriDraw) : item,
      )
    } else {
      const d = currentDraw.value
      if (d?.id === drawId) {
        drawHistory.value = [{ ...d, id: drawId, userNet, userBets } as KikiriDraw, ...drawHistory.value]
      }
    }
    walletStore.fetchBalance()

    // Notification visuelle gain/perte sur le plateau
    if (resultNotificationTimeout) clearTimeout(resultNotificationTimeout)
    lastResultNotification.value = { userNet, drawId }
    resultNotificationTimeout = setTimeout(() => {
      lastResultNotification.value = null
      resultNotificationTimeout = null
    }, 4000)
  })
  onBetPlaced(({ balance: b }) => {
    balance.value = b
  })
  onBetError(({ error }) => {
    toast.add({ title: 'Mise refusée', description: error, color: 'error' })
  })
  onChatMessage((msg) => {
    chatMessages.value = [...chatMessages.value, msg]
  })

  countdownInterval = setInterval(updateCountdown, 500)

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.altKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault()
      finishDraw()
    }
  }
  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (resultNotificationTimeout) clearTimeout(resultNotificationTimeout)
  disconnect()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-white mb-6">
      Kikiri
    </h1>
    <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
      <!-- Colonne gauche : plateau + boutons + derniers tirages -->
      <div class="space-y-4">
        <div class="relative">
          <KikiriGameBoard
            :draw="currentDraw"
            :can-bet="!!canBet"
            :balance="balance"
            v-model:bet-amounts="betAmounts"
            :is-placing="isPlacing"
          />
          <!-- Bannière gain/perte sous les dés -->
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="lastResultNotification"
              class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            >
              <div
                class="px-8 py-4 rounded-xl text-2xl font-bold shadow-lg animate-pulse -translate-y-12"
                :class="[
                  lastResultNotification.userNet > 0
                    ? 'bg-green-500/90 text-white'
                    : lastResultNotification.userNet < 0
                      ? 'bg-red-500/90 text-white'
                      : 'bg-white/20 text-white',
                ]"
              >
                {{ lastResultNotification.userNet > 0 ? '+' : '' }}{{ lastResultNotification.userNet }} 🐚
              </div>
            </div>
          </Transition>
          <!-- Compteur sous la coupelle (même position que la notification gain) -->
          <div
            v-if="countdownFormatted && canBet && !lastResultNotification"
            class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div class="px-8 py-4 rounded-xl text-2xl font-bold shadow-lg bg-black/50 text-white font-mono -translate-y-12">
              {{ countdownFormatted }}
            </div>
          </div>
        </div>
        <KikiriResultsHistory :draws="drawHistory" />
      </div>
      <!-- Colonne droite : chat -->
      <div>
        <KikiriChatPanel
          v-model:input="chatInput"
          :messages="chatMessages"
          @send="sendChatMessage"
        />
      </div>
    </div>
  </div>
</template>
