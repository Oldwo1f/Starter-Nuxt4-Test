<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Gestion de l\'Academy',
})

import { useAcademyStore } from '~/stores/useAcademyStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { useApi } from '~/composables/useApi'

const academyStore = useAcademyStore()
const authStore = useAuthStore()
const { getImageUrl } = useApi()
const router = useRouter()
const toast = useToast()

// Fetch courses on mount
onMounted(async () => {
  try {
    await academyStore.fetchCourses()
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors du chargement des cours',
      color: 'error',
    })
  }
})

// Delete course
const handleDelete = async (courseId: number, courseTitle: string) => {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer le cours "${courseTitle}" ?`)) {
    return
  }

  try {
    await academyStore.deleteCourse(courseId)
    toast.add({
      title: 'Succès',
      description: 'Cours supprimé avec succès',
      color: 'success',
    })
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la suppression',
      color: 'error',
    })
  }
}

// Get image URL helper
const getImageUrlHelper = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  return getImageUrl(imagePath)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Gestion de l'Academy</h1>
        <p class="mt-1 text-sm text-white/60">Gérez les cours, modules et vidéos</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        @click="router.push('/admin/academy/new')"
      >
        Nouveau cours
      </UButton>
    </div>

    <div v-if="academyStore.isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="academyStore.courses.length > 0" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="course in academyStore.courses"
        :key="course.id"
        class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
      >
        <template #header>
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
            
            <!-- Published badge -->
            <div
              v-if="course.isPublished"
              class="absolute top-2 right-2 rounded-full bg-green-500/90 px-3 py-1 text-xs font-semibold text-white"
            >
              Publié
            </div>
            <div
              v-else
              class="absolute top-2 right-2 rounded-full bg-gray-500/90 px-3 py-1 text-xs font-semibold text-white"
            >
              Brouillon
            </div>
          </div>
        </template>

        <div class="space-y-3">
          <div>
            <h3 class="font-semibold">{{ course.title }}</h3>
            <p v-if="course.description" class="mt-1 line-clamp-2 text-sm text-white/70">
              {{ course.description }}
            </p>
          </div>

          <div class="flex items-center gap-2 text-xs text-white/60">
            <UIcon name="i-heroicons-folder" class="h-4 w-4" />
            <span>{{ course.modules?.length || 0 }} module{{ (course.modules?.length || 0) > 1 ? 's' : '' }}</span>
          </div>

          <div class="flex gap-2">
            <UButton
              variant="outline"
              size="sm"
              icon="i-heroicons-pencil"
              @click="router.push(`/admin/academy/${course.id}`)"
            >
              Éditer
            </UButton>
            <UButton
              variant="outline"
              size="sm"
              color="red"
              icon="i-heroicons-trash"
              @click="handleDelete(course.id, course.title)"
            >
              Supprimer
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="py-12 text-center text-white/60">
      <UIcon name="i-heroicons-academic-cap" class="mx-auto mb-4 h-12 w-12" />
      <p>Aucun cours pour le moment</p>
      <UButton
        class="mt-4"
        icon="i-heroicons-plus"
        @click="router.push('/admin/academy/new')"
      >
        Créer le premier cours
      </UButton>
    </div>
  </div>
</template>
