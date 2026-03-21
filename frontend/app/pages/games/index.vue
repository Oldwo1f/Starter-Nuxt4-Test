<script setup lang="ts">
import jijiImage from '~/assets/images/jiji.png'
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'

definePageMeta({
  layout: 'default',
  titleKey: 'games.metaTitle',
})

const authStore = useAuthStore()
const walletStore = useWalletStore()
const { t } = useI18n()

onMounted(() => {
  if (authStore.isAuthenticated) {
    walletStore.fetchJijiBalance()
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Section Jetons de jeux Nuna -->
    <section class="mb-14">
      <div class="flex flex-col gap-4 rounded-2xl border border-primary-500/30 bg-gradient-to-br from-amber-500/10 via-primary-900/30 to-primary-800/20 p-5 pb-8 sm:gap-6 sm:p-12 sm:pb-14 backdrop-blur-sm">
        <h2 class="text-center text-xl font-bold text-white sm:text-left sm:text-2xl md:text-3xl">
          {{ t('games.jijiTitle') }}
        </h2>
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <!-- Contenu à gauche : jeton + texte -->
        <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-start">
          <div class="flex flex-col items-center sm:flex-row sm:items-center sm:gap-6">
            <img
              :src="jijiImage"
              :alt="t('games.jijiAlt')"
              class="h-16 w-16 shrink-0 object-contain sm:h-24 sm:w-24 md:h-32 md:w-32"
            >
          </div>
          <div class="flex flex-col items-center gap-1.5 text-center text-xs text-primary-300 sm:items-start sm:gap-2 sm:text-left sm:text-base md:text-lg">
            <span class="inline-flex flex-wrap items-center justify-center gap-1 sm:justify-start">
              1 000
              <JijiIcon size="sm" />
              {{ t('games.jijiSignup') }}
            </span>
            <span class="inline-flex flex-wrap items-center justify-center gap-1 sm:justify-start">
              + 1 000
              <JijiIcon size="sm" />
              {{ t('games.jijiWeekly') }}
            </span>
            <span class="inline-flex flex-wrap items-center justify-center gap-1 sm:justify-start">
              + 2 000
              <JijiIcon size="sm" />
              {{ t('games.jijiMember') }}
            </span>
            <span class="inline-flex flex-wrap items-center justify-center gap-1 sm:justify-start">
              + 4 000
              <JijiIcon size="sm" />
              {{ t('games.jijiPremium') }}
            </span>
          </div>
        </div>
        <!-- Solde à droite (si connecté) -->
        <div
          v-if="authStore.isAuthenticated"
          class="flex shrink-0 flex-col items-center justify-center self-center rounded-xl bg-amber-500/20 px-8 py-6 sm:items-end"
        >
          <span class="mb-2 text-sm font-medium text-white/80">{{ t('games.myBalance') }}</span>
          <div class="flex items-center gap-2.5 text-3xl font-bold text-amber-400">
            <JijiIcon size="lg" />
            <span>{{ Math.round(walletStore.jijiBalance) }}</span>
          </div>
        </div>
        </div>
      </div>
    </section>

    <h1 class="text-2xl font-bold text-white mb-6">
      {{ t('games.pageTitle') }}
    </h1>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        to="/games/kikiri"
        class="flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-6 transition-colors hover:bg-white/10 hover:border-green-500/30"
      >
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
          <UIcon name="i-heroicons-cube" class="h-6 w-6 text-green-400" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="font-semibold text-white">
            {{ t('games.kikiriTitle') }}
          </h2>
          <p class="text-sm text-white/60">
            {{ t('games.kikiriDesc') }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2 rounded-full bg-green-500/20 px-4 py-2">
          <span class="text-sm font-medium text-green-400">{{ t('games.play') }}</span>
          <UIcon name="i-heroicons-play" class="h-5 w-5 text-green-400" />
        </div>
      </NuxtLink>
      <NuxtLink
        to="/games/bingo"
        class="flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-6 transition-colors hover:bg-white/10 hover:border-amber-500/30"
      >
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <UIcon name="i-heroicons-squares-2x2" class="h-6 w-6 text-amber-400" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="font-semibold text-white">
            {{ t('games.bingoTitle') }}
          </h2>
          <p class="text-sm text-white/60">
            {{ t('games.bingoDesc') }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2 rounded-full bg-amber-500/20 px-4 py-2">
          <span class="text-sm font-medium text-amber-400">{{ t('games.play') }}</span>
          <UIcon name="i-heroicons-play" class="h-5 w-5 text-amber-400" />
        </div>
      </NuxtLink>
    </div>

    <GamesLeaderboardSection />
  </div>
</template>
