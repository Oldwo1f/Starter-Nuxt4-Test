<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

import { useAcademyStore } from '~/stores/useAcademyStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { useApi } from '~/composables/useApi'

const academyStore = useAcademyStore()
const authStore = useAuthStore()
const { getImageUrl } = useApi()
const router = useRouter()

// Fetch courses on mount
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  try {
    await academyStore.fetchCourses()
  } catch (error) {
    console.error('Error fetching courses:', error)
  }
})

// Helper to get image URL
const getImageUrlHelper = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  return getImageUrl(imagePath)
}

// Format progress percentage
const formatProgress = (progress?: { progressPercentage: number }) => {
  if (!progress) return 0
  return Math.round(progress.progressPercentage)
}

// Check if user can access a course
const canAccess = (course: Course) => {
  return academyStore.canAccessCourse(course)
}

// Get access message for a course
const getAccessMessage = (course: Course) => {
  return academyStore.getAccessMessage(course)
}

// Handle course click
const handleCourseClick = (course: Course) => {
  if (canAccess(course)) {
    router.push(`/academy/${course.id}`)
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <ProfileIncompleteBanner />
    
    <div class="mb-8 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Academy</h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        Découvrez nos cours et progressez à votre rythme
      </p>
    </div>

    <div v-if="academyStore.isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="academyStore.courses.length > 0" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="course in academyStore.courses"
        :key="course.id"
        class="relative bg-gradient-to-br from-white/5 to-white/[0.02] border-0 transition-transform hover:scale-105"
        :class="{ 'cursor-pointer hover:border-primary-500/50': canAccess(course) }"
        @click="handleCourseClick(course)"
      >
        <template #header>
          <!-- Thumbnail -->
          <div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            <img
              v-if="getImageUrlHelper(course.thumbnailImage)"
              :src="getImageUrlHelper(course.thumbnailImage)"
              :alt="course.title"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full items-center justify-center bg-white/10">
              <UIcon name="i-heroicons-academic-cap" class="h-12 w-12 text-white/40" />
            </div>
            
            <!-- Progress badge -->
            <div
              v-if="course.progress"
              class="absolute top-2 right-2 rounded-full bg-primary-500/90 px-3 py-1 text-xs font-semibold text-white"
            >
              {{ formatProgress(course.progress) }}%
            </div>
          </div>
        </template>
        
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h3 class="flex-1 font-semibold line-clamp-2">{{ course.title }}</h3>
            <UBadge 
              v-if="course.accessLevel === 'public'"
              color="neutral"
              variant="outline"
              size="xs"
            >
              Public
            </UBadge>
            <UBadge 
              v-else-if="course.accessLevel === 'member'"
              color="success"
              variant="subtle"
              size="xs"
            >
              Membre
            </UBadge>
            <UBadge 
              v-else-if="course.accessLevel === 'premium'"
              color="warning"
              variant="subtle"
              size="xs"
            >
              Premium
            </UBadge>
            <UBadge 
              v-else-if="course.accessLevel === 'vip'"
              class="bg-purple-500/20 text-purple-400 ring-1 ring-inset ring-purple-500/50"
              variant="subtle"
              size="xs"
            >
              VIP
            </UBadge>
          </div>
          <p v-if="course.description" class="line-clamp-3 text-sm text-white/70">
            {{ course.description }}
          </p>
          
          <!-- Progress bar -->
          <div v-if="course.progress" class="space-y-1">
            <div class="flex items-center justify-between text-xs text-white/60">
              <span>Progression</span>
              <span>{{ formatProgress(course.progress) }}%</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full bg-primary-500 transition-all duration-300"
                :style="{ width: `${formatProgress(course.progress)}%` }"
              />
            </div>
          </div>
          
          <!-- Module count -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs text-white/60">
              <UIcon name="i-heroicons-folder" class="h-4 w-4" />
              <span>{{ course.modules?.length || 0 }} module{{ (course.modules?.length || 0) > 1 ? 's' : '' }}</span>
            </div>
            
            <!-- Bouton avec cadenas si le cours est restreint et l'utilisateur n'a pas accès -->
            <UButton
              v-if="!canAccess(course)"
              disabled
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-heroicons-lock-closed"
              class="opacity-50 cursor-not-allowed"
              @click.stop
            >
              {{ getAccessMessage(course) }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="py-12 text-center text-white/60">
      <UIcon name="i-heroicons-academic-cap" class="mx-auto mb-4 h-12 w-12" />
      <p>Aucun cours disponible pour le moment</p>
    </div>
  </div>
</template>
