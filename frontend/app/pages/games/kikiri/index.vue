<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useKikiriSocket } from '~/composables/useKikiriSocket'
import type { KikiriDraw, KikiriChatMessage, KikiriOnlineUser, KikiriBetByUser } from '~/composables/useKikiriSocket'

/** Chat en drawer à droite sur écrans < 1024px */
const isChatDrawerOpen = ref(false)
/** Nombre de messages non lus (drawer fermé) - uniquement messages des autres */
const unreadChatCount = ref(0)

definePageMeta({
  layout: 'games',
  middleware: 'auth',
  titleKey: 'games.metaKikiri',
})

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
const { getImageUrl } = useApi()
const walletStore = useWalletStore()
const toast = useToast()
const { t } = useI18n()

interface KikiriStatus {
  isOpen: boolean
  mode: 'manual' | 'cruise'
  manualEnabled: boolean
  openHour: number
  openMinute: number
  closeHour: number
  closeMinute: number
  nextOpenAt: string | null
}

const kikiriStatus = ref<KikiriStatus | null>(null)
const statusLoading = ref(true)
const countdownToOpenSeconds = ref<number | null>(null)

const closedMessage = computed(() => {
  const s = kikiriStatus.value
  if (!s) return null
  if (s.mode === 'manual') {
    return t('games.closedDisabled')
  }
  if (s.nextOpenAt) {
    const hh = new Date(s.nextOpenAt).getHours().toString().padStart(2, '0')
    const mm = new Date(s.nextOpenAt).getMinutes().toString().padStart(2, '0')
    return t('games.kikiriOpensAt', { time: `${hh}:${mm}` })
  }
  return t('games.closedLater')
})

const countdownToOpenFormatted = computed(() => {
  const sec = countdownToOpenSeconds.value
  if (sec === null || sec < 0) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts = [h, m, s].map((n) => n.toString().padStart(2, '0'))
  return parts.join(':')
})

function updateCountdownToOpen() {
  const s = kikiriStatus.value
  if (!s?.nextOpenAt || s.mode !== 'cruise') {
    countdownToOpenSeconds.value = null
    return
  }
  const diffMs = new Date(s.nextOpenAt).getTime() - Date.now()
  countdownToOpenSeconds.value = Math.max(0, Math.ceil(diffMs / 1000))
}

function deriveUserBetsFromAllBets(
  allBets: Record<number, KikiriBetByUser[]> | undefined,
  userId: number | undefined,
): Record<number, number> {
  if (!allBets || userId == null) return {}
  const result: Record<number, number> = {}
  for (let num = 1; num <= 6; num++) {
    const bets = allBets[num] ?? []
    const mine = bets.find((b) => b.userId === userId)
    if (mine && mine.amount > 0) result[num] = mine.amount
  }
  return result
}

const {
  connect,
  disconnect,
  placeBet,
  moveBet,
  moveAllBets,
  emitBetPreview,
  sendChat,
  onState,
  onOnlineUsers,
  onDrawStartingSoon,
  onDrawNew,
  onDrawEnding,
  onDrawReveal,
  onDrawResolved,
  onDrawMyResult,
  onBetPlaced,
  onBetError,
  onChatMessage,
  onAllBets,
  onBetPreview,
  onTableClosingAfterDraw,
  onTableClosed,
} = useKikiriSocket()

const currentDraw = ref<KikiriDraw | null>(null)
const drawHistory = ref<KikiriDraw[]>([])
const chatMessages = ref<KikiriChatMessage[]>([])
const onlineUsers = ref<KikiriOnlineUser[]>([])
const balance = ref(0)
const countdown = ref<number | null>(null)
const chatInput = ref('')
const hasSubmittedForCurrentDraw = ref(false)
const isFinishLoading = ref(false)
const isTriggerLoading = ref(false)
const isPlacing = ref(false)
const lastKnownUserBets = ref<Record<number, number>>({})
const pendingUserBets = ref<Record<number, number>>({})

const betAmounts = ref<Record<number, number>>({})
const provisionalBetsByUser = ref<Record<number, Record<number, number>>>({})
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
const tableClosingAfterDraw = ref(false)
const tableClosedTransition = ref(false)
const animationsCompleteForCurrentDraw = ref(false)
/** Compteur 5s "partie va commencer" (étape 2) - null = inactif */
const preGameCountdown = ref<number | null>(null)

/** Afficher "La prochaine partie commence bientôt..." après la pop de résultat, avant startingSoon */
const showNextGameSoonMessage = computed(
  () =>
    currentDraw.value?.status === 'resolved' &&
    !lastResultNotification.value &&
    preGameCountdown.value == null,
)

const TABLE_CLOSED_TRANSITION_MS = 6000

watch(isChatDrawerOpen, (open) => {
  if (open) unreadChatCount.value = 0
})

const totalBetAmount = computed(() =>
  [1, 2, 3, 4, 5, 6].reduce((a, n) => a + (betAmounts.value[n] ?? 0), 0),
)
const effectiveBalance = computed(() =>
  balanceFrozenAtResult.value ?? balance.value,
)

let resultNotificationTimeout: ReturnType<typeof setTimeout> | null = null
let resultFallbackTimeout: ReturnType<typeof setTimeout> | null = null

function onBetMove({ from, to, amount = 1 }: { from: number; to: number; amount?: number }) {
  const draw = currentDraw.value
  if (!draw || draw.status !== 'betting' || hasSubmittedForCurrentDraw.value) return
  const n = Math.max(1, Math.floor(amount))
  emitBetPreview(draw.id, -n, from)
  emitBetPreview(draw.id, n, to)
  const knownOnSource = lastKnownUserBets.value[from] ?? 0
  if (knownOnSource >= n) {
    if (n > 1) {
      moveAllBets(draw.id, from, to)
    } else {
      moveBet(draw.id, from, to)
    }
    lastKnownUserBets.value = {
      ...lastKnownUserBets.value,
      [from]: knownOnSource - n,
      [to]: (lastKnownUserBets.value[to] ?? 0) + n,
    }
  }
}

function onBetPreviewEvent({ delta, case: caseNum }: { delta: number; case: number }) {
  const draw = currentDraw.value
  const uid = authStore.user?.id
  if (!draw || draw.status !== 'betting' || !uid) return
  emitBetPreview(draw.id, delta, caseNum)
}

function tryShowResultNotification() {
  if (!pendingResultNotification.value) return
  const { userNet, totalBetAtResult } = pendingResultNotification.value
  const base = balanceFrozenAtResult.value ?? balance.value
  if (userNet < 0) {
    balance.value = base
  } else {
    balance.value = base + (userNet === 0 ? totalBetAtResult : userNet + totalBetAtResult)
  }
  nextTick(() => walletStore.fetchJijiBalance())
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

function onBoardAnimationsComplete() {
  animationsCompleteForCurrentDraw.value = true
  tryShowResultNotification()
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
    pendingUserBets.value = {
      ...pendingUserBets.value,
      [num]: (pendingUserBets.value[num] ?? 0) + amount,
    }
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
      // Ne pas afficher si un autre client a déjà fini le tirage (race condition normale)
      if (err.message === 'Draw already resolved or in progress') return
      toast.add({ title: t('common.error'), description: err.message || t('gameUi.finishDrawFail'), color: 'error' })
    }
  } catch (e) {
    toast.add({ title: t('common.error'), description: t('gameUi.finishDrawFail'), color: 'error' })
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
      toast.add({ title: t('common.error'), description: err.message || t('gameUi.triggerDrawFail'), color: 'error' })
    }
  } catch (e) {
    toast.add({ title: t('common.error'), description: t('gameUi.triggerDrawFail'), color: 'error' })
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
  if (preGameCountdown.value != null) return
  const draw = currentDraw.value
  if (!draw || draw.status !== 'betting' || !draw.bettingEndsAt) {
    countdown.value = null
    return
  }
  const end = new Date(draw.bettingEndsAt).getTime()
  const diff = Math.max(0, Math.ceil((end - Date.now()) / 1000))
  countdown.value = diff
}

let countdownInterval: ReturnType<typeof setInterval> | null = null
let preGameCountdownInterval: ReturnType<typeof setInterval> | null = null
let statusPollInterval: ReturnType<typeof setInterval> | null = null
let countdownToOpenInterval: ReturnType<typeof setInterval> | null = null
let tableClosedTransitionTimeout: ReturnType<typeof setTimeout> | null = null

function setupGame() {
  connect()
  onState((s) => {
    const stateDrawId = s.currentDraw?.id
    const ourDrawId = currentDraw.value?.id
    const stateIsStale = ourDrawId != null && stateDrawId != null && ourDrawId > stateDrawId
    if (stateIsStale) return
    if (s.currentDraw?.status === 'betting') preGameCountdown.value = null
    const hasLocalBets = totalBetAmount.value > 0 && currentDraw.value?.status === 'betting'
    hasReceivedState.value = true
    currentDraw.value = s.currentDraw
    drawHistory.value = s.drawHistory ?? []
    chatMessages.value = s.chatMessages ?? []
    if (!pendingResultNotification.value) balance.value = s.balance ?? 0
    onlineUsers.value = s.onlineUsers ?? []
    if (!hasLocalBets) {
      const userBets = s.currentDraw?.userBets ?? deriveUserBetsFromAllBets(s.currentDraw?.allBets, authStore.user?.id)
      lastKnownUserBets.value = { ...userBets }
      betAmounts.value = { ...lastKnownUserBets.value }
    }
    updateCountdown()
  })
  onOnlineUsers(({ users }) => {
    onlineUsers.value = users
  })
  onDrawStartingSoon(() => {
    if (preGameCountdownInterval) clearInterval(preGameCountdownInterval)
    preGameCountdown.value = 5
    preGameCountdownInterval = setInterval(() => {
      if (preGameCountdown.value == null) return
      preGameCountdown.value = preGameCountdown.value! - 1
      if (preGameCountdown.value <= 0) {
        preGameCountdown.value = null
        if (preGameCountdownInterval) {
          clearInterval(preGameCountdownInterval)
          preGameCountdownInterval = null
        }
      }
    }, 1000)
  })
  onDrawNew(({ draw }) => {
    preGameCountdown.value = null
    const pendingResult = pendingResultNotification.value
    if (resultFallbackTimeout) {
      clearTimeout(resultFallbackTimeout)
      resultFallbackTimeout = null
    }
    pendingResultNotification.value = null
    animationsCompleteForCurrentDraw.value = false
    currentDraw.value = draw
    hasSubmittedForCurrentDraw.value = false
    lastKnownUserBets.value = {}
    pendingUserBets.value = {}
    betAmounts.value = {}
    provisionalBetsByUser.value = {}
    balanceFrozenAtResult.value = null
    gameReady.value = false
    isNewGame.value = true
    updateCountdown()
    if (pendingResult) {
      nextTick(() => {
        pendingResultNotification.value = pendingResult
        tryShowResultNotification()
      })
    }
  })
  onDrawEnding(({ drawId }) => {
    placeBets(true)
  })
  onDrawReveal(({ draw }) => {
    currentDraw.value = { ...currentDraw.value!, ...draw }
    provisionalBetsByUser.value = {}
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
    const totalBetAtResult = totalBetAmount.value

    // Pas de popup si le joueur n'a pas misé : aller directement au message d'attente
    if (userNet === 0 && totalBetAtResult === 0) {
      balanceFrozenAtResult.value = null
      if (resultFallbackTimeout) {
        clearTimeout(resultFallbackTimeout)
        resultFallbackTimeout = null
      }
      return
    }

    balanceFrozenAtResult.value = balance.value

    // Stocker le résultat ; affichage dès que les animations du plateau sont terminées
    pendingResultNotification.value = {
      userNet,
      drawId,
      totalBetAtResult,
    }
    if (resultFallbackTimeout) clearTimeout(resultFallbackTimeout)
    resultFallbackTimeout = setTimeout(() => {
      resultFallbackTimeout = null
      tryShowResultNotification()
    }, 15000)
    if (animationsCompleteForCurrentDraw.value) {
      tryShowResultNotification()
    }
  })
  onBetPlaced(({ bet, balance: b }) => {
    balance.value = b
    const num = Number(bet?.number)
    const amount = Number(bet?.amount ?? 0)
    if (num >= 1 && num <= 6 && amount > 0) {
      const pending = pendingUserBets.value[num] ?? 0
      pendingUserBets.value = {
        ...pendingUserBets.value,
        [num]: Math.max(0, pending - amount),
      }
      lastKnownUserBets.value = {
        ...lastKnownUserBets.value,
        [num]: (lastKnownUserBets.value[num] ?? 0) + amount,
      }
    }
  })
  onBetError(({ error }) => {
    const err = typeof error === 'string' ? error : String(error ?? '')
    if (/draft already resolving|draw already resolved|in progress/i.test(err)) {
      return
    }
    const msg = err || 'Mise refusée'
    try {
      toast.add({ title: 'Mise refusée', description: msg, color: 'error' })
    } catch {
      // Ignorer les erreurs internes du toaster
    }
  })
  onChatMessage((msg) => {
    chatMessages.value = [...chatMessages.value, msg]
    if (!isChatDrawerOpen.value && msg.userId !== authStore.user?.id) {
      unreadChatCount.value++
    }
  })
  onAllBets(({ drawId, allBets }) => {
    if (currentDraw.value?.id === drawId) {
      currentDraw.value = { ...currentDraw.value, allBets }
    }
  })
  onTableClosingAfterDraw(() => {
    tableClosingAfterDraw.value = true
    toast.add({
      title: 'Fermeture programmée',
      description: 'La table sera fermée après ce tirage. Vos gains seront encaissés.',
      color: 'warning',
      icon: 'i-heroicons-information-circle',
    })
  })
  onTableClosed(() => {
    tableClosingAfterDraw.value = false
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
      if (kikiriStatus.value) {
        kikiriStatus.value = { ...kikiriStatus.value, isOpen: false }
      }
      disconnect()
      updateCountdownToOpen()
      if (countdownToOpenInterval) clearInterval(countdownToOpenInterval)
      countdownToOpenInterval = setInterval(updateCountdownToOpen, 1000)
      if (!statusPollInterval) statusPollInterval = setInterval(pollStatusAndConnectIfOpen, 10000)
    }, TABLE_CLOSED_TRANSITION_MS)
  })
  onBetPreview(({ drawId, userId, delta, case: caseNum }) => {
    const uid = authStore.user?.id
    if (uid != null && userId === uid) return
    if (currentDraw.value?.id !== drawId) return
    const userMap = { ...(provisionalBetsByUser.value[userId] ?? {}) }
    const current = userMap[caseNum] ?? 0
    const next = current + delta
    if (next === 0) {
      delete userMap[caseNum]
      if (Object.keys(userMap).length === 0) {
        const { [userId]: _, ...rest } = provisionalBetsByUser.value
        provisionalBetsByUser.value = rest
      } else {
        provisionalBetsByUser.value = { ...provisionalBetsByUser.value, [userId]: userMap }
      }
    } else {
      provisionalBetsByUser.value = {
        ...provisionalBetsByUser.value,
        [userId]: { ...userMap, [caseNum]: next },
      }
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
}

async function pollStatusAndConnectIfOpen() {
  try {
    const status = await $fetch<KikiriStatus>(`${apiBaseUrl}/kikiri/status`)
    if (status.isOpen) {
      if (statusPollInterval) {
        clearInterval(statusPollInterval)
        statusPollInterval = null
      }
      if (countdownToOpenInterval) {
        clearInterval(countdownToOpenInterval)
        countdownToOpenInterval = null
      }
      kikiriStatus.value = status
      toast.add({
        title: 'La table est ouverte !',
        description: 'Bienvenue à la table de kikiri.',
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
      setupGame()
    } else {
      kikiriStatus.value = status
      updateCountdownToOpen()
    }
  } catch {
    // Ignorer les erreurs de poll
  }
}

onMounted(async () => {
  statusLoading.value = true
  try {
    kikiriStatus.value = await $fetch<KikiriStatus>(`${apiBaseUrl}/kikiri/status`)
  } catch {
    kikiriStatus.value = { isOpen: false, mode: 'manual', manualEnabled: false, openHour: 9, openMinute: 0, closeHour: 18, closeMinute: 0, nextOpenAt: null }
  } finally {
    statusLoading.value = false
  }

  if (!kikiriStatus.value?.isOpen) {
    updateCountdownToOpen()
    countdownToOpenInterval = setInterval(updateCountdownToOpen, 1000)
    statusPollInterval = setInterval(pollStatusAndConnectIfOpen, 10000)
    return
  }

  setupGame()
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (preGameCountdownInterval) clearInterval(preGameCountdownInterval)
  if (countdownToOpenInterval) clearInterval(countdownToOpenInterval)
  if (statusPollInterval) clearInterval(statusPollInterval)
  if (resultNotificationTimeout) clearTimeout(resultNotificationTimeout)
  if (resultFallbackTimeout) clearTimeout(resultFallbackTimeout)
  if (tableClosedTransitionTimeout) clearTimeout(tableClosedTransitionTimeout)
  disconnect()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">
        Kikiri
      </h1>
      <UDrawer
        v-if="kikiriStatus?.isOpen || tableClosedTransition"
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
            <KikiriChatPanel
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

    <div v-else-if="!kikiriStatus?.isOpen && !tableClosedTransition" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="rounded-xl bg-amber-900/30 border border-amber-700/40 px-8 py-6 max-w-md space-y-4">
        <p class="text-lg text-amber-200">
          {{ closedMessage }}
        </p>
        <div
          v-if="kikiriStatus?.mode === 'cruise' && countdownToOpenFormatted"
          class="space-y-1"
        >
          <p class="text-sm text-amber-300/80">Ouverture dans</p>
          <p class="text-3xl font-mono font-bold text-amber-300 tabular-nums">
            {{ countdownToOpenFormatted }}
          </p>
        </div>
        <p class="text-sm text-amber-300/80 flex items-center justify-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          En attente de l'ouverture… Vous serez notifié automatiquement.
        </p>
      </div>
    </div>

    <div v-else class="relative">
      <!-- Overlay transition après fermeture : laisser voir le résultat quelques secondes -->
      <Transition name="fade">
        <div
          v-if="tableClosedTransition"
          class="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-amber-950/95 backdrop-blur-sm"
        >
          <UIcon name="i-heroicons-check-circle" class="h-16 w-16 text-amber-400 mb-4" />
          <p class="text-xl font-medium text-amber-200">
            Table fermée
          </p>
          <p class="text-amber-300/90 mt-1">
            Merci d'avoir joué ! À bientôt.
          </p>
        </div>
      </Transition>
      <div
        class="grid gap-6 lg:grid-cols-[1fr_320px] min-[1536px]:grid-cols-[minmax(0,0.65fr)_minmax(360px,1fr)] min-[1920px]:grid-cols-[1fr_320px]"
      >
      <!-- Colonne gauche : plateau + boutons + derniers tirages -->
      <div class="space-y-4">
        <!-- Bannière fermeture programmée -->
        <div
          v-if="tableClosingAfterDraw"
          class="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-600/30 border border-amber-500/50"
        >
          <UIcon name="i-heroicons-information-circle" class="h-6 w-6 text-amber-400 shrink-0" />
          <p class="text-amber-200 font-medium">
            La table sera fermée après ce tirage. Vos gains seront encaissés normalement.
          </p>
        </div>
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
            :key="currentDraw?.id ?? 'none'"
            v-show="hasReceivedState"
            :draw="currentDraw"
            :can-bet="!!canBet"
            :balance="effectiveBalance"
            :has-submitted-bets="hasSubmittedForCurrentDraw"
            v-model:bet-amounts="betAmounts"
            :is-placing="isPlacing"
            :all-bets="currentDraw?.allBets"
            :provisional-bets-by-user="provisionalBetsByUser"
            :online-users="onlineUsers"
            :current-user-id="authStore.user?.id"
            @animations-complete="onBoardAnimationsComplete"
            @move="onBetMove"
            @bet-preview="onBetPreviewEvent"
            :is-new-game="isNewGame"
            :cup-close-requested="preGameCountdown != null"
            @game-ready="gameReady = true; isNewGame = false"
          >
            <template #board-overlay>
              <!-- Conteneur fixe : pré-partie 5s, résultat, ou compteur de paris -->
              <div class="grid min-w-[120px] min-h-[44px]">
                <div class="col-start-1 row-start-1 flex items-center justify-center">
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
                      class="px-3 py-1.5 text-base min-[600px]:px-4 min-[600px]:py-2 min-[600px]:text-lg lg:px-8 lg:py-4 lg:text-2xl rounded-xl font-bold shadow-lg animate-pulse"
                      :class="[
                        lastResultNotification.userNet > 0
                          ? 'bg-green-500/90 text-white'
                          : lastResultNotification.userNet < 0
                            ? 'bg-red-500/90 text-white'
                            : 'bg-white/20 text-white',
                      ]"
                    >
                      <span class="inline-flex items-center gap-1.5">
                        {{ lastResultNotification.userNet === 0 ? 'ORA' : (lastResultNotification.userNet > 0 ? '+' : '') + lastResultNotification.userNet }}
                        <JijiIcon size="sm" />
                      </span>
                    </div>
                  </Transition>
                </div>
                <div class="col-start-1 row-start-1 flex items-center justify-center z-10">
                  <!-- Étape 2 : compteur 5s "partie va commencer" -->
                  <div
                    v-if="preGameCountdown != null"
                    class="px-3 py-1.5 text-sm min-[600px]:px-4 min-[600px]:py-2 min-[600px]:text-base lg:px-6 lg:py-3 lg:text-lg rounded-xl font-bold shadow-lg bg-amber-600/90 text-white font-mono animate-pulse"
                  >
                    Prochaine partie dans {{ preGameCountdown }}
                  </div>
                  <!-- Après la pop de résultat : en attente du serveur -->
                  <div
                    v-else-if="showNextGameSoonMessage"
                    class="px-3 py-1.5 text-sm min-[600px]:px-4 min-[600px]:py-2 min-[600px]:text-base lg:px-6 lg:py-3 lg:text-lg rounded-xl font-medium shadow-lg bg-amber-800/80 text-amber-100"
                  >
                    La prochaine partie commence bientôt
                    <span class="kikiri-ellipsis">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                  <!-- Étape 4 : compteur de paris -->
                  <div
                    v-else-if="countdownFormatted && canBet && !lastResultNotification"
                    class="px-3 py-1.5 text-base min-[600px]:px-4 min-[600px]:py-2 min-[600px]:text-lg lg:px-8 lg:py-4 lg:text-2xl rounded-xl font-bold shadow-lg bg-black/50 text-white font-mono"
                  >
                    {{ countdownFormatted }}
                  </div>
                </div>
              </div>
            </template>
          </KikiriGameBoard>
        </div>
        <KikiriResultsHistory :draws="drawHistory" />
      </div>
      <!-- Colonne droite : chat (visible lg+) -->
      <div class="hidden lg:block w-full min-w-0 shrink-0 min-h-[80vh]">
        <KikiriChatPanel
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

<style scoped>
.kikiri-ellipsis span {
  animation: kikiri-ellipsis-dot 1.4s ease-in-out infinite;
  opacity: 0;
}
.kikiri-ellipsis span:nth-child(1) { animation-delay: 0s; }
.kikiri-ellipsis span:nth-child(2) { animation-delay: 0.2s; }
.kikiri-ellipsis span:nth-child(3) { animation-delay: 0.4s; }
@keyframes kikiri-ellipsis-dot {
  0%, 20% { opacity: 0; }
  50%, 100% { opacity: 1; }
}
</style>
