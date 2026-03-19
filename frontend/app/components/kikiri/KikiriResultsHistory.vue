<script setup lang="ts">
import type { KikiriDraw } from '~/composables/useKikiriSocket'

defineProps<{ draws: KikiriDraw[] }>()

const formatResult = (userNet: number | undefined) => {
  if (userNet === undefined) return null
  if (userNet > 0) return { text: `+${userNet}`, color: 'text-green-400' }
  if (userNet < 0) return { text: `${userNet}`, color: 'text-red-400' }
  return { text: '0', color: 'text-white/60' }
}

const getBetsForDraw = (draw: KikiriDraw) => {
  const bets: { num: number; amount: number }[] = []
  for (let num = 1; num <= 6; num++) {
    const amount = draw.userBets?.[num] ?? 0
    if (amount > 0) bets.push({ num, amount })
  }
  return bets
}
</script>

<template>
  <div class="rounded-xl bg-white/5 border border-white/10 p-6">
    <h3 class="text-lg font-semibold text-white mb-4">
      Derniers tirages
    </h3>
    <div v-if="draws.length === 0" class="text-white/50 text-center py-8">
      Aucun tirage pour le moment
    </div>
    <div v-else class="flex flex-col">
      <div
        v-for="draw in draws.slice(0, 5)"
        :key="`draw-${draw.id ?? draw.createdAt ?? ''}`"
        class="py-3 border-b border-white/5 last:border-0 flex flex-col"
      >
        <div class="flex justify-between items-center">
          <span class="text-white/70">Tirage #{{ draw.id }}</span>
          <div class="flex gap-2">
            <KikiriDieFace
              v-for="(d, i) in [draw.dice1, draw.dice2, draw.dice3]"
              :key="`dice-${draw.id ?? ''}-${i}`"
              :value="d ?? null"
              size="md"
            />
          </div>
        </div>
        <div
          v-if="getBetsForDraw(draw).length > 0"
          class="flex justify-between items-center gap-4 mt-2 text-xs text-white/60"
        >
          <div class="flex flex-wrap gap-x-4 gap-y-1 items-center">
            <span class="text-white/60 shrink-0">Vos mises:</span>
            <span
              v-for="{ num, amount } in getBetsForDraw(draw)"
              :key="num"
              class="flex items-center gap-1"
            >
              <span class="text-white/50 font-bold bg-white/10 rounded w-6 h-6 inline-flex items-center justify-center shrink-0">{{ num }}</span>
              <span>:</span>
              <span class="inline-flex items-center gap-1">{{ amount }} <JijiIcon size="xs" /></span>
            </span>
          </div>
          <span
            :class="['text-sm font-medium flex items-center gap-1 shrink-0', (formatResult(draw.userNet) ?? { color: 'text-white/60' }).color]"
          >
            {{ (formatResult(draw.userNet) ?? { text: '0' }).text }}
            <JijiIcon size="xs" />
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
