<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import type { LeaderboardEntry, LatestWinners, MyScore } from '~/composables/useGamesLeaderboard'

const authStore = useAuthStore()
const {
  kikiriLeaderboard,
  bingoLeaderboard,
  kikiriWinners,
  bingoWinners,
  myKikiriScore,
  myBingoScore,
  isLoading,
  error,
  getImageUrl,
  fetchAll,
} = useGamesLeaderboard()

const activeTab = ref<'kikiri' | 'bingo'>('kikiri')

onMounted(() => {
  fetchAll()
})

const currentLeaderboard = computed<LeaderboardEntry[]>(() =>
  activeTab.value === 'kikiri' ? kikiriLeaderboard.value : bingoLeaderboard.value,
)

const currentWinners = computed<LatestWinners>(() =>
  activeTab.value === 'kikiri' ? kikiriWinners.value : bingoWinners.value,
)

const currentMyScore = computed<MyScore | null>(() =>
  activeTab.value === 'kikiri' ? myKikiriScore.value : myBingoScore.value,
)

const scoreDetail = (s: MyScore) =>
  `J×${s.dailyWins} + S×${s.weeklyWins} + M×${s.monthlyWins}`

const formatPeriodDate = (periodStart: string, type: 'day' | 'week' | 'month') => {
  if (!periodStart) return ''
  const [y, m, d] = periodStart.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: type === 'day' ? 'numeric' : type === 'month' ? 'numeric' : undefined,
  })
  if (type === 'day') return formatter.format(date)
  if (type === 'week') return `semaine du ${date.getDate()} ${date.toLocaleDateString('fr-FR', { month: 'long' })}`
  if (type === 'month') return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return ''
}
</script>

<template>
  <section class="mt-12">
    <h2 class="text-xl font-bold text-white mb-4">
      Classement
    </h2>
    <p class="mx-auto mb-6 max-w-2xl text-center text-sm text-white/80 leading-relaxed">
      C'est là que tout se passe. Pour la <span class="font-bold text-amber-400">Gloire</span>, pour le <span class="font-bold text-amber-400">Prestige</span>, et pour l'<span class="font-bold text-primary-400">Amour du jeu</span>.
      On verra au mois de <span class="font-bold text-white">décembre</span> qui sera sacré <span class="font-bold text-amber-400">Champion</span> du <span class="font-bold text-green-400">Kikiri</span> et du <span class="font-bold text-amber-500">Bingo</span>.
    </p>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400">
      {{ error }}
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="flex gap-2 mb-4">
        <button
          type="button"
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          :class="activeTab === 'kikiri'
            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
            : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'"
          @click="activeTab = 'kikiri'"
        >
          Kikiri
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          :class="activeTab === 'bingo'
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'"
          @click="activeTab = 'bingo'"
        >
          Bingo
        </button>
      </div>

      <!-- Winner cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div
          v-for="slot in [
            { label: 'Gagnant du jour', data: currentWinners.day, icon: 'i-heroicons-sun', periodType: 'day' as const },
            { label: 'Gagnant de la semaine', data: currentWinners.week, icon: 'i-heroicons-calendar-days', periodType: 'week' as const },
            { label: 'Gagnant du mois', data: currentWinners.month, icon: 'i-heroicons-calendar', periodType: 'month' as const },
          ]"
          :key="slot.label"
          class="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center"
        >
          <p class="text-xs font-medium text-white/60 mb-3 uppercase tracking-wider">
            {{ slot.label }}
          </p>
          <div v-if="slot.data" class="flex flex-col items-center">
            <img
              v-if="slot.data.avatarImage"
              :src="getImageUrl(slot.data.avatarImage)"
              :alt="slot.data.displayName"
              class="h-14 w-14 rounded-full object-cover mb-2 ring-2 ring-primary-500/30"
            >
            <div
              v-else
              class="h-14 w-14 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xl font-bold mb-2 ring-2 ring-primary-500/30"
            >
              {{ slot.data.displayName?.charAt(0)?.toUpperCase() || '?' }}
            </div>
            <span class="text-white font-medium text-center">{{ slot.data.displayName }}</span>
            <p class="text-xs text-white/50 mt-1">
              {{ formatPeriodDate(slot.data.periodStart, slot.periodType) }}
            </p>
          </div>
          <div v-else class="flex flex-col items-center text-white/40">
            <div class="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-2 border border-dashed border-white/20">
              <UIcon :name="slot.icon" class="h-7 w-7" />
            </div>
            <span class="text-sm text-center">À déterminer</span>
          </div>
        </div>
      </div>

      <div class="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <!-- Mon score -->
        <div class="p-4 border-b border-white/10 bg-white/5">
          <p class="text-sm font-medium text-white/80 mb-2">
            Mon score
          </p>
          <div v-if="authStore.isAuthenticated">
            <div v-if="currentMyScore" class="flex items-center gap-4">
              <span class="text-2xl font-bold text-primary-400">
                {{ currentMyScore.score }} pts
              </span>
              <span class="text-white/60">
                Rang #{{ currentMyScore.rank }}
              </span>
              <span
                class="text-xs text-white/50"
                :title="scoreDetail(currentMyScore)"
              >
                ({{ scoreDetail(currentMyScore) }})
              </span>
            </div>
            <p v-else class="text-white/60">
              Aucune victoire enregistrée pour l'instant. Jouez pour gagner des journées, semaines ou mois !
            </p>
          </div>
          <div v-else class="flex items-center gap-2">
            <NuxtLink
              to="/login"
              class="text-primary-400 hover:text-primary-300 underline"
            >
              Connectez-vous
            </NuxtLink>
            <span class="text-white/60">pour voir votre score</span>
          </div>
        </div>

        <!-- Top 100 table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-white/10">
                <th class="px-4 py-3 text-sm font-medium text-white/70">
                  Rang
                </th>
                <th class="px-4 py-3 text-sm font-medium text-white/70">
                  Joueur
                </th>
                <th class="px-4 py-3 text-sm font-medium text-white/70 text-center" title="Gagnant du jour × 1">
                  Jour
                </th>
                <th class="px-4 py-3 text-sm font-medium text-white/70 text-center" title="Gagnant de la semaine × 5">
                  Semaine
                </th>
                <th class="px-4 py-3 text-sm font-medium text-white/70 text-center" title="Gagnant du mois × 20">
                  Mois
                </th>
                <th class="px-4 py-3 text-sm font-medium text-white/70 text-right">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in currentLeaderboard"
                :key="`${activeTab}-${entry.userId}`"
                class="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td class="px-4 py-3 text-white/90 font-medium">
                  #{{ entry.rank }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="entry.avatarImage"
                      :src="getImageUrl(entry.avatarImage)"
                      :alt="entry.displayName"
                      class="h-8 w-8 rounded-full object-cover"
                    >
                    <div
                      v-else
                      class="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm"
                    >
                      {{ entry.displayName?.charAt(0)?.toUpperCase() || '?' }}
                    </div>
                    <span class="text-white">{{ entry.displayName }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-center text-white/80">
                  {{ entry.dailyWins }}
                </td>
                <td class="px-4 py-3 text-center text-white/80">
                  {{ entry.weeklyWins }}
                </td>
                <td class="px-4 py-3 text-center text-white/80">
                  {{ entry.monthlyWins }}
                </td>
                <td class="px-4 py-3 text-right">
                  <span class="font-medium text-primary-400">{{ entry.score }} pts</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="currentLeaderboard.length === 0 && !isLoading" class="p-8 text-center text-white/60">
          <UIcon name="i-heroicons-trophy" class="mx-auto mb-2 h-12 w-12" />
          <p>Aucun classement pour l'instant</p>
          <p class="text-sm mt-1">
            Les gagnants du jour, de la semaine et du mois sont calculés automatiquement.
          </p>
        </div>
      </div>

      <p class="mt-3 text-xs text-white/50">
        Score = (gagnant du jour × 1) + (gagnant de la semaine × 5) + (gagnant du mois × 20)
      </p>
    </template>
  </section>
</template>
