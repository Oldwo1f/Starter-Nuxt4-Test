<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

import { useAcademyStore } from '~/stores/useAcademyStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const academyStore = useAcademyStore()
const authStore = useAuthStore()
const { apiBaseUrl, getImageUrl: getImageUrlHelper } = useApi()

// Helper to get image URL
const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  return getImageUrlHelper(imagePath)
}

const courseId = computed(() => parseInt(route.params.id as string, 10))
const currentVideo = ref<any>(null)
const videoPlayer = ref<HTMLVideoElement | null>(null)
const isVideoLoading = ref(false)
let lastProgressUpdate = 0
const PROGRESS_UPDATE_INTERVAL = 5000 // Update last watched every 5 seconds

// Get all videos from course
const allVideos = computed(() => {
  if (!academyStore.currentCourse) return []
  const videos: Array<{ video: any; module: any; course: any }> = []
  academyStore.currentCourse.modules?.forEach((module) => {
    module.videos?.forEach((video) => {
      videos.push({ video, module, course: academyStore.currentCourse })
    })
  })
  return videos.sort((a, b) => {
    if (a.module.order !== b.module.order) {
      return a.module.order - b.module.order
    }
    return a.video.order - b.video.order
  })
})

// Get current video index
const currentVideoIndex = computed(() => {
  if (!currentVideo.value) return -1
  return allVideos.value.findIndex((v) => v.video.id === currentVideo.value.id)
})

// Get next video
const nextVideo = computed(() => {
  const index = currentVideoIndex.value
  if (index >= 0 && index < allVideos.value.length - 1) {
    return allVideos.value[index + 1]
  }
  return null
})

// Get previous video
const previousVideo = computed(() => {
  const index = currentVideoIndex.value
  if (index > 0) {
    return allVideos.value[index - 1]
  }
  return null
})

// Check if video is completed
const isVideoCompleted = (videoId: number) => {
  return academyStore.currentCourse?.progress?.completedVideos.includes(videoId) || false
}

// Format duration
const formatDuration = (seconds: number | null | undefined) => {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Get video URL - YouTube en priorité, sinon fichier uploadé
const getVideoUrl = (video: any) => {
  // Priorité à YouTube si présent
  if (video.videoUrl) {
    return video.videoUrl
  }
  // Sinon utiliser le fichier uploadé
  if (video.videoFile) {
    if (video.videoFile.startsWith('http')) return video.videoFile
    // S'assurer que le chemin commence par / pour éviter les URLs mal formées
    let path = video.videoFile.startsWith('/') ? video.videoFile : `/${video.videoFile}`
    // Encoder les espaces et autres caractères spéciaux dans les noms de fichiers/dossiers
    // On encode chaque segment du chemin séparément pour préserver les /
    const pathSegments = path.split('/')
    const encodedSegments = pathSegments.map(segment => {
      if (!segment) return segment // Garder les segments vides (début/fin)
      return encodeURIComponent(segment)
    })
    path = encodedSegments.join('/')
    return `${apiBaseUrl}${path}`
  }
  return ''
}

// Convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return ''
  
  // Handle different YouTube URL formats
  let videoId = ''
  
  // Standard format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) {
    videoId = watchMatch[1]
  }
  
  // Short format: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/)
  if (shortMatch) {
    videoId = shortMatch[1]
  }
  
  // Embed format: already embed URL
  if (url.includes('youtube.com/embed/')) {
    return url
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`
  }
  
  return url
}

// Load course
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  try {
    await academyStore.fetchCourse(courseId.value)
    
    // Set initial video (last watched or first)
    if (academyStore.currentCourse) {
      const lastWatchedId = academyStore.currentCourse.progress?.lastVideoWatchedId
      if (lastWatchedId) {
        const lastWatched = allVideos.value.find((v) => v.video.id === lastWatchedId)
        if (lastWatched) {
          currentVideo.value = lastWatched.video
          return
        }
      }
      // Otherwise, set first video
      if (allVideos.value.length > 0) {
        currentVideo.value = allVideos.value[0].video
      }
    }
  } catch (error) {
    console.error('Error fetching course:', error)
  }
})

// Watch for video changes
watch(currentVideo, () => {
  if (videoPlayer.value && currentVideo.value) {
    isVideoLoading.value = true
    videoPlayer.value.load()
  }
})

// Handle video ended
const handleVideoEnded = async () => {
  if (currentVideo.value) {
    // Ne pas tracker la fin pour les vidéos YouTube (nécessite l'API YouTube)
    if (!currentVideo.value.videoUrl || (!currentVideo.value.videoUrl.includes('youtube.com') && !currentVideo.value.videoUrl.includes('youtu.be'))) {
      // Mark as completed
      await academyStore.updateProgress(courseId.value, currentVideo.value.id, currentVideo.value.id, true)
    }
    
    // Auto-play next video if available
    if (nextVideo.value) {
      currentVideo.value = nextVideo.value.video
    }
  }
}

// Handle video time update (mark as completed at 80%)
const handleTimeUpdate = async () => {
  // Ne pas tracker la progression pour les vidéos YouTube (nécessite l'API YouTube)
  if (currentVideo.value?.videoUrl && (currentVideo.value.videoUrl.includes('youtube.com') || currentVideo.value.videoUrl.includes('youtu.be'))) {
    return
  }
  
  if (!videoPlayer.value || !currentVideo.value) return
  
  const video = videoPlayer.value
  const progress = (video.currentTime / video.duration) * 100
  const currentTime = Date.now()
  
  // Mark as completed if watched 80% and not already completed
  if (progress >= 80 && !isVideoCompleted(currentVideo.value.id)) {
    await academyStore.updateProgress(courseId.value, currentVideo.value.id, currentVideo.value.id, true)
    lastProgressUpdate = currentTime
    return
  }
  
  // Update last watched (but don't mark as completed) - only update every 5 seconds to avoid too many requests
  if (progress > 10 && (currentTime - lastProgressUpdate) >= PROGRESS_UPDATE_INTERVAL) {
    await academyStore.updateProgress(courseId.value, currentVideo.value.id, currentVideo.value.id, false)
    lastProgressUpdate = currentTime
  }
}

// Select video
const selectVideo = async (video: any) => {
  currentVideo.value = video
  // Update last watched when selecting a video
  if (video) {
    await academyStore.updateProgress(courseId.value, video.id, video.id, false)
    lastProgressUpdate = Date.now()
  }
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Get progress for module
const getModuleProgress = (module: any) => {
  if (!academyStore.currentCourse?.progress) return 0
  const moduleVideos = module.videos || []
  if (moduleVideos.length === 0) return 0
  const completed = moduleVideos.filter((v: any) =>
    academyStore.currentCourse?.progress?.completedVideos.includes(v.id)
  ).length
  return Math.round((completed / moduleVideos.length) * 100)
}

// Get overall progress
const overallProgress = computed(() => {
  if (!academyStore.currentCourse?.progress) return 0
  return Math.round(academyStore.currentCourse.progress.progressPercentage)
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div v-if="academyStore.isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="!academyStore.currentCourse" class="py-12 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-4 h-12 w-12 text-red-500" />
      <p class="text-red-500">Cours non trouvé</p>
      <UButton to="/academy" class="mt-4" icon="i-heroicons-arrow-left">
        Retour à l'academy
      </UButton>
    </div>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <UButton to="/academy" variant="ghost" icon="i-heroicons-arrow-left" class="mb-4">
          Retour
        </UButton>
        
        <!-- Thumbnail image -->
        <div v-if="getImageUrl(academyStore.currentCourse.thumbnailImage)" class="mb-6">
          <div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            <img
              :src="getImageUrl(academyStore.currentCourse.thumbnailImage)"
              :alt="academyStore.currentCourse.title"
              class="h-full w-full object-cover"
            />
          </div>
        </div>
        
        <h1 class="text-3xl font-bold">{{ academyStore.currentCourse.title }}</h1>
        <p v-if="academyStore.currentCourse.description" class="mt-2 text-white/70">
          {{ academyStore.currentCourse.description }}
        </p>
        
        <!-- Instructor information -->
        <div
          v-if="academyStore.currentCourse.instructorFirstName || academyStore.currentCourse.instructorLastName || academyStore.currentCourse.instructorAvatar"
          class="mt-6 flex items-start gap-4 rounded-lg bg-white/5 p-4"
        >
          <div v-if="academyStore.currentCourse.instructorAvatar" class="flex-shrink-0">
            <img
              :src="getImageUrl(academyStore.currentCourse.instructorAvatar)"
              :alt="`${academyStore.currentCourse.instructorFirstName || ''} ${academyStore.currentCourse.instructorLastName || ''}`.trim()"
              class="h-20 w-20 rounded-full object-cover"
            />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold">
              {{ [academyStore.currentCourse.instructorFirstName, academyStore.currentCourse.instructorLastName].filter(Boolean).join(' ') || 'Formateur' }}
            </h3>
            <p v-if="academyStore.currentCourse.instructorTitle" class="mt-1 text-sm text-white/70">
              {{ academyStore.currentCourse.instructorTitle }}
            </p>
            <a
              v-if="academyStore.currentCourse.instructorLink"
              :href="academyStore.currentCourse.instructorLink"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
            >
              <UIcon name="i-heroicons-link" class="h-4 w-4" />
              En savoir plus
            </a>
          </div>
        </div>
        
        <!-- Overall progress -->
        <div v-if="academyStore.currentCourse.progress" class="mt-4 space-y-2">
          <div class="flex items-center justify-between text-sm text-white/60">
            <span>Progression globale</span>
            <span>{{ overallProgress }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full bg-primary-500 transition-all duration-300"
              :style="{ width: `${overallProgress}%` }"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Video player -->
        <div class="lg:col-span-2">
          <div v-if="currentVideo" class="space-y-4">
            <!-- Video player -->
            <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <!-- YouTube video -->
              <iframe
                v-if="currentVideo.videoUrl && (currentVideo.videoUrl.includes('youtube.com') || currentVideo.videoUrl.includes('youtu.be'))"
                :src="getYouTubeEmbedUrl(currentVideo.videoUrl)"
                class="h-full w-full"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                @load="isVideoLoading = false"
              />
              <!-- Uploaded video file -->
              <video
                v-else
                ref="videoPlayer"
                :src="getVideoUrl(currentVideo)"
                controls
                preload="metadata"
                playsinline
                webkit-playsinline
                x5-playsinline
                class="h-full w-full"
                @ended="handleVideoEnded"
                @timeupdate="handleTimeUpdate"
                @loadeddata="isVideoLoading = false"
                @error="(e) => {
                  const video = e.target as HTMLVideoElement
                  const error = video.error
                  console.error('Video playback error:', {
                    error: error ? {
                      code: error.code,
                      message: error.message,
                    } : null,
                    networkState: video.networkState,
                    readyState: video.readyState,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                  })
                  if (error && error.code === 3) {
                    console.error('Codec vidéo non supporté. La vidéo doit être en MP4 avec codec H.264')
                  }
                }"
                @loadedmetadata="(e) => {
                  const video = e.target as HTMLVideoElement
                  console.log('Video metadata:', {
                    duration: video.duration,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                  })
                }"
              />
              <div
                v-if="isVideoLoading"
                class="absolute inset-0 flex items-center justify-center bg-black/50"
              >
                <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-white" />
              </div>
            </div>

            <!-- Video info -->
            <div>
              <h2 class="text-xl font-semibold">{{ currentVideo.title }}</h2>
              <p v-if="currentVideo.description" class="mt-2 text-white/70">
                {{ currentVideo.description }}
              </p>
              <div class="mt-2 flex items-center gap-4 text-sm text-white/60">
                <span v-if="currentVideo.duration">
                  <UIcon name="i-heroicons-clock" class="mr-1 inline h-4 w-4" />
                  {{ formatDuration(currentVideo.duration) }}
                </span>
                <span v-if="isVideoCompleted(currentVideo.id)" class="text-primary-400">
                  <UIcon name="i-heroicons-check-circle" class="mr-1 inline h-4 w-4" />
                  Complété
                </span>
              </div>
            </div>

            <!-- Navigation -->
            <div class="flex gap-2">
              <UButton
                v-if="previousVideo"
                variant="outline"
                icon="i-heroicons-arrow-left"
                @click="selectVideo(previousVideo.video)"
              >
                Précédent
              </UButton>
              <UButton
                v-if="nextVideo"
                variant="outline"
                trailing-icon="i-heroicons-arrow-right"
                @click="selectVideo(nextVideo.video)"
              >
                Suivant
              </UButton>
            </div>
          </div>

          <div v-else class="flex h-96 items-center justify-center rounded-lg bg-white/5">
            <p class="text-white/60">Sélectionnez une vidéo pour commencer</p>
          </div>
        </div>

        <!-- Sidebar - Course content -->
        <div class="lg:col-span-1">
          <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
            <template #header>
              <h3 class="font-semibold">Sommaire</h3>
            </template>

            <div class="space-y-4">
              <div
                v-for="module in academyStore.currentCourse.modules"
                :key="module.id"
                class="space-y-2"
              >
                <!-- Module header -->
                <div class="flex items-center justify-between">
                  <h4 class="font-medium">{{ module.title }}</h4>
                  <span
                    v-if="academyStore.currentCourse.progress"
                    class="text-xs text-white/60"
                  >
                    {{ getModuleProgress(module) }}%
                  </span>
                </div>
                
                <!-- Module progress bar -->
                <div
                  v-if="academyStore.currentCourse.progress"
                  class="h-1 w-full overflow-hidden rounded-full bg-white/10"
                >
                  <div
                    class="h-full bg-primary-500 transition-all duration-300"
                    :style="{ width: `${getModuleProgress(module)}%` }"
                  />
                </div>

                <!-- Videos in module -->
                <div class="space-y-1 pl-4">
                  <button
                    v-for="video in module.videos"
                    :key="video.id"
                    :class="[
                      'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      currentVideo?.id === video.id
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'hover:bg-white/10 text-white/70',
                      isVideoCompleted(video.id) && 'text-primary-300',
                    ]"
                    @click="selectVideo(video)"
                  >
                    <div class="flex items-center justify-between">
                      <span class="flex items-center gap-2">
                        <UIcon
                          v-if="isVideoCompleted(video.id)"
                          name="i-heroicons-check-circle"
                          class="h-4 w-4 text-primary-400"
                        />
                        <span>{{ video.title }}</span>
                      </span>
                      <span v-if="video.duration" class="text-xs text-white/40">
                        {{ formatDuration(video.duration) }}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
