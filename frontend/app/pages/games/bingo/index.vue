<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { useAuthStore } from '~/stores/useAuthStore'
import { useBingoSocket } from '~/composables/useBingoSocket'
import type { BingoRound, BingoGrid, BingoChatMessage, BingoOnlineUser } from '~/composables/useBingoSocket'

const isChatDrawerOpen = ref(false)
const unreadChatCount = ref(0)

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  titleKey: 'games.metaBingo',
})

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
const { getImageUrl } = useApi()
const toast = useToast()
const { t } = useI18n()
const { playBall, playWinSong } = useBingoBallSound()

interface BingoStatus {
  isOpen: boolean
  mode: 'manual' | 'cruise'
  manualEnabled: boolean
  openHour: number
  openMinute: number
  closeHour: number
  closeMinute: number
  drawSpeed: string
  gridPrice: number
  nextOpenAt: string | null
}

const bingoStatus = ref<BingoStatus | null>(null)
const statusLoading = ref(true)
const countdownToOpenSeconds = ref<number | null>(null)

const closedMessage = computed(() => {
  const s = bingoStatus.value
  if (!s) return null
  if (s.mode === 'manual') {
    return t('games.closedDisabled')
  }
  if (s.nextOpenAt) {
    const hh = new Date(s.nextOpenAt).getHours().toString().padStart(2, '0')
    const mm = new Date(s.nextOpenAt).getMinutes().toString().padStart(2, '0')
    return t('games.bingoOpensAt', { time: `${hh}:${mm}` })
  }
  return t('games.closedLater')
})

const countdownToOpenFormatted = computed(() => {
  const sec = countdownToOpenSeconds.value
  if (sec === null || sec < 0) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return [h, m, s].map((n) => n.toString().padStart(2, '0')).join(':')
})

function updateCountdownToOpen() {
  const s = bingoStatus.value
  if (!s?.nextOpenAt || s.mode !== 'cruise') {
    countdownToOpenSeconds.value = null
    return
  }
  const diffMs = new Date(s.nextOpenAt).getTime() - Date.now()
  countdownToOpenSeconds.value = Math.max(0, Math.ceil(diffMs / 1000))
}

const {
  connect,
  disconnect,
  buyGrid,
  requestState,
  sendChat,
  onState,
  onRoundNew,
  onRoundDrawing,
  onBallDrawn,
  onRoundEnded,
  onRoundCountdownStarted,
  onRoundJackpot,
  onGridPurchased,
  onGridError,
  onOnlineUsers,
  onChatMessage,
  onTableClosed,
} = useBingoSocket()

const currentRound = ref<BingoRound | null>(null)
const userGrids = ref<BingoGrid[]>([])
const chatMessages = ref<BingoChatMessage[]>([])
const onlineUsers = ref<BingoOnlineUser[]>([])
const balance = ref(0)
const chatInput = ref('')
const purchaseCountdownSeconds = ref<number | null>(null)
const isPurchasing = ref(false)
const hasReceivedState = ref(false)
const soundEnabled = useStorage('bingo-sound-enabled', true)
const tableClosedTransition = ref(false)
const lastWinnerNotification = ref<{ winnerIds: number[]; winners: { id: number; name: string }[]; jackpot: number } | null>(null)
/** Gagnant(s) de la partie précédente, affiché dans la zone de tirage jusqu'au prochain round */
const lastRoundWinner = ref<{ winnerIds: number[]; winners: { id: number; name: string }[]; jackpot: number } | null>(null)
/** Transition après un gagnant : 10s pendant lesquelles le tirage reste visible */
const winnerAnnouncedAt = ref<number | null>(null)
/** Boules tirées pendant la transition (pour garder l'affichage 10s après le gagnant) */
const lastRoundDrawnBalls = ref<number[]>([])
/** Popup gagnant : ferme en 6s ou sur OK */
const showWinnerPopup = ref(false)
let winnerPopupTimeout: ReturnType<typeof setTimeout> | null = null

const nowForTransition = ref(Date.now())
const isInWinnerTransition = computed(() => {
  const at = winnerAnnouncedAt.value
  if (!at) return false
  return nowForTransition.value - at < 10000
})

const drawnBalls = computed(() => currentRound.value?.drawnBalls ?? [])
/** Boules à afficher : pendant la transition, utiliser lastRoundDrawnBalls */
const displayedDrawnBalls = computed(() =>
  isInWinnerTransition.value ? lastRoundDrawnBalls.value : drawnBalls.value
)

const canPurchase = computed(() => {
  const r = currentRound.value
  if (!r || r.phase !== 'purchase') return false
  const endsAt = new Date(r.purchaseEndsAt).getTime()
  if (endsAt < Date.now()) return false
  return true
})

const ONE_DAY_MS = 86400000
const isWaitingForPlayers = computed(() => {
  const r = currentRound.value
  if (!r || r.phase !== 'purchase') return false
  const endsAt = new Date(r.purchaseEndsAt).getTime()
  return endsAt - Date.now() > ONE_DAY_MS
})

const purchasePhaseMessage = computed(() => {
  if (!currentRound.value || currentRound.value.phase !== 'purchase') return null
  const hasGridsInRound = (currentRound.value?.jackpot ?? 0) > 0
  const currentUserHasGrids = userGrids.value.length > 0
  const isCountdown = !isWaitingForPlayers.value && purchaseCountdownSeconds.value !== null

  if (!hasGridsInRound) {
    return 'Achetez une ou plusieurs grilles pour participer.'
  }
  if (isWaitingForPlayers.value) {
    return currentUserHasGrids
      ? 'En attente d\'un autre joueur au minimum pour démarrer la partie.'
      : 'Achetez une ou plusieurs grilles pour participer.'
  }
  if (isCountdown) {
    return 'La partie va bientôt commencer, dépêchez-vous de prendre vos grilles.'
  }
  return null
})

watch(isChatDrawerOpen, (open) => {
  if (open) unreadChatCount.value = 0
})

function updatePurchaseCountdown() {
  const r = currentRound.value
  if (!r || r.phase !== 'purchase' || !r.purchaseEndsAt) {
    purchaseCountdownSeconds.value = null
    return
  }
  const endsAt = new Date(r.purchaseEndsAt).getTime()
  if (endsAt - Date.now() > ONE_DAY_MS) {
    purchaseCountdownSeconds.value = null
    return
  }
  purchaseCountdownSeconds.value = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

const sendChatMessage = () => {
  const msg = chatInput.value?.trim()
  if (!msg) return
  sendChat(msg)
  chatInput.value = ''
}

function closeWinnerPopup() {
  if (winnerPopupTimeout) {
    clearTimeout(winnerPopupTimeout)
    winnerPopupTimeout = null
  }
  showWinnerPopup.value = false
}

let purchaseCountdownInterval: ReturnType<typeof setInterval> | null = null
let statusPollInterval: ReturnType<typeof setInterval> | null = null
let countdownToOpenInterval: ReturnType<typeof setInterval> | null = null
let tableClosedTransitionTimeout: ReturnType<typeof setTimeout> | null = null
let winnerTransitionInterval: ReturnType<typeof setInterval> | null = null

function setupGame() {
  connect()
  onState((s) => {
    hasReceivedState.value = true
    currentRound.value = s.currentRound
    userGrids.value = s.userGrids ?? []
    chatMessages.value = s.chatMessages ?? []
    balance.value = s.balance ?? 0
    onlineUsers.value = s.onlineUsers ?? []
    updatePurchaseCountdown()
  })
  onOnlineUsers(({ users }) => {
    onlineUsers.value = users
  })
  onRoundNew(({ round }) => {
    currentRound.value = round
    userGrids.value = []
    lastWinnerNotification.value = null
    updatePurchaseCountdown()
  })
  onRoundCountdownStarted(({ roundId, purchaseEndsAt, jackpot }) => {
    if (currentRound.value?.id === roundId) {
      currentRound.value = {
        ...currentRound.value,
        purchaseEndsAt,
        jackpot,
      }
      updatePurchaseCountdown()
    }
  })
  onRoundDrawing(({ round }) => {
    currentRound.value = round
    lastRoundWinner.value = null
    updatePurchaseCountdown()
  })
  onBallDrawn(({ roundId, ball, drawnBalls: balls }) => {
    if (currentRound.value?.id === roundId) {
      currentRound.value = { ...currentRound.value, drawnBalls: balls }
      if (soundEnabled.value) playBall(ball)
    }
  })
  onRoundEnded(({ round }) => {
    if (currentRound.value?.id === round.id) {
      currentRound.value = { ...currentRound.value, phase: 'ended', winnerId: round.winnerId }
      const winnerIds = round.winnerIds ?? (round.winnerId ? [round.winnerId] : [])
      const winners = round.winners ?? (winnerIds.length > 0 ? winnerIds.map((id) => ({ id, name: round.winnerName ?? `Joueur #${id}` })) : [])
      if (winnerIds.includes(authStore.user?.id ?? -1)) {
        requestState()
        playWinSong()
      }
      if (winnerIds.length > 0) {
        const winnerData = { winnerIds, winners, jackpot: round.jackpot }
        lastWinnerNotification.value = winnerData
        lastRoundWinner.value = winnerData
        lastRoundDrawnBalls.value = [...(currentRound.value?.drawnBalls ?? [])]
        winnerAnnouncedAt.value = Date.now()
        nowForTransition.value = Date.now()
        showWinnerPopup.value = true
        if (winnerPopupTimeout) clearTimeout(winnerPopupTimeout)
        winnerPopupTimeout = setTimeout(() => {
          showWinnerPopup.value = false
          winnerPopupTimeout = null
        }, 6000)
        if (winnerTransitionInterval) clearInterval(winnerTransitionInterval)
        winnerTransitionInterval = setInterval(() => {
          nowForTransition.value = Date.now()
          if (nowForTransition.value - (winnerAnnouncedAt.value ?? 0) >= 10000) {
            winnerAnnouncedAt.value = null
            if (winnerTransitionInterval) {
              clearInterval(winnerTransitionInterval)
              winnerTransitionInterval = null
            }
          }
        }, 500)
        setTimeout(() => {
          lastWinnerNotification.value = null
        }, 5000)
      } else {
        lastWinnerNotification.value = null
        lastRoundWinner.value = { winnerIds: [], winners: [], jackpot: round.jackpot }
      }
      if (winnerIds.length === 0) {
        toast.add({
          title: 'Partie terminée',
          description: `Sans gagnant (${round.jackpot} Jiji reportés).`,
          color: 'success',
          icon: 'i-heroicons-trophy',
        })
      }
    }
  })
  onRoundJackpot(({ roundId, jackpot }) => {
    if (currentRound.value?.id === roundId) {
      currentRound.value = { ...currentRound.value, jackpot }
    }
  })
  onGridPurchased(({ grids, jackpot, balance: b, countdownStarted, purchaseEndsAt }) => {
    userGrids.value = [...userGrids.value, ...grids]
    balance.value = b
    if (currentRound.value) {
      currentRound.value = {
        ...currentRound.value,
        jackpot,
        ...(countdownStarted && purchaseEndsAt ? { purchaseEndsAt } : {}),
      }
      if (countdownStarted) updatePurchaseCountdown()
    }
    isPurchasing.value = false
  })
  onGridError(({ error }) => {
    toast.add({ title: 'Erreur', description: error, color: 'error' })
    isPurchasing.value = false
  })
  onChatMessage((msg) => {
    chatMessages.value = [...chatMessages.value, msg]
    if (!isChatDrawerOpen.value && msg.userId !== authStore.user?.id) {
      unreadChatCount.value++
    }
  })
  onTableClosed(() => {
    tableClosedTransition.value = true
    toast.add({
      title: 'Table fermée',
      description: 'Merci d\'avoir joué ! La table rouvrira à la prochaine session.',
      color: 'neutral',
      icon: 'i-heroicons-check-circle',
    })
    tableClosedTransitionTimeout = setTimeout(() => {
      tableClosedTransitionTimeout = null
      tableClosedTransition.value = false
      if (bingoStatus.value) {
        bingoStatus.value = { ...bingoStatus.value, isOpen: false }
      }
      disconnect()
      updateCountdownToOpen()
      if (countdownToOpenInterval) clearInterval(countdownToOpenInterval)
      countdownToOpenInterval = setInterval(updateCountdownToOpen, 1000)
      if (!statusPollInterval) statusPollInterval = setInterval(pollStatusAndConnectIfOpen, 10000)
    }, 4000)
  })

  purchaseCountdownInterval = setInterval(updatePurchaseCountdown, 500)

  const handleDevRestart = async (e: KeyboardEvent) => {
    if (e.altKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault()
      if (!authStore.accessToken || !bingoStatus.value?.isOpen) return
      try {
        await $fetch(`${apiBaseUrl}/bingo/dev-restart`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
        })
        toast.add({
          title: 'Partie relancée',
          description: 'Alt+Shift+F (dev)',
          color: 'success',
        })
      } catch (err: any) {
        toast.add({
          title: 'Erreur',
          description: err.data?.message || err.message || 'Impossible de relancer',
          color: 'error',
        })
      }
    }
  }
  const handleKeydown = (e: KeyboardEvent) => handleDevRestart(e)
  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}

function handleBuyGrid(count: number) {
  const r = currentRound.value
  if (!r || r.id == null || !canPurchase.value || isPurchasing.value) return
  isPurchasing.value = true
  buyGrid(Number(r.id), count)
}

async function pollStatusAndConnectIfOpen() {
  try {
    const status = await $fetch<BingoStatus>(`${apiBaseUrl}/bingo/status`)
    if (status.isOpen) {
      if (statusPollInterval) {
        clearInterval(statusPollInterval)
        statusPollInterval = null
      }
      if (countdownToOpenInterval) {
        clearInterval(countdownToOpenInterval)
        countdownToOpenInterval = null
      }
      bingoStatus.value = status
      toast.add({
        title: 'La table est ouverte !',
        description: 'Bienvenue à la table de bingo.',
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
      setupGame()
    } else {
      bingoStatus.value = status
      updateCountdownToOpen()
    }
  } catch {
    // Ignore
  }
}

onMounted(async () => {
  statusLoading.value = true
  try {
    bingoStatus.value = await $fetch<BingoStatus>(`${apiBaseUrl}/bingo/status`)
  } catch {
    bingoStatus.value = {
      isOpen: false,
      mode: 'manual',
      manualEnabled: false,
      openHour: 9,
      openMinute: 0,
      closeHour: 18,
      closeMinute: 0,
      drawSpeed: 'medium',
      nextOpenAt: null,
    }
  } finally {
    statusLoading.value = false
  }

  if (!bingoStatus.value?.isOpen) {
    updateCountdownToOpen()
    countdownToOpenInterval = setInterval(updateCountdownToOpen, 1000)
    statusPollInterval = setInterval(pollStatusAndConnectIfOpen, 10000)
    return
  }

  setupGame()
})

onUnmounted(() => {
  if (purchaseCountdownInterval) clearInterval(purchaseCountdownInterval)
  if (countdownToOpenInterval) clearInterval(countdownToOpenInterval)
  if (statusPollInterval) clearInterval(statusPollInterval)
  if (tableClosedTransitionTimeout) clearTimeout(tableClosedTransitionTimeout)
  disconnect()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">
        Bingo
      </h1>
      <UDrawer
        v-if="bingoStatus?.isOpen || tableClosedTransition"
        v-model:open="isChatDrawerOpen"
        direction="right"
        :handle="false"
        :ui="{
          content: 'h-full',
          container: 'max-w-[min(100vw-2rem,380px)] w-full flex flex-col h-full min-h-0 overflow-hidden p-0',
          body: 'flex-1 min-h-0 flex flex-col overflow-hidden p-4'
        }"
      >
        <div class="relative inline-flex lg:hidden shrink-0">
          <UButton
            color="primary"
            variant="outline"
            icon="i-heroicons-chat-bubble-left-right"
            size="sm"
            label="Chat"
            aria-label="Ouvrir le chat"
          />
          <UBadge
            v-if="unreadChatCount > 0"
            color="primary"
            variant="solid"
            size="xs"
            class="absolute -top-1 -right-1 min-w-[1.25rem] h-5 text-[10px] leading-none !rounded-full justify-center px-1.5"
          >
            {{ unreadChatCount > 99 ? '99+' : unreadChatCount }}
          </UBadge>
        </div>
        <template #body>
          <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
            <BingoChatPanel
              v-model:input="chatInput"
              :messages="chatMessages"
              :current-user-id="authStore.user?.id"
              compact
              @send="sendChatMessage"
            />
          </div>
        </template>
      </UDrawer>
    </div>

    <div v-if="statusLoading" class="flex items-center justify-center py-24">
      <div class="w-10 h-10 border-2 border-amber-500/60 border-t-amber-400 rounded-full animate-spin" />
    </div>

    <div
      v-else-if="!bingoStatus?.isOpen && !tableClosedTransition"
      class="flex flex-col items-center justify-center py-24 text-center"
    >
      <div class="rounded-xl bg-amber-900/30 border border-amber-700/40 px-8 py-6 max-w-md space-y-4">
        <p class="text-lg text-amber-200">
          {{ closedMessage }}
        </p>
        <div
          v-if="bingoStatus?.mode === 'cruise' && countdownToOpenFormatted"
          class="space-y-1"
        >
          <p class="text-sm text-amber-300/80">Ouverture dans</p>
          <p class="text-3xl font-mono font-bold text-amber-300 tabular-nums">
            {{ countdownToOpenFormatted }}
          </p>
        </div>
        <p class="text-sm text-amber-300/80 flex items-center justify-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          En attente de l'ouverture…
        </p>
      </div>
    </div>

    <div v-else class="relative">
      <Transition name="fade">
        <div
          v-if="tableClosedTransition"
          class="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-amber-950/95 backdrop-blur-sm"
        >
          <UIcon name="i-heroicons-check-circle" class="h-16 w-16 text-amber-400 mb-4" />
          <p class="text-xl font-medium text-amber-200">Table fermée</p>
          <p class="text-amber-300/90 mt-1">Merci d'avoir joué ! À bientôt.</p>
        </div>
      </Transition>

      <div
        class="grid gap-6 lg:grid-cols-[1fr_320px] min-[1536px]:grid-cols-[minmax(0,0.65fr)_minmax(360px,1fr)]"
      >
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

          <div class="relative min-h-[200px] flex items-center justify-center">
            <div
              v-if="!hasReceivedState"
              class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl"
            >
              <div class="w-8 h-8 border-2 border-amber-500/60 border-t-amber-400 rounded-full animate-spin" />
            </div>
            <BingoGameBoard
              v-show="hasReceivedState"
              :current-round="currentRound"
              :user-grids="userGrids"
              :drawn-balls="displayedDrawnBalls"
              :balance="balance"
              :grid-price="bingoStatus?.gridPrice ?? 50"
              :can-purchase="canPurchase"
              :countdown-seconds="purchaseCountdownSeconds"
              :purchase-phase-message="purchasePhaseMessage"
              :is-purchasing="isPurchasing"
              :last-round-winner="lastRoundWinner"
              :online-users="onlineUsers"
              :current-user-id="authStore.user?.id"
              :show-winner-popup="showWinnerPopup"
              :winner-popup-data="lastRoundWinner"
              :is-in-winner-transition="isInWinnerTransition"
              v-model:sound-enabled="soundEnabled"
              @buy-grid="handleBuyGrid"
              @close-winner-popup="closeWinnerPopup"
            />
          </div>
        </div>

        <div class="hidden lg:block w-full min-w-0 shrink-0 min-h-[80vh]">
          <BingoChatPanel
            v-model:input="chatInput"
            :messages="chatMessages"
            :current-user-id="authStore.user?.id"
            @send="sendChatMessage"
          />
        </div>
      </div>
    </div>
  </div>
</template>
