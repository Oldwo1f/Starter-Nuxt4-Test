<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Édition du cours',
})

import { useAcademyStore } from '~/stores/useAcademyStore'
import { useAuthStore } from '~/stores/useAuthStore'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const academyStore = useAcademyStore()
const authStore = useAuthStore()
const { getImageUrl } = useApi()
const toast = useToast()

const courseId = computed(() => {
  const id = route.params.id
  if (id === 'new') return null
  return parseInt(id as string, 10)
})

const isNewCourse = computed(() => courseId.value === null)

// Course form
const courseForm = ref({
  title: '',
  description: '',
  thumbnailImage: null as File | null,
  existingThumbnailImage: null as string | null,
  isPublished: false,
  order: 0,
  instructorAvatar: null as File | null,
  existingInstructorAvatar: null as string | null,
  instructorFirstName: '',
  instructorLastName: '',
  instructorTitle: '',
  instructorLink: '',
})

// Module form
const moduleForm = ref({
  title: '',
  description: '',
  order: 0,
})

// Video form
const videoForm = ref({
  title: '',
  description: '',
  videoFile: null as File | null,
  existingVideoFile: null as string | null,
  videoUrl: null as string | null,
  duration: null as number | null,
  order: 0,
})

// UI state
const isSaving = ref(false)
const selectedModuleId = ref<number | null>(null)
const selectedVideoId = ref<number | null>(null)
const isModuleModalOpen = ref(false)
const isVideoModalOpen = ref(false)
const isEditModule = ref(false)
const isEditVideo = ref(false)
const isUploadingVideo = ref(false)
const uploadProgress = ref(0)

// Load course if editing
onMounted(async () => {
  if (courseId.value) {
    try {
      await academyStore.fetchCourse(courseId.value)
      if (academyStore.currentCourse) {
        courseForm.value = {
          title: academyStore.currentCourse.title,
          description: academyStore.currentCourse.description || '',
          thumbnailImage: null,
          existingThumbnailImage: academyStore.currentCourse.thumbnailImage,
          isPublished: academyStore.currentCourse.isPublished,
          order: academyStore.currentCourse.order,
          instructorAvatar: null,
          existingInstructorAvatar: academyStore.currentCourse.instructorAvatar,
          instructorFirstName: academyStore.currentCourse.instructorFirstName || '',
          instructorLastName: academyStore.currentCourse.instructorLastName || '',
          instructorTitle: academyStore.currentCourse.instructorTitle || '',
          instructorLink: academyStore.currentCourse.instructorLink || '',
        }
      }
    } catch (error: any) {
      toast.add({
        title: 'Erreur',
        description: error.message || 'Erreur lors du chargement du cours',
        color: 'error',
      })
    }
  }
})

// Save course
const saveCourse = async () => {
  if (!courseForm.value.title.trim()) {
    toast.add({
      title: 'Erreur',
      description: 'Le titre est requis',
      color: 'error',
    })
    return
  }

  isSaving.value = true
  try {
    const courseData: any = {
      title: courseForm.value.title,
      description: courseForm.value.description || undefined,
      isPublished: courseForm.value.isPublished,
      order: courseForm.value.order,
      instructorFirstName: courseForm.value.instructorFirstName || undefined,
      instructorLastName: courseForm.value.instructorLastName || undefined,
      instructorTitle: courseForm.value.instructorTitle || undefined,
      instructorLink: courseForm.value.instructorLink || undefined,
    }

    // Handle thumbnail image
    if (courseForm.value.thumbnailImage) {
      // Upload thumbnail image
      if (!isNewCourse.value && courseId.value) {
        const formData = new FormData()
        formData.append('image', courseForm.value.thumbnailImage)
        const { apiBaseUrl } = useApi()
        const { accessToken } = authStore
        const response = await $fetch<{ thumbnailImage: string }>(`${apiBaseUrl}/academy/${courseId.value}/thumbnail`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        })
        courseData.thumbnailImage = response.thumbnailImage
      }
    } else if (courseForm.value.existingThumbnailImage) {
      courseData.thumbnailImage = courseForm.value.existingThumbnailImage
    }

    // Handle instructor avatar
    if (courseForm.value.instructorAvatar) {
      // Upload instructor avatar
      if (!isNewCourse.value && courseId.value) {
        const formData = new FormData()
        formData.append('avatar', courseForm.value.instructorAvatar)
        const { apiBaseUrl } = useApi()
        const { accessToken } = authStore
        const response = await $fetch<{ instructorAvatar: string }>(`${apiBaseUrl}/academy/${courseId.value}/instructor-avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        })
        courseData.instructorAvatar = response.instructorAvatar
      }
    } else if (courseForm.value.existingInstructorAvatar) {
      courseData.instructorAvatar = courseForm.value.existingInstructorAvatar
    }

    if (isNewCourse.value) {
      const createdCourse = await academyStore.createCourse(courseData)
      // Upload thumbnail after course creation if needed
      if (courseForm.value.thumbnailImage && createdCourse.id) {
        const formData = new FormData()
        formData.append('image', courseForm.value.thumbnailImage)
        const { apiBaseUrl } = useApi()
        const { accessToken } = authStore
        const response = await $fetch<{ thumbnailImage: string }>(`${apiBaseUrl}/academy/${createdCourse.id}/thumbnail`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        })
        await academyStore.updateCourse(createdCourse.id, {
          thumbnailImage: response.thumbnailImage,
        })
      }
      // Upload instructor avatar after course creation if needed
      if (courseForm.value.instructorAvatar && createdCourse.id) {
        const formData = new FormData()
        formData.append('avatar', courseForm.value.instructorAvatar)
        const { apiBaseUrl } = useApi()
        const { accessToken } = authStore
        const response = await $fetch<{ instructorAvatar: string }>(`${apiBaseUrl}/academy/${createdCourse.id}/instructor-avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        })
        await academyStore.updateCourse(createdCourse.id, {
          instructorAvatar: response.instructorAvatar,
        })
      }
      toast.add({
        title: 'Succès',
        description: 'Cours créé avec succès',
        color: 'success',
      })
      router.push(`/admin/academy/${academyStore.currentCourse?.id}`)
    } else {
      await academyStore.updateCourse(courseId.value!, courseData)
      toast.add({
        title: 'Succès',
        description: 'Cours mis à jour avec succès',
        color: 'success',
      })
      await academyStore.fetchCourse(courseId.value!)
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la sauvegarde',
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

// Open module modal
const openModuleModal = (module?: any) => {
  if (module) {
    isEditModule.value = true
    moduleForm.value = {
      title: module.title,
      description: module.description || '',
      order: module.order,
    }
    selectedModuleId.value = module.id
  } else {
    isEditModule.value = false
    moduleForm.value = {
      title: '',
      description: '',
      order: academyStore.currentCourse?.modules?.length || 0,
    }
    selectedModuleId.value = null
  }
  isModuleModalOpen.value = true
}

// Save module
const saveModule = async () => {
  if (!moduleForm.value.title.trim()) {
    toast.add({
      title: 'Erreur',
      description: 'Le titre est requis',
      color: 'error',
    })
    return
  }

  if (!courseId.value) {
    toast.add({
      title: 'Erreur',
      description: 'Veuillez d\'abord sauvegarder le cours',
      color: 'error',
    })
    return
  }

  try {
    if (isEditModule.value && selectedModuleId.value) {
      await academyStore.updateModule(selectedModuleId.value, moduleForm.value)
      toast.add({
        title: 'Succès',
        description: 'Module mis à jour avec succès',
        color: 'success',
      })
    } else {
      await academyStore.createModule({
        courseId: courseId.value,
        ...moduleForm.value,
      })
      toast.add({
        title: 'Succès',
        description: 'Module créé avec succès',
        color: 'success',
      })
    }
    isModuleModalOpen.value = false
    await academyStore.fetchCourse(courseId.value)
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la sauvegarde',
      color: 'error',
    })
  }
}

// Delete module
const deleteModule = async (moduleId: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce module ?')) return

  try {
    await academyStore.deleteModule(moduleId)
    toast.add({
      title: 'Succès',
      description: 'Module supprimé avec succès',
      color: 'success',
    })
    if (courseId.value) {
      await academyStore.fetchCourse(courseId.value)
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la suppression',
      color: 'error',
    })
  }
}

// Open video modal
const openVideoModal = (moduleId: number, video?: any) => {
  if (video) {
    isEditVideo.value = true
    selectedVideoId.value = video.id
    videoForm.value = {
      title: video.title,
      description: video.description || '',
      videoFile: null,
      existingVideoFile: video.videoFile || null,
      videoUrl: video.videoUrl || null,
      duration: video.duration,
      order: video.order,
    }
    selectedModuleId.value = moduleId
  } else {
    isEditVideo.value = false
    selectedVideoId.value = null
    videoForm.value = {
      title: '',
      description: '',
      videoFile: null,
      existingVideoFile: null,
      videoUrl: null,
      duration: null,
      order: 0,
    }
    selectedModuleId.value = moduleId
  }
  isVideoModalOpen.value = true
  isUploadingVideo.value = false
  uploadProgress.value = 0
}

// Save video
const saveVideo = async () => {
  if (!videoForm.value.title.trim()) {
    toast.add({
      title: 'Erreur',
      description: 'Le titre est requis',
      color: 'error',
    })
    return
  }

  if (!selectedModuleId.value) {
    toast.add({
      title: 'Erreur',
      description: 'Module non sélectionné',
      color: 'error',
    })
    return
  }

  try {
    let videoFileUrl = videoForm.value.existingVideoFile

    // Upload video if new
    if (videoForm.value.videoFile) {
      isUploadingVideo.value = true
      uploadProgress.value = 0
      
      videoFileUrl = await academyStore.uploadVideo(
        videoForm.value.videoFile,
        (progress) => {
          uploadProgress.value = progress
        }
      )
      
      isUploadingVideo.value = false
      uploadProgress.value = 100
    }

    // Vérifier qu'au moins une source vidéo est fournie (YouTube ou fichier)
    if (!videoForm.value.videoUrl && !videoFileUrl) {
      toast.add({
        title: 'Erreur',
        description: 'Veuillez fournir une URL YouTube ou sélectionner une vidéo à uploader',
        color: 'error',
      })
      return
    }

    if (isEditVideo.value) {
      if (!selectedVideoId.value) {
        toast.add({
          title: 'Erreur',
          description: 'Vidéo non sélectionnée',
          color: 'error',
        })
        return
      }

      await academyStore.updateVideo(selectedVideoId.value, {
        title: videoForm.value.title,
        description: videoForm.value.description || undefined,
        videoFile: videoFileUrl || null,
        videoUrl: videoForm.value.videoUrl || null,
        duration: videoForm.value.duration ?? undefined,
        order: videoForm.value.order ?? undefined,
      })

      toast.add({
        title: 'Succès',
        description: 'Vidéo mise à jour avec succès',
        color: 'success',
      })
    } else {
      await academyStore.createVideo({
        moduleId: selectedModuleId.value,
        title: videoForm.value.title,
        description: videoForm.value.description || undefined,
        videoFile: videoFileUrl || undefined,
        videoUrl: videoForm.value.videoUrl || undefined,
        duration: videoForm.value.duration ?? undefined,
        order: videoForm.value.order ?? undefined,
      })

      toast.add({
        title: 'Succès',
        description: 'Vidéo créée avec succès',
        color: 'success',
      })
    }
    isVideoModalOpen.value = false
    isUploadingVideo.value = false
    uploadProgress.value = 0
    if (courseId.value) {
      await academyStore.fetchCourse(courseId.value)
    }
  } catch (error: any) {
    isUploadingVideo.value = false
    uploadProgress.value = 0
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la sauvegarde',
      color: 'error',
    })
  }
}

// Delete video
const deleteVideo = async (videoId: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) return

  try {
    await academyStore.deleteVideo(videoId)
    toast.add({
      title: 'Succès',
      description: 'Vidéo supprimée avec succès',
      color: 'success',
    })
    if (courseId.value) {
      await academyStore.fetchCourse(courseId.value)
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la suppression',
      color: 'error',
    })
  }
}

// Get video URL
const { apiBaseUrl: apiBaseUrlHelper } = useApi()
const getVideoUrl = (video: any) => {
  // Si c'est une string (ancien format), gérer la compatibilité
  if (typeof video === 'string') {
    if (!video) return ''
    if (video.startsWith('http')) return video
    const path = video.startsWith('/') ? video : `/${video}`
    return `${apiBaseUrlHelper}${path}`
  }
  // Nouveau format avec objet video
  // Priorité à YouTube si présent
  if (video?.videoUrl) {
    return video.videoUrl
  }
  // Sinon utiliser le fichier uploadé
  if (video?.videoFile) {
    if (video.videoFile.startsWith('http')) return video.videoFile
    const path = video.videoFile.startsWith('/') ? video.videoFile : `/${video.videoFile}`
    return `${apiBaseUrlHelper}${path}`
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

// Get instructor avatar preview
const getInstructorAvatarPreview = (): string | null => {
  if (courseForm.value.instructorAvatar) {
    return URL.createObjectURL(courseForm.value.instructorAvatar)
  }
  if (courseForm.value.existingInstructorAvatar) {
    return getImageUrl(courseForm.value.existingInstructorAvatar)
  }
  return null
}

// Remove instructor avatar
const removeInstructorAvatar = () => {
  courseForm.value.instructorAvatar = null
  courseForm.value.existingInstructorAvatar = null
}

// Get thumbnail preview
const getThumbnailPreview = (): string | null => {
  if (courseForm.value.thumbnailImage) {
    return URL.createObjectURL(courseForm.value.thumbnailImage)
  }
  if (courseForm.value.existingThumbnailImage) {
    return getImageUrl(courseForm.value.existingThumbnailImage)
  }
  return null
}

// Remove thumbnail
const removeThumbnail = () => {
  courseForm.value.thumbnailImage = null
  courseForm.value.existingThumbnailImage = null
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <UButton
          variant="ghost"
          icon="i-heroicons-arrow-left"
          @click="router.push('/admin/academy')"
        >
          Retour
        </UButton>
        <h1 class="mt-4 text-2xl font-bold">
          {{ isNewCourse ? 'Nouveau cours' : 'Édition du cours' }}
        </h1>
      </div>
      <UButton
        :loading="isSaving"
        @click="saveCourse"
      >
        {{ isNewCourse ? 'Créer' : 'Sauvegarder' }}
      </UButton>
    </div>

    <!-- Course form -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
      <template #header>
        <h3 class="font-semibold">Informations du cours</h3>
      </template>

      <div class="space-y-4">
        <UFormGroup label="Titre" required>
          <UInput v-model="courseForm.title" placeholder="Titre du cours" />
        </UFormGroup>

        <UFormGroup label="Description">
          <UTextarea
            v-model="courseForm.description"
            placeholder="Description du cours"
            :rows="4"
          />
        </UFormGroup>

        <UFormGroup label="Image de couverture (format 4/3)">
          <div class="space-y-4">
            <!-- Preview de l'image existante ou nouvelle -->
            <div v-if="getThumbnailPreview()" class="relative inline-block">
              <img
                :src="getThumbnailPreview()!"
                alt="Image de couverture"
                class="w-full max-w-md object-cover rounded-lg border border-white/10"
                style="aspect-ratio: 4/3;"
              />
              <UButton
                color="error"
                variant="solid"
                icon="i-heroicons-trash"
                size="xs"
                class="absolute top-2 right-2"
                @click="removeThumbnail"
              />
            </div>

            <!-- Composant de crop -->
            <div v-if="!getThumbnailPreview()">
              <CourseThumbnailCropper
                @cropped="(file) => {
                  courseForm.thumbnailImage = file
                  courseForm.existingThumbnailImage = null
                }"
                @cancel="() => {}"
              />
            </div>
            <p class="text-xs text-white/60">
              L'image sera automatiquement redimensionnée au format 4/3
            </p>
          </div>
        </UFormGroup>

        <UFormGroup label="Ordre d'affichage">
          <UInput
            v-model.number="courseForm.order"
            type="number"
            placeholder="0"
          />
        </UFormGroup>

        <UFormGroup label="Publication">
          <USwitch
            v-model="courseForm.isPublished"
            label="Publier le cours"
          />
        </UFormGroup>
      </div>
    </UCard>

    <!-- Instructor information -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
      <template #header>
        <h3 class="font-semibold">Informations du formateur</h3>
      </template>

      <div class="space-y-4">
        <UFormGroup label="Photo du formateur (300x300px)">
          <div class="space-y-4">
            <!-- Preview de l'avatar existant ou nouveau -->
            <div v-if="getInstructorAvatarPreview()" class="relative inline-block">
              <img
                :src="getInstructorAvatarPreview()!"
                alt="Avatar formateur"
                class="w-48 h-48 object-cover rounded-lg border border-white/10"
              />
              <UButton
                color="error"
                variant="solid"
                icon="i-heroicons-trash"
                size="xs"
                class="absolute top-2 right-2"
                @click="removeInstructorAvatar"
              />
            </div>

            <!-- Composant de crop -->
            <div v-if="!getInstructorAvatarPreview()">
              <InstructorAvatarCropper
                @cropped="(file) => {
                  courseForm.instructorAvatar = file
                  courseForm.existingInstructorAvatar = null
                }"
                @cancel="() => {}"
              />
            </div>
            <p class="text-xs text-white/60">
              L'image sera automatiquement redimensionnée à 300x300px
            </p>
          </div>
        </UFormGroup>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormGroup label="Prénom">
            <UInput
              v-model="courseForm.instructorFirstName"
              placeholder="Prénom du formateur"
            />
          </UFormGroup>

          <UFormGroup label="Nom">
            <UInput
              v-model="courseForm.instructorLastName"
              placeholder="Nom du formateur"
            />
          </UFormGroup>
        </div>

        <UFormGroup label="Qualité / Titre">
          <UInput
            v-model="courseForm.instructorTitle"
            placeholder="Ex: Expert en culture polynésienne"
          />
        </UFormGroup>

        <UFormGroup label="Lien">
          <UInput
            v-model="courseForm.instructorLink"
            placeholder="https://example.com/profile"
            icon="i-heroicons-link"
          />
        </UFormGroup>
      </div>
    </UCard>

    <!-- Modules and videos (only if course is saved) -->
    <div v-if="!isNewCourse && academyStore.currentCourse" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">Modules et vidéos</h2>
        <UButton
          icon="i-heroicons-plus"
          @click="openModuleModal()"
        >
          Nouveau module
        </UButton>
      </div>

      <div
        v-for="module in academyStore.currentCourse.modules"
        :key="module.id"
        class="space-y-2"
      >
        <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">{{ module.title }}</h3>
              <div class="flex gap-2">
                <UButton
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-pencil"
                  @click="openModuleModal(module)"
                />
                <UButton
                  variant="ghost"
                  size="sm"
                  color="red"
                  icon="i-heroicons-trash"
                  @click="deleteModule(module.id)"
                />
              </div>
            </div>
          </template>

          <div class="space-y-2">
            <p v-if="module.description" class="text-sm text-white/70">
              {{ module.description }}
            </p>

            <div class="flex items-center justify-between">
              <span class="text-sm text-white/60">
                {{ module.videos?.length || 0 }} vidéo{{ (module.videos?.length || 0) > 1 ? 's' : '' }}
              </span>
              <UButton
                size="sm"
                icon="i-heroicons-plus"
                @click="openVideoModal(module.id)"
              >
                Ajouter une vidéo
              </UButton>
            </div>

            <div v-if="module.videos && module.videos.length > 0" class="space-y-2">
              <div
                v-for="video in module.videos"
                :key="video.id"
                class="flex items-center justify-between rounded-lg bg-white/5 p-3"
              >
                <div class="flex-1">
                  <h4 class="font-medium">{{ video.title }}</h4>
                  <p v-if="video.description" class="text-sm text-white/60">
                    {{ video.description }}
                  </p>
                  <div class="mt-1 flex items-center gap-4 text-xs text-white/40">
                    <span v-if="video.duration">
                      Durée: {{ Math.floor(video.duration / 60) }}:{{ String(video.duration % 60).padStart(2, '0') }}
                    </span>
                    <span>Ordre: {{ video.order }}</span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <UButton
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-pencil"
                    @click="openVideoModal(module.id, video)"
                  />
                  <UButton
                    variant="ghost"
                    size="sm"
                    color="red"
                    icon="i-heroicons-trash"
                    @click="deleteVideo(video.id)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Module modal -->
    <UModal v-model:open="isModuleModalOpen">
      <template #header>
        <h3>{{ isEditModule ? 'Éditer le module' : 'Nouveau module' }}</h3>
      </template>

      <template #body>
        <div class="space-y-4">
          <UFormGroup label="Titre" required>
            <UInput v-model="moduleForm.title" placeholder="Titre du module" />
          </UFormGroup>

          <UFormGroup label="Description">
            <UTextarea
              v-model="moduleForm.description"
              placeholder="Description du module"
              :rows="3"
            />
          </UFormGroup>

          <UFormGroup label="Ordre">
            <UInput
              v-model.number="moduleForm.order"
              type="number"
              placeholder="0"
            />
          </UFormGroup>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="isModuleModalOpen = false">
            Annuler
          </UButton>
          <UButton @click="saveModule">
            {{ isEditModule ? 'Mettre à jour' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Video modal -->
    <UModal v-model:open="isVideoModalOpen" :ui="{ wrapper: 'max-w-2xl' }">
      <template #header>
        <h3>{{ isEditVideo ? 'Éditer la vidéo' : 'Nouvelle vidéo' }}</h3>
      </template>

      <template #body>
        <div class="space-y-4">
          <UFormGroup label="Titre" required>
            <UInput v-model="videoForm.title" placeholder="Titre de la vidéo" />
          </UFormGroup>

          <UFormGroup label="Description">
            <UTextarea
              v-model="videoForm.description"
              placeholder="Description de la vidéo"
              :rows="3"
            />
          </UFormGroup>

          <UFormGroup label="URL YouTube (optionnel)">
            <UInput
              v-model="videoForm.videoUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
            />
            <p class="mt-1 text-xs text-white/60">
              Si vous fournissez une URL YouTube, elle sera utilisée en priorité. Sinon, utilisez le fichier vidéo ci-dessous.
            </p>
          </UFormGroup>

          <UFormGroup label="Fichier vidéo (optionnel si URL YouTube fournie)">
            <div class="space-y-2">
              <div v-if="(videoForm.existingVideoFile || videoForm.videoUrl) && !isUploadingVideo" class="space-y-2">
                <!-- YouTube video -->
                <iframe
                  v-if="videoForm.videoUrl && (videoForm.videoUrl.includes('youtube.com') || videoForm.videoUrl.includes('youtu.be'))"
                  :src="getYouTubeEmbedUrl(videoForm.videoUrl)"
                  class="h-48 w-full rounded"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                />
                <!-- Uploaded video file -->
                <video
                  v-else-if="videoForm.existingVideoFile"
                  :src="getVideoUrl({ videoFile: videoForm.existingVideoFile, videoUrl: videoForm.videoUrl })"
                  controls
                  preload="metadata"
                  playsinline
                  webkit-playsinline
                  x5-playsinline
                  class="h-48 w-full rounded bg-black"
                  @error="(e) => {
                    console.error('Video error:', e)
                    const video = e.target as HTMLVideoElement
                    const error = video.error
                    console.error('Video error details:', {
                      error: error ? {
                        code: error.code,
                        message: error.message,
                      } : null,
                      networkState: video.networkState,
                      readyState: video.readyState,
                      src: video.src,
                      videoWidth: video.videoWidth,
                      videoHeight: video.videoHeight,
                    })
                    if (error) {
                      let errorMsg = 'Erreur de lecture vidéo: '
                      switch (error.code) {
                        case 1:
                          errorMsg += 'Abort - La vidéo a été interrompue'
                          break
                        case 2:
                          errorMsg += 'Network - Erreur réseau'
                          break
                        case 3:
                          errorMsg += 'Decode - Codec vidéo non supporté. Essayez de convertir en MP4 (H.264)'
                          break
                        case 4:
                          errorMsg += 'SourceNotSupported - Format non supporté'
                          break
                        default:
                          errorMsg += `Code ${error.code}`
                      }
                      console.error(errorMsg)
                    }
                  }"
                  @loadedmetadata="(e) => {
                    const video = e.target as HTMLVideoElement
                    console.log('Video metadata loaded:', {
                      duration: video.duration,
                      videoWidth: video.videoWidth,
                      videoHeight: video.videoHeight,
                      readyState: video.readyState,
                    })
                  }"
                  @canplay="(e) => {
                    const video = e.target as HTMLVideoElement
                    console.log('Video can play:', {
                      videoWidth: video.videoWidth,
                      videoHeight: video.videoHeight,
                    })
                  }"
                />
                <p v-if="!videoForm.videoUrl" class="text-xs text-white/60">
                  Si la vidéo ne s'affiche pas, vérifiez que le format est MP4 avec codec H.264
                </p>
                <p v-else class="text-xs text-primary-400">
                  Vidéo YouTube détectée - elle sera utilisée en priorité
                </p>
              </div>
              
              <!-- Progress bar during upload -->
              <div v-if="isUploadingVideo" class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-white/70">Upload en cours...</span>
                  <span class="text-white/70">{{ Math.round(uploadProgress) }}%</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    class="h-full bg-primary-500 transition-all duration-300"
                    :style="{ width: `${uploadProgress}%` }"
                  />
                </div>
                <p class="text-xs text-white/60">
                  Veuillez patienter pendant le chargement de la vidéo...
                </p>
              </div>
              
              <input
                v-if="!isUploadingVideo"
                type="file"
                accept="video/*"
                @change="(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    videoForm.videoFile = file
                    videoForm.existingVideoFile = null
                  }
                }"
              />
              <p v-if="!isUploadingVideo" class="text-xs text-white/60">
                Formats acceptés: MP4, WebM, OGG. Taille illimitée.
              </p>
              <div v-if="!isUploadingVideo" class="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2 text-xs text-yellow-400">
                <p class="font-semibold mb-1">⚠️ Format recommandé :</p>
                <p>Pour une compatibilité maximale, utilisez <strong>MP4 avec codec H.264</strong> (vidéo) et <strong>AAC</strong> (audio).</p>
                <p class="mt-1">Si la vidéo ne s'affiche pas, convertissez-la avec un outil comme HandBrake ou FFmpeg.</p>
              </div>
            </div>
          </UFormGroup>

          <UFormGroup label="Durée (en secondes)">
            <UInput
              v-model.number="videoForm.duration"
              type="number"
              placeholder="300"
            />
          </UFormGroup>

          <UFormGroup label="Ordre">
            <UInput
              v-model.number="videoForm.order"
              type="number"
              placeholder="0"
            />
          </UFormGroup>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="ghost"
            :disabled="isUploadingVideo"
            @click="isVideoModalOpen = false"
          >
            Annuler
          </UButton>
          <UButton
            :loading="isSaving || isUploadingVideo"
            :disabled="isUploadingVideo"
            @click="saveVideo"
          >
            {{ isEditVideo ? 'Mettre à jour' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
