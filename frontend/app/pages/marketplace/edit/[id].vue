<script setup lang="ts">
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const route = useRoute()
const { apiBaseUrl } = useApi()
const marketplaceStore = useMarketplaceStore()
const router = useRouter()

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
  status: 'active' as 'active' | 'sold' | 'archived',
})

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

// Images
const existingImages = ref<string[]>([])
const newImages = ref<File[]>([])
const newImagePreviews = ref<string[]>([])

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
      $fetch(`${apiBaseUrl}/locations`),
      $fetch(`${apiBaseUrl}/categories`),
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
        status: data.status,
      }
      existingImages.value = data.images || []
    }

    locations.value = locs || []
    allCategories.value = cats || [] // Store all categories
  } catch (error) {
    console.error('Error fetching data:', error)
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

// Handle image selection
const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  
  const totalImages = existingImages.value.length + newImages.value.length + files.length
  if (totalImages > 5) {
    alert('Maximum 5 images autorisées')
    return
  }

  files.forEach((file) => {
    if (file.type.startsWith('image/')) {
      newImages.value.push(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        newImagePreviews.value.push(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  })
}

// Remove existing image
const removeExistingImage = (index: number) => {
  existingImages.value.splice(index, 1)
}

// Remove new image
const removeNewImage = (index: number) => {
  newImages.value.splice(index, 1)
  newImagePreviews.value.splice(index, 1)
}

// Submit form
const handleSubmit = async () => {
  if (!form.value.title || !form.value.description || !form.value.price || !form.value.categoryId || !form.value.locationId) {
    alert('Veuillez remplir tous les champs obligatoires')
    return
  }

  if (existingImages.value.length === 0 && newImages.value.length === 0) {
    alert('Veuillez ajouter au moins une image')
    return
  }

  if (!confirm('Enregistrer les modifications ?')) {
    return
  }

  isSubmitting.value = true
  try {
    // For now, we'll update without new images (backend would need to handle image updates separately)
    const result = await marketplaceStore.updateListing(listingId.value, {
      ...form.value,
    })

    if (result.success) {
      router.push(`/marketplace/${listingId.value}`)
    } else {
      alert(result.error || 'Erreur lors de la mise à jour')
    }
  } catch (error: any) {
    alert(error.message || 'Erreur lors de la mise à jour')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
    <div v-if="isLoading" class="text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>

    <div v-else>
      <div class="mb-6">
        <UButton to="/account/listings" variant="ghost" icon="i-heroicons-arrow-left">
          Retour
        </UButton>
        <h1 class="mt-4 text-3xl font-bold">Modifier l'annonce</h1>
      </div>

      <UCard>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Title -->
          <div>
            <label class="mb-2 block text-sm font-medium">Titre *</label>
            <UInput
              v-model="form.title"
              placeholder="Ex: Vélo de montagne en excellent état"
              size="lg"
              required
            />
          </div>

          <!-- Description -->
          <div>
            <label class="mb-2 block text-sm font-medium">Description *</label>
            <UTextarea
              v-model="form.description"
              placeholder="Décrivez votre produit ou service en détail..."
              :rows="6"
              size="lg"
              required
            />
            <p class="mt-1 text-xs text-white/60">{{ form.description.length }} caractères</p>
          </div>

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
                Produit
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

          <!-- Category -->
          <div>
            <label class="mb-2 block text-sm font-medium">Catégorie *</label>
            <USelect
              v-model="form.categoryId"
              :items="categories.map(c => ({ label: c.name, value: c.id }))"
              placeholder="Sélectionnez une catégorie"
              size="lg"
              required
            />
          </div>

          <!-- Location -->
          <div>
            <label class="mb-2 block text-sm font-medium">Localisation *</label>
            <USelect
              v-model="form.locationId"
              :items="locations.map(l => ({ label: `${l.commune} - ${l.ile} (${l.archipel})`, value: l.id }))"
              placeholder="Sélectionnez votre localisation"
              size="lg"
              required
            />
          </div>

          <!-- Price -->
          <div>
            <label class="mb-2 block text-sm font-medium">Valeur en Pūpū *</label>
            <div class="flex gap-2">
              <div class="relative flex-1">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🐚</span>
                <UInput
                  v-model.number="form.price"
                  type="number"
                  placeholder="0"
                  size="lg"
                  class="pl-12"
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
                class="w-48"
                searchable
              />
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="mb-2 block text-sm font-medium">Statut</label>
            <USelect
              v-model="form.status"
              :items="[
                { label: 'Active', value: 'active' },
                { label: 'Vendue', value: 'sold' },
                { label: 'Archivée', value: 'archived' },
              ]"
              size="lg"
            />
          </div>

          <!-- Existing Images -->
          <div v-if="existingImages.length > 0">
            <label class="mb-2 block text-sm font-medium">Images actuelles</label>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div
                v-for="(image, index) in existingImages"
                :key="index"
                class="relative aspect-square overflow-hidden rounded-lg border border-white/20"
              >
                <img :src="`${apiBaseUrl}${image}`" alt="Image" class="h-full w-full object-cover" />
                <button
                  type="button"
                  class="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white"
                  @click="removeExistingImage(index)"
                >
                  <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- New Images -->
          <div>
            <label class="mb-2 block text-sm font-medium">Ajouter des images</label>
            <div class="space-y-4">
              <!-- Preview new images -->
              <div v-if="newImagePreviews.length > 0" class="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div
                  v-for="(preview, index) in newImagePreviews"
                  :key="index"
                  class="relative aspect-square overflow-hidden rounded-lg border border-white/20"
                >
                  <img :src="preview" alt="Preview" class="h-full w-full object-cover" />
                  <button
                    type="button"
                    class="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white"
                    @click="removeNewImage(index)"
                  >
                    <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <!-- Upload button -->
              <div v-if="existingImages.length + newImages.length < 5">
                <label class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 p-8 transition-colors hover:border-primary-500">
                  <UIcon name="i-heroicons-photo" class="mb-2 h-12 w-12 text-white/40" />
                  <span class="text-sm font-medium">Ajouter des images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    class="hidden"
                    @change="handleImageSelect"
                  />
                </label>
              </div>
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
    </div>
  </div>
</template>
