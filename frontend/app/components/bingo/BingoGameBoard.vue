<script setup lang="ts">
import type { Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import type { BingoRound, BingoGrid, BingoOnlineUser } from '~/composables/useBingoSocket'
import { useBingoBallSound } from '~/composables/useBingoBallSound'

const { getImageUrl } = useApi()
const { playBingoMusic, stopBingoMusic, setBingoMusicVolume } = useBingoBallSound()

const HEADERS = ['B', 'I', 'N', 'G', 'O']

/** Couleurs par lettre (sans vert, réservé à la validation) */
const COLUMN_COLORS = [
  { bg: 'bg-blue-500/25', header: 'bg-blue-600/60 text-blue-100', ball: 'bg-blue-500 text-white' },      // B 1-15
  { bg: 'bg-violet-500/25', header: 'bg-violet-600/60 text-violet-100', ball: 'bg-violet-500 text-white' }, // I 16-30
  { bg: 'bg-amber-500/25', header: 'bg-amber-600/60 text-amber-100', ball: 'bg-amber-500 text-white' },    // N 31-45
  { bg: 'bg-rose-500/25', header: 'bg-rose-600/60 text-rose-100', ball: 'bg-rose-500 text-white' },       // G 46-60
  { bg: 'bg-cyan-500/25', header: 'bg-cyan-600/60 text-cyan-100', ball: 'bg-cyan-500 text-white' },       // O 61-75
]

function getLetterForNumber(num: number): number {
  if (num <= 15) return 0
  if (num <= 30) return 1
  if (num <= 45) return 2
  if (num <= 60) return 3
  return 4
}

const props = defineProps<{
  currentRound: BingoRound | null
  userGrids: BingoGrid[]
  drawnBalls: number[]
  balance: number
  gridPrice?: number
  canPurchase: boolean
  countdownSeconds: number | null
  purchasePhaseMessage: string | null
  isPurchasing: boolean
  lastRoundWinner?: { winnerIds: number[]; winners: { id: number; name: string }[]; jackpot: number } | null
  onlineUsers?: BingoOnlineUser[]
  currentUserId?: number | undefined
  showWinnerPopup?: boolean
  winnerPopupData?: { winnerIds: number[]; winners: { id: number; name: string }[]; jackpot: number } | null
  isInWinnerTransition?: boolean
  soundEnabled?: boolean
}>()

const emit = defineEmits<{
  'buy-grid': [count: number]
  'close-winner-popup': []
  'update:sound-enabled': [value: boolean]
}>()

const gridPrice = computed(() => props.gridPrice ?? 50)

const soundEnabled = computed({
  get: () => props.soundEnabled ?? true,
  set: (v) => emit('update:sound-enabled', v),
})

function isNumberDrawn(num: number): boolean {
  return props.drawnBalls.includes(num)
}

function handleBuyGrid(count: number) {
  emit('buy-grid', count)
}

const isDrawnNumbersOpen = useStorage('bingo-accordion-open', true)

const currentBall = computed(() => {
  const balls = props.drawnBalls
  return balls.length > 0 ? balls[balls.length - 1] : null
})
const MAX_PREVIOUS_BALLS = 5
const MAX_PREVIOUS_BALLS_MOBILE = 4

function getTargetPreviousBalls(max: number): number[] {
  return props.drawnBalls.slice(0, -1).reverse().slice(0, max)
}

/** Boules affichées : retrait de l'ancienne avant ajout de la nouvelle (logique séparée mobile/desktop) */
const displayedBalls = ref<number[]>([])
const displayedBallsMobile = ref<number[]>([])
const pendingNewBall = ref<number | null>(null)
const pendingNewBallMobile = ref<number | null>(null)
const deferredTarget = ref<number[] | null>(null)
const deferredTargetMobile = ref<number[] | null>(null)

function syncDisplayedBalls(
  displayed: Ref<number[]>,
  pending: Ref<number | null>,
  deferred: Ref<number[] | null>,
  max: number
) {
  const target = deferred.value ?? getTargetPreviousBalls(max)
  deferred.value = null
  if (target.length === 0) {
    displayed.value = []
    pending.value = null
    return
  }
  const current = displayed.value
  const newBall = target[0]
  const isNewBallArrived = current.length > 0 && newBall !== current[0]
  const atCapacity = current.length >= max
  if (isNewBallArrived && atCapacity) {
    pending.value = newBall
    displayed.value = current.slice(0, -1)
  } else {
    displayed.value = target
    pending.value = null
  }
}

watch(
  () => props.drawnBalls,
  () => {
    const target = getTargetPreviousBalls(MAX_PREVIOUS_BALLS)
    const targetMobile = getTargetPreviousBalls(MAX_PREVIOUS_BALLS_MOBILE)
    if (pendingNewBall.value !== null) deferredTarget.value = target
    else syncDisplayedBalls(displayedBalls, pendingNewBall, deferredTarget, MAX_PREVIOUS_BALLS)
    if (pendingNewBallMobile.value !== null) deferredTargetMobile.value = targetMobile
    else syncDisplayedBalls(displayedBallsMobile, pendingNewBallMobile, deferredTargetMobile, MAX_PREVIOUS_BALLS_MOBILE)
  },
  { immediate: true }
)

function onPreviousBallLeave() {
  if (pendingNewBall.value !== null) {
    const toAdd = pendingNewBall.value
    pendingNewBall.value = null
    displayedBalls.value = [toAdd, ...displayedBalls.value]
    if (deferredTarget.value) syncDisplayedBalls(displayedBalls, pendingNewBall, deferredTarget, MAX_PREVIOUS_BALLS)
  }
}

function onPreviousBallLeaveMobile() {
  if (pendingNewBallMobile.value !== null) {
    const toAdd = pendingNewBallMobile.value
    pendingNewBallMobile.value = null
    displayedBallsMobile.value = [toAdd, ...displayedBallsMobile.value]
    if (deferredTargetMobile.value) syncDisplayedBalls(displayedBallsMobile, pendingNewBallMobile, deferredTargetMobile, MAX_PREVIOUS_BALLS_MOBILE)
  }
}

const previousBalls = computed(() => displayedBalls.value)
const previousBallsMobile = computed(() => displayedBallsMobile.value)

const winnerPopupData = computed(() => props.winnerPopupData ?? null)
const winnerPopupUsers = computed(() => {
  const w = winnerPopupData.value
  if (!w?.winnerIds?.length) return []
  const users = props.onlineUsers ?? []
  return w.winnerIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as BingoOnlineUser[]
})
const showWinnerPopup = computed(() => !!(props.showWinnerPopup && winnerPopupData.value?.winnerIds?.length))
const isInWinnerTransition = computed(() => props.isInWinnerTransition ?? false)

/** Remplissage automatique des cases (rond vert) ou manuel (clic du joueur) */
const autoFillEnabled = useStorage('bingo-auto-fill-enabled', true)
/** Musique de fond en boucle */
const musicEnabled = useStorage('bingo-music-enabled', false)
/** Numéros marqués manuellement quand autoFillEnabled est false */
const manuallyMarkedNumbers = ref<Set<number>>(new Set())

watch(() => props.currentRound?.id, () => {
  manuallyMarkedNumbers.value = new Set()
  displayedBalls.value = []
  displayedBallsMobile.value = []
  pendingNewBall.value = null
  pendingNewBallMobile.value = null
  deferredTarget.value = null
  deferredTargetMobile.value = null
})

watch(autoFillEnabled, (enabled) => {
  if (!enabled) {
    // En passant en manuel, garder les ronds verts déjà présents (numéros tirés)
    manuallyMarkedNumbers.value = new Set(props.drawnBalls)
  }
})

function getMusicVolume() {
  return soundEnabled.value && musicEnabled.value ? 0.3 : 0.5
}

watch(musicEnabled, (enabled) => {
  if (enabled) playBingoMusic(getMusicVolume())
  else stopBingoMusic()
}, { immediate: true })

watch([() => soundEnabled.value, musicEnabled], () => {
  if (musicEnabled.value) setBingoMusicVolume(getMusicVolume())
})

onUnmounted(stopBingoMusic)

function isCellMarked(num: number): boolean {
  if (autoFillEnabled.value) {
    return props.drawnBalls.includes(num)
  }
  return manuallyMarkedNumbers.value.has(num)
}

function toggleManualMark(num: number) {
  if (props.drawnBalls.includes(num)) {
    const next = new Set(manuallyMarkedNumbers.value)
    if (next.has(num)) next.delete(num)
    else next.add(num)
    manuallyMarkedNumbers.value = next
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Cagnotte et solde -->
    <div
      v-if="currentRound"
      class="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/5 border border-white/10 p-4"
    >
      <div class="flex items-center gap-2 text-2xl font-bold text-amber-400">
        Cagnotte : {{ currentRound.jackpot ?? 0 }}
        <JijiIcon size="md" />
      </div>
      <div class="flex items-center gap-2 text-white/80">
        <span>Solde :</span>
        <span class="font-semibold text-amber-400 flex items-center gap-1">{{ balance }} <JijiIcon size="sm" /></span>
      </div>
    </div>

    <!-- Popup gagnant -->
    <UModal
      :open="showWinnerPopup"
      :ui="{ wrapper: 'max-w-md' }"
      @update:open="(v: boolean) => !v && emit('close-winner-popup')"
    >
      <template #content>
        <div class="p-6 flex flex-col items-center gap-6">
          <div class="flex flex-col items-center gap-4">
            <div class="flex flex-wrap justify-center gap-4">
              <div
                v-for="winner in (winnerPopupData?.winners ?? [])"
                :key="winner.id"
                class="flex flex-col items-center gap-1"
              >
                <img
                  v-if="(winnerPopupUsers.find(u => u.id === winner.id) ?? null)?.avatarImage"
                  :src="getImageUrl(winnerPopupUsers.find(u => u.id === winner.id)!.avatarImage!)"
                  :alt="winner.name"
                  class="h-16 w-16 rounded-full border-2 border-amber-500/60 object-cover ring-2 ring-amber-400/40"
                >
                <div
                  v-else
                  class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-500/60 bg-amber-700/60 text-2xl font-bold text-amber-200 ring-2 ring-amber-400/40"
                >
                  {{ (winner.name ?? '?')[0] }}
                </div>
                <span class="text-sm font-medium text-amber-200 max-w-[100px] truncate">{{ winner.name }}</span>
              </div>
            </div>
            <div v-if="winnerPopupData" class="text-center">
              <p class="text-2xl font-bold text-amber-200">
                Pahina !
              </p>
              <p class="text-3xl font-bold text-amber-400 mt-2 flex items-center justify-center gap-2">
                {{ winnerPopupData.jackpot }} <JijiIcon size="lg" />
                <span v-if="(winnerPopupData.winners?.length ?? 0) > 1" class="text-lg font-normal text-amber-300/90">
                  (partagé)
                </span>
              </p>
            </div>
          </div>
          <div class="w-full flex justify-center">
            <UButton
              size="xl"
              color="primary"
              class="min-w-[200px]"
              @click="emit('close-winner-popup')"
            >
              OK
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Zone de tirage : zone principale, ne disparaît jamais -->
    <div
      v-if="currentRound"
      class="min-w-0 max-w-full w-full rounded-xl border-2 border-amber-600/50 bg-amber-950/40 p-4 overflow-hidden"
    >
      <!-- Mode tirage en cours ou transition gagnant : boules + accordéon -->
      <template v-if="currentRound.phase === 'drawing' || isInWinnerTransition">
        <!-- Mobile : 4 derniers numéros, boutons dans une card séparée -->
        <div class="flex flex-col gap-4 sm:hidden">
          <div class="flex items-center gap-3 min-h-[7rem]">
            <div
              v-if="currentBall"
              class="flex h-24 w-24 min-w-24 shrink-0 items-center justify-center rounded-full font-bold text-white text-2xl transition-colors duration-300"
              :class="COLUMN_COLORS[getLetterForNumber(currentBall)].ball"
            >
              {{ currentBall }}
            </div>
            <TransitionGroup
              v-if="drawnBalls.length > 0"
              name="ball-draw"
              tag="div"
              class="flex min-w-[12rem] flex-1 flex-nowrap items-center gap-2 overflow-hidden"
              @after-leave="onPreviousBallLeaveMobile"
            >
              <div
                v-for="ball in previousBallsMobile"
                :key="ball"
                class="flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white transition-all duration-300 ease-out"
                :class="COLUMN_COLORS[getLetterForNumber(ball)].ball"
              >
                {{ ball }}
              </div>
            </TransitionGroup>
            <div v-else class="flex-1" />
          </div>
          <div class="rounded-lg border border-amber-700/50 bg-amber-900/30 p-3 flex flex-wrap items-center justify-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Son</span>
              <USwitch v-model="soundEnabled" size="sm" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Musique</span>
              <USwitch v-model="musicEnabled" size="sm" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Remplissage auto</span>
              <USwitch v-model="autoFillEnabled" size="sm" />
            </div>
            <UButton
              variant="soft"
              size="sm"
              color="amber"
              :trailing-icon="isDrawnNumbersOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              @click="isDrawnNumbersOpen = !isDrawnNumbersOpen"
            >
              Voir tout le tirage
            </UButton>
          </div>
        </div>

        <!-- Desktop : layout original -->
        <div class="hidden sm:flex items-center gap-4 min-h-[7rem]">
          <div
            v-if="currentBall"
            class="flex h-24 w-24 min-w-24 shrink-0 items-center justify-center rounded-full font-bold text-white text-2xl transition-colors duration-300"
            :class="COLUMN_COLORS[getLetterForNumber(currentBall)].ball"
          >
            {{ currentBall }}
          </div>
          <TransitionGroup
            v-if="drawnBalls.length > 0"
            name="ball-draw"
            tag="div"
            class="flex min-w-[15rem] flex-1 flex-nowrap items-center gap-2 overflow-hidden"
            @after-leave="onPreviousBallLeave"
          >
            <div
              v-for="ball in previousBalls"
              :key="ball"
              class="flex h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white transition-all duration-300 ease-out"
              :class="COLUMN_COLORS[getLetterForNumber(ball)].ball"
            >
              {{ ball }}
            </div>
          </TransitionGroup>
          <div v-else class="flex-1" />
          <div class="flex shrink-0 flex-col items-center gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Son</span>
              <USwitch v-model="soundEnabled" size="sm" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Musique</span>
              <USwitch v-model="musicEnabled" size="sm" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Remplissage auto</span>
              <USwitch v-model="autoFillEnabled" size="sm" />
            </div>
            <UButton
              variant="soft"
              size="sm"
              color="amber"
              :trailing-icon="isDrawnNumbersOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              @click="isDrawnNumbersOpen = !isDrawnNumbersOpen"
            >
              Voir tout le tirage
            </UButton>
          </div>
        </div>
      </template>

      <!-- Mode entre parties / tirage fini : gagnant, boutons, countdown, messages -->
      <template v-else>
        <div class="flex min-h-[7rem] flex-col items-center justify-center gap-4 py-4">
          <!-- Gagnant + avatar ou cagnotte -->
          <div class="flex flex-col items-center gap-3">
            <template v-if="lastRoundWinner?.winnerIds?.length">
              <!-- Gagnant : rien à afficher -->
            </template>
            <template v-else-if="lastRoundWinner">
              <p class="text-lg font-semibold text-amber-300">
                Partie terminée sans gagnant (<span class="inline-flex items-center gap-1">{{ lastRoundWinner.jackpot }} <JijiIcon size="xs" /></span> reportés)
              </p>
            </template>
            <template v-else>
              <p class="text-lg font-semibold text-amber-300">
                Prochaine partie
              </p>
            </template>
          </div>

          <!-- Compte à rebours -->
          <div
            v-if="countdownSeconds !== null && canPurchase"
            class="text-center"
          >
            <p class="text-lg font-semibold text-amber-300">
              La partie va bientôt commencer.
            </p>
            <p class="text-lg font-semibold text-amber-300 mt-1">
              {{ countdownSeconds }}s
            </p>
          </div>

          <!-- Message pour le joueur -->
          <p
            v-if="purchasePhaseMessage"
            class="text-sm text-amber-200/90 text-center"
          >
            {{ purchasePhaseMessage }}
          </p>

          <!-- Switches (Son, Musique, Remplissage auto) en phase achat -->
          <div class="flex flex-wrap items-center justify-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Son</span>
              <USwitch v-model="soundEnabled" size="sm" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Musique</span>
              <USwitch v-model="musicEnabled" size="sm" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/80 whitespace-nowrap">Remplissage auto</span>
              <USwitch v-model="autoFillEnabled" size="sm" />
            </div>
          </div>

          <!-- Boutons acheter grilles : card séparée sur mobile -->
          <div
            v-if="canPurchase"
            class="w-full sm:w-auto rounded-lg border border-amber-700/50 bg-amber-900/30 p-4 sm:bg-transparent sm:border-0 sm:p-0"
          >
            <div class="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
              <UButton
                :loading="isPurchasing"
                :disabled="balance < gridPrice"
                color="primary"
                size="lg"
                class="w-full sm:w-auto"
                @click="handleBuyGrid(1)"
              >
                <JijiIcon size="sm" class="mr-1 inline" /> Acheter 1 grille ({{ gridPrice }} <JijiIcon size="xs" class="inline" />)
              </UButton>
              <UButton
                :loading="isPurchasing"
                :disabled="balance < gridPrice * 3"
                variant="outline"
                size="lg"
                class="w-full sm:w-auto"
                @click="handleBuyGrid(3)"
              >
                <JijiIcon size="sm" class="mr-1 inline" /> Acheter 3 grilles ({{ gridPrice * 3 }} <JijiIcon size="xs" class="inline" />)
              </UButton>
              <UButton
                :loading="isPurchasing"
                :disabled="balance < gridPrice * 5"
                variant="outline"
                size="lg"
                class="w-full sm:w-auto"
                @click="handleBuyGrid(5)"
              >
                <JijiIcon size="sm" class="mr-1 inline" /> Acheter 5 grilles ({{ gridPrice * 5 }} <JijiIcon size="xs" class="inline" />)
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <!-- Accordéon : grille complète des numéros tirés (visible en phase drawing ou transition) -->
      <div
        v-if="currentRound.phase === 'drawing' || isInWinnerTransition"
        class="overflow-hidden transition-all duration-200 ease-out"
        :class="isDrawnNumbersOpen ? 'max-h-[500px]' : 'max-h-0'"
      >
        <div class="p-3 overflow-x-auto border-t border-amber-700/50">
          <!-- Mobile : lettres en en-têtes, 5 colonnes -->
          <table class="w-full table-fixed border-collapse text-center min-w-0 banker-grid sm:hidden">
            <thead>
              <tr>
                <th
                  v-for="(letter, colIdx) in HEADERS"
                  :key="letter"
                  class="banker-header-mobile border border-amber-700/50 font-bold"
                  :class="COLUMN_COLORS[colIdx].header"
                >
                  {{ letter }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rowIdx in 15"
                :key="rowIdx"
                class="border-b border-amber-700/30 last:border-b-0"
              >
                <td
                  v-for="(letter, colIdx) in HEADERS"
                  :key="letter"
                  class="banker-cell-mobile border border-amber-700/40 text-xs font-medium transition-colors"
                  :class="
                    isNumberDrawn((colIdx * 15) + rowIdx)
                      ? [COLUMN_COLORS[colIdx].bg, 'text-amber-200/80']
                      : 'bg-gray-700/50 text-gray-500'
                  "
                >
                  {{ (colIdx * 15) + rowIdx }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Desktop : lettres en en-têtes de ligne, layout original -->
          <table class="w-full table-fixed border-collapse text-center min-w-0 banker-grid hidden sm:table">
            <tbody>
              <tr
                v-for="(letter, rowIdx) in HEADERS"
                :key="letter"
                class="border-b border-amber-700/30 last:border-b-0"
              >
                <th
                  class="banker-header border-r border-amber-700/50 font-bold shrink-0"
                  :class="COLUMN_COLORS[rowIdx].header"
                >
                  {{ letter }}
                </th>
                <td
                  v-for="n in 15"
                  :key="n"
                  class="banker-cell border border-amber-700/40 text-xs font-medium transition-colors"
                  :class="
                    isNumberDrawn((rowIdx * 15) + n)
                      ? [COLUMN_COLORS[rowIdx].bg, 'text-amber-200/80']
                      : 'bg-gray-700/50 text-gray-500'
                  "
                >
                  {{ (rowIdx * 15) + n }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Grilles du joueur (toutes affichées) -->
    <div v-if="userGrids.length > 0" class="flex flex-wrap gap-4">
      <div
        v-for="(grid, gridIdx) in userGrids"
        :key="grid.id"
        class="w-full sm:w-auto sm:shrink-0 rounded-xl border-2 border-amber-500 bg-amber-950/30 overflow-hidden transition-all"
      >
        <div class="px-3 pt-2 pb-1 text-xs font-semibold text-amber-300/80">
          Grille {{ gridIdx + 1 }}
        </div>
        <div class="p-3">
          <table class="w-full sm:w-auto table-fixed sm:table-auto border-collapse text-center">
            <thead>
              <tr>
                <th
                  v-for="(h, colIdx) in HEADERS"
                  :key="h"
                  class="w-[20%] sm:w-12 h-10 border border-amber-700/50 font-bold"
                  :class="COLUMN_COLORS[colIdx].header"
                >
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIdx) in 5" :key="rowIdx">
              <td
                v-for="(col, colIdx) in 5"
                :key="colIdx"
                class="relative w-[20%] sm:w-12 h-10 border border-amber-700/50 text-sm font-medium transition-colors"
                :class="[
                  COLUMN_COLORS[colIdx].bg,
                  'text-amber-100',
                  !autoFillEnabled &&
                    grid.numbers?.[colIdx]?.[rowIdx] != null &&
                    isNumberDrawn(grid.numbers[colIdx][rowIdx])
                    ? 'cursor-pointer hover:ring-2 hover:ring-amber-400/50'
                    : '',
                ]"
                @click="
                  !autoFillEnabled &&
                    grid.numbers?.[colIdx]?.[rowIdx] != null &&
                    toggleManualMark(grid.numbers[colIdx][rowIdx])
                "
              >
                <span class="relative z-10">{{ grid.numbers?.[colIdx]?.[rowIdx] ?? '' }}</span>
                <!-- Rond vert transparent type tampon pour les cases validées -->
                <div
                  v-if="
                    grid.numbers?.[colIdx]?.[rowIdx] != null &&
                    isCellMarked(grid.numbers[colIdx][rowIdx])
                  "
                  class="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span class="w-8 h-8 rounded-full bg-green-500/40 ring-2 ring-green-400/30" />
                </div>
              </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.ball-draw-enter-active,
.ball-draw-leave-active {
  transition: all 0.3s ease-out;
}
.ball-draw-leave-active {
  position: absolute;
}
.ball-draw-move {
  transition: transform 0.3s ease-out;
}
.ball-draw-enter-from {
  opacity: 0;
  transform: scale(0.3);
}
.ball-draw-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* Grille du banquier mobile : 5 colonnes, lettres en en-tête */
.banker-header-mobile {
  width: 20%;
  padding: 0.25rem;
  font-size: 0.75rem;
}
.banker-cell-mobile {
  width: 20%;
  padding: 0.2rem;
  font-size: 0.65rem;
}

/* Grille du banquier desktop : layout original */
.banker-header {
  width: 2.5rem;
  min-width: 2.5rem;
  height: 2rem;
}
.banker-cell {
  width: 2rem;
  min-width: 2rem;
  height: 2rem;
  font-size: 0.75rem;
}
</style>
