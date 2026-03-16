<script setup lang="ts">
import type { KikiriDraw } from '~/composables/useKikiriSocket'

defineProps<{ draws: KikiriDraw[] }>()

const formatResult = (userNet: number | undefined) => {
  if (userNet === undefined) return null
  if (userNet > 0) return { text: `+${userNet} 🐚`, color: 'text-green-400' }
  if (userNet < 0) return { text: `${userNet} 🐚`, color: 'text-red-400' }
  return { text: '0 🐚', color: 'text-white/60' }
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
    <div v-else class="space-y-4">
      <div
        v-for="draw in draws.slice(0, 5)"
        :key="`draw-${draw.id ?? draw.createdAt ?? ''}`"
        class="py-3 border-b border-white/5 last:border-0 space-y-2"
      >
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-white/70 shrink-0">Tirage #{{ draw.id }}</span>
          <div class="flex gap-2 shrink-0">
            <span
              v-for="(d, i) in [draw.dice1, draw.dice2, draw.dice3]"
              :key="`dice-${draw.id ?? ''}-${i}`"
              class="w-8 h-8 rounded flex items-center justify-center bg-white/10 text-sm font-medium"
            >
              {{ d ?? '?' }}
            </span>
          </div>
          <span
            v-if="formatResult(draw.userNet)"
            :class="['text-sm font-medium shrink-0', formatResult(draw.userNet)!.color]"
          >
            {{ formatResult(draw.userNet)!.text }}
          </span>
        </div>
        <div
          v-if="getBetsForDraw(draw).length > 0"
          class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60"
        >
          <span
            v-for="{ num, amount } in getBetsForDraw(draw)"
            :key="num"
            class="flex items-center gap-1"
          >
            <span class="text-white/50">{{ num }}:</span>
            <span>{{ amount }} 🐚</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
