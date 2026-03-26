<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import teohiImage from '~/assets/images/pictopack/teohi.jpeg'
import umeteImage from '~/assets/images/pictopack/umete.jpeg'
import arataiImage from '~/assets/images/pictopack/aratai.jpeg'
import fenuaImage from '~/assets/images/pictopack/fenua.jpeg'
import toaImage from '~/assets/images/pictopack/toa.jpeg'
import fetiaImage from '~/assets/images/pictopack/fetia.jpeg'

definePageMeta({
  layout: 'default',
})

const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

// Compte à rebours promo : fin le 1er mai 2026 00:00 (Pacific/Tahiti = 10:00 UTC)
const promoEndMs = Date.UTC(2026, 4, 1, 10, 0, 0)
const promoDaysRemaining = ref(0)

const updatePromoCountdown = () => {
  const distance = promoEndMs - Date.now()
  promoDaysRemaining.value =
    distance > 0 ? Math.max(0, Math.ceil(distance / (1000 * 60 * 60 * 24))) : 0
}

let countdownInterval: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  updatePromoCountdown()
  countdownInterval = setInterval(updatePromoCountdown, 60_000)
}

onMounted(() => {
  startCountdown()
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

// Handler pour le bouton "Nous contacter" des packs VIP
const handleContactVIP = () => {
  const subj = encodeURIComponent(t('tarifs.contactMailSubject'))
  window.location.href = `mailto:contact@nunaheritage.pf?subject=${subj}`
}

// Formatage des prix en XPF
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR').format(price)
}

// Fonction pour obtenir l'image du pack
const getPackImage = (packName: string) => {
  const imageMap: Record<string, string> = {
    'Te Ohi': teohiImage,
    'Umete': umeteImage,
    'Aratai': arataiImage,
    'Fenua': fenuaImage,
    'Toa': toaImage,
    'Fetia': fetiaImage,
  }
  return imageMap[packName] || ''
}

// Pack Te Ohi - 5000 XPF/an
const teOhiPack = computed(() => ({
  name: 'Te Ohi',
  price: 5000,
  period: t('tarifs.periodYear'),
  badge: t('tarifs.teOhi.badge'),
  description: t('tarifs.teOhi.description'),
  features: [
    t('tarifs.teOhi.f0'),
    t('tarifs.teOhi.f1'),
    t('tarifs.teOhi.f2'),
    t('tarifs.teOhi.f3'),
    { text: t('tarifs.teOhi.jijiText'), unit: t('tarifs.teOhi.jijiUnit'), icon: 'jiji' },
    t('tarifs.teOhi.f4'),
    t('tarifs.teOhi.f5'),
  ],
  buttonLabel: authStore.isAuthenticated ? t('tarifs.teOhi.btnMember') : t('tarifs.teOhi.btnChoose'),
  buttonAction: () => {
    if (!authStore.isAuthenticated) {
      navigateTo('/register')
    }
  },
}))

// Pack UMETE — 20 000 XPF paiement unique
const umetePack = computed(() => ({
  name: 'Umete',
  price: 20000,
  period: t('tarifs.umete.billingOnce'),
  badge: t('tarifs.umete.badge'),
  description: t('tarifs.umete.description'),
  features: [
    t('tarifs.umete.f0'),
    t('tarifs.umete.f1'),
    { text: t('tarifs.umete.jijiText'), unit: t('tarifs.umete.jijiUnit'), icon: 'jiji' },
    t('tarifs.umete.f2'),
    t('tarifs.umete.f3'),
    t('tarifs.umete.f4'),
  ],
  buttonLabel: authStore.isAuthenticated ? t('tarifs.umete.btnPremium') : t('tarifs.umete.btnChoose'),
  buttonAction: () => {
    if (!authStore.isAuthenticated) {
      navigateTo('/register')
    } else {
      toast.add({
        title: t('tarifs.toastSoonTitle'),
        description: t('tarifs.toastSoonDesc'),
        color: 'info',
      })
    }
  },
  popular: true,
}))

// Packs VIP Invest
const vipInvestPacks = computed(() => [
  {
    name: 'Aratai',
    price: 50000,
    period: t('tarifs.periodYear'),
    description: t('tarifs.vipDesc'),
    buttonLabel: t('tarifs.contactUs'),
    buttonAction: handleContactVIP,
  },
  {
    name: 'Fenua',
    price: 150000,
    period: t('tarifs.periodYear'),
    description: t('tarifs.vipDesc'),
    buttonLabel: t('tarifs.contactUs'),
    buttonAction: handleContactVIP,
  },
  {
    name: 'Toa',
    price: 300000,
    period: t('tarifs.periodYear'),
    description: t('tarifs.vipDesc'),
    buttonLabel: t('tarifs.contactUs'),
    buttonAction: handleContactVIP,
  },
  {
    name: 'Fetia',
    price: 500000,
    period: t('tarifs.periodYear'),
    description: t('tarifs.vipDesc'),
    buttonLabel: t('tarifs.contactUs'),
    buttonAction: handleContactVIP,
  },
])
</script>

<template>
  <div class="min-h-screen bg-black">
    <!-- Section Hero -->
    <section class="relative overflow-hidden bg-gradient-to-b from-primary-900/20 via-black to-black px-4 py-16 sm:py-24">
      <div class="relative z-10 mx-auto max-w-7xl">
        <div class="text-center">
          <h1 class="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            {{ t('tarifs.title') }}
          </h1>
          <p class="mx-auto max-w-2xl text-lg text-white/70 sm:text-xl">
            {{ t('tarifs.subtitle') }}
          </p>
        </div>
      </div>
      <!-- Effet de fond décoratif -->
      <div class="absolute inset-0 -z-0">
        <div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>
    </section>

    <!-- Bandeau Promo de Lancement -->
    <section class="relative bg-black/50 py-8 sm:py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-900/40 to-primary-800/30 p-6 sm:p-8 backdrop-blur-sm">
          <div class="mb-6 text-center">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-500/20 px-4 py-2 text-sm font-semibold text-primary-300">
              <UIcon name="i-heroicons-sparkles" class="h-5 w-5" />
              <span>{{ t('tarifs.promoBadge') }}</span>
            </div>
            <h2 class="mb-2 text-2xl font-bold text-white sm:text-3xl">
              {{ t('tarifs.promoTitle') }}
            </h2>
            <p class="mx-auto max-w-2xl text-lg text-primary-200/90">
              {{ t('tarifs.promoSubtitle') }}
            </p>
          </div>
          <div class="flex flex-col items-center justify-center py-2">
            <div
              class="text-5xl font-bold tabular-nums text-white sm:text-6xl md:text-7xl"
              aria-live="polite"
            >
              {{ promoDaysRemaining }}
            </div>
            <div class="mt-3 text-base font-medium text-white/70 sm:text-lg">
              {{ t('tarifs.promoCountdownDays') }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section Packs Principaux -->
    <section class="relative bg-black/50 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid gap-8 sm:grid-cols-1 md:grid-cols-2">
          <!-- Pack Te Ohi -->
          <UCard
            class="group relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-0 transition-all hover:scale-[1.02] hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/20"
          >
            <template #header>
              <div class="space-y-4">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3">
                    <img
                      :src="getPackImage(teOhiPack.name)"
                      :alt="teOhiPack.name"
                      class="h-12 w-12 shrink-0 rounded-lg object-cover"
                    >
                    <div>
                      <h3 class="text-2xl font-bold text-white">
                        {{ teOhiPack.name }}
                      </h3>
                      <p class="mt-1 text-sm text-white/60">
                        {{ teOhiPack.description }}
                      </p>
                    </div>
                  </div>
                  <span
                    v-if="teOhiPack.badge"
                    class="inline-flex items-center rounded-full bg-primary-500/20 px-3 py-1 text-xs font-semibold text-primary-300"
                  >
                    {{ teOhiPack.badge }}
                  </span>
                </div>
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="text-4xl font-bold text-white">
                    {{ formatPrice(teOhiPack.price) }}
                  </span>
                  <span class="text-lg text-white/60">{{ t('tarifs.currency') }}</span>
                  <span class="text-sm text-white/60">{{ t('tarifs.perSlash') }} {{ teOhiPack.period }}</span>
                </div>
                <p class="text-sm text-white/50">
                  {{ t('tarifs.teOhi.priceApproxEUR') }}
                </p>
              </div>
            </template>

            <div class="space-y-6">
              <ul class="space-y-3">
                <li
                  v-for="(feature, index) in teOhiPack.features"
                  :key="index"
                  class="flex items-start gap-3"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="mt-0.5 h-5 w-5 shrink-0 text-primary-400"
                  />
                  <span class="inline-flex items-center gap-1.5 text-white/80">
                    <template v-if="typeof feature === 'object' && feature.icon === 'jiji'">
                      {{ feature.text }}
                      <JijiIcon size="sm" class="inline" />
                      {{ feature.unit }}
                    </template>
                    <template v-else>
                      {{ feature }}
                    </template>
                  </span>
                </li>
              </ul>

              <UButton
                :label="teOhiPack.buttonLabel"
                :disabled="authStore.isAuthenticated && authStore.user?.role === 'member'"
                color="primary"
                size="lg"
                block
                class="group/btn"
                @click="teOhiPack.buttonAction"
              >
                <span>{{ teOhiPack.buttonLabel }}</span>
                <UIcon
                  name="i-heroicons-arrow-right"
                  class="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1"
                />
              </UButton>
            </div>
          </UCard>

          <!-- Pack UMETE -->
          <UCard
            class="group relative overflow-hidden bg-gradient-to-br from-primary-500/10 via-white/5 to-white/[0.02] border-2 border-primary-500/50 transition-all hover:scale-[1.02] hover:border-primary-500 hover:shadow-2xl hover:shadow-primary-500/30"
          >
            <template #header>
              <div class="space-y-4">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3">
                    <img
                      :src="getPackImage(umetePack.name)"
                      :alt="umetePack.name"
                      class="h-12 w-12 shrink-0 rounded-lg object-cover"
                    >
                    <div>
                      <h3 class="text-2xl font-bold text-white">
                        {{ umetePack.name }}
                      </h3>
                      <p class="mt-1 text-sm text-white/60">
                        {{ umetePack.description }}
                      </p>
                    </div>
                  </div>
                  <span
                    v-if="umetePack.badge"
                    class="inline-flex items-center rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white"
                  >
                    {{ umetePack.badge }}
                  </span>
                </div>
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="text-4xl font-bold text-white">
                    {{ formatPrice(umetePack.price) }}
                  </span>
                  <span class="text-lg text-white/60">{{ t('tarifs.currency') }}</span>
                  <span class="text-sm text-white/60"> {{ umetePack.period }}</span>
                </div>
                <p class="text-sm text-white/50">
                  {{ t('tarifs.umete.priceApproxEUR') }}
                </p>
              </div>
            </template>

            <div class="space-y-6">
              <ul class="space-y-3">
                <li
                  v-for="(feature, index) in umetePack.features"
                  :key="index"
                  class="flex items-start gap-3"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="mt-0.5 h-5 w-5 shrink-0 text-primary-400"
                  />
                  <span class="inline-flex items-center gap-1.5 text-white/80">
                    <template v-if="typeof feature === 'object' && feature.icon === 'jiji'">
                      {{ feature.text }}
                      <JijiIcon size="sm" class="inline" />
                      {{ feature.unit }}
                    </template>
                    <template v-else>
                      {{ feature }}
                    </template>
                  </span>
                </li>
              </ul>

              <UButton
                :label="umetePack.buttonLabel"
                :disabled="authStore.isAuthenticated && authStore.user?.role === 'premium'"
                color="primary"
                size="lg"
                block
                class="group/btn"
                @click="umetePack.buttonAction"
              >
                <span>{{ umetePack.buttonLabel }}</span>
                <UIcon
                  name="i-heroicons-arrow-right"
                  class="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1"
                />
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <!-- Section Packs VIP Invest -->
    <section class="relative bg-black py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {{ t('tarifs.vipTitle') }}
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            {{ t('tarifs.vipSubtitle') }}
          </p>
        </div>

        <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <UCard
            v-for="(pack, index) in vipInvestPacks"
            :key="index"
            class="group relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-0 transition-all hover:scale-[1.02] hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20"
          >
            <template #header>
              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="getPackImage(pack.name)"
                    :alt="pack.name"
                    class="h-10 w-10 shrink-0 rounded-lg object-cover"
                  >
                  <div>
                    <h3 class="text-xl font-bold text-white">
                      {{ pack.name }}
                    </h3>
                    <p class="mt-1 text-sm text-white/60">
                      {{ pack.description }}
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="text-3xl font-bold text-primary-400">
                    {{ formatPrice(pack.price) }}
                  </span>
                  <span class="text-base text-white/60">{{ t('tarifs.currency') }}</span>
                  <span class="text-sm text-white/60">{{ t('tarifs.perSlash') }} {{ pack.period }}</span>
                </div>
              </div>
            </template>

            <div class="pt-4">
              <UButton
                :label="pack.buttonLabel"
                color="primary"
                variant="outline"
                size="lg"
                block
                class="group/btn"
                @click="pack.buttonAction"
              >
                <span>{{ pack.buttonLabel }}</span>
                <UIcon
                  name="i-heroicons-envelope"
                  class="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1"
                />
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </section>
  </div>
</template>
