<script setup lang="ts">
import type { PollResults } from '~/stores/usePollStore'

interface Props {
  results: PollResults
}

const props = defineProps<Props>()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-white">Résultats du sondage</h2>
      <p class="mt-2 text-sm text-white/60">
        {{ results.totalResponses }} {{ results.totalResponses > 1 ? 'réponses' : 'réponse' }}
      </p>
    </div>

    <!-- QCM Results -->
    <div v-if="results.type === 'qcm'" class="space-y-4">
      <div
        v-for="result in results.results"
        :key="result.optionId"
        class="space-y-2"
      >
        <div class="flex items-center justify-between">
          <span class="text-white">{{ result.text }}</span>
          <span class="text-sm font-semibold text-white/80">
            {{ result.count }} ({{ result.percentage?.toFixed(1) }}%)
          </span>
        </div>
        <div class="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            class="h-full bg-primary-500 transition-all duration-500"
            :style="{ width: `${result.percentage || 0}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Ranking Results -->
    <div v-else-if="results.type === 'ranking'" class="space-y-4">
      <div
        v-for="(result, index) in results.results"
        :key="result.optionId"
        class="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold"
          :class="{
            'bg-yellow-500/20 text-yellow-400': index === 0,
            'bg-gray-500/20 text-gray-400': index === 1,
            'bg-orange-500/20 text-orange-400': index === 2,
            'bg-white/10 text-white/60': index > 2,
          }"
        >
          {{ index + 1 }}
        </div>
        <div class="flex-1">
          <p class="font-semibold text-white">{{ result.text }}</p>
          <p class="text-sm text-white/60">
            Position moyenne : {{ result.averagePosition?.toFixed(2) || 'N/A' }}
            <span v-if="result.responseCount !== undefined">
              ({{ result.responseCount }} {{ result.responseCount > 1 ? 'réponses' : 'réponse' }})
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
