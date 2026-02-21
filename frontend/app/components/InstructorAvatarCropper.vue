<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const emit = defineEmits<{
  cropped: [file: File]
  cancel: []
}>()

const toast = useToast()

// États du composant
const showCropper = ref(false)
const imageSrc = ref<string | null>(null)
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const isProcessing = ref(false)
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

  // Vérifier la taille (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    toast.add({
      title: 'Erreur',
      description: 'L\'image est trop volumineuse. Taille maximale : 10MB',
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

// Calculer la taille de sortie (300x300px)
const calculateOutputSize = (canvas: HTMLCanvasElement) => {
  const targetSize = 300
  // Le canvas est déjà carré (ratio 1:1), donc width === height
  const currentSize = canvas.width
  
  // Toujours redimensionner à 300x300px
  return { width: targetSize, height: targetSize }
}

// Cropper et retourner l'image
const confirmCrop = async () => {
  if (!cropperRef.value) return

  try {
    isProcessing.value = true

    // Obtenir le canvas croppé
    const { canvas } = cropperRef.value.getResult()
    
    if (!canvas) {
      throw new Error('Impossible de générer l\'image croppée')
    }

    // Calculer la taille de sortie (300x300px)
    const outputSize = calculateOutputSize(canvas)
    
    // Créer un nouveau canvas avec la taille de sortie
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = outputSize.width
    outputCanvas.height = outputSize.height
    const ctx = outputCanvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Impossible de créer le contexte canvas')
    }

    // Dessiner l'image croppée sur le nouveau canvas (redimensionnée à 300x300)
    ctx.drawImage(canvas, 0, 0, outputSize.width, outputSize.height)

    // Convertir le canvas en blob
    outputCanvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Impossible de convertir l\'image en blob')
      }

      // Créer un File à partir du blob
      const file = new File([blob], `instructor-avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })

      emit('cropped', file)
      showCropper.value = false
      imageSrc.value = null
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    }, 'image/jpeg', 0.9)
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue lors du crop.',
      color: 'red',
    })
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div>
    <!-- Input file caché -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Bouton pour sélectionner une image -->
    <div v-if="!showCropper">
      <label
        class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 p-8 transition-colors hover:border-primary-500"
        @click="openFileSelector"
      >
        <UIcon name="i-heroicons-photo" class="mb-2 h-12 w-12 text-white/40" />
        <span class="text-sm font-medium">Cliquez pour ajouter une photo</span>
        <span class="mt-1 text-xs text-white/60">
          Formats : JPEG, PNG, WebP (max 10MB) • Format carré 300x300px
        </span>
      </label>
    </div>

    <!-- Cropper Modal -->
    <UModal 
      v-model:open="showCropper" 
      title="Recadrer l'avatar du formateur"
      description="Ajustez l'image pour un format carré (1:1). L'image sera redimensionnée à 300x300 pixels."
      :ui="{ wrapper: 'max-w-4xl' }"
      :dismissible="!isProcessing"
    >
      <template #body>
        <div v-if="imageSrc" class="space-y-4" @mousedown.stop @click.stop>
          <div class="rounded-lg overflow-hidden bg-white/5 p-4" @mousedown.stop @click.stop>
            <Cropper
              ref="cropperRef"
              :src="imageSrc"
              :stencil-props="{
                aspectRatio: 1,
                resizable: true,
                movable: true,
              }"
              class="cropper"
              @mousedown.stop
              @click.stop
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <UButton
            @click="cancelCrop"
            color="neutral"
            variant="outline"
            :disabled="isProcessing"
          >
            Annuler
          </UButton>
          <UButton
            @click="confirmCrop"
            color="primary"
            :loading="isProcessing"
            :disabled="isProcessing"
          >
            <UIcon name="i-heroicons-check" class="mr-2" />
            Confirmer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.cropper {
  height: 500px;
  width: 100%;
  background: #1f2937;
}
</style>
