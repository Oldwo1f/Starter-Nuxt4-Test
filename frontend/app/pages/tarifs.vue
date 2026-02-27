<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'default',
})

const authStore = useAuthStore()
const toast = useToast()

// Compte à rebours pour la promo de lancement - 10 mars à minuit
const countdown = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
})

const targetDate = new Date('2026-03-10T00:00:00').getTime()

const updateCountdown = () => {
  const now = new Date().getTime()
  const distance = targetDate - now

  if (distance > 0) {
    countdown.value = {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000),
    }
  } else {
    countdown.value = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    }
  }
}

let countdownInterval: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  updateCountdown()
  countdownInterval = setInterval(updateCountdown, 1000)
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
  // Ouvrir le client email avec un mailto
  window.location.href = 'mailto:contact@nunaheritage.pf?subject=Demande d\'information - Pack VIP Invest'
}

// Formatage des prix en XPF
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR').format(price)
}

// Pack Te Ohi - 5000 XPF/an
const teOhiPack = {
  name: 'Te Ohi',
  price: 5000,
  period: 'an',
  badge: 'Membre Nuna\'a héritage',
  description: 'Accès complet aux services membres',
  features: [
    'Accès à l\'Academy',
    'Accès aux goodies et aux partenaires',
    'Accès à Nuna\'a Troc',
    '🐚 50 Pūpū offerts',
    'Te Natira\'a à prix membre',
    'Liste Cryptos expertisées #1',
  ],
  buttonLabel: authStore.isAuthenticated ? 'Déjà membre' : 'Choisir ce pack',
  buttonAction: () => {
    if (!authStore.isAuthenticated) {
      navigateTo('/register')
    }
  },
}

// Pack UMETE - 20000 XPF/an
const umetePack = {
  name: 'Umete',
  price: 20000,
  period: 'an',
  badge: 'Membre Premium',
  description: 'Accès premium avec fonctionnalités avancées',
  features: [
    'Tout du pack Te Ohi +',
    '+ 🐚 50 Pūpū offerts (100 au total)',
    'Cours avancés de l\'Academy débloqués',
    'Goodies premium débloqués',
    'Te Natira\'a offert pour 2 personnes',
    'Liste Crypto expertisées #2',
  ],
  buttonLabel: authStore.isAuthenticated ? 'Passer Premium' : 'Choisir ce pack',
  buttonAction: () => {
    if (!authStore.isAuthenticated) {
      navigateTo('/register')
    } else {
      // TODO: Implémenter l'upgrade vers Premium
      toast.add({
        title: 'Fonctionnalité à venir',
        description: 'L\'upgrade vers Premium sera bientôt disponible',
        color: 'info',
      })
    }
  },
  popular: true,
}

// Packs VIP Invest
const vipInvestPacks = [
  {
    name: 'Aratai',
    price: 50000,
    period: 'an',
    description: 'Pack d\'investissement premium',
    buttonLabel: 'Nous contacter',
    buttonAction: handleContactVIP,
  },
  {
    name: 'Fenua',
    price: 150000,
    period: 'an',
    description: 'Pack d\'investissement premium',
    buttonLabel: 'Nous contacter',
    buttonAction: handleContactVIP,
  },
  {
    name: 'Toa',
    price: 300000,
    period: 'an',
    description: 'Pack d\'investissement premium',
    buttonLabel: 'Nous contacter',
    buttonAction: handleContactVIP,
  },
  {
    name: 'Fetia',
    price: 500000,
    period: 'an',
    description: 'Pack d\'investissement premium',
    buttonLabel: 'Nous contacter',
    buttonAction: handleContactVIP,
  },
]
</script>

<template>
  <div class="min-h-screen bg-black">
    <!-- Section Hero -->
    <section class="relative overflow-hidden bg-gradient-to-b from-primary-900/20 via-black to-black px-4 py-16 sm:py-24">
      <div class="relative z-10 mx-auto max-w-7xl">
        <div class="text-center">
          <h1 class="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Tarifs
          </h1>
          <p class="mx-auto max-w-2xl text-lg text-white/70 sm:text-xl">
            Choisissez le pack qui correspond à vos besoins et rejoignez la communauté Nuna'a Heritage
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
              <span>Promo de Lancement du nouveau site</span>
            </div>
            <h2 class="mb-2 text-2xl font-bold text-white sm:text-3xl">
              On double les 🐚 Pūpū
            </h2>
            <p class="text-lg text-primary-300">
              Jusqu'au 10 mars à minuit
            </p>
          </div>
          <div class="mb-6 grid grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <div class="text-center">
              <div class="mb-2 text-2xl font-bold text-white sm:text-3xl md:text-4xl lg:text-5xl">
                {{ countdown.days.toString().padStart(2, '0') }}
              </div>
              <div class="text-xs font-medium text-white/70 sm:text-sm md:text-base">
                Jours
              </div>
            </div>
            <div class="text-center">
              <div class="mb-2 text-2xl font-bold text-white sm:text-3xl md:text-4xl lg:text-5xl">
                {{ countdown.hours.toString().padStart(2, '0') }}
              </div>
              <div class="text-xs font-medium text-white/70 sm:text-sm md:text-base">
                Heures
              </div>
            </div>
            <div class="text-center">
              <div class="mb-2 text-2xl font-bold text-white sm:text-3xl md:text-4xl lg:text-5xl">
                {{ countdown.minutes.toString().padStart(2, '0') }}
              </div>
              <div class="text-xs font-medium text-white/70 sm:text-sm md:text-base">
                Minutes
              </div>
            </div>
            <div class="text-center">
              <div class="mb-2 text-2xl font-bold text-white sm:text-3xl md:text-4xl lg:text-5xl">
                {{ countdown.seconds.toString().padStart(2, '0') }}
              </div>
              <div class="text-xs font-medium text-white/70 sm:text-sm md:text-base">
                Secondes
              </div>
            </div>
          </div>
          <!-- Informations sur les packs -->
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg bg-primary-500/20 p-4 text-center">
              <div class="mb-1 text-sm font-medium text-white/70">Pack Te Ohi</div>
              <div class="text-xl font-bold text-white">
                50 🐚 × 2 = <span class="text-primary-300">100 🐚</span>
              </div>
            </div>
            <div class="rounded-lg bg-primary-500/20 p-4 text-center">
              <div class="mb-1 text-sm font-medium text-white/70">Pack Umete</div>
              <div class="text-xl font-bold text-white">
                100 🐚 × 2 = <span class="text-primary-300">200 🐚</span>
              </div>
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
                  <div>
                    <h3 class="text-2xl font-bold text-white">
                      {{ teOhiPack.name }}
                    </h3>
                    <p class="mt-1 text-sm text-white/60">
                      {{ teOhiPack.description }}
                    </p>
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
                  <span class="text-lg text-white/60">XPF</span>
                  <span class="text-sm text-white/60">/ {{ teOhiPack.period }}</span>
                </div>
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
                  <span class="text-white/80">{{ feature }}</span>
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
                  <div>
                    <h3 class="text-2xl font-bold text-white">
                      {{ umetePack.name }}
                    </h3>
                    <p class="mt-1 text-sm text-white/60">
                      {{ umetePack.description }}
                    </p>
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
                  <span class="text-lg text-white/60">XPF</span>
                  <span class="text-sm text-white/60">/ {{ umetePack.period }}</span>
                </div>
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
                  <span class="text-white/80">{{ feature }}</span>
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
            Packs VIP Invest
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            Pour les investisseurs souhaitant s'engager davantage dans notre communauté
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
                <div>
                  <h3 class="text-xl font-bold text-white">
                    {{ pack.name }}
                  </h3>
                  <p class="mt-1 text-sm text-white/60">
                    {{ pack.description }}
                  </p>
                </div>
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="text-3xl font-bold text-primary-400">
                    {{ formatPrice(pack.price) }}
                  </span>
                  <span class="text-base text-white/60">XPF</span>
                  <span class="text-sm text-white/60">/ {{ pack.period }}</span>
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
