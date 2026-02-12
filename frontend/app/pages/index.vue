<script setup lang="ts">
import videoUrl from '~/assets/images/nuna-a-heritage-video-presentation.mp4'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'

definePageMeta({
  layout: 'default',
})

const { appName } = useAppInfo()
const { apiBaseUrl } = useApi()

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
      author: post.author?.email || 'Auteur',
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

// Charger les articles au montage
onMounted(() => {
  fetchFeaturedPosts()
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

const toggleVideoSound = () => {
  if (videoRef.value) {
    isMuted.value = !isMuted.value
    videoRef.value.muted = isMuted.value
  }
}

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

// Données de l'accordéon
const accordionSections = [
  {
    id: 'transmettre',
    title: 'Transmettre',
    icon: 'i-heroicons-academic-cap',
    description: 'Partagez et transmettez le savoir, la culture et les connaissances à travers nos ressources éducatives, nos articles et nos contenus gratuits.',
    items: [
      {
        label: 'Académie',
        to: 'https://nunaaheritage.schoolmaker.co/products',
        icon: 'i-heroicons-academic-cap',
        external: true,
      },
      {
        label: 'Blog',
        to: '/blog',
        icon: 'i-heroicons-document-text',
        external: false,
      },
      {
        label: 'Goodies',
        to: '/goodies',
        icon: 'i-heroicons-gift',
        external: false,
      },
    ],
  },
  {
    id: 'connecter',
    title: 'Connecter',
    icon: 'i-heroicons-link',
    description: 'Créez des liens entre les personnes, les communautés et les initiatives locales. Rejoignez notre réseau de partenaires et participez à notre écosystème de troc.',
    items: [
      {
        label: 'Annuaire des Partenaires',
        to: '/partners',
        icon: 'i-heroicons-building-office-2',
        external: false,
      },
      {
        label: 'Nuna\'a Troc',
        to: '/marketplace',
        icon: 'i-heroicons-shopping-bag',
        external: false,
      },
      {
        label: 'Te Natira\'a',
        to: '/te-natiraa',
        icon: 'i-heroicons-sparkles',
        external: false,
      },
    ],
  },
  {
    id: 'inspirer',
    title: 'Inspirer',
    icon: 'i-heroicons-light-bulb',
    description: 'Découvrez des histoires, des témoignages et des documentaires qui inspirent les générations d\'aujourd\'hui et de demain. Plongez dans la richesse de notre culture polynésienne.',
    items: [
      {
        label: 'Reportages',
        to: '/culture#reportages',
        icon: 'i-heroicons-video-camera',
        external: false,
      },
      {
        label: 'Documentaires',
        to: '/culture#documentaires',
        icon: 'i-heroicons-film',
        external: false,
      },
      {
        label: 'Interviews',
        to: '/culture#interviews',
        icon: 'i-heroicons-microphone',
        external: false,
      },
    ],
  },
]
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
          <span class="transition-all hover:scale-105">Transmettre</span>
          <span class="text-white/40">•</span>
          <span class="transition-all hover:scale-105">Connecter</span>
          <span class="text-white/40">•</span>
          <span class="transition-all hover:scale-105">Inspirer</span>
        </div>
        <p class="mx-auto max-w-3xl text-lg text-white/80 sm:text-xl">
          Bâtir aujourd'hui l'héritage de demain
        </p>
      </div>
      <!-- Effet de fond décoratif -->
      <div class="absolute inset-0 -z-0">
        <div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>
    </section>

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
              />
              <!-- Bouton contrôle du son -->
              <button
                @click="toggleVideoSound"
                class="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black"
                :aria-label="isMuted ? 'Activer le son' : 'Désactiver le son'"
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
              <p>
                Nuna'a Heritage est une initiative créée en mars 2024 pour transmettre
                la culture, les valeurs et le savoir, tout en les reliant au monde
                moderne.
              </p>
              <p>
                Elle développe des projets locaux, éducation sur les marchés financiers
                culturels et entrepreneuriaux pour inspirer les générations d'aujourd'hui
                et de demain.
              </p>
              <p>
                Nuna'a Heritage a été fondée par <strong class="text-primary-400">Fabien Nohorai (Naho)</strong>, artiste et
                entrepreneur polynésien, avec une vision simple : <strong class="text-primary-400">bâtir aujourd'hui
                l'héritage de demain</strong>.
              </p>
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
            Explorez nos univers
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            Découvrez les différentes facettes de Nuna'a Heritage
          </p>
        </div>

        <div class="space-y-4">
          <div
            v-for="section in accordionSections"
            :key="section.id"
            class="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] transition-all duration-500"
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
                    class="group/item cursor-pointer bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 transition-all hover:scale-105 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20"
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
                          Lien externe
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
              <span>Te Natira'a</span>
            </div>
            <h2 class="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              Un moment de rassemblement
            </h2>
            <div class="space-y-4 text-lg leading-relaxed text-white/90">
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
            <div class="pt-4">
              <UButton
                to="/te-natiraa"
                size="xl"
                color="primary"
                icon="i-heroicons-sparkles"
                class="group"
              >
                Découvrir Te Natira'a
                <UIcon
                  name="i-heroicons-arrow-right"
                  class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                />
              </UButton>
            </div>
          </div>

          <!-- Images placeholder -->
          <div class="grid grid-cols-2 gap-4">
            <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 shadow-2xl">
              <div class="absolute inset-0 flex items-center justify-center">
                <UIcon name="i-heroicons-photo" class="h-16 w-16 text-primary-300/40" />
              </div>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p class="text-xs text-white/80">Photo à venir</p>
              </div>
            </div>
            <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600/20 to-primary-500/20 shadow-2xl mt-8">
              <div class="absolute inset-0 flex items-center justify-center">
                <UIcon name="i-heroicons-photo" class="h-16 w-16 text-primary-300/40" />
              </div>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p class="text-xs text-white/80">Photo à venir</p>
              </div>
            </div>
            <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 shadow-2xl -mt-4">
              <div class="absolute inset-0 flex items-center justify-center">
                <UIcon name="i-heroicons-photo" class="h-16 w-16 text-primary-300/40" />
              </div>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p class="text-xs text-white/80">Photo à venir</p>
              </div>
            </div>
            <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600/20 to-primary-500/20 shadow-2xl mt-4">
              <div class="absolute inset-0 flex items-center justify-center">
                <UIcon name="i-heroicons-photo" class="h-16 w-16 text-primary-300/40" />
              </div>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p class="text-xs text-white/80">Photo à venir</p>
              </div>
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

    <!-- Section À la une -->
    <section v-if="featuredPosts.length > 0" class="relative bg-black/50 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
            À la une
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            Découvrez nos derniers articles de blog
          </p>
        </div>

        <div v-if="isLoadingFeatured" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
        </div>

        <div v-else class="grid gap-8 md:grid-cols-2">
          <UCard
            v-for="post in featuredPosts"
            :key="post.id"
            class="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/20"
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
                    <span>{{ new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
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
            Voir tous les articles
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
            Rejoignez la communauté
          </h2>
          <p class="mb-8 text-lg text-white/80 sm:text-xl">
            Participez à l'écosystème Nuna'a Heritage et découvrez tous nos services
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
              to="/tarifs"
              size="xl"
              variant="outline"
              icon="i-heroicons-currency-dollar"
            >
              Voir les tarifs
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
    <section class="relative bg-black/50 py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Témoignages de nos membres
          </h2>
          <p class="mx-auto max-w-2xl text-lg text-white/70">
            Découvrez les expériences et les parcours inspirants de notre communauté
          </p>
        </div>

        <!-- Grille de 3 vidéos -->
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

        <!-- CTA vers la page témoignages -->
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
    </section>
  </div>
</template>
