<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { useAuthStore } from '~/stores/useAuthStore'

interface Props {
  currentAvatar?: string | null
  userId?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentAvatar: null,
  userId: undefined,
})

const emit = defineEmits<{
  uploaded: [avatarUrl: string]
  cancel: []
}>()

const toast = useToast()
const API_BASE_URL = 'http://localhost:3001'
const authStore = useAuthStore()

// États du composant
const showCropper = ref(false)
const imageSrc = ref<string | null>(null)
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Gérer la sélection de fichier
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  // Vérifier le type de fichier
  if (!file.type.startsWith('image/')) {
    toast.add({
      title: 'Erreur',
      description: 'Veuillez sélectionner une image valide (JPEG, PNG, WebP)',
      color: 'red',
    })
    return
  }

  // Vérifier la taille (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    toast.add({
      title: 'Erreur',
      description: 'L\'image est trop volumineuse. Taille maximale : 5MB',
      color: 'red',
    })
    return
  }

  // Lire le fichier et afficher le cropper
  const reader = new FileReader()
  reader.onload = (e) => {
    imageSrc.value = e.target?.result as string
    showCropper.value = true
  }
  reader.readAsDataURL(file)
}

// Ouvrir le sélecteur de fichier
const openFileSelector = () => {
  fileInputRef.value?.click()
}

// Annuler le crop
const cancelCrop = () => {
  showCropper.value = false
  imageSrc.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  emit('cancel')
}

// Uploader l'image croppée
const uploadCroppedImage = async () => {
  if (!cropperRef.value) return

  try {
    isUploading.value = true

    // Obtenir le canvas croppé
    const { canvas } = cropperRef.value.getResult()
    
    if (!canvas) {
      throw new Error('Impossible de générer l\'image croppée')
    }

    // Convertir le canvas en blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        throw new Error('Impossible de convertir l\'image en blob')
      }

      // Créer un FormData avec le fichier
      const formData = new FormData()
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      formData.append('avatar', file)

      // Vérifier l'authentification
      if (!authStore.accessToken) {
        throw new Error('Non authentifié')
      }

      // Uploader le fichier
      const response = await $fetch<{
        avatarUrl: string
        message: string
        user: any
      }>(`${API_BASE_URL}/auth/upload-avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: formData,
      })

      // Mettre à jour le store avec le nouvel avatar en rafraîchissant le profil
      await authStore.fetchProfile()

      toast.add({
        title: 'Avatar mis à jour',
        description: 'Votre avatar a été mis à jour avec succès.',
        color: 'green',
      })

      emit('uploaded', response.avatarUrl)
      showCropper.value = false
      imageSrc.value = null
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    }, 'image/jpeg', 0.9)
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || error.message || 'Une erreur est survenue lors de l\'upload.',
      color: 'red',
    })
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Input file caché -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Bouton pour sélectionner une image -->
    <div v-if="!showCropper" class="space-y-2">
      <UButton
        @click="openFileSelector"
        color="primary"
        variant="outline"
        icon="i-heroicons-photo"
      >
        {{ currentAvatar ? 'Changer l\'avatar' : 'Ajouter un avatar' }}
      </UButton>
      <p class="text-sm text-white/60">
        Formats acceptés : JPEG, PNG, WebP (max 5MB)
      </p>
    </div>

    <!-- Cropper -->
    <div v-if="showCropper && imageSrc" class="space-y-4">
      <div class="rounded-lg overflow-hidden bg-white/5 p-4">
        <Cropper
          ref="cropperRef"
          :src="imageSrc"
          :stencil-props="{
            aspectRatio: 1,
            resizable: true,
            movable: true,
          }"
          class="cropper"
        />
      </div>

      <div class="flex items-center gap-3">
        <UButton
          @click="uploadCroppedImage"
          color="primary"
          :loading="isUploading"
          :disabled="isUploading"
        >
          <UIcon name="i-heroicons-check" class="mr-2" />
          Enregistrer
        </UButton>
        <UButton
          @click="cancelCrop"
          color="neutral"
          variant="outline"
          :disabled="isUploading"
        >
          Annuler
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cropper {
  height: 400px;
  width: 100%;
  background: #1f2937;
}
</style>
