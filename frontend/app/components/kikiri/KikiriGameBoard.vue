<script setup lang="ts">
import type { KikiriDraw } from '~/composables/useKikiriSocket'
import tasseImg from '~/assets/images/tasse.png'

const props = defineProps<{
  draw: KikiriDraw | null
  canBet: boolean
  balance: number
  betAmounts: Record<number, number>
  isPlacing: boolean
}>()

const emit = defineEmits<{
  'update:betAmounts': [Record<number, number>]
}>()

const betAmounts = computed({
  get: () => props.betAmounts,
  set: (v) => emit('update:betAmounts', v),
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const domeOffsetY = ref(0)
const domeOpacity = ref(1)
const isAnimating = ref(false)
const animationStartTime = ref(0)

const numbers = [1, 2, 3, 4, 5, 6]

const isRevealed = computed(() => {
  if (!props.draw) return false
  return props.draw.status === 'revealing' || props.draw.status === 'resolved'
})

const dice = computed(() => {
  if (!props.draw || !isRevealed.value) return [null, null, null]
  return [props.draw.dice1, props.draw.dice2, props.draw.dice3]
})

const totalBetAmount = computed(() => {
  return numbers.reduce((a, n) => a + (betAmounts.value[n] || 0), 0)
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

  // Isométrique : top = losange, front = face verticale gauche, right = face verticale droite
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

function drawBoard(ctx: CanvasRenderingContext2D, cw: number, ch: number) {

  ctx.fillStyle = 'rgba(30, 40, 30, 0.95)'
  ctx.fillRect(0, 0, cw, ch)

  ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'
  ctx.lineWidth = 4
  ctx.strokeRect(8, 8, cw - 16, ch - 16)

  const domeCenterX = cw / 2
  const domeCenterY = ch * 0.15 + 45
  const diceSize = Math.min(cw, ch) * 0.18
  const diceGap = diceSize * -0.12

  const totalDiceWidth = diceSize * 3 + diceGap * 2
  const diceStartX = domeCenterX - totalDiceWidth / 2 + diceSize / 2 + diceGap / 2

  for (let i = 0; i < 3; i++) {
    const dcx = diceStartX + i * (diceSize + diceGap)
    drawDice(ctx, dcx, domeCenterY, diceSize, dice.value[i] ?? null)
  }

}

function animateDome() {
  if (!isAnimating.value) return
  const elapsed = performance.now() - animationStartTime.value
  const duration = 800
  const progress = Math.min(elapsed / duration, 1)
  const easeOut = 1 - Math.pow(1 - progress, 2)

  domeOffsetY.value = -120 * easeOut
  domeOpacity.value = 1 - easeOut

  if (progress < 1) {
    requestAnimationFrame(animateDome)
  } else {
    isAnimating.value = false
  }
  draw()
}

function draw() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  drawBoard(ctx, rect.width, rect.height)
}

watch([() => props.draw, dice, domeOffsetY, domeOpacity], () => {
  draw()
}, { deep: true })

watch(() => props.draw?.status, (status) => {
  if (!props.draw || status === 'betting') {
    domeOffsetY.value = 0
    domeOpacity.value = 1
    isAnimating.value = false
  } else if (status === 'revealing' && !isAnimating.value) {
    isAnimating.value = true
    animationStartTime.value = performance.now()
    requestAnimationFrame(animateDome)
  }
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
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
  <div ref="containerRef" class="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black/20">
    <canvas
      ref="canvasRef"
      class="block w-full h-full"
    />
    <!-- Tasse recouvrant les dés (soulève à la révélation) -->
    <div
      v-show="!isRevealed || isAnimating"
      class="absolute pointer-events-none transition-none z-10"
      :style="{
        left: '50%',
        top: '10px',
        width: '40%',
        transform: `translate(-50%, ${domeOffsetY}px)`,
        opacity: domeOpacity,
      }"
    >
      <img
        :src="tasseImg"
        alt=""
        class="w-full h-auto block"
      />
    </div>
    <!-- Overlay: 6 boxes en 2 lignes (1,2,3 | 4,5,6), moitié inférieure du canvas -->
    <div class="absolute bottom-0 left-0 right-0 h-1/2 grid grid-cols-3 grid-rows-2 gap-2 p-3">
      <div
        v-for="num in numbers"
        :key="num"
        class="flex flex-col items-center justify-center rounded-xl bg-white/5 border-2 border-green-500/30"
      >
        <span class="text-2xl font-bold text-primary-400 mb-1">{{ num }}</span>
        <span class="text-lg text-white/80 mb-2">{{ betAmounts[num] || 0 }} 🐚</span>
        <div class="flex gap-2">
          <button
            type="button"
            class="w-10 h-10 rounded-lg bg-green-500/30 hover:bg-green-500/50 text-green-400 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
            :disabled="!canBet || isPlacing || (betAmounts[num] || 0) >= Math.round(balance)"
            @click="addBet(num)"
          >
            +
          </button>
          <button
            type="button"
            class="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
            :disabled="!canBet || isPlacing || (betAmounts[num] || 0) <= 0"
            @click="removeBet(num)"
          >
            −
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
