<script setup lang="ts">
definePageMeta({
  layout: 'marketplace',
})

const { t } = useI18n()

const STORAGE_KEY = 'marketplace_how_it_works_visited'

onMounted(() => {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, 'true')
  }
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <ProfileIncompleteBanner />

    <div class="mb-8 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight">{{ t('marketplaceHow.pageTitle') }}</h1>
      <p class="text-lg text-white/70">
        {{ t('marketplaceHow.pageIntro') }}
      </p>
    </div>

    <div class="space-y-8">
      <!-- Section Règles -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <h2 class="text-2xl font-bold">{{ t('marketplaceHow.rulesTitle') }}</h2>
        </template>
        <div class="space-y-6">
          <div class="rounded-lg bg-primary-500/20 border border-primary-500/30 p-4">
            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-information-circle" class="h-6 w-6 shrink-0 text-primary-400 mt-0.5" />
              <div>
                <h3 class="mb-2 font-semibold text-white">{{ t('marketplaceHow.mainRuleTitle') }}</h3>
                <p class="text-white/80">
                  <strong style="font-size:1.2em;">{{ t('marketplaceHow.mainRuleLead') }}</strong>
                  <span class="whitespace-pre-line block mt-1">{{ t('marketplaceHow.mainRulePlatform') }}</span>
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80 font-bold">
                {{ t('marketplaceHow.ruleNoPrice') }}
              </p>
            </div>
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80">
                {{ t('marketplaceHow.ruleNoPupuNeeded') }}
              </p>
            </div>
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80">
                {{ t('marketplaceHow.rulePupuComplement') }}
              </p>
            </div>
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80">
                {{ t('marketplaceHow.rulePayWithPupu') }}
              </p>
            </div>
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80">
                {{ t('marketplaceHow.ruleCirculate') }}
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <div class="flex items-center gap-3">
            <span class="text-3xl">🐚</span>
            <h2 class="text-2xl font-bold">{{ t('marketplaceHow.pupuTitle') }}</h2>
          </div>
        </template>
        <div class="space-y-4">
          <p class="text-white/80">
            {{ t('marketplaceHow.pupuIntro') }}
          </p>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">{{ t('marketplaceHow.card1Shell') }}</div>
              <div class="text-sm text-white/60">{{ t('marketplaceHow.pupuUnit') }}</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">{{ t('marketplaceHow.pupuApproxXpf') }}</div>
            </div>
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">{{ t('marketplaceHow.card2Title') }}</div>
              <div class="text-sm text-white/60">{{ t('marketplaceHow.pupuLocalLabel') }}</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">{{ t('marketplaceHow.pupuTenShells') }}</div>
            </div>
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">{{ t('marketplaceHow.card3Title') }}</div>
              <div class="text-sm text-white/60">{{ t('marketplaceHow.pupuWorkHour') }}</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">{{ t('marketplaceHow.pupuWorkRange') }}</div>
            </div>
          </div>

          <div class="mt-8">
            <h3 class="mb-4 text-xl font-semibold">{{ t('marketplaceHow.howGetTitle') }}</h3>
            <ul class="space-y-3 text-white/80">
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-500">•</span>
                <span>{{ t('marketplaceHow.howGetLi1') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-500">•</span>
                <span>{{ t('marketplaceHow.howGetLi2') }}</span>
              </li>
            </ul>
            <hr style="border-color: #374151; border-width: 1px; margin:20px 0;">
            <ul class="space-y-3 text-white/80">
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-500">•</span>
                <span>{{ t('marketplaceHow.howGetLi3') }}</span>
              </li>
            </ul>
            <ul class="ml-6 mt-3 space-y-2">
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>{{ t('marketplaceHow.howGetSub1') }}</strong> {{ t('marketplaceHow.howGetSub1Text') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>{{ t('marketplaceHow.howGetSub2') }}</strong> {{ t('marketplaceHow.howGetSub2Text') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>{{ t('marketplaceHow.howGetSub3') }}</strong> {{ t('marketplaceHow.howGetSub3Text') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>{{ t('marketplaceHow.howGetSub4') }}</strong> {{ t('marketplaceHow.howGetSub4Text') }}</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>{{ t('marketplaceHow.howGetSub5') }}</strong> {{ t('marketplaceHow.howGetSub5Text') }}</span>
              </li>
            </ul>
          </div>
        </div>
      </UCard>

      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <h2 class="text-2xl font-bold">{{ t('marketplaceHow.processTitle') }}</h2>
        </template>
        <div class="space-y-6">
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              1
            </div>
            <div>
              <h3 class="mb-1 font-semibold text-white">{{ t('marketplaceHow.step1Title') }}</h3>
              <p class="text-white/70">
                {{ t('marketplaceHow.step1Text') }}
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              2
            </div>
            <div>
              <h3 class="mb-1 font-semibold text-white">{{ t('marketplaceHow.step2Title') }}</h3>
              <p class="text-white/70">
                {{ t('marketplaceHow.step2Text') }}
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              3
            </div>
            <div>
              <h3 class="mb-1 font-semibold text-white">{{ t('marketplaceHow.step3Title') }}</h3>
              <p class="text-white/70">
                {{ t('marketplaceHow.step3Text') }}
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              4
            </div>
            <div>
              <h3 class="mb-1 font-semibold text-white">{{ t('marketplaceHow.step4Title') }}</h3>
              <p class="text-white/70">
                {{ t('marketplaceHow.step4Text') }}
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <h2 class="text-2xl font-bold">{{ t('marketplaceHow.advantagesTitle') }}</h2>
        </template>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex gap-3">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 shrink-0 text-primary-500" />
            <div>
              <h3 class="font-semibold">{{ t('marketplaceHow.adv1Title') }}</h3>
              <p class="text-sm text-white/70">
                {{ t('marketplaceHow.adv1Text') }}
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 shrink-0 text-primary-500" />
            <div>
              <h3 class="font-semibold">{{ t('marketplaceHow.adv2Title') }}</h3>
              <p class="text-sm text-white/70">
                {{ t('marketplaceHow.adv2Text') }}
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 shrink-0 text-primary-500" />
            <div>
              <h3 class="font-semibold">{{ t('marketplaceHow.adv3Title') }}</h3>
              <p class="text-sm text-white/70">
                {{ t('marketplaceHow.adv3Text') }}
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 shrink-0 text-primary-500" />
            <div>
              <h3 class="font-semibold">{{ t('marketplaceHow.adv4Title') }}</h3>
              <p class="text-sm text-white/70">
                {{ t('marketplaceHow.adv4Text') }}
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <div class="text-center">
        <UButton
          to="/marketplace"
          size="xl"
          color="primary"
          icon="i-heroicons-shopping-bag"
        >
          {{ t('marketplaceHow.cta') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
