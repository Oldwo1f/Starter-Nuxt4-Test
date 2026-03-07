<script setup lang="ts">
import { useCultureStore } from '~/stores/useCultureStore'
import type { Culture } from '~/stores/useCultureStore'
import tahitiVodVerticale from '~/assets/images/tahiti-vod-verticale.jpg'
import tahitiVodHorizontale from '~/assets/images/tahiti-vod-horizontale.jpg'

definePageMeta({
  layout: 'default',
})

const cultureStore = useCultureStore()

// Helper pour obtenir l'URL d'embed YouTube à partir d'une URL YouTube
const getYouTubeEmbedUrl = (url: string) => {
  // Formats supportés :
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(youtubeRegex)
  
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`
  }
  
  return null
}

// Helper pour obtenir la miniature YouTube
const getYouTubeThumbnail = (url: string) => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(youtubeRegex)
  
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
  }
  
  return null
}

// Organiser les vidéos par catégories
const videoCategories = computed(() => {
  const categories = [
    {
      id: 'reportages',
      title: 'Reportages',
      icon: 'i-heroicons-video-camera',
      description: 'Découvrez nos reportages sur la culture polynésienne',
      type: 'reportage' as const,
    },
    {
      id: 'interviews',
      title: 'Interviews',
      icon: 'i-heroicons-microphone',
      description: 'Rencontres avec les acteurs de la culture polynésienne',
      type: 'interview' as const,
    },
  ]

  return categories.map(category => ({
    ...category,
    videos: cultureStore.cultures.filter(video => video.type === category.type),
  }))
})

// État pour gérer la vidéo sélectionnée (modal)
const selectedVideo = ref<Culture | null>(null)

// État pour gérer l'ouverture du modal
const isModalOpen = computed({
  get: () => selectedVideo.value !== null,
  set: (value: boolean) => {
    if (!value) {
      selectedVideo.value = null
    }
  },
})

const openVideo = (video: Culture) => {
  selectedVideo.value = video
}

const closeVideo = () => {
  selectedVideo.value = null
}

// Formatage de la date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Charger les vidéos au montage
onMounted(() => {
  cultureStore.fetchCultures()
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- En-tête -->
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Culture</h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        Découvrez nos reportages et interviews sur la culture polynésienne
      </p>
    </div>

    <!-- Navigation par ancres -->
    <div class="mb-12 flex flex-wrap justify-center gap-4">
      <UButton
        to="#reportages"
        variant="ghost"
        color="primary"
        icon="i-heroicons-video-camera"
      >
        Reportages
      </UButton>
      <UButton
        to="#interviews"
        variant="ghost"
        color="primary"
        icon="i-heroicons-microphone"
      >
        Interviews
      </UButton>
    </div>

    <!-- Catégories de vidéos -->
    <div class="space-y-16">
      <div
        v-for="category in videoCategories"
        :key="category.id"
        :id="category.id"
        class="scroll-mt-20 space-y-6"
      >
        <!-- En-tête de catégorie -->
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/20">
            <UIcon :name="category.icon" class="h-6 w-6 text-primary-400" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white sm:text-3xl">
              {{ category.title }}
            </h2>
            <p class="text-white/70">
              {{ category.description }}
            </p>
          </div>
        </div>

        <!-- Grille de vidéos -->
        <div v-if="category.videos.length > 0" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <UCard
            v-for="video in category.videos"
            :key="video.id"
            class="group cursor-pointer bg-gradient-to-br from-white/5 to-white/[0.02] border-0 transition-all hover:scale-105 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20"
            @click="openVideo(video)"
          >
            <template #header>
              <!-- Miniature YouTube -->
              <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                <img
                  v-if="getYouTubeThumbnail(video.youtubeUrl)"
                  :src="getYouTubeThumbnail(video.youtubeUrl)!"
                  :alt="video.title"
                  class="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center bg-white/10"
                >
                  <UIcon name="i-heroicons-video-camera" class="h-12 w-12 text-white/40" />
                </div>
                <!-- Overlay avec icône play -->
                <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/90 backdrop-blur-sm">
                    <UIcon name="i-heroicons-play" class="ml-1 h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </template>

            <div class="space-y-2">
              <h3 class="font-semibold text-white line-clamp-2 group-hover:text-primary-400">
                {{ video.title }}
              </h3>
              <div v-if="video.director" class="flex items-center gap-2 text-sm text-white/70">
                <UIcon name="i-heroicons-user" class="h-4 w-4" />
                <span>{{ video.director }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-white/60">
                <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
                <span>{{ formatDate(video.createdAt) }}</span>
              </div>
            </div>
          </UCard>
        </div>
        <div v-else class="py-8 text-center text-white/60">
          <UIcon :name="category.icon" class="mx-auto mb-4 h-12 w-12" />
          <p>Aucune vidéo disponible dans cette catégorie</p>
        </div>
      </div>
    </div>

    <!-- Modal pour afficher la vidéo -->
    <UModal
      v-model:open="isModalOpen"
      :ui="{
        wrapper: 'w-full max-w-5xl',
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-xl font-bold text-white">
              {{ selectedVideo?.title }}
            </h3>
            <div v-if="selectedVideo?.director" class="mt-2 flex items-center gap-2 text-sm text-white/70">
              <UIcon name="i-heroicons-user" class="h-4 w-4" />
              <span>Réalisateur : {{ selectedVideo.director }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <!-- Player YouTube -->
          <div v-if="selectedVideo" class="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              v-if="getYouTubeEmbedUrl(selectedVideo.youtubeUrl)"
              :src="getYouTubeEmbedUrl(selectedVideo.youtubeUrl)!"
              class="h-full w-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center"
            >
              <p class="text-white/60">URL YouTube invalide</p>
            </div>
          </div>

          <!-- Informations supplémentaires -->
          <div v-if="selectedVideo" class="flex items-center gap-4 text-sm text-white/60">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
              <span>{{ formatDate(selectedVideo.createdAt) }}</span>
            </div>
            <UBadge
              :color="
                selectedVideo.type === 'reportage'
                  ? 'info'
                  : 'success'
              "
              variant="subtle"
            >
              {{ selectedVideo.type === 'reportage' ? 'Reportage' : 'Interview' }}
            </UBadge>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Bandeau Tahiti VOD -->
    <div class="mt-16 w-full">
      <!-- Version mobile (verticale) -->
      <div class="relative block overflow-hidden rounded-lg md:hidden">
        <img
          :src="tahitiVodVerticale"
          alt="Tahiti VOD"
          class="h-full w-full object-cover"
        />
        <div class="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
          <UButton
            href="https://www.tahitivod.pf/discover?locale=fr"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            size="lg"
            class="w-full"
          >
            Accéder à TAHITI-VOD
          </UButton>
        </div>
      </div>

      <!-- Version desktop (horizontale) -->
      <div class="relative hidden overflow-hidden rounded-lg md:block">
        <img
          :src="tahitiVodHorizontale"
          alt="Tahiti VOD"
          class="h-full w-full object-cover"
        />
        <div class="absolute inset-0 flex items-center justify-end bg-gradient-to-l from-black/80 via-black/40 to-transparent pr-8">
          <UButton
            href="https://www.tahitivod.pf/discover?locale=fr"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            size="lg"
          >
            Accéder à TAHITI-VOD
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
