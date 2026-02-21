<script setup lang="ts">
import tenatiraaH1 from '~/assets/images/tenatiraa/tenatiraa.jpeg'
import tenatiraaH2 from '~/assets/images/tenatiraa/tenatiraa1.jpeg'
import tenatiraaH3 from '~/assets/images/tenatiraa/tenatiraa2.jpeg'
import tenatiraaV1 from '~/assets/images/tenatiraa/v1.jpeg'
import tenatiraaV2 from '~/assets/images/tenatiraa/v2.jpeg'
import tenatiraaV3 from '~/assets/images/tenatiraa/v3.jpeg'

definePageMeta({
  layout: 'default',
})

// Compte à rebours pour Te Natira'a - 11 juin 2026 à 8h00
const countdown = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
})

const targetDate = new Date('2026-06-11T08:00:00').getTime()

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
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-gradient-to-b from-primary-900/40 via-black to-black px-4 py-20 sm:py-32">
      <div class="relative z-10 mx-auto max-w-5xl text-center">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-500/20 px-4 py-2 text-sm font-semibold text-primary-300">
          <UIcon name="i-heroicons-sparkles" class="h-5 w-5" />
          <span>Te Natira'a</span>
        </div>
        <h1 class="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
          Un moment de rassemblement
        </h1>
        <p class="mx-auto max-w-3xl text-lg text-white/80 sm:text-xl">
          Rejoignez-nous pour partager la culture, les traditions et créer des liens durables
        </p>
      </div>
      <!-- Effet de fond décoratif -->
      <div class="absolute inset-0 -z-0">
        <div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>
    </section>

    <!-- Compte à rebours -->
    <section class="relative bg-black/50 py-12 sm:py-16">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-900/40 to-primary-800/30 p-8 backdrop-blur-sm">
          <div class="mb-6 text-center">
            <h2 class="mb-2 text-2xl font-bold text-white sm:text-3xl">
              Prochain événement
            </h2>
            <p class="text-lg text-primary-300">
              11 juin 2026 à 8h00
            </p>
          </div>
          <div class="grid grid-cols-4 gap-4 sm:gap-6">
            <div class="text-center">
              <div class="mb-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {{ countdown.days.toString().padStart(2, '0') }}
              </div>
              <div class="text-sm font-medium text-white/70 sm:text-base">
                Jours
              </div>
            </div>
            <div class="text-center">
              <div class="mb-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {{ countdown.hours.toString().padStart(2, '0') }}
              </div>
              <div class="text-sm font-medium text-white/70 sm:text-base">
                Heures
              </div>
            </div>
            <div class="text-center">
              <div class="mb-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {{ countdown.minutes.toString().padStart(2, '0') }}
              </div>
              <div class="text-sm font-medium text-white/70 sm:text-base">
                Minutes
              </div>
            </div>
            <div class="text-center">
              <div class="mb-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {{ countdown.seconds.toString().padStart(2, '0') }}
              </div>
              <div class="text-sm font-medium text-white/70 sm:text-base">
                Secondes
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section Présentation -->
    <section class="relative bg-black/50 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl">
          <div class="mb-12 text-center">
            <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
              Qu'est-ce que le Te Natira'a ?
            </h2>
          </div>
          <div class="space-y-6 text-lg leading-relaxed text-white/90">
            <p>
              Le <strong class="text-primary-300">"Te Natira'a"</strong> est un moment de
              rassemblement pour les membres et les
              invités de Nuna'a Heritage.
            </p>
            <p>
              On s'y retrouve pour partager un repas, mettre
              en avant la culture, les artisans et la musique,
              dans une ambiance conviviale et
              respectueuse.
            </p>
            <p>
              C'est un temps de rencontre, de partage et de
              lien humain.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section Galerie Photos -->
    <section class="relative bg-black py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Moments partagés
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            Découvrez les moments forts de nos précédents rassemblements
          </p>
        </div>

        <div class="space-y-4 sm:space-y-6">
          <!-- 2 photos horizontales, l'une en dessous de l'autre -->
          <div class="grid grid-cols-1 gap-4">
            <div class="group relative aspect-[1600/747] overflow-hidden rounded-2xl shadow-2xl transition-transform hover:scale-[1.02]">
              <img
                :src="tenatiraaH1"
                alt="Te Natira'a - Moment de rassemblement"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="group relative aspect-[1600/747] overflow-hidden rounded-2xl shadow-2xl transition-transform hover:scale-[1.02]">
              <img
                :src="tenatiraaH2"
                alt="Te Natira'a - Moment de rassemblement"
                class="h-full w-full object-cover"
              />
            </div>
          </div>

          <!-- 3 photos verticales sur la même ligne (desktop) -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="group relative aspect-[747/1600] overflow-hidden rounded-2xl shadow-2xl transition-transform hover:scale-[1.02]">
              <img
                :src="tenatiraaV1"
                alt="Te Natira'a - Moment de rassemblement"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="group relative aspect-[747/1600] overflow-hidden rounded-2xl shadow-2xl transition-transform hover:scale-[1.02]">
              <img
                :src="tenatiraaV2"
                alt="Te Natira'a - Moment de rassemblement"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="group relative aspect-[747/1600] overflow-hidden rounded-2xl shadow-2xl transition-transform hover:scale-[1.02]">
              <img
                :src="tenatiraaV3"
                alt="Te Natira'a - Moment de rassemblement"
                class="h-full w-full object-cover"
              />
            </div>
          </div>

          <!-- Dernière photo horizontale -->
          <div class="group relative aspect-[1600/747] overflow-hidden rounded-2xl shadow-2xl transition-transform hover:scale-[1.02]">
            <img
              :src="tenatiraaH3"
              alt="Te Natira'a - Moment de rassemblement"
              class="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Section Informations -->
    <section class="relative bg-gradient-to-br from-primary-900/40 via-primary-800/30 to-primary-900/40 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl">
          <div class="mb-12 text-center">
            <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
              Informations pratiques
            </h2>
          </div>
          <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <UCard class="text-center bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div class="mb-4 flex justify-center">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20">
                  <UIcon name="i-heroicons-calendar" class="h-8 w-8 text-primary-400" />
                </div>
              </div>
              <h3 class="mb-2 text-xl font-bold text-white">
                Date
              </h3>
              <p class="text-white/80">
                11 juin 2026
              </p>
            </UCard>

            <UCard class="text-center bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div class="mb-4 flex justify-center">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20">
                  <UIcon name="i-heroicons-clock" class="h-8 w-8 text-primary-400" />
                </div>
              </div>
              <h3 class="mb-2 text-xl font-bold text-white">
                Heure
              </h3>
              <p class="text-white/80">
                8h00
              </p>
            </UCard>

            <UCard class="text-center sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div class="mb-4 flex justify-center">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20">
                  <UIcon name="i-heroicons-user-group" class="h-8 w-8 text-primary-400" />
                </div>
              </div>
              <h3 class="mb-2 text-xl font-bold text-white">
                Participants
              </h3>
              <p class="text-white/80">
                Membres et invités de Nuna'a Heritage
              </p>
            </UCard>
          </div>
        </div>
      </div>
      <!-- Effet de fond décoratif -->
      <div class="pointer-events-none absolute inset-0 -z-0">
        <div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>
    </section>

    <!-- Section CTA -->
    <section class="relative bg-black py-16 sm:py-20">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-900/30 to-primary-800/20 p-8 sm:p-12 text-center">
          <h2 class="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Rejoignez-nous pour le prochain Te Natira'a
          </h2>
          <p class="mb-8 text-lg text-white/80">
            Participez à ce moment unique de partage et de découverte de la culture polynésienne
          </p>
          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <UButton
              to="/register"
              size="xl"
              color="primary"
              icon="i-heroicons-user-plus"
            >
              S'inscrire
            </UButton>
            <UButton
              to="/"
              size="xl"
              variant="outline"
              icon="i-heroicons-arrow-left"
            >
              Retour à l'accueil
            </UButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
