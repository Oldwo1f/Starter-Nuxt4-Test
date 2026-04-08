<script setup lang="ts">
definePageMeta({
  layout: 'academy',
})

import Player from '@vimeo/player'
import { useAcademyStore } from '~/stores/useAcademyStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { useApi } from '~/composables/useApi'
import type { AcademyProgressUpdateResponse } from '~/stores/useAcademyStore'

const route = useRoute()
const academyStore = useAcademyStore()
const authStore = useAuthStore()
const { apiBaseUrl, getImageUrl: getImageUrlHelper } = useApi()
const { t } = useI18n()
const toast = useToast()

// Helper to get image URL
const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  return getImageUrlHelper(imagePath)
}

const courseId = computed(() => parseInt(route.params.id as string, 10))
const currentVideo = ref<any>(null)
const videoPlayer = ref<HTMLVideoElement | null>(null)
const vimeoIframeRef = ref<HTMLIFrameElement | null>(null)
const youtubeIframeRef = ref<HTMLIFrameElement | null>(null)
const isVideoLoading = ref(false)
let lastProgressUpdate = 0
const PROGRESS_UPDATE_INTERVAL = 5000 // Update last watched every 5 seconds
let vimeoPlayer: Player | null = null
let ytPlayer: {
  getCurrentTime?: () => number
  getDuration?: () => number
  destroy?: () => void
} | null = null
let ytProgressTimer: ReturnType<typeof setInterval> | null = null
let ytIframeApiLoading: Promise<void> | null = null

// Check if user can access the course
const canAccessCourse = computed(() => {
  if (!academyStore.currentCourse) return false
  return academyStore.canAccessCourse(academyStore.currentCourse)
})

// Message d'accès au cours (selon accessLevel)
const courseAccessHint = computed(() => {
  const course = academyStore.currentCourse
  if (!course) return ''
  const level = course.accessLevel
  if (level === 'public') return t('academyCourse.access.public')
  if (level === 'member') return t('academyCourse.access.member')
  if (level === 'premium') return t('academyCourse.access.premium')
  if (level === 'vip') return t('academyCourse.access.vip')
  return t('academyCourse.access.default')
})

// Check if user has partial access (first module only)
const hasPartialAccess = computed(() => {
  if (!academyStore.currentCourse) return false
  return academyStore.hasPartialAccess(academyStore.currentCourse)
})

// Get first module (lowest order)
const firstModule = computed(() => {
  if (!academyStore.currentCourse?.modules) return null
  const sortedModules = [...academyStore.currentCourse.modules].sort((a, b) => a.order - b.order)
  return sortedModules[0] || null
})

// Check if a module is accessible
const canAccessModule = (module: any) => {
  if (!academyStore.currentCourse) return false
  return academyStore.canAccessModule(module, academyStore.currentCourse)
}

// Check if a video is accessible
const canAccessVideo = (video: any, module: any) => {
  if (!academyStore.currentCourse) return false
  return academyStore.canAccessVideo(video, module, academyStore.currentCourse)
}

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

// Detect video type (YouTube, Vimeo, or file)
const getVideoType = (url: string | null | undefined): 'youtube' | 'vimeo' | 'file' => {
  if (!url) return 'file'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('vimeo.com')) return 'vimeo'
  return 'file'
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

// Convert Vimeo URL to embed URL
const getVimeoEmbedUrl = (url: string) => {
  if (!url) return ''
  
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }
  
  return ''
}

// Generic function to get embed URL for YouTube or Vimeo
const getVideoEmbedUrl = (url: string | null | undefined) => {
  if (!url) return null
  
  const type = getVideoType(url)
  if (type === 'youtube') return getYouTubeEmbedUrl(url)
  if (type === 'vimeo') return getVimeoEmbedUrl(url)
  return null
}

/** Vimeo Player.js — api=1 requis pour le tracking */
const buildVimeoPlayerSrc = (pageUrl: string) => {
  const embed = getVimeoEmbedUrl(pageUrl)
  if (!embed) return ''
  return embed.includes('?') ? `${embed}&api=1` : `${embed}?api=1`
}

/** YouTube IFrame API */
const buildYouTubePlayerSrc = (pageUrl: string) => {
  const embed = getYouTubeEmbedUrl(pageUrl)
  if (!embed) return ''
  const origin =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''
  const sep = embed.includes('?') ? '&' : '?'
  return `${embed}${sep}enablejsapi=1${origin ? `&origin=${origin}` : ''}`
}

function notifyNewBadges(res: Pick<AcademyProgressUpdateResponse, 'newBadges'>) {
  if (!res?.newBadges?.length) return
  for (const code of res.newBadges) {
    const key = `account.badges.codes.${code}.name`
    const title = t(key)
    const label = title === key ? t('account.badges.earnedFallback') : title
    toast.add({
      title: label,
      color: 'success',
      icon: 'i-heroicons-trophy',
    })
  }
}

async function applyEmbedPlaybackProgress(percent: number) {
  if (!authStore.isAuthenticated || !currentVideo.value) return
  const videoId = currentVideo.value.id
  const now = Date.now()
  if (percent >= 80 && !isVideoCompleted(videoId)) {
    const res = await academyStore.updateProgress(courseId.value, videoId, videoId, true)
    lastProgressUpdate = now
    notifyNewBadges(res)
    return
  }
  if (percent > 10 && now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
    const res = await academyStore.updateProgress(courseId.value, videoId, videoId, false)
    lastProgressUpdate = now
    notifyNewBadges(res)
  }
}

async function markEmbedEndedAndAdvance() {
  if (currentVideo.value && authStore.isAuthenticated) {
    const v = currentVideo.value
    if (!isVideoCompleted(v.id)) {
      const res = await academyStore.updateProgress(courseId.value, v.id, v.id, true)
      lastProgressUpdate = Date.now()
      notifyNewBadges(res)
    }
    if (nextVideo.value) {
      currentVideo.value = nextVideo.value.video
    }
  } else if (currentVideo.value && !authStore.isAuthenticated && nextVideo.value) {
    currentVideo.value = nextVideo.value.video
  }
}

function stopYoutubeProgressPolling() {
  if (ytProgressTimer) {
    clearInterval(ytProgressTimer)
    ytProgressTimer = null
  }
}

function ensureYoutubeIframeApi(): Promise<void> {
  if (!import.meta.client) return Promise.resolve()
  const w = window as Window & {
    YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => typeof ytPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
  if (w.YT?.Player) return Promise.resolve()
  if (ytIframeApiLoading) return ytIframeApiLoading

  ytIframeApiLoading = new Promise<void>((resolve) => {
    const finish = () => {
      ytIframeApiLoading = null
      resolve()
    }
    const previous = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      previous?.()
      finish()
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    const started = Date.now()
    const poll = setInterval(() => {
      if (w.YT?.Player) {
        clearInterval(poll)
        finish()
      } else if (Date.now() - started > 12000) {
        clearInterval(poll)
        finish()
      }
    }, 100)
  })
  return ytIframeApiLoading
}

async function destroyEmbedPlayers() {
  stopYoutubeProgressPolling()
  if (vimeoPlayer) {
    try {
      await vimeoPlayer.destroy()
    } catch {
      /* iframe peut être déjà détruit */
    }
    vimeoPlayer = null
  }
  if (ytPlayer?.destroy) {
    try {
      ytPlayer.destroy()
    } catch {
      /* ignore */
    }
    ytPlayer = null
  }
}

const handleVimeoIframeLoad = async () => {
  isVideoLoading.value = false
  if (!import.meta.client || !authStore.isAuthenticated || !currentVideo.value?.videoUrl) return
  if (getVideoType(currentVideo.value.videoUrl) !== 'vimeo') return
  const row = allVideos.value.find((v) => v.video.id === currentVideo.value!.id)
  if (!row || !canAccessVideo(currentVideo.value!, row.module)) return

  try {
    if (vimeoPlayer) {
      try {
        await vimeoPlayer.destroy()
      } catch {
        /* ignore */
      }
      vimeoPlayer = null
    }
    const el = vimeoIframeRef.value
    if (!el) return
    vimeoPlayer = new Player(el)
    vimeoPlayer.on('timeupdate', (data: { percent?: number }) => {
      const pct = (data.percent ?? 0) * 100
      void applyEmbedPlaybackProgress(pct)
    })
    vimeoPlayer.on('ended', () => {
      void markEmbedEndedAndAdvance()
    })
  } catch (e) {
    console.warn('Vimeo player API failed', e)
  }
}

const handleYoutubeIframeLoad = async () => {
  isVideoLoading.value = false
  if (!import.meta.client || !authStore.isAuthenticated || !currentVideo.value?.videoUrl) return
  if (getVideoType(currentVideo.value.videoUrl) !== 'youtube') return
  const row = allVideos.value.find((v) => v.video.id === currentVideo.value!.id)
  if (!row || !canAccessVideo(currentVideo.value!, row.module)) return

  try {
    stopYoutubeProgressPolling()
    if (ytPlayer?.destroy) {
      try {
        ytPlayer.destroy()
      } catch {
        /* ignore */
      }
      ytPlayer = null
    }

    await ensureYoutubeIframeApi()
    const w = window as Window & {
      YT: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => typeof ytPlayer }
    }
    if (!youtubeIframeRef.value || !w.YT?.Player) return

    ytPlayer = new w.YT.Player(youtubeIframeRef.value, {
      events: {
        onStateChange: (ev: { data: number }) => {
          if (ev.data === 0) {
            stopYoutubeProgressPolling()
            void markEmbedEndedAndAdvance()
            return
          }
          if (ev.data === 1) {
            stopYoutubeProgressPolling()
            ytProgressTimer = setInterval(() => {
              try {
                if (!ytPlayer?.getCurrentTime || !ytPlayer.getDuration || !currentVideo.value) return
                const cur = ytPlayer.getCurrentTime()
                const dur = ytPlayer.getDuration()
                if (!dur || dur <= 0) return
                void applyEmbedPlaybackProgress((cur / dur) * 100)
              } catch {
                /* ignore */
              }
            }, 2000)
            return
          }
          stopYoutubeProgressPolling()
        },
      },
    })
  } catch (e) {
    console.warn('YouTube player API failed', e)
  }
}

// Load course
onMounted(async () => {
  try {
    await academyStore.fetchCourse(courseId.value)
    
    // Set initial video (last watched or first)
    if (academyStore.currentCourse) {
      // Only set last watched if user is authenticated
      if (authStore.isAuthenticated) {
        const lastWatchedId = academyStore.currentCourse.progress?.lastVideoWatchedId
        if (lastWatchedId) {
          const lastWatched = allVideos.value.find((v) => v.video.id === lastWatchedId)
          if (lastWatched) {
            currentVideo.value = lastWatched.video
            return
          }
        }
      }
      // Otherwise, set first accessible video
      if (allVideos.value.length > 0) {
        // Find first accessible video
        const firstAccessible = allVideos.value.find((v) => {
          return canAccessVideo(v.video, v.module)
        })
        if (firstAccessible) {
          currentVideo.value = firstAccessible.video
        } else if (allVideos.value.length > 0) {
          // Fallback to first video if none accessible
          currentVideo.value = allVideos.value[0].video
        }
      }
    }
  } catch (error) {
    console.error('Error fetching course:', error)
  }
})

// Watch for video changes
watch(currentVideo, async () => {
  await destroyEmbedPlayers()
  if (!currentVideo.value) return
  const vt = currentVideo.value.videoUrl ? getVideoType(currentVideo.value.videoUrl) : 'file'
  if (vt === 'youtube' || vt === 'vimeo') {
    isVideoLoading.value = true
  } else if (videoPlayer.value) {
    isVideoLoading.value = true
    videoPlayer.value.load()
  }
})

onBeforeUnmount(() => {
  void destroyEmbedPlayers()
})

// Handle video ended (fichier uploadé uniquement — YouTube/Vimeo via Player API)
const handleVideoEnded = async () => {
  if (currentVideo.value && authStore.isAuthenticated) {
    const videoType = currentVideo.value.videoUrl ? getVideoType(currentVideo.value.videoUrl) : 'file'
    if (videoType === 'file') {
      const res = await academyStore.updateProgress(
        courseId.value,
        currentVideo.value.id,
        currentVideo.value.id,
        true,
      )
      lastProgressUpdate = Date.now()
      notifyNewBadges(res)
    }

    if (nextVideo.value) {
      currentVideo.value = nextVideo.value.video
    }
  } else if (currentVideo.value && !authStore.isAuthenticated) {
    if (nextVideo.value) {
      currentVideo.value = nextVideo.value.video
    }
  }
}

// Handle video time update (mark as completed at 80%) — lecteur fichier uniquement
const handleTimeUpdate = async () => {
  if (!authStore.isAuthenticated) {
    return
  }

  if (!videoPlayer.value || !currentVideo.value) return
  if (currentVideo.value.videoUrl && getVideoType(currentVideo.value.videoUrl) !== 'file') {
    return
  }

  const video = videoPlayer.value
  const progress = (video.currentTime / video.duration) * 100
  const currentTime = Date.now()

  if (progress >= 80 && !isVideoCompleted(currentVideo.value.id)) {
    const res = await academyStore.updateProgress(courseId.value, currentVideo.value.id, currentVideo.value.id, true)
    lastProgressUpdate = currentTime
    notifyNewBadges(res)
    return
  }

  if (progress > 10 && currentTime - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
    const res = await academyStore.updateProgress(courseId.value, currentVideo.value.id, currentVideo.value.id, false)
    lastProgressUpdate = currentTime
    notifyNewBadges(res)
  }
}

// Select video
const selectVideo = async (video: any) => {
  // Trouver le module parent de la vidéo
  const videoWithModule = allVideos.value.find((v) => v.video.id === video.id)
  if (!videoWithModule) {
    return
  }

  // Vérifier l'accès à la vidéo spécifique
  if (!canAccessVideo(video, videoWithModule.module)) {
    return
  }

  currentVideo.value = video
  if (video && authStore.isAuthenticated) {
    const res = await academyStore.updateProgress(courseId.value, video.id, video.id, false)
    lastProgressUpdate = Date.now()
    notifyNewBadges(res)
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
      <p class="text-red-500">{{ t('academyCourse.notFound') }}</p>
      <UButton to="/academy" class="mt-4" icon="i-heroicons-arrow-left">
        {{ t('academyCourse.backAcademy') }}
      </UButton>
    </div>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <UButton to="/academy" variant="ghost" icon="i-heroicons-arrow-left" class="mb-4">
          {{ t('academyCourse.back') }}
        </UButton>

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
              {{ [academyStore.currentCourse.instructorFirstName, academyStore.currentCourse.instructorLastName].filter(Boolean).join(' ') || t('academyCourse.instructorFallback') }}
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
              {{ t('academyCourse.learnMore') }}
            </a>
          </div>
        </div>
        
        <!-- Overall progress -->
        <div v-if="academyStore.currentCourse.progress" class="mt-4 space-y-2">
          <div class="flex items-center justify-between text-sm text-white/60">
            <span>{{ t('academyCourse.globalProgress') }}</span>
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
              <!-- Lock overlay for restricted courses (only if no partial access) -->
              <div
                v-if="!canAccessCourse && !hasPartialAccess"
                class="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              >
                <div class="text-center">
                  <UIcon name="i-heroicons-lock-closed" class="mx-auto mb-2 h-12 w-12 text-white/80" />
                  <p class="text-sm font-medium text-white">{{ courseAccessHint }}</p>
                  <UButton
                    to="/pricing"
                    size="sm"
                    color="primary"
                    class="mt-3"
                    icon="i-heroicons-arrow-up-right"
                  >
                    {{ t('home.seePricing') }}
                  </UButton>
                </div>
              </div>
              
              <!-- Check if current video is accessible -->
              <template v-if="currentVideo">
                <!-- Find the module for current video -->
                <template v-if="allVideos.find(v => v.video.id === currentVideo.id)">
                  <!-- YouTube video -->
                  <iframe
                    v-if="canAccessVideo(currentVideo, allVideos.find(v => v.video.id === currentVideo.id)!.module) && currentVideo.videoUrl && getVideoType(currentVideo.videoUrl) === 'youtube'"
                    ref="youtubeIframeRef"
                    :key="`yt-${currentVideo.id}`"
                    :src="buildYouTubePlayerSrc(currentVideo.videoUrl)"
                    class="h-full w-full"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    @load="handleYoutubeIframeLoad"
                  />
                  <!-- Vimeo video -->
                  <iframe
                    v-else-if="canAccessVideo(currentVideo, allVideos.find(v => v.video.id === currentVideo.id)!.module) && currentVideo.videoUrl && getVideoType(currentVideo.videoUrl) === 'vimeo'"
                    ref="vimeoIframeRef"
                    :key="`vm-${currentVideo.id}`"
                    :src="buildVimeoPlayerSrc(currentVideo.videoUrl)"
                    class="h-full w-full"
                    frameborder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowfullscreen
                    @load="handleVimeoIframeLoad"
                  />
                  <!-- Uploaded video file -->
                  <video
                    v-else-if="canAccessVideo(currentVideo, allVideos.find(v => v.video.id === currentVideo.id)!.module)"
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
                  <!-- Lock overlay for non-accessible videos -->
                  <div
                    v-else
                    class="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                  >
                    <div class="text-center">
                      <UIcon name="i-heroicons-lock-closed" class="mx-auto mb-2 h-12 w-12 text-white/80" />
                      <p class="text-sm font-medium text-white">{{ t('academyCourse.premiumVideo') }}</p>
                      <UButton
                        to="/pricing"
                        size="sm"
                        color="primary"
                        class="mt-3"
                        icon="i-heroicons-arrow-up-right"
                      >
                        {{ t('home.seePricing') }}
                      </UButton>
                    </div>
                  </div>
                </template>
              </template>
              
              <div
                v-if="isVideoLoading && (canAccessCourse || hasPartialAccess)"
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
                  {{ t('academyCourse.completed') }}
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
                {{ t('academyCourse.prev') }}
              </UButton>
              <UButton
                v-if="nextVideo"
                variant="outline"
                trailing-icon="i-heroicons-arrow-right"
                @click="selectVideo(nextVideo.video)"
              >
                {{ t('academyCourse.next') }}
              </UButton>
            </div>
          </div>

          <div v-else class="flex h-96 items-center justify-center rounded-lg bg-white/5">
            <p class="text-white/60">{{ t('academyCourse.selectVideo') }}</p>
          </div>
        </div>

        <!-- Sidebar - Course content -->
        <div class="lg:col-span-1">
          <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <template #header>
              <h3 class="font-semibold">{{ t('academyCourse.summary') }}</h3>
            </template>

            <div class="space-y-4">
              <div
                v-for="module in academyStore.currentCourse.modules"
                :key="module.id"
                :class="[
                  'space-y-2',
                  !canAccessModule(module) && 'opacity-60'
                ]"
              >
                <!-- Module header -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium">{{ module.title }}</h4>
                    <UIcon
                      v-if="!canAccessModule(module)"
                      name="i-heroicons-lock-closed"
                      class="h-4 w-4 text-white/60"
                    />
                  </div>
                  <span
                    v-if="academyStore.currentCourse.progress"
                    class="text-xs text-white/60"
                  >
                    {{ getModuleProgress(module) }}%
                  </span>
                </div>
                
                <!-- Message for locked modules -->
                <div
                  v-if="!canAccessModule(module)"
                  class="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70"
                >
                  <p>{{ t('academyCourse.modulePremium') }} <NuxtLink to="/pricing" class="text-primary-400 hover:underline">{{ t('academyCourse.upgradeLink') }}</NuxtLink>{{ t('academyCourse.upgradeSuffix') }}</p>
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
                      !canAccessVideo(video, module) && 'opacity-50 cursor-not-allowed',
                    ]"
                    :disabled="!canAccessVideo(video, module)"
                    @click="selectVideo(video)"
                  >
                    <div class="flex items-center justify-between">
                      <span class="flex items-center gap-2">
                        <UIcon
                          v-if="!canAccessVideo(video, module)"
                          name="i-heroicons-lock-closed"
                          class="h-4 w-4 text-white/60"
                        />
                        <UIcon
                          v-else-if="isVideoCompleted(video.id)"
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
