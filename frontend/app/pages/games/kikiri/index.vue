<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useKikiriSocket } from '~/composables/useKikiriSocket'
import type { KikiriDraw, KikiriChatMessage, KikiriOnlineUser } from '~/composables/useKikiriSocket'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  meta: { title: 'Kikiri' },
})

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
const { getImageUrl } = useApi()
const walletStore = useWalletStore()
const toast = useToast()

const {
  connect,
  disconnect,
  placeBet,
  moveBet,
  requestState,
  sendChat,
  onState,
  onOnlineUsers,
  onDrawNew,
  onDrawEnding,
  onDrawReveal,
  onDrawResolved,
  onDrawMyResult,
  onBetPlaced,
  onBetError,
  onChatMessage,
  onAllBets,
} = useKikiriSocket()

const currentDraw = ref<KikiriDraw | null>(null)
const drawHistory = ref<KikiriDraw[]>([])
const chatMessages = ref<KikiriChatMessage[]>([])
const onlineUsers = ref<KikiriOnlineUser[]>([])
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
const pendingResultNotification = ref<{
  userNet: number
  drawId: number
  totalBetAtResult: number
} | null>(null)
const balanceFrozenAtResult = ref<number | null>(null)
const gameReady = ref(false)
const isNewGame = ref(false)
const hasReceivedState = ref(false)

const totalBetAmount = computed(() =>
  [1, 2, 3, 4, 5, 6].reduce((a, n) => a + (betAmounts.value[n] ?? 0), 0),
)
const effectiveBalance = computed(() =>
  balanceFrozenAtResult.value ?? balance.value,
)

let resultNotificationTimeout: ReturnType<typeof setTimeout> | null = null
let resultFallbackTimeout: ReturnType<typeof setTimeout> | null = null

function onBetMove({ from, to }: { from: number; to: number }) {
  const draw = currentDraw.value
  if (!draw || draw.status !== 'betting' || hasSubmittedForCurrentDraw.value) return
  const knownOnSource = lastKnownUserBets.value[from] ?? 0
  if (knownOnSource > 0) {
    moveBet(draw.id, from, to)
    lastKnownUserBets.value = {
      ...lastKnownUserBets.value,
      [from]: knownOnSource - 1,
      [to]: (lastKnownUserBets.value[to] ?? 0) + 1,
    }
  }
}

function onBoardAnimationsComplete() {
  if (pendingResultNotification.value) {
    const { userNet, totalBetAtResult } = pendingResultNotification.value
    const base = balanceFrozenAtResult.value ?? balance.value
    if (userNet < 0) {
      balance.value = base
    } else {
      balance.value = base + (userNet === 0 ? totalBetAtResult : userNet)
      requestState()
      walletStore.fetchBalance()
    }
    balanceFrozenAtResult.value = null
    if (resultFallbackTimeout) {
      clearTimeout(resultFallbackTimeout)
      resultFallbackTimeout = null
    }
    if (resultNotificationTimeout) clearTimeout(resultNotificationTimeout)
    lastResultNotification.value = {
      userNet: pendingResultNotification.value.userNet,
      drawId: pendingResultNotification.value.drawId,
    }
    pendingResultNotification.value = null
    resultNotificationTimeout = setTimeout(() => {
      lastResultNotification.value = null
      resultNotificationTimeout = null
    }, 4000)
  }
}

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
    hasReceivedState.value = true
    currentDraw.value = s.currentDraw
    drawHistory.value = s.drawHistory ?? []
    chatMessages.value = s.chatMessages ?? []
    balance.value = s.balance ?? 0
    onlineUsers.value = s.onlineUsers ?? []
    lastKnownUserBets.value = { ...(s.currentDraw?.userBets ?? {}) }
    betAmounts.value = { ...lastKnownUserBets.value }
    updateCountdown()
  })
  onOnlineUsers(({ users }) => {
    onlineUsers.value = users
  })
  onDrawNew(({ draw }) => {
    currentDraw.value = draw
    hasSubmittedForCurrentDraw.value = false
    hasTriggeredFinishAtZero.value = false
    lastKnownUserBets.value = {}
    betAmounts.value = {}
    pendingResultNotification.value = null
    balanceFrozenAtResult.value = null
    gameReady.value = false
    isNewGame.value = true
    if (resultFallbackTimeout) {
      clearTimeout(resultFallbackTimeout)
      resultFallbackTimeout = null
    }
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
    balanceFrozenAtResult.value = balance.value

    // Stocker le résultat ; la popup et la mise à jour du solde s'afficheront quand le plateau aura fini ses animations
    pendingResultNotification.value = {
      userNet,
      drawId,
      totalBetAtResult: totalBetAmount.value,
    }
    if (resultFallbackTimeout) clearTimeout(resultFallbackTimeout)
    resultFallbackTimeout = setTimeout(() => {
      resultFallbackTimeout = null
      if (pendingResultNotification.value) onBoardAnimationsComplete()
    }, 15000)
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
  onAllBets(({ drawId, allBets }) => {
    if (currentDraw.value?.id === drawId) {
      currentDraw.value = { ...currentDraw.value, allBets }
    }
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
  if (resultFallbackTimeout) clearTimeout(resultFallbackTimeout)
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
        <!-- Joueurs en ligne -->
        <div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-900/30 border border-amber-700/40">
          <div class="flex -space-x-2">
            <template v-for="u in onlineUsers" :key="u.id">
              <img
                v-if="u.avatarImage"
                :src="getImageUrl(u.avatarImage)"
                :alt="u.firstName ?? ''"
                class="w-8 h-8 rounded-full border-2 border-amber-800 object-cover"
                :class="{ 'ring-2 ring-amber-400': u.id === authStore.user?.id }"
                :title="u.firstName ?? `Joueur ${u.id}`"
              />
              <div
                v-else
                class="w-8 h-8 rounded-full border-2 border-amber-800 bg-amber-700/60 flex items-center justify-center text-xs font-bold text-amber-200"
                :class="{ 'ring-2 ring-amber-400': u.id === authStore.user?.id }"
                :title="u.firstName ?? `Joueur ${u.id}`"
              >
                {{ (u.firstName ?? '?')[0] }}
              </div>
            </template>
          </div>
          <span class="text-sm text-amber-200">
            {{ onlineUsers.length }} joueur{{ onlineUsers.length > 1 ? 's' : '' }} en ligne
          </span>
        </div>
        <div class="relative min-h-[320px] flex items-center justify-center">
          <div
            v-if="!hasReceivedState"
            class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl"
          >
            <div class="w-8 h-8 border-2 border-amber-500/60 border-t-amber-400 rounded-full animate-spin" />
          </div>
          <KikiriGameBoard
            v-show="hasReceivedState"
            :draw="currentDraw"
            :can-bet="!!canBet"
            :balance="effectiveBalance"
            :has-submitted-bets="hasSubmittedForCurrentDraw"
            v-model:bet-amounts="betAmounts"
            :is-placing="isPlacing"
            :all-bets="currentDraw?.allBets"
            :current-user-id="authStore.user?.id"
            @animations-complete="onBoardAnimationsComplete"
            @move="onBetMove"
            :is-new-game="isNewGame"
            @game-ready="gameReady = true; isNewGame = false"
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
                class="px-8 py-4 rounded-xl text-2xl font-bold shadow-lg animate-pulse -translate-y-24"
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
            v-if="countdownFormatted && canBet && !lastResultNotification && gameReady"
            class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div class="px-8 py-4 rounded-xl text-2xl font-bold shadow-lg bg-black/50 text-white font-mono -translate-y-24">
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
