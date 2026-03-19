<script setup lang="ts">
const props = defineProps<{
  value: number | null
  size?: 'sm' | 'md'
}>()

const dotPositions: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

const dotGrid = computed(() => {
  const v = props.value
  if (v == null || v < 1 || v > 6) return null
  const positions = dotPositions[v]
  const grid = Array(9).fill(false)
  for (const [r, c] of positions) {
    grid[r * 3 + c] = true
  }
  return grid
})

const sizeClasses = computed(() => {
  const s = props.size ?? 'md'
  return s === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
})

const dotSizeClasses = computed(() => {
  const s = props.size ?? 'md'
  return s === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'
})
</script>

<template>
  <span
    :class="[
      sizeClasses,
      'rounded flex items-center justify-center bg-white/10 shrink-0',
    ]"
  >
    <template v-if="dotGrid">
      <div class="grid grid-cols-3 grid-rows-3 gap-0.5 place-items-center w-full h-full p-1.5">
        <span
          v-for="(show, idx) in dotGrid"
          :key="idx"
          :class="[
            dotSizeClasses,
            'rounded-full',
            show ? 'bg-white/90' : 'bg-transparent',
          ]"
        />
      </div>
    </template>
    <span v-else class="text-sm font-medium text-white/60">?</span>
  </span>
</template>
