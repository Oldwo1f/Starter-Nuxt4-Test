<script setup lang="ts">
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
})

const route = useRoute()
const API_BASE_URL = 'http://localhost:3001'
const marketplaceStore = useMarketplaceStore()
const router = useRouter()
const toast = useToast()

const listingId = computed(() => parseInt(route.params.id as string, 10))

// Form data
const form = ref({
  title: '',
  description: '',
  price: 0,
  priceUnit: '' as string,
  type: 'bien' as 'bien' | 'service',
  categoryId: undefined as number | undefined,
  locationId: undefined as number | undefined,
})

// Current listing status (separate from form)
const currentStatus = ref<'active' | 'sold' | 'archived'>('active')

// Price unit options - separated by type
const bienPriceUnitOptions = [
  { label: "l'unité", value: "l'unité" },
  { label: 'le paquet', value: 'le paquet' },
  { label: 'le kilo', value: 'le kilo' },
  { label: 'Le lot', value: 'Le lot' },
  { label: 'La pièce', value: 'La pièce' },
]

const servicePriceUnitOptions = [
  { label: 'par heure', value: 'par heure' },
  { label: 'par jour', value: 'par jour' },
  { label: 'demi-journée', value: 'demi-journée' },
]

// Computed property to get the right options based on type
const priceUnitOptions = computed(() => {
  return form.value.type === 'service' ? servicePriceUnitOptions : bienPriceUnitOptions
})

// Images (managed separately from form)
const existingImages = ref<string[]>([])
const isDeletingImage = ref<number | null>(null) // Track which image is being deleted
const isAddingImages = ref(false)

// Options
const locations = ref<any[]>([])
const allCategories = ref<any[]>([]) // Store all categories
const isLoading = ref(false)
const isSubmitting = ref(false)

// Computed property to filter categories by type
const categories = computed(() => {
  if (!form.value.type) return []
  return (allCategories.value || []).filter((c: any) => c.type === form.value.type)
})

// Fetch listing and options
const fetchData = async () => {
  isLoading.value = true
  try {
    const [listing, locs, cats] = await Promise.all([
      marketplaceStore.fetchListingById(listingId.value),
      $fetch(`${API_BASE_URL}/locations`),
      $fetch(`${API_BASE_URL}/categories`),
    ])

    if (listing.success && listing.data) {
      const data = listing.data
      form.value = {
        title: data.title,
        description: data.description,
        price: data.price,
        priceUnit: data.priceUnit || '',
        type: data.type,
        categoryId: data.categoryId,
        locationId: data.locationId,
      }
      currentStatus.value = data.status
      existingImages.value = data.images || []
    }

    locations.value = locs || []
    allCategories.value = cats || [] // Store all categories
  } catch (error) {
    console.error('Error fetching data:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les données de l\'annonce',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}

// Watch type to reset categoryId and priceUnit if it doesn't match the new type
watch(() => form.value.type, () => {
  // Reset categoryId when type changes
  form.value.categoryId = undefined
  // Reset priceUnit if it doesn't match the new type
  const currentOptions = form.value.type === 'service' ? servicePriceUnitOptions : bienPriceUnitOptions
  const isValidUnit = currentOptions.some(opt => opt.value === form.value.priceUnit)
  if (!isValidUnit && form.value.priceUnit) {
    form.value.priceUnit = ''
  }
})

// Delete image immediately
const handleDeleteImage = async (imageUrl: string) => {
  if (existingImages.value.length <= 1) {
    toast.add({
      title: 'Impossible de supprimer',
      description: 'Une annonce doit avoir au moins une image',
      color: 'red',
    })
    return
  }

  const imageIndex = existingImages.value.indexOf(imageUrl)
  if (imageIndex === -1) return

  isDeletingImage.value = imageIndex
  try {
    const result = await marketplaceStore.deleteListingImage(listingId.value, imageUrl)
    if (result.success) {
      // Update local state
      existingImages.value = existingImages.value.filter(img => img !== imageUrl)
      toast.add({
        title: 'Image supprimée',
        description: 'L\'image a été supprimée avec succès',
        color: 'green',
      })
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Erreur lors de la suppression de l\'image',
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la suppression de l\'image',
      color: 'red',
    })
  } finally {
    isDeletingImage.value = null
  }
}

// Add cropped image immediately
const handleImageCropped = async (file: File) => {
  const totalImages = existingImages.value.length + 1
  if (totalImages > 5) {
    toast.add({
      title: 'Limite atteinte',
      description: 'Maximum 5 images autorisées au total',
      color: 'orange',
    })
    return
  }

  isAddingImages.value = true
  try {
    const result = await marketplaceStore.addListingImages(listingId.value, [file])
    if (result.success && result.data) {
      // Update local state
      existingImages.value = result.data.images || []
      toast.add({
        title: 'Image ajoutée',
        description: 'L\'image a été ajoutée avec succès',
        color: 'green',
      })
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Erreur lors de l\'ajout de l\'image',
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de l\'ajout de l\'image',
      color: 'red',
    })
  } finally {
    isAddingImages.value = false
  }
}

// Handle status change from component
const handleStatusChanged = (newStatus: 'active' | 'sold' | 'archived') => {
  currentStatus.value = newStatus
}

// Submit form (images are handled separately)
const handleSubmit = async () => {
  if (!form.value.title || !form.value.description || !form.value.price || !form.value.categoryId || !form.value.locationId) {
    toast.add({
      title: 'Champs manquants',
      description: 'Veuillez remplir tous les champs obligatoires',
      color: 'red',
    })
    return
  }

  isSubmitting.value = true
  try {
    // Update only form fields (images are managed separately)
    const result = await marketplaceStore.updateListing(listingId.value, {
      ...form.value,
    })

    if (result.success) {
      toast.add({
        title: 'Annonce mise à jour',
        description: 'Votre annonce a été mise à jour avec succès.',
        color: 'green',
      })
      router.push(`/account/listings`)
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Erreur lors de la mise à jour',
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la mise à jour',
      color: 'red',
    })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>

    <div v-else>
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-2">
          <UButton to="/account/listings" variant="ghost" icon="i-heroicons-arrow-left">
            Retour
          </UButton>
          <h1 class="text-3xl font-bold">Modifier l'annonce</h1>
        </div>
        <ListingStatusChanger
          :listing-id="listingId"
          :current-status="currentStatus"
          size="md"
          @status-changed="handleStatusChanged"
        />
      </div>

      <UCard>
        <form @submit.prevent="handleSubmit" class="w-full space-y-6">
          <!-- Type -->
          <div>
            <label class="mb-2 block text-sm font-medium">Type *</label>
            <div class="flex gap-2">
              <UButton
                :variant="form.type === 'bien' ? 'solid' : 'outline'"
                color="success"
                size="xl"
                class="flex-1"
                @click="form.type = 'bien'"
              >
                Bien
              </UButton>
              <UButton
                :variant="form.type === 'service' ? 'solid' : 'outline'"
                color="info"
                size="xl"
                class="flex-1"
                @click="form.type = 'service'"
              >
                Service
              </UButton>
            </div>
          </div>

          <!-- Title -->
          <div class="w-full">
            <label class="mb-2 block text-sm font-medium">Titre *</label>
            <UInput
              v-model="form.title"
              placeholder="Ex: Vélo de montagne en excellent état"
              size="lg"
              class="w-full"
              required
            />
          </div>

          <!-- Description -->
          <div class="w-full">
            <label class="mb-2 block text-sm font-medium">Description *</label>
            <UTextarea
              v-model="form.description"
              placeholder="Décrivez votre bien ou service en détail..."
              :rows="6"
              size="lg"
              class="w-full"
              required
            />
            <p class="mt-1 text-xs text-white/60">{{ form.description.length }} caractères</p>
          </div>

          <!-- Category and Location (side by side) -->
          <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Category -->
            <div class="w-full">
              <label class="mb-2 block text-sm font-medium">Catégorie *</label>
              <USelect
                v-model="form.categoryId"
                :items="categories.length > 0 ? categories.map(c => ({ label: c.name, value: c.id })) : []"
                placeholder="Sélectionnez une catégorie"
                size="lg"
                class="w-full"
                :disabled="categories.length === 0"
                required
              />
              <p v-if="categories.length === 0 && !isLoading" class="mt-1 text-xs text-red-500">
                Aucune catégorie disponible pour ce type
              </p>
            </div>

            <!-- Location -->
            <div class="w-full">
              <label class="mb-2 block text-sm font-medium">Localisation *</label>
              <USelect
                v-model="form.locationId"
                :items="locations.length > 0 ? locations.map(l => ({ label: `${l.commune} - ${l.ile} (${l.archipel})`, value: l.id })) : []"
                placeholder="Sélectionnez votre localisation"
                size="lg"
                class="w-full"
                :disabled="locations.length === 0"
                required
              />
              <p v-if="locations.length === 0 && !isLoading" class="mt-1 text-xs text-red-500">
                Aucune localisation disponible
              </p>
            </div>
          </div>

          <!-- Price -->
          <div class="w-full">
            <label class="mb-2 block text-sm font-medium">Prix en Pūpū *</label>
            <div class="relative flex w-full gap-2">
              <div class="relative flex-1 w-full">
                <span class="absolute left-0 top-1/2 -translate-y-1/2 text-2xl z-10">🐚</span>
                <UInput
                  v-model.number="form.price"
                  type="number"
                  placeholder="0"
                  size="lg"
                  class="w-full pl-10"
                  min="0"
                  step="1"
                  required
                />
              </div>
              <USelect
                v-model="form.priceUnit"
                :items="priceUnitOptions"
                placeholder="Unité (optionnel)"
                size="lg"
                class="w-48 flex-shrink-0"
                searchable
              />
            </div>
          </div>

          <!-- Submit -->
          <div class="flex gap-4">
            <UButton
              type="submit"
              color="primary"
              size="xl"
              block
              :loading="isSubmitting"
              icon="i-heroicons-check-circle"
            >
              Enregistrer les modifications
            </UButton>
          </div>
        </form>
      </UCard>

      <!-- Images Management (separate from form) -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Gestion des images</h2>
          <p class="mt-1 text-sm text-white/60">
            Ajoutez ou supprimez des images. Les modifications sont appliquées immédiatement.
          </p>
        </template>

        <!-- Existing Images -->
        <div v-if="existingImages.length > 0" class="mb-6">
          <label class="mb-3 block text-sm font-medium">Images actuelles ({{ existingImages.length }}/5)</label>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="(image, index) in existingImages"
              :key="image"
              class="relative aspect-square overflow-hidden rounded-lg border border-white/20 group"
            >
              <img :src="`http://localhost:3001${image}`" alt="Image" class="h-full w-full object-cover" />
              <button
                type="button"
                :disabled="isDeletingImage === index || existingImages.length <= 1"
                class="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                @click="handleDeleteImage(image)"
              >
                <UIcon
                  v-if="isDeletingImage === index"
                  name="i-heroicons-arrow-path"
                  class="h-4 w-4 animate-spin"
                />
                <UIcon
                  v-else
                  name="i-heroicons-trash"
                  class="h-4 w-4"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Add Images -->
        <div>
          <label class="mb-3 block text-sm font-medium">Ajouter des images (format carré requis)</label>
          <div v-if="existingImages.length < 5" class="space-y-4">
            <ListingImageCropper
              :max-images="5"
              :current-images-count="existingImages.length"
              @cropped="handleImageCropped"
            />
          </div>
          <div v-else class="rounded-lg border border-white/20 p-4 text-center text-sm text-white/60">
            Maximum de 5 images atteint
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
