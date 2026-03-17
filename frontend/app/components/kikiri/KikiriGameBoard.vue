<script setup lang="ts">
import type { KikiriDraw, KikiriBetByUser, KikiriOnlineUser } from '~/composables/useKikiriSocket'
import tasseImg from '~/assets/images/tasse.png'
import pupuImg from '~/assets/images/pupu3D.png'
import tasPupuImg from '~/assets/images/tasPupu.png'

const props = defineProps<{
  draw: KikiriDraw | null
  canBet: boolean
  balance: number
  betAmounts: Record<number, number>
  isPlacing: boolean
  allBets?: Record<number, KikiriBetByUser[]>
  provisionalBetsByUser?: Record<number, Record<number, number>>
  onlineUsers?: KikiriOnlineUser[]
  currentUserId?: number | null
  isNewGame?: boolean
  hasSubmittedBets?: boolean
}>()

const emit = defineEmits<{
  'update:betAmounts': [Record<number, number>]
  'move': [{ from: number; to: number }]
  'betPreview': [{ delta: number; case: number }]
  'animations-complete': []
  'game-ready': []
}>()

const { getImageUrl } = useApi()

const betAmounts = computed({
  get: () => props.betAmounts,
  set: (v) => emit('update:betAmounts', v),
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const boardSurfaceClipPath = ref('')
const domeOffsetY = ref(0)
const domeOpacity = ref(1)
const isAnimating = ref(false)
const animationStartTime = ref(0)

type ResolutionPhase =
  | 'idle'
  | 'dice-reveal'
  | 'cup-lift'
  | 'lost-to-bank'
  | 'bank-to-win'
  | 'pile-visible'
  | 'to-balance'
  | 'cup-close'

const resolutionPhase = ref<ResolutionPhase>('idle')

const numbers = [1, 2, 3, 4, 5, 6]

const tasPupuImageRef = ref<HTMLImageElement | null>(null)

const isRevealed = computed(() => {
  if (!props.draw) return false
  return props.draw.status === 'revealing' || props.draw.status === 'resolved'
})

const bettingDice = ref<[number, number, number] | null>(null)

const dice = computed(() => {
  if (!props.draw) return [null, null, null]
  if (isRevealed.value) return [props.draw.dice1, props.draw.dice2, props.draw.dice3]
  if (bettingDice.value) return bettingDice.value
  return [null, null, null]
})

const winningCases = computed(() => {
  const d = props.draw
  if (!d?.dice1 || !d?.dice2 || !d?.dice3) return new Set<number>()
  return new Set([d.dice1, d.dice2, d.dice3])
})

const losingCases = computed(() =>
  numbers.filter((n) => !winningCases.value.has(n)),
)

function shouldHidePupusOnCase(caseNum: number): boolean {
  if (resolutionPhase.value === 'idle' || resolutionPhase.value === 'dice-reveal' || resolutionPhase.value === 'cup-lift') return false
  if (resolutionPhase.value === 'lost-to-bank' || resolutionPhase.value === 'bank-to-win' || resolutionPhase.value === 'pile-visible') {
    return losingCases.value.includes(caseNum)
  }
  if (resolutionPhase.value === 'to-balance' || resolutionPhase.value === 'cup-close') {
    return true
  }
  return false
}

interface FlyingPupu {
  id: string
  caseNum: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  isLost?: boolean
  index?: number
}

const flyingPupus = ref<FlyingPupu[]>([])
const flyingPupuProgress = ref(0)
const flyingPupuStartTime = ref(0)
const flyingPupuDelayPerUnit = ref(500)
const casesGridRef = ref<HTMLElement | null>(null)
const gameBoardWrapperRef = ref<HTMLElement | null>(null)
const balanceRef = ref<HTMLElement | null>(null)

function getBankPositions(containerRect: DOMRect) {
  const cw = containerRect.width
  const ch = containerRect.height
  const width = cw * 0.242
  const img = tasPupuImageRef.value
  const height = img ? (img.naturalHeight / img.naturalWidth) * width : width * 0.6
  const y = ch * 0.08
  const leftX = cw * 0.06
  const rightX = cw * 0.72 - 12
  return {
    left: { x: leftX + width / 2, y: y + height / 2 },
    right: { x: rightX + width / 2, y: y + height / 2 },
  }
}

function getBankForCase(caseNum: number): 'left' | 'right' {
  const col = (caseNum - 1) % 3
  return col < 2 ? 'left' : 'right'
}

function startLostToBankAnimation() {
  const container = containerRef.value
  const grid = casesGridRef.value
  if (!container || !grid) return

  const containerRect = container.getBoundingClientRect()
  const bankPos = getBankPositions(containerRect)
  const caseEls = grid.querySelectorAll<HTMLElement>('[data-case-num]')
  const toAdd: FlyingPupu[] = []
  let id = 0

  for (const caseNum of losingCases.value) {
    const totalLost = (betAmounts.value[caseNum] ?? 0) + (otherBetsByCase.value[caseNum] ?? []).reduce((s, b) => s + b.amount, 0)
    if (totalLost <= 0) continue

    const caseEl = caseEls[caseNum - 1]
    if (!caseEl) continue

    const caseRect = caseEl.getBoundingClientRect()
    const fromX = caseRect.left - containerRect.left + caseRect.width / 2
    const fromY = caseRect.top - containerRect.top + caseRect.height / 2
    const bank = getBankForCase(caseNum)
    const to = bankPos[bank]

    const count = Math.min(totalLost, 12)
    for (let i = 0; i < count; i++) {
      toAdd.push({
        id: `lost-${caseNum}-${id++}`,
        caseNum,
        fromX,
        fromY,
        toX: to.x,
        toY: to.y,
        isLost: true,
      })
    }
  }

  flyingPupus.value = toAdd
  flyingPupuProgress.value = 0

  const start = performance.now()
  function animate() {
    const elapsed = performance.now() - start
    const p = Math.min(elapsed / LOST_TO_BANK_DURATION_MS, 1)
    flyingPupuProgress.value = 1 - Math.pow(1 - p, 2)
    if (p < 1) requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}

function getWinAmountPerCase(): Record<number, number> {
  const d = props.draw
  if (!d?.dice1 || !d?.dice2 || !d?.dice3) return {}
  const dice = [d.dice1, d.dice2, d.dice3]
  const result: Record<number, number> = {}
  for (const num of winningCases.value) {
    const count = dice.filter((x) => x === num).length
    const multiplier = 1 + count
    const staked = betAmounts.value[num] ?? 0
    result[num] = Math.round((staked * multiplier - staked) * 100) / 100
  }
  return result
}

const PER_PUPU_DELAY_MS = 500
const PER_PUPU_DURATION_MS = 700
const BANK_TO_WIN_MAX_DURATION_MS = 7500
const LOST_TO_BANK_DURATION_MS = 900
const DOME_LIFT_DURATION_MS = 1100
const DOME_CLOSE_DURATION_MS = 800
const DOME_OPEN_DURATION_MS = 700
const CUP_SHAKE_DURATION_MS = 600
const TO_BALANCE_DURATION_MS = 950
const PILE_VISIBLE_PAUSE_MS = 500
const DICE_TO_CUP_LIFT_DELAY_MS = 300
const TO_BALANCE_TO_CUP_CLOSE_MS = 1200

function getFlyingPupuProgress(fp: FlyingPupu): number {
  const elapsed = performance.now() - flyingPupuStartTime.value
  const idx = fp.index ?? 0
  const startAt = idx * flyingPupuDelayPerUnit.value
  const p = Math.max(0, Math.min(1, (elapsed - startAt) / PER_PUPU_DURATION_MS))
  return p
}

const ARRIVED_THRESHOLD = 0.98

function hasFlyingPupuArrived(fp: FlyingPupu): boolean {
  return getFlyingPupuProgress(fp) >= ARRIVED_THRESHOLD
}

function getDisplayedPileCount(caseNum: number): number {
  if (resolutionPhase.value !== 'bank-to-win' && resolutionPhase.value !== 'pile-visible') {
    return betAmounts.value[caseNum] ?? 0
  }
  flyingPupuProgress.value
  const staked = betAmounts.value[caseNum] ?? 0
  const arrived = flyingPupus.value.filter((f) => f.caseNum === caseNum && hasFlyingPupuArrived(f)).length
  return staked + arrived
}

function startBankToWinAnimation(): number {
  const container = containerRef.value
  const grid = casesGridRef.value
  if (!container || !grid) return 0

  const winAmounts = getWinAmountPerCase()
  const totalWin = Object.values(winAmounts).reduce((a, b) => a + b, 0)
  if (totalWin <= 0) return 0

  const containerRect = container.getBoundingClientRect()
  const bankPos = getBankPositions(containerRect)
  const caseEls = grid.querySelectorAll<HTMLElement>('[data-case-num]')
  const toAdd: FlyingPupu[] = []
  let id = 0

  const leftBank = bankPos.left
  const rightBank = bankPos.right

  for (const caseNum of winningCases.value) {
    const amount = Math.round(winAmounts[caseNum] ?? 0)
    if (amount <= 0) continue

    const caseEl = caseEls[caseNum - 1]
    if (!caseEl) continue

    const caseRect = caseEl.getBoundingClientRect()
    const toX = caseRect.left - containerRect.left + caseRect.width / 2
    const toY = caseRect.top - containerRect.top + caseRect.height / 2
    const bank = getBankForCase(caseNum)
    const from = bank === 'left' ? leftBank : rightBank

    const count = Math.min(Math.max(amount, 1), 15)
    for (let i = 0; i < count; i++) {
      toAdd.push({
        id: `win-${caseNum}-${id}`,
        caseNum,
        fromX: from.x,
        fromY: from.y,
        toX,
        toY,
        index: id,
      })
      id++
    }
  }

  flyingPupus.value = toAdd
  flyingPupuProgress.value = 0
  flyingPupuStartTime.value = performance.now()

  const totalCount = toAdd.length
  const rawDuration = totalCount * PER_PUPU_DELAY_MS + PER_PUPU_DURATION_MS + 100
  const totalDuration = Math.min(rawDuration, BANK_TO_WIN_MAX_DURATION_MS)
  flyingPupuDelayPerUnit.value = totalCount > 0 ? Math.max(80, (totalDuration - PER_PUPU_DURATION_MS - 100) / totalCount) : PER_PUPU_DELAY_MS
  function animate() {
    const elapsed = performance.now() - flyingPupuStartTime.value
    flyingPupuProgress.value = elapsed
    if (elapsed < totalDuration) {
      requestAnimationFrame(animate)
    } else {
      flyingPupuProgress.value = totalDuration
    }
  }
  requestAnimationFrame(animate)
  return totalDuration
}

function startToBalanceAnimation() {
  const wrapper = gameBoardWrapperRef.value
  const grid = casesGridRef.value
  const balanceEl = balanceRef.value
  if (!wrapper || !grid || !balanceEl) {
    resolutionPhase.value = 'to-balance'
    return
  }

  const wrapperRect = wrapper.getBoundingClientRect()
  const balanceRect = balanceEl.getBoundingClientRect()
  const toX = balanceRect.left - wrapperRect.left + balanceRect.width / 2
  const toY = balanceRect.top - wrapperRect.top + balanceRect.height / 2

  const winAmounts = getWinAmountPerCase()
  const caseEls = grid.querySelectorAll<HTMLElement>('[data-case-num]')
  const toAdd: FlyingPupu[] = []
  let id = 0

  for (const caseNum of winningCases.value) {
    const staked = betAmounts.value[caseNum] ?? 0
    const won = Math.round(winAmounts[caseNum] ?? 0)
    const total = staked + won
    if (total <= 0) continue

    const caseEl = caseEls[caseNum - 1]
    if (!caseEl) continue

    const caseRect = caseEl.getBoundingClientRect()
    const fromX = caseRect.left - wrapperRect.left + caseRect.width / 2
    const fromY = caseRect.top - wrapperRect.top + caseRect.height / 2

    const count = Math.min(total, 12)
    for (let i = 0; i < count; i++) {
      toAdd.push({
        id: `tobal-${caseNum}-${id++}`,
        caseNum,
        fromX,
        fromY,
        toX,
        toY,
      })
    }
  }

  if (toAdd.length === 0) {
    resolutionPhase.value = 'to-balance'
    scheduleCupCloseAndEmit()
    return
  }

  resolutionPhase.value = 'to-balance'
  flyingPupus.value = toAdd
  flyingPupuProgress.value = 0
  flyingPupuStartTime.value = performance.now()

  const start = performance.now()
  function animate() {
    const elapsed = performance.now() - start
    const p = Math.min(elapsed / TO_BALANCE_DURATION_MS, 1)
    flyingPupuProgress.value = 1 - Math.pow(1 - p, 2)
    if (p < 1) requestAnimationFrame(animate)
    else {
      flyingPupus.value = []
      scheduleCupCloseAndEmit()
    }
  }
  requestAnimationFrame(animate)
}

function scheduleCupCloseAndEmit() {
  if (cupCloseScheduled.value) return
  cupCloseScheduled.value = true
  emit('animations-complete')
  setTimeout(() => {
    resolutionPhase.value = 'cup-close'
  }, TO_BALANCE_TO_CUP_CLOSE_MS)
}

const totalBetAmount = computed(() => {
  return numbers.reduce((a, n) => a + (betAmounts.value[n] || 0), 0)
})

const displayedBalance = computed(() => {
  const bal = Math.round(props.balance)
  if (
    props.hasSubmittedBets ||
    props.draw?.status === 'revealing' ||
    props.draw?.status === 'resolved'
  ) {
    return Math.max(0, bal)
  }
  return Math.max(0, bal - totalBetAmount.value)
})

const addBet = (num: number) => {
  if (!props.canBet || props.isPlacing) return
  const total = totalBetAmount.value
  if (total >= Math.round(props.balance)) return
  const current = betAmounts.value[num] || 0
  betAmounts.value = { ...betAmounts.value, [num]: current + 1 }
}

const removeBet = (num: number) => {
  if (!props.canBet || props.isPlacing) return
  const current = betAmounts.value[num] || 0
  if (current <= 0) return
  betAmounts.value = { ...betAmounts.value, [num]: current - 1 }
}

function clearAllBets() {
  if (!props.canBet || props.isPlacing) return
  betAmounts.value = {}
}

// Other players' bets per case (exclude current user), merged with provisional previews
const otherBetsByCase = computed(() => {
  const all = props.allBets ?? {}
  const provisional = props.provisionalBetsByUser ?? {}
  const onlineUsers = props.onlineUsers ?? []
  const uid = props.currentUserId
  const result: Record<number, KikiriBetByUser[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  const userById = Object.fromEntries(onlineUsers.map((u) => [u.id, u]))
  for (let num = 1; num <= 6; num++) {
    const bets = (all[num] ?? []).filter((b) => b.userId !== uid)
    const byUser = new Map<number, KikiriBetByUser>()
    for (const b of bets) {
      if (b.amount > 0) {
        byUser.set(b.userId, { ...b })
      }
    }
    for (const [userId, userProvisional] of Object.entries(provisional)) {
      const id = Number(userId)
      if (id === uid) continue
      const delta = userProvisional[num] ?? 0
      if (delta <= 0) continue
      const existing = byUser.get(id)
      if (existing) continue
      const user = userById[id]
      byUser.set(id, {
        userId: id,
        amount: delta,
        user: user ? { id, firstName: user.firstName, avatarImage: user.avatarImage } : { id, firstName: null, avatarImage: null },
      })
    }
    result[num] = Array.from(byUser.values())
  }
  return result
})

// Répartition des autres joueurs dans les 4 coins (max 2 par coin = 8 joueurs)
function getOtherBetsByCorner(caseNum: number): { topLeft: KikiriBetByUser[]; topRight: KikiriBetByUser[]; bottomLeft: KikiriBetByUser[]; bottomRight: KikiriBetByUser[] } {
  const bets = (otherBetsByCase.value[caseNum] ?? []).slice(0, 8)
  const corners = { topLeft: [] as KikiriBetByUser[], topRight: [] as KikiriBetByUser[], bottomLeft: [] as KikiriBetByUser[], bottomRight: [] as KikiriBetByUser[] }
  const keys = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const
  bets.forEach((b, i) => {
    const corner = keys[i % 4]
    if (corners[corner].length < 2) corners[corner].push(b)
  })
  return corners
}

// Drag & drop
const DRAG_TYPE = 'application/x-kikiri-pupu'
const dragSource = ref<{ source: 'balance' | 'cell'; num?: number } | null>(null)
const dragOverCell = ref<number | null>(null)
const dragOverBalance = ref(false)

function getDragData(source: 'balance' | 'cell', num?: number): string {
  return JSON.stringify({ source, num })
}

function parseDragData(data: string): { source: 'balance' | 'cell'; num?: number } | null {
  try {
    return JSON.parse(data) as { source: 'balance' | 'cell'; num?: number }
  } catch {
    return null
  }
}

function isCellValidDropTarget(cellNum: number): boolean {
  const src = dragSource.value
  if (!src) return false
  if (src.source === 'balance') return displayedBalance.value > 0
  if (src.source === 'cell' && src.num != null) return src.num !== cellNum
  return false
}

function onBalanceDragStart(e: DragEvent) {
  if (!props.canBet || props.isPlacing || displayedBalance.value <= 0) {
    e.preventDefault()
    return
  }
  dragSource.value = { source: 'balance' }
  e.dataTransfer?.setData(DRAG_TYPE, getDragData('balance'))
  e.dataTransfer!.effectAllowed = 'move'
}

function onCellDragStart(e: DragEvent, num: number) {
  if (!props.canBet || props.isPlacing || (betAmounts.value[num] ?? 0) <= 0) {
    e.preventDefault()
    return
  }
  dragSource.value = { source: 'cell', num }
  e.dataTransfer?.setData(DRAG_TYPE, getDragData('cell', num))
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragEnd() {
  dragSource.value = null
  dragOverCell.value = null
  dragOverBalance.value = false
}

function onCellDragOver(e: DragEvent, num: number) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dragOverCell.value = isCellValidDropTarget(num) ? num : null
}

function onCellDragLeave(e: DragEvent) {
  const cell = (e.currentTarget as HTMLElement)
  const related = e.relatedTarget as Node | null
  if (!related || !cell.contains(related)) {
    dragOverCell.value = null
  }
}

function onBalanceDragOver(e: DragEvent) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  const src = dragSource.value
  if (src?.source === 'cell' && src.num != null) {
    dragOverBalance.value = true
  }
}

function onBalanceDragLeave(e: DragEvent) {
  const el = e.currentTarget as HTMLElement
  const related = e.relatedTarget as Node | null
  if (!related || !el.contains(related)) {
    dragOverBalance.value = false
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
}

function onBalanceDrop(e: DragEvent) {
  e.preventDefault()
  dragOverBalance.value = false
  const src = dragSource.value
  if (!src || src.source !== 'cell' || src.num == null) return
  removeBet(src.num)
  emit('betPreview', { delta: -1, case: src.num })
}

function onCellDrop(e: DragEvent, targetNum: number) {
  e.preventDefault()
  dragOverCell.value = null
  const src = dragSource.value
  if (!src) return
  if (src.source === 'balance') {
    addBet(targetNum)
    emit('betPreview', { delta: 1, case: targetNum })
  } else if (src.source === 'cell' && src.num != null && src.num !== targetNum) {
    const from = src.num
    const to = targetNum
    const next = { ...betAmounts.value }
    next[from] = Math.max(0, (next[from] ?? 0) - 1)
    next[to] = (next[to] ?? 0) + 1
    betAmounts.value = next
    emit('move', { from, to })
    emit('betPreview', { delta: -1, case: from })
    emit('betPreview', { delta: 1, case: to })
  }
}

// Chevauchement fixe 50% : chaque pupu superpose le précédent de 50%
// Pour obtenir ça en flex, chaque item i doit être décalé de i*50% vers la gauche
function getPupuStackItemTransform(itemIndex: number): string {
  if (itemIndex === 0) return 'none'
  return `translateX(-${itemIndex * 50}%)`
}

// Dé standard : opposés 1-6, 2-5, 3-4. 3 faces visibles = top, front, right (toutes adjacentes)
const DICE_3D_FACES: Record<number, { top: number; front: number; right: number }> = {
  1: { top: 1, front: 2, right: 3 },
  2: { top: 2, front: 6, right: 3 },
  3: { top: 3, front: 1, right: 2 },
  4: { top: 4, front: 1, right: 5 },
  5: { top: 5, front: 1, right: 4 },
  6: { top: 6, front: 2, right: 3 },
}

const DICE_PATTERNS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.25, 0.5], [0.25, 0.8], [0.75, 0.2], [0.75, 0.5], [0.75, 0.8]],
}

function drawDotsOnQuad(
  ctx: CanvasRenderingContext2D,
  corners: [number, number][],
  value: number,
  dotR: number,
) {
  const pattern = DICE_PATTERNS[value]
  if (!pattern) return
  ctx.fillStyle = '#1a1a1a'
  for (const [u, v] of pattern) {
    const x = corners[0][0] * (1 - u) * (1 - v) + corners[1][0] * u * (1 - v) + corners[2][0] * u * v + corners[3][0] * (1 - u) * v
    const y = corners[0][1] * (1 - u) * (1 - v) + corners[1][1] * u * (1 - v) + corners[2][1] * u * v + corners[3][1] * (1 - u) * v
    ctx.beginPath()
    ctx.arc(x, y, dotR, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawDice(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, value: number | null) {
  const s = size * 0.45
  const dotR = s * 0.1
  const cos30 = 0.866
  const sin30 = 0.5

  const faces = value !== null && value >= 1 && value <= 6
    ? DICE_3D_FACES[value]
    : { top: 1, front: 2, right: 3 }

  const topFace: [number, number][] = [
    [cx, cy - s],
    [cx + s * cos30, cy - s * sin30],
    [cx, cy],
    [cx - s * cos30, cy - s * sin30],
  ]
  const frontFace: [number, number][] = [
    [cx - s * cos30, cy - s * sin30],
    [cx, cy],
    [cx, cy + s],
    [cx - s * cos30, cy + s * sin30],
  ]
  const rightFace: [number, number][] = [
    [cx, cy],
    [cx + s * cos30, cy - s * sin30],
    [cx + s * cos30, cy + s * sin30],
    [cx, cy + s],
  ]

  ctx.strokeStyle = 'rgba(180,180,180,0.6)'
  ctx.lineWidth = 1.5

  ctx.fillStyle = 'rgb(240,240,240)'
  ctx.beginPath()
  ctx.moveTo(...rightFace[0])
  rightFace.forEach((p, i) => i > 0 && ctx.lineTo(...p))
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  drawDotsOnQuad(ctx, rightFace, faces.right, dotR)

  ctx.fillStyle = 'rgb(230,230,230)'
  ctx.beginPath()
  ctx.moveTo(...frontFace[0])
  frontFace.forEach((p, i) => i > 0 && ctx.lineTo(...p))
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  drawDotsOnQuad(ctx, frontFace, faces.front, dotR)

  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(...topFace[0])
  topFace.forEach((p, i) => i > 0 && ctx.lineTo(...p))
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  if (value !== null && value >= 1 && value <= 6) {
    drawDotsOnQuad(ctx, topFace, faces.top, dotR)
  } else {
    ctx.fillStyle = 'rgba(80,80,80,0.6)'
    ctx.font = `bold ${s * 0.9}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', cx, cy - s * 0.5)
  }
}

function drawBankPupuPiles(ctx: CanvasRenderingContext2D, cw: number, ch: number, img: HTMLImageElement | null) {
  if (!img || !img.complete || img.naturalWidth === 0) return

  const width = cw * 0.242
  const height = (img.naturalHeight / img.naturalWidth) * width
  const y = ch * 0.08
  const leftX = cw * 0.06
  const rightX = cw * 0.72 - 12

  ctx.drawImage(img, leftX, y, width, height)
  ctx.save()
  ctx.translate(rightX + width, y)
  ctx.scale(-1, 1)
  ctx.drawImage(img, 0, 0, width, height)
  ctx.restore()
}

// Perspective simulée : plateau en trapèze (haut plus étroit = vue de dessus)
const PERSPECTIVE_INSET = 0.08 // rétrécissement du haut par rapport au bas
const BOARD_EDGE = 8 // marge du plateau
const BOARD_CASE_MARGIN = 12 // marge entre les bordures des cases et le bord du plateau

function getBoardTrapezoid(cw: number, ch: number): [number, number][] {
  const inset = cw * PERSPECTIVE_INSET
  return [
    [inset, BOARD_EDGE],
    [cw - inset, BOARD_EDGE],
    [cw - BOARD_EDGE, ch - BOARD_EDGE],
    [BOARD_EDGE, ch - BOARD_EDGE],
  ]
}

function getBoardClipPath(cw: number, ch: number): string {
  const corners = getBoardTrapezoid(cw, ch)
  const pts = corners.map(([x, y]) => `${(x / cw) * 100}% ${(y / ch) * 100}%`)
  return `polygon(${pts.join(', ')})`
}

function getCaseTrapezoid(cw: number, ch: number, col: number, row: number): [number, number][] {
  const caseTopY = ch * 0.5 + 4
  const caseBottomY = ch - BOARD_EDGE - BOARD_CASE_MARGIN
  const rowHeight = (caseBottomY - caseTopY) / 2
  const gap = 8
  const y0 = caseTopY + row * (rowHeight + gap / 2)
  const y1 = y0 + rowHeight

  const rangeY = ch - 16
  const topInset = cw * PERSPECTIVE_INSET * (1 - (y0 - BOARD_EDGE) / rangeY)
  const bottomInset = cw * PERSPECTIVE_INSET * (1 - (y1 - BOARD_EDGE) / rangeY)

  const topWidth = cw - 2 * topInset - 2 * BOARD_EDGE - 2 * BOARD_CASE_MARGIN
  const bottomWidth = cw - 2 * bottomInset - 2 * BOARD_EDGE - 2 * BOARD_CASE_MARGIN
  const colWidthTop = (topWidth - gap * 2) / 3
  const colWidthBottom = (bottomWidth - gap * 2) / 3

  const x0Top = BOARD_EDGE + BOARD_CASE_MARGIN + topInset + col * (colWidthTop + gap)
  const x1Top = x0Top + colWidthTop
  const x0Bottom = BOARD_EDGE + BOARD_CASE_MARGIN + bottomInset + col * (colWidthBottom + gap)
  const x1Bottom = x0Bottom + colWidthBottom

  return [
    [x0Top, y0],
    [x1Top, y0],
    [x1Bottom, y1],
    [x0Bottom, y1],
  ]
}

function drawTrapezoid(ctx: CanvasRenderingContext2D, corners: [number, number][], fill: string, stroke: string) {
  ctx.beginPath()
  ctx.moveTo(corners[0][0], corners[0][1])
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i][0], corners[i][1])
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawBoard(ctx: CanvasRenderingContext2D, cw: number, ch: number, highlightedCase: number | null) {
  ctx.clearRect(0, 0, cw, ch)
  ctx.fillStyle = 'rgba(25, 30, 25, 0.5)'
  ctx.fillRect(0, 0, cw, ch)

  const boardCorners = getBoardTrapezoid(cw, ch)
  ctx.beginPath()
  ctx.moveTo(boardCorners[0][0], boardCorners[0][1])
  for (let i = 1; i < boardCorners.length; i++) {
    ctx.lineTo(boardCorners[i][0], boardCorners[i][1])
  }
  ctx.closePath()
  /* Légère teinte pour harmoniser avec le bois, laissant la texture visible */
  ctx.fillStyle = 'rgba(40, 28, 18, 0.15)'
  ctx.fill()
  /* Cadre bois : bordure épaisse style chant de planche */
  ctx.strokeStyle = 'rgba(45, 30, 18, 0.9)'
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.strokeStyle = 'rgba(120, 85, 50, 0.7)'
  ctx.lineWidth = 3
  ctx.stroke()

  drawBankPupuPiles(ctx, cw, ch, tasPupuImageRef.value)

  const domeCenterX = cw / 2
  const domeCenterY = ch * 0.15 + 45
  const diceSize = Math.min(cw, ch) * 0.18
  const diceGap = diceSize * -0.12

  const totalDiceWidth = diceSize * 3 + diceGap * 2
  const diceStartX = domeCenterX - totalDiceWidth / 2 + diceSize / 2 + diceGap / 2

  const shouldDrawDice = isRevealed.value || (props.draw?.status === 'betting' && bettingDice.value)
  if (shouldDrawDice) {
    for (let i = 0; i < 3; i++) {
      const dcx = diceStartX + i * (diceSize + diceGap)
      drawDice(ctx, dcx, domeCenterY, diceSize, dice.value[i] ?? null)
    }
  }

  for (let num = 1; num <= 6; num++) {
    const col = (num - 1) % 3
    const row = Math.floor((num - 1) / 3)
    const corners = getCaseTrapezoid(cw, ch, col, row)
    const isHighlighted = highlightedCase === num
    /* Cases gravées : fond légèrement plus sombre (creux), bordure bois */
    const fill = isHighlighted
      ? 'rgba(251, 191, 36, 0.22)'
      : 'rgba(30, 22, 14, 0.35)'
    const stroke = isHighlighted
      ? 'rgba(251, 191, 36, 0.85)'
      : 'rgba(70, 50, 30, 0.6)'
    drawTrapezoid(ctx, corners, fill, stroke)
  }

  drawCaseNumbers(ctx, cw, ch)
}

function drawCaseNumbers(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  const fontSize = Math.min(cw, ch) * 0.14
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const depthColor = 'rgba(35, 25, 18, 0.9)'
  const mainColor = 'rgba(100, 75, 50, 0.95)'
  const edgeColor = 'rgba(140, 105, 70, 0.4)'

  for (let num = 1; num <= 6; num++) {
    const col = (num - 1) % 3
    const row = Math.floor((num - 1) / 3)
    const corners = getCaseTrapezoid(cw, ch, col, row)
    const cx = (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4
    const cy = (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4

    ctx.fillStyle = edgeColor
    ctx.fillText(String(num), cx - 1, cy - 1)
    ctx.fillStyle = depthColor
    ctx.fillText(String(num), cx + 1, cy + 1)
    ctx.fillStyle = mainColor
    ctx.fillText(String(num), cx, cy)
  }
}

const cupClosing = ref(false)
const cupCloseScheduled = ref(false)
const cupOpening = ref(false)
const cupShaking = ref(false)
const domeShakeX = ref(0)

function animateDomeLift() {
  if (!isAnimating.value) return
  const elapsed = performance.now() - animationStartTime.value
  const progress = Math.min(elapsed / DOME_LIFT_DURATION_MS, 1)
  const easeOut = 1 - Math.pow(1 - progress, 2)

  domeOffsetY.value = -120 * easeOut
  domeOpacity.value = 1 - easeOut

  if (progress < 1) {
    requestAnimationFrame(animateDomeLift)
  } else {
    isAnimating.value = false
    resolutionPhase.value = 'lost-to-bank'
    nextTick(() => runResolutionPhases())
  }
  draw()
}

function animateDomeClose() {
  if (!cupClosing.value) return
  const elapsed = performance.now() - animationStartTime.value
  const progress = Math.min(elapsed / DOME_CLOSE_DURATION_MS, 1)
  const easeIn = Math.pow(progress, 2)

  domeOffsetY.value = -120 * easeIn
  domeOpacity.value = 1 - easeIn

  if (progress < 1) {
    requestAnimationFrame(animateDomeClose)
  } else {
    cupClosing.value = false
    domeOffsetY.value = -120
    domeOpacity.value = 0
  }
  draw()
}

function animateDomeOpen() {
  if (!cupOpening.value) return
  const elapsed = performance.now() - animationStartTime.value
  const progress = Math.min(elapsed / DOME_OPEN_DURATION_MS, 1)
  const easeOut = 1 - Math.pow(1 - progress, 2)

  domeOffsetY.value = -120 + 120 * easeOut
  domeOpacity.value = easeOut

  if (progress < 1) {
    requestAnimationFrame(animateDomeOpen)
  } else {
    cupOpening.value = false
    domeOffsetY.value = 0
    domeOpacity.value = 1
    startCupShake()
  }
  draw()
}

function playBipSound() {
  try {
    const audio = new Audio('/BIP.wav')
    audio.volume = 0.7
    audio.play().catch(() => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)
      } catch {}
    })
  } catch {}
}

function startCupShake() {
  cupShaking.value = true
  domeShakeX.value = 0
  animationStartTime.value = performance.now()
  playBipSound()
  requestAnimationFrame(animateCupShake)
}

function animateCupShake() {
  if (!cupShaking.value) return
  const elapsed = performance.now() - animationStartTime.value
  const progress = Math.min(elapsed / CUP_SHAKE_DURATION_MS, 1)
  const shakeAmount = 8
  const decay = 1 - progress
  domeShakeX.value = Math.sin(elapsed * 0.03) * shakeAmount * decay

  if (progress < 1) {
    requestAnimationFrame(animateCupShake)
  } else {
    cupShaking.value = false
    domeShakeX.value = 0
    bettingDice.value = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ]
    emit('game-ready')
  }
  draw()
}

function runResolutionPhases() {
  if (resolutionPhase.value === 'lost-to-bank') {
    startLostToBankAnimation()
    setTimeout(() => {
      flyingPupus.value = []
      resolutionPhase.value = 'bank-to-win'
      nextTick(() => {
        const bankToWinDuration = startBankToWinAnimation()
        const delay = Math.max(bankToWinDuration + 50, 100)
        setTimeout(() => {
          resolutionPhase.value = 'pile-visible'
          setTimeout(() => {
            flyingPupus.value = []
            nextTick(() => startToBalanceAnimation())
          }, PILE_VISIBLE_PAUSE_MS)
        }, delay)
      })
    }, LOST_TO_BANK_DURATION_MS)
  }
}

function draw() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const rect = container.getBoundingClientRect()
  boardSurfaceClipPath.value = getBoardClipPath(rect.width, rect.height)
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  drawBoard(ctx, rect.width, rect.height, dragOverCell.value)
}

watch([() => props.draw, dice, domeOffsetY, domeOpacity, domeShakeX, tasPupuImageRef, dragOverCell, resolutionPhase], () => {
  draw()
}, { deep: true })

watch(() => props.draw?.status, (status) => {
  if (!props.draw) {
    domeOffsetY.value = 0
    domeOpacity.value = 1
    domeShakeX.value = 0
    isAnimating.value = false
    cupClosing.value = false
    cupCloseScheduled.value = false
    cupOpening.value = false
    cupShaking.value = false
    bettingDice.value = null
    resolutionPhase.value = 'idle'
    flyingPupus.value = []
  } else if (status === 'betting') {
    isAnimating.value = false
    cupClosing.value = false
    cupCloseScheduled.value = false
    cupShaking.value = false
    domeShakeX.value = 0
    resolutionPhase.value = 'idle'
    flyingPupus.value = []
    if (props.isNewGame) {
      bettingDice.value = null
      cupOpening.value = true
      domeOffsetY.value = -120
      domeOpacity.value = 0
      animationStartTime.value = performance.now()
      requestAnimationFrame(animateDomeOpen)
    } else {
      bettingDice.value = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]
      cupOpening.value = false
      domeOffsetY.value = 0
      domeOpacity.value = 1
      emit('game-ready')
    }
  } else if (status === 'revealing' && resolutionPhase.value === 'idle') {
    cupOpening.value = false
    cupShaking.value = false
    domeShakeX.value = 0
    bettingDice.value = null
    domeOffsetY.value = 0
    domeOpacity.value = 1
    isAnimating.value = true
    resolutionPhase.value = 'dice-reveal'
    setTimeout(() => {
      resolutionPhase.value = 'cup-lift'
      animationStartTime.value = performance.now()
      requestAnimationFrame(animateDomeLift)
    }, DICE_TO_CUP_LIFT_DELAY_MS)
  } else if (status === 'resolved' && resolutionPhase.value !== 'cup-close') {
    const phase = resolutionPhase.value
    if (phase === 'to-balance') {
      scheduleCupCloseAndEmit()
    }
  }
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const img = new Image()
  img.onload = () => {
    tasPupuImageRef.value = img
    draw()
  }
  img.src = tasPupuImg

  draw()
  resizeObserver = new ResizeObserver(() => draw())
  if (containerRef.value) resizeObserver.observe(containerRef.value)
})

onUnmounted(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value)
    resizeObserver = null
  }
})
</script>

<template>
  <div ref="gameBoardWrapperRef" class="relative w-full space-y-4">
    <div ref="containerRef" class="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black/30">
      <div class="kikiri-perspective-container">
        <div class="kikiri-board-3d">
          <div
            class="kikiri-board-surface pointer-events-none"
            aria-hidden="true"
            :style="{ clipPath: boardSurfaceClipPath }"
          />
          <canvas
            ref="canvasRef"
            class="block w-full h-full relative z-[1] pointer-events-none"
          />
          <div
            v-show="!isRevealed || isAnimating || cupClosing || cupOpening || cupShaking"
            class="absolute pointer-events-none transition-none z-10"
            :style="{
              left: '50%',
              top: '10px',
              width: '40%',
              transform: `translate(calc(-50% + ${domeShakeX}px), ${domeOffsetY}px)`,
              opacity: domeOpacity,
            }"
          >
            <img :src="tasseImg" alt="" class="w-full h-auto block" />
          </div>
          <!-- Cases : drag & drop -->
          <div class="absolute bottom-0 left-0 right-0 h-1/2 z-[2]">
            <div ref="casesGridRef" class="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 px-6 py-4 kikiri-cases-grid">
              <div
                v-for="num in numbers"
                :key="num"
                :data-case-num="num"
                class="relative flex flex-col items-center justify-center rounded-xl p-1 min-h-[60px] kikiri-cell-transparent"
                :class="{
                  'cursor-pointer': canBet && !isPlacing,
                  'kikiri-case-top-row': num <= 3,
                }"
                @dragover="onCellDragOver($event, num)"
                @dragleave="onCellDragLeave"
                @drop="onCellDrop($event, num)"
              >
                <!-- Other players' bets : 4 coins (top-left, top-right, bottom-left, bottom-right), max 2 joueurs par coin -->
                <template v-if="(otherBetsByCase[num] ?? []).length > 0 && !shouldHidePupusOnCase(num)">
                  <div
                    v-for="(players, corner) in getOtherBetsByCorner(num)"
                    :key="`${num}-${corner}`"
                    v-show="players.length > 0"
                    class="absolute flex flex-col gap-0.5 pointer-events-none"
                    :class="{
                      'left-1 top-1': corner === 'topLeft',
                      'right-1 top-1': corner === 'topRight',
                      'left-1 bottom-1': corner === 'bottomLeft',
                      'right-1 bottom-1': corner === 'bottomRight',
                    }"
                  >
                    <div
                      v-for="b in players"
                      :key="`${num}-${corner}-${b.userId}`"
                      class="flex items-center gap-1"
                      :class="corner.startsWith('right') ? 'flex-row-reverse' : ''"
                    >
                      <img
                        v-if="b.user?.avatarImage"
                        :src="getImageUrl(b.user.avatarImage)"
                        :alt="b.user.firstName ?? ''"
                        class="w-[30px] h-[30px] rounded-full border border-amber-800 object-cover flex-shrink-0"
                      />
                      <div
                        v-else
                        class="w-[30px] h-[30px] rounded-full border border-amber-800 bg-amber-700/60 flex items-center justify-center text-xs font-bold text-amber-200 flex-shrink-0"
                      >
                        {{ (b.user?.firstName ?? '?')[0] }}
                      </div>
                      <div class="flex items-center pupu-stack kikiri-pupu-3d-on-board opacity-60 grayscale" :class="corner.startsWith('right') ? 'flex-row-reverse' : ''">
                        <template v-if="b.amount > 5">
                          <span class="text-xs font-bold text-amber-200/70">{{ b.amount }}</span>
                          <img :src="pupuImg" alt="" class="w-6 h-6" />
                        </template>
                        <template v-else>
                          <div
                            v-for="(_, i) in b.amount"
                            :key="i"
                            class="pupu-stack-item"
                            :style="{ transform: getPupuStackItemTransform(i) }"
                          >
                            <img :src="pupuImg" alt="" class="w-6 h-6 flex-shrink-0" />
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </template>
                <!-- User's pupu (center) - 3D sur le plateau -->
                <div
                  v-show="!shouldHidePupusOnCase(num)"
                  class="flex items-center justify-center pupu-stack kikiri-pupu-3d-on-board"
                >
                  <template v-if="getDisplayedPileCount(num) > 5">
                    <span class="text-xl font-bold text-amber-100">{{ getDisplayedPileCount(num) }}</span>
                    <img
                      :src="pupuImg"
                      alt=""
                      class="w-[3.75rem] h-[3.75rem] flex-shrink-0 select-none"
                      :class="canBet && !isPlacing && (betAmounts[num] || 0) > 0 ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'"
                      :draggable="!!(canBet && !isPlacing && (betAmounts[num] || 0) > 0)"
                      @dragstart="onCellDragStart($event, num)"
                      @dragend="onDragEnd"
                    />
                  </template>
                  <template v-else>
                    <div
                      v-for="(_, i) in getDisplayedPileCount(num)"
                      :key="`${num}-${i}`"
                      class="pupu-stack-item"
                      :style="{ transform: getPupuStackItemTransform(i) }"
                    >
                      <img
                        :src="pupuImg"
                        alt=""
                        class="w-9 h-9 select-none flex-shrink-0"
                        :class="canBet && !isPlacing ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'"
                        :draggable="!!(canBet && !isPlacing)"
                        @dragstart="onCellDragStart($event, num)"
                        @dragend="onDragEnd"
                      />
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Flying pupus (lost to bank, bank to winning, to balance) - au niveau wrapper pour couvrir plateau + solde -->
    <div
      v-if="flyingPupus.length > 0"
      class="absolute inset-0 z-[15] pointer-events-none"
    >
      <div
        v-for="fp in flyingPupus.filter((f) => f.index == null || !hasFlyingPupuArrived(f))"
        :key="fp.id"
        class="absolute w-9 h-9 kikiri-pupu-3d-on-board"
        :style="{
          left: (fp.fromX + (fp.toX - fp.fromX) * (fp.index != null ? getFlyingPupuProgress(fp) : flyingPupuProgress)) + 'px',
          top: (fp.fromY + (fp.toY - fp.fromY) * (fp.index != null ? getFlyingPupuProgress(fp) : flyingPupuProgress)) + 'px',
          transform: 'translate(-50%, -50%)',
        }"
      >
        <img :src="pupuImg" alt="" class="w-full h-full" />
      </div>
    </div>

    <!-- Section solde (sous le plateau) : drag source + drop zone + bouton retirer tout -->
    <div
      ref="balanceRef"
      class="flex items-center justify-between gap-4 px-6 py-4 rounded-xl border-2 border-blue-700/50 bg-blue-900/30 transition-all duration-150 w-full"
      :class="[
        canBet && !isPlacing && displayedBalance > 0 ? 'hover:border-blue-600/60' : '',
        dragOverBalance ? 'kikiri-balance-drop-target' : '',
      ]"
      @dragover="onBalanceDragOver"
      @dragleave="onBalanceDragLeave"
      @drop="onBalanceDrop"
    >
      <div class="flex items-center justify-center gap-4 flex-1">
      <span class="text-xl font-bold text-blue-100">Mon solde :</span>
      <div
        class="pupu-stack flex items-center"
        :class="canBet && !isPlacing && displayedBalance > 0 ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'"
        :draggable="!!(canBet && !isPlacing && displayedBalance > 0)"
        @dragstart="onBalanceDragStart"
        @dragend="onDragEnd"
      >
        <template v-if="displayedBalance > 5">
          <span class="text-xl font-bold text-blue-100">{{ displayedBalance }}</span>
          <img :src="pupuImg" alt="Pupu" class="w-10 h-10 select-none" />
        </template>
        <template v-else-if="displayedBalance > 0">
          <div
            v-for="(_, i) in displayedBalance"
            :key="`bal-${i}`"
            class="pupu-stack-item"
            :style="{ transform: getPupuStackItemTransform(i) }"
          >
            <img :src="pupuImg" alt="Pupu" class="w-8 h-8 select-none" />
          </div>
        </template>
        <template v-else>
          <span class="text-xl font-bold text-blue-100">{{ displayedBalance }}</span>
          <img :src="pupuImg" alt="Pupu" class="w-10 h-10 select-none opacity-50" />
        </template>
      </div>
      </div>
    <button
      v-if="canBet && totalBetAmount > 0"
      type="button"
      class="flex-shrink-0 px-4 py-2 rounded-lg border-2 border-red-600 bg-red-700 text-white font-bold text-sm hover:bg-red-600 hover:border-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="isPlacing"
      @click="clearAllBets"
    >
      Retirer tout
    </button>
    </div>
  </div>
</template>

<style scoped>
/* Perspective désactivée temporairement pour test */
.kikiri-perspective-container {
  position: absolute;
  inset: 0;
}

.kikiri-board-3d {
  position: absolute;
  inset: 0;
}

.kikiri-board-surface {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* clip-path synchronisé avec getBoardTrapezoid via :style */
  /* Plateau bois : tons chauds, grain naturel */
  background-color: #6b4423;
  background-image:
    /* Grain bois fin (veines) */
    repeating-linear-gradient(
      88deg,
      transparent 0,
      transparent 1px,
      rgba(80, 50, 25, 0.15) 1px,
      rgba(80, 50, 25, 0.15) 2px
    ),
    repeating-linear-gradient(
      94deg,
      transparent 0,
      transparent 3px,
      rgba(120, 75, 40, 0.12) 3px,
      rgba(120, 75, 40, 0.12) 4px
    ),
    /* Variation naturelle du bois */
    linear-gradient(
      105deg,
      transparent 0%,
      rgba(180, 130, 70, 0.08) 25%,
      transparent 50%,
      rgba(60, 40, 20, 0.1) 75%,
      transparent 100%
    ),
    /* Dégradé principal : bois clair au centre, plus foncé sur les bords */
    linear-gradient(
      180deg,
      #5a3820 0%,
      #7d552e 12%,
      #9a6b3a 25%,
      #b07d45 40%,
      #a67c38 55%,
      #8f6a32 70%,
      #6d4a28 85%,
      #4a3018 100%
    );
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.15);
}

/* Ligne 1-2-3 plus étroite (95%) */
.kikiri-cases-grid .kikiri-case-top-row {
  width: 95%;
  max-width: 95%;
  justify-self: center;
}

.kikiri-cases-grid > div:nth-child(1) {
  transform: translateX(3%);
}

.kikiri-cases-grid > div:nth-child(3) {
  transform: translateX(-3%);
}

.pupu-stack {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Pupus sur le plateau : effet 3D (ombre portée) */
.kikiri-pupu-3d-on-board img {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* Zones de drop transparentes : l'allumage se fait sur le canvas */
.kikiri-cell-transparent {
  background: transparent;
  border: 2px solid transparent;
}

/* Section solde qui s'allume au survol pendant un drag depuis une case */
.kikiri-balance-drop-target {
  border-color: rgba(59, 130, 246, 0.9);
  background-color: rgba(30, 58, 138, 0.5);
  box-shadow: inset 0 0 12px rgba(96, 165, 250, 0.2);
}

</style>
