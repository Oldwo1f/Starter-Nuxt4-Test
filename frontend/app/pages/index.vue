<script setup lang="ts">
import videoUrl from '~/assets/images/nuna-a-heritage-video-presentation.mp4'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'
import tenatiraaImage1 from '~/assets/images/tenatiraa/tenatiraa.jpeg'
import tenatiraaImage2 from '~/assets/images/tenatiraa/tenatiraa1.jpeg'
import { usePollStore } from '~/stores/usePollStore'

definePageMeta({
  layout: 'default',
})

const { appName } = useAppInfo()
const { apiBaseUrl } = useApi()
const pollStore = usePollStore()
const { t } = useI18n()
const { formatDate } = useLocaleDate()

// Sondages actifs pour la home
const activePolls = computed(() => pollStore.activePolls)

// État de l'accordéon - un seul panneau ouvert à la fois, toujours au moins un ouvert
const openAccordion = ref<string>('transmettre')

// Articles à la une
const featuredPosts = ref<any[]>([])
const isLoadingFeatured = ref(false)

// Helper pour obtenir l'URL de l'image
const { getImageUrl: getImageUrlHelper } = useApi()
const getImageUrl = (imagePath: string) => {
  return getImageUrlHelper(imagePath)
}

// Helper pour extraire l'ID YouTube/Vimeo
const getVideoEmbedUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }
  
  return undefined
}

// Récupérer les 2 derniers articles de blog
const fetchFeaturedPosts = async () => {
  isLoadingFeatured.value = true
  try {
    const response = await $fetch<{
      data: any[]
      total: number
    }>(`${apiBaseUrl}/blog`, {
      query: {
        page: 1,
        pageSize: 2,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    })

    featuredPosts.value = response.data.map((post) => ({
      id: post.id,
      title: post.title,
      description: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
      date: new Date(post.createdAt).toISOString(),
      author: post.author?.email || t('home.featuredAuthorFallback'),
      to: `/blog/${post.id}`,
      image: post.images && post.images.length > 0
        ? getImageUrl(post.images[0])
        : null,
      videoUrl: post.videoUrl || null,
    }))
  } catch (error) {
    console.error('Error fetching featured posts:', error)
    featuredPosts.value = []
  } finally {
    isLoadingFeatured.value = false
  }
}

// Charger les articles et sondages au montage
onMounted(() => {
  fetchFeaturedPosts()
  pollStore.fetchActivePolls()
})

// Témoignages de nos membres (placeholder)
const testimonials = [
  {
    name: 'Marie Teva',
    role: 'Membre de la communauté',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    name: 'Jean-Pierre Tama',
    role: 'Artisan partenaire',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    name: 'Sophie Manu',
    role: 'Entrepreneuse',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
]

// Contrôle du son de la vidéo
const videoRef = ref<HTMLVideoElement | null>(null)
const isMuted = ref(true)
const isPlaying = ref(false)
const showPlayButton = ref(true)

// Détecter si la vidéo est en lecture
const handleVideoPlay = () => {
  isPlaying.value = true
  showPlayButton.value = false
}

const handleVideoPause = () => {
  isPlaying.value = false
  showPlayButton.value = true
}

// Lancer la vidéo manuellement
const playVideo = async () => {
  if (videoRef.value) {
    try {
      await videoRef.value.play()
      isPlaying.value = true
      showPlayButton.value = false
    } catch (error) {
      console.error('Erreur lors de la lecture de la vidéo:', error)
    }
  }
}

const toggleVideoSound = () => {
  if (videoRef.value) {
    isMuted.value = !isMuted.value
    videoRef.value.muted = isMuted.value
  }
}

// Vérifier l'état de la vidéo au montage
onMounted(() => {
  if (videoRef.value) {
    // Vérifier si la vidéo est déjà en lecture
    if (!videoRef.value.paused) {
      isPlaying.value = true
      showPlayButton.value = false
    }
    
    // Écouter les événements de lecture
    videoRef.value.addEventListener('play', handleVideoPlay)
    videoRef.value.addEventListener('pause', handleVideoPause)
    videoRef.value.addEventListener('playing', handleVideoPlay)
    
    // Vérifier après un court délai si l'autoplay a fonctionné
    setTimeout(() => {
      if (videoRef.value && videoRef.value.paused) {
        showPlayButton.value = true
      }
    }, 500)
  }
})

// Nettoyer les écouteurs d'événements
onUnmounted(() => {
  if (videoRef.value) {
    videoRef.value.removeEventListener('play', handleVideoPlay)
    videoRef.value.removeEventListener('pause', handleVideoPause)
    videoRef.value.removeEventListener('playing', handleVideoPlay)
  }
})

// Fonction pour gérer l'ouverture/fermeture des panneaux
// Toujours garder au moins un panneau ouvert
const toggleAccordion = (panel: string) => {
  // Si on clique sur le panneau déjà ouvert, ne rien faire (toujours garder un panneau ouvert)
  if (openAccordion.value === panel) {
    return
  }
  // Sinon, ouvrir le nouveau panneau
  openAccordion.value = panel
}

// Fonction pour gérer les clics sur les items
const handleItemClick = (item: { to: string; external: boolean }) => {
  if (item.external) {
    navigateTo(item.to, { external: true })
  } else {
    navigateTo(item.to)
  }
}

// Données de l'accordéon (réactif à la langue)
const accordionSections = computed(() => [
  {
    id: 'transmettre',
    title: t('home.accTransmitTitle'),
    icon: 'i-heroicons-academic-cap',
    description: t('home.accTransmitDesc'),
    items: [
      {
        label: t('home.labelAcademy'),
        to: '/academy',
        icon: 'i-heroicons-academic-cap',
        external: false,
      },
      {
        label: t('home.labelBlog'),
        to: '/blog',
        icon: 'i-heroicons-document-text',
        external: false,
      },
      {
        label: t('home.labelGoodies'),
        to: '/goodies',
        icon: 'i-heroicons-gift',
        external: false,
      },
    ],
  },
  {
    id: 'connecter',
    title: t('home.accConnectTitle'),
    icon: 'i-heroicons-link',
    description: t('home.accConnectDesc'),
    items: [
      {
        label: t('home.labelPartners'),
        to: '/partners',
        icon: 'i-heroicons-building-office-2',
        external: false,
      },
      {
        label: t('home.labelTroc'),
        to: '/marketplace',
        icon: 'i-heroicons-shopping-bag',
        external: false,
      },
      {
        label: t('home.labelTeNatiraa'),
        to: '/te-natiraa',
        icon: 'i-heroicons-sparkles',
        external: false,
      },
    ],
  },
  {
    id: 'inspirer',
    title: t('home.accInspireTitle'),
    icon: 'i-heroicons-light-bulb',
    description: t('home.accInspireDesc'),
    items: [
      {
        label: t('home.labelReportages'),
        to: '/culture#reportages',
        icon: 'i-heroicons-video-camera',
        external: false,
      },
      {
        label: t('home.labelInterviews'),
        to: '/culture#interviews',
        icon: 'i-heroicons-microphone',
        external: false,
      },
      {
        label: t('home.labelPeriodReports'),
        to: 'https://www.tahitivod.pf/discover?locale=fr',
        icon: 'i-heroicons-film',
        external: true,
      },
    ],
  },
])
</script>

<template>
  <div class="min-h-screen">
    <!-- Section Hero avec Slogan -->
    <section class="relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-gradient-to-b from-primary-900/20 via-black to-black px-4 py-20 sm:py-32">
      <div class="relative z-10 mx-auto max-w-5xl text-center">
        <div class="mb-8 flex justify-center">
          <img :src="logoUrl" :alt="appName" class="h-24 w-auto sm:h-32 md:h-40 lg:h-48" />
        </div>
        <h1 class="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
          {{ appName }}
        </h1>
        <div class="mb-8 flex flex-wrap items-center justify-center gap-4 text-2xl font-semibold text-primary-400 sm:text-3xl md:text-4xl lg:gap-8">
          <span class="transition-all hover:scale-105">{{ t('home.pillTransmit') }}</span>
          <span class="text-white/40">•</span>
          <span class="transition-all hover:scale-105">{{ t('home.pillConnect') }}</span>
          <span class="text-white/40">•</span>
          <span class="transition-all hover:scale-105">{{ t('home.pillInspire') }}</span>
        </div>
        <p class="mx-auto max-w-3xl text-lg text-white/80 sm:text-xl">
          {{ t('home.heroSub') }}
        </p>
      </div>
      <!-- Effet de fond décoratif -->
      <div class="absolute inset-0 -z-0">
        <div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>
    </section>

    <SiteBanner />

    <!-- Section Présentation Naho & Nuna'a Heritage -->
    <section class="relative bg-black/50 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid gap-12 lg:grid-cols-2 lg:items-center">
          <!-- Vidéo de présentation -->
          <div class="order-2 lg:order-1">
            <div class="relative aspect-[19/9] overflow-hidden rounded-2xl bg-black shadow-2xl">
              <video
                ref="videoRef"
                :src="videoUrl"
                autoplay
                loop
                :muted="isMuted"
                playsinline
                class="h-full w-full object-cover"
                @play="handleVideoPlay"
                @pause="handleVideoPause"
                @playing="handleVideoPlay"
              />
              <!-- Bouton de lecture -->
              <button
                v-if="showPlayButton"
                @click="playVideo"
                class="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black"
                :aria-label="t('home.playVideoAria')"
              >
                <div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-500/90 backdrop-blur-sm transition-all hover:scale-110 hover:bg-primary-500">
                  <UIcon
                    name="i-heroicons-play"
                    class="ml-1 h-10 w-10 text-white"
                  />
                </div>
              </button>
              <!-- Bouton contrôle du son -->
              <button
                @click="toggleVideoSound"
                class="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black"
                :aria-label="isMuted ? t('home.unmuteAria') : t('home.muteAria')"
              >
                <UIcon
                  :name="isMuted ? 'i-heroicons-speaker-x-mark' : 'i-heroicons-speaker-wave'"
                  class="h-6 w-6 text-white"
                />
              </button>
            </div>
          </div>

          <!-- Texte de présentation -->
          <div class="order-1 space-y-6 lg:order-2">
            
            <div class="space-y-4 text-lg leading-relaxed text-white/90">
              <p>{{ t('home.presentationP1') }}</p>
              <p>{{ t('home.presentationP2') }}</p>
              <p>{{ t('home.presentationP3') }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Accordéon Plein Écran -->
    <section class="relative min-h-screen bg-black py-8">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
            {{ t('home.exploreTitle') }}
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            {{ t('home.exploreSubtitle') }}
          </p>
        </div>

        <div class="space-y-4">
          <div
            v-for="section in accordionSections"
            :key="section.id"
            class="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-white/5 to-white/[0.02] transition-all duration-500"
            :class="{
              'ring-2 ring-primary-500/50 shadow-2xl shadow-primary-500/20': openAccordion === section.id,
            }"
          >
            <!-- En-tête du panneau -->
            <button
              class="flex w-full items-center justify-between p-6 text-left transition-all hover:bg-white/5 sm:p-8"
              @click="toggleAccordion(section.id)"
            >
              <div class="flex items-center gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20 transition-all sm:h-16 sm:w-16"
                  :class="{
                    'bg-primary-500/30 scale-110': openAccordion === section.id,
                  }"
                >
                  <UIcon
                    :name="section.icon"
                    class="h-6 w-6 text-primary-400 transition-all sm:h-8 sm:w-8"
                    :class="{
                      'text-primary-300 scale-110': openAccordion === section.id,
                    }"
                  />
                </div>
                <h3
                  class="text-2xl font-bold text-white transition-all sm:text-3xl md:text-4xl"
                  :class="{
                    'text-primary-400': openAccordion === section.id,
                  }"
                >
                  {{ section.title }}
                </h3>
              </div>
              <UIcon
                name="i-heroicons-chevron-down"
                class="h-6 w-6 text-white/60 transition-all duration-300 sm:h-8 sm:w-8"
                :class="{
                  'rotate-180 text-primary-400': openAccordion === section.id,
                }"
              />
            </button>

            <!-- Contenu du panneau (avec animation) -->
            <div
              class="overflow-hidden transition-all duration-500"
              :class="{
                'max-h-0': openAccordion !== section.id,
                'max-h-[800px]': openAccordion === section.id,
              }"
            >
              <div class="border-t border-white/10 p-6 sm:p-8">
                <!-- Texte de circonstance -->
                <p class="mb-6 text-center text-lg text-white/80 sm:text-xl">
                  {{ section.description }}
                </p>
                
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <UCard
                    v-for="item in section.items"
                    :key="item.label"
                    class="group/item cursor-pointer bg-gradient-to-br from-white/5 to-white/[0.02] border-0 transition-all hover:scale-105 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20"
                    @click="handleItemClick(item)"
                  >
                    <div class="flex items-center gap-4">
                      <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500/20 transition-all group-hover/item:bg-primary-500/30">
                        <UIcon :name="item.icon" class="h-6 w-6 text-primary-400" />
                      </div>
                      <div class="flex-1">
                        <h4 class="font-semibold text-white group-hover/item:text-primary-400">
                          {{ item.label }}
                        </h4>
                        <p
                          v-if="item.external"
                          class="mt-1 text-xs text-white/60"
                        >
                          {{ t('home.externalLink') }}
                        </p>
                      </div>
                      <UIcon
                        name="i-heroicons-arrow-right"
                        class="h-5 w-5 text-white/40 transition-all group-hover/item:translate-x-1 group-hover/item:text-primary-400"
                      />
                    </div>
                  </UCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Bandeau Te Natira'a -->
    <section class="relative overflow-hidden bg-gradient-to-br from-primary-900/40 via-primary-800/30 to-primary-900/40 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid gap-12 lg:grid-cols-2 lg:items-center">
          <!-- Contenu texte -->
          <div class="space-y-6 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 rounded-full bg-primary-500/20 px-4 py-2 text-sm font-semibold text-primary-300">
              <UIcon name="i-heroicons-sparkles" class="h-5 w-5" />
              <span>{{ t('home.teNatiraaBadge') }}</span>
            </div>
            <h2 class="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              {{ t('home.teNatiraaTitle') }}
            </h2>
            <div class="space-y-4 text-lg leading-relaxed text-white/90">
              <p>{{ t('home.teNatiraaP1') }}</p>
              <p>{{ t('home.teNatiraaP2') }}</p>
              <p>{{ t('home.teNatiraaP3') }}</p>
            </div>
            <div class="pt-4">
              <UButton
                to="/te-natiraa"
                size="xl"
                color="primary"
                icon="i-heroicons-sparkles"
                class="group"
              >
                {{ t('home.discoverTeNatiraa') }}
                <UIcon
                  name="i-heroicons-arrow-right"
                  class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                />
              </UButton>
            </div>
          </div>

          <!-- Images horizontales -->
          <div class="grid grid-cols-1 gap-6">
            <div class="relative aspect-[1600/747] overflow-hidden rounded-2xl shadow-2xl">
              <img
                :src="tenatiraaImage1"
                :alt="t('home.altTeNatiraa')"
                class="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </div>
            <div class="relative aspect-[1600/747] overflow-hidden rounded-2xl shadow-2xl">
              <img
                :src="tenatiraaImage2"
                :alt="t('home.altTeNatiraa')"
                class="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- Effet de fond décoratif -->
      <div class="pointer-events-none absolute inset-0 -z-0">
        <div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>
    </section>

    <!-- Section Sondages en cours -->
    <section v-if="activePolls.length > 0" class="relative bg-black/50 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
            {{ t('home.pollsTitle') }}
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            {{ t('home.pollsSubtitle') }}
          </p>
        </div>

        <div v-if="pollStore.isLoading" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
        </div>

        <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PollCard
            v-for="poll in activePolls"
            :key="poll.id"
            :poll="poll"
            :show-response="true"
          />
        </div>

        <div v-if="activePolls.length > 0" class="mt-8 text-center">
          <UButton
            to="/polls"
            size="lg"
            variant="outline"
            icon="i-heroicons-arrow-right"
            class="group"
          >
            {{ t('home.seeAllPolls') }}
            <UIcon
              name="i-heroicons-arrow-right"
              class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </UButton>
        </div>
      </div>
    </section>

    <!-- Bandeau CTA Rejoindre la communauté -->
    <section class="relative bg-gradient-to-r from-primary-600/20 via-primary-500/20 to-primary-600/20 py-16 sm:py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-3xl text-center">
          <h2 class="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {{ t('home.communityTitle') }}
          </h2>
          <p class="mb-8 text-lg text-white/80 sm:text-xl">
            {{ t('home.communitySubtitle') }}
          </p>
          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <UButton
              to="/register"
              size="xl"
              color="primary"
              icon="i-heroicons-user-plus"
            >
              {{ t('home.signup') }}
            </UButton>
            <UButton
              to="/tarifs"
              size="xl"
              variant="outline"
              icon="i-heroicons-currency-dollar"
            >
              {{ t('home.seePricing') }}
            </UButton>
          </div>
        </div>
      </div>
      <!-- Effet de fond décoratif -->
      <div class="pointer-events-none absolute inset-0 -z-0">
        <div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>
    </section>

    <!-- Section Témoignages de nos membres -->
    <!-- <section class="relative bg-black/50 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Témoignages de nos membres
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            Découvrez les expériences et les parcours inspirants de notre communauté
          </p>
        </div>

        <div class="grid gap-8 md:grid-cols-3">
          <div
            v-for="(testimonial, index) in testimonials"
            :key="index"
            class="group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] transition-all hover:scale-[1.02] hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/20"
          >
            <div class="relative aspect-video w-full overflow-hidden bg-black">
              <iframe
                :src="getVideoEmbedUrl(testimonial.videoUrl)"
                class="h-full w-full"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              />
            </div>
            <div class="p-6">
              <h3 class="mb-2 text-xl font-semibold text-white group-hover:text-primary-400">
                {{ testimonial.name }}
              </h3>
              <p class="text-sm text-white/70">
                {{ testimonial.role }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-12 text-center">
          <UButton
            to="/temoignages"
            size="xl"
            color="primary"
            icon="i-heroicons-video-camera"
            class="group"
          >
            Voir tous les témoignages
            <UIcon
              name="i-heroicons-arrow-right"
              class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
            />
          </UButton>
        </div>
      </div>
    </section> -->

    <!-- Section À la une -->
    <section v-if="featuredPosts.length > 0" class="relative bg-black/50 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
            {{ t('home.featuredTitle') }}
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            {{ t('home.featuredSubtitle') }}
          </p>
        </div>

        <div v-if="isLoadingFeatured" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
        </div>

        <div v-else class="grid gap-8 md:grid-cols-2">
          <UCard
            v-for="post in featuredPosts"
            :key="post.id"
            class="group cursor-pointer overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-0 transition-all hover:scale-[1.02] hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/20"
            @click="navigateTo(post.to)"
          >
            <template #header>
              <!-- Vidéo (priorité sur les images) -->
              <div v-if="post.videoUrl" class="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
                <iframe
                  v-if="getVideoEmbedUrl(post.videoUrl)"
                  :src="getVideoEmbedUrl(post.videoUrl)"
                  class="h-full w-full transition-transform group-hover:scale-105"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                />
                <div v-else class="flex h-full items-center justify-center bg-white/10">
                  <UIcon name="i-heroicons-video-camera" class="h-12 w-12 text-white/40" />
                </div>
              </div>
              <!-- Image si pas de vidéo -->
              <div v-else-if="post.image" class="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
                <img
                  :src="post.image"
                  :alt="post.title"
                  class="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <!-- Placeholder si ni vidéo ni image -->
              <div v-else class="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
                <UIcon name="i-heroicons-document-text" class="h-16 w-16 text-primary-400/60" />
              </div>
            </template>
            <div class="space-y-4">
              <h3 class="text-2xl font-bold text-white transition-colors group-hover:text-primary-400">
                {{ post.title }}
              </h3>
              <p class="line-clamp-3 text-white/80">
                {{ post.description }}
              </p>
              <div class="flex items-center justify-between border-t border-white/10 pt-4">
                <div class="flex items-center gap-4 text-sm text-white/60">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-user" class="h-4 w-4" />
                    <span>{{ post.author }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
                    <span>{{ formatDate(post.date) }}</span>
                  </div>
                </div>
                <UIcon
                  name="i-heroicons-arrow-right"
                  class="h-5 w-5 text-white/40 transition-all group-hover:translate-x-1 group-hover:text-primary-400"
                />
              </div>
            </div>
          </UCard>
        </div>

        <div v-if="featuredPosts.length > 0" class="mt-8 text-center">
          <UButton
            to="/blog"
            size="lg"
            variant="outline"
            icon="i-heroicons-arrow-right"
            class="group"
          >
            {{ t('home.seeAllArticles') }}
            <UIcon
              name="i-heroicons-arrow-right"
              class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
