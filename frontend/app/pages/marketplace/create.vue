<script setup lang="ts">
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const API_BASE_URL = 'http://localhost:3001'
const marketplaceStore = useMarketplaceStore()
const router = useRouter()
const toast = useToast()

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
const images = ref<File[]>([])
const imagePreviews = ref<string[]>([])

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

// Fetch options
const fetchOptions = async () => {
  isLoading.value = true
  try {
    const [locs, cats] = await Promise.all([
      $fetch<any[]>(`${API_BASE_URL}/locations`),
      $fetch<any[]>(`${API_BASE_URL}/categories`),
    ])
    locations.value = Array.isArray(locs) ? locs : []
    allCategories.value = Array.isArray(cats) ? cats : [] // Store all categories
    console.log('Locations loaded:', locations.value.length)
    console.log('Categories loaded:', allCategories.value.length)
  } catch (error) {
    console.error('Error fetching options:', error)
    locations.value = []
    allCategories.value = []
  } finally {
    isLoading.value = false
  }
}

// Function to calculate step based on current value (exponential steps)
const getStep = (value: number): number => {
  if (value < 50) return 1
  if (value < 200) return 5
  if (value < 1000) return 10
  return 100
}

// Function to round value to nearest step
const roundToStep = (value: number, step: number): number => {
  return Math.round(value / step) * step
}

// Convert slider position (0-100) to actual value (0-2000)
// First half (0-50) maps to 0-100, second half (50-100) maps to 100-2000
const sliderPositionToValue = (position: number): number => {
  if (position <= 50) {
    // First half: 0-50% -> 0-100
    return (position / 50) * 100
  } else {
    // Second half: 50-100% -> 100-2000
    return 100 + ((position - 50) / 50) * 1900
  }
}

// Convert actual value (0-2000) to slider position (0-100)
const valueToSliderPosition = (value: number): number => {
  if (value <= 100) {
    // First half: 0-100 -> 0-50%
    return (value / 100) * 50
  } else {
    // Second half: 100-2000 -> 50-100%
    return 50 + ((value - 100) / 1900) * 50
  }
}

// Slider position state (0-100)
const sliderPosition = ref(0)

// Watch type to reset categoryId and priceUnit
watch(() => form.value.type, () => {
  form.value.categoryId = undefined
  form.value.priceUnit = '' // Reset price unit when type changes
})

// Watch price to ensure it's within bounds and rounded to step, and update slider position
watch(() => form.value.price, (newValue) => {
  if (newValue < 0) {
    form.value.price = 0
  } else if (newValue > 2000) {
    form.value.price = 2000
  } else {
    const step = getStep(newValue)
    form.value.price = roundToStep(newValue, step)
  }
  // Update slider position based on value (avoid infinite loop)
  const newPosition = valueToSliderPosition(form.value.price)
  if (Math.abs(sliderPosition.value - newPosition) > 0.1) {
    sliderPosition.value = newPosition
  }
})

// Watch slider position to update price
watch(() => sliderPosition.value, (newPosition) => {
  const newValue = sliderPositionToValue(newPosition)
  const step = getStep(newValue)
  const roundedValue = roundToStep(newValue, step)
  if (Math.abs(form.value.price - roundedValue) > 0.1) {
    form.value.price = roundedValue
  }
})

// Handle cropped image
const handleImageCropped = (file: File) => {
  if (images.value.length >= 5) {
    toast.add({
      title: 'Limite atteinte',
      description: 'Maximum 5 images autorisées',
      color: 'warning',
    })
    return
  }

  images.value.push(file)
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreviews.value.push(e.target?.result as string)
  }
  reader.readAsDataURL(file)
}

// Remove image
const removeImage = (index: number) => {
  images.value.splice(index, 1)
  imagePreviews.value.splice(index, 1)
}

// Submit form
const handleSubmit = async () => {
  if (!form.value.title || !form.value.description || !form.value.price || !form.value.categoryId || !form.value.locationId) {
    alert('Veuillez remplir tous les champs obligatoires')
    return
  }

  if (images.value.length === 0) {
    alert('Veuillez ajouter au moins une image')
    return
  }

  if (!confirm('Publier cette annonce ?')) {
    return
  }

  isSubmitting.value = true
  try {
    // Ensure categoryId and locationId are defined (already checked above)
    if (!form.value.categoryId || !form.value.locationId) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    
    const result = await marketplaceStore.createListing({
      ...form.value,
      categoryId: form.value.categoryId,
      locationId: form.value.locationId,
      images: images.value,
    })

    if (result.success) {
      router.push(`/marketplace/${result.data?.id}`)
    } else {
      alert(result.error || 'Erreur lors de la création')
    }
  } catch (error: any) {
    alert(error.message || 'Erreur lors de la création')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchOptions()
  // Initialize slider position based on initial price
  sliderPosition.value = valueToSliderPosition(form.value.price)
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
    <div class="mb-6">
      <UButton to="/marketplace" variant="ghost" icon="i-heroicons-arrow-left">
        Retour
      </UButton>
      <h1 class="mt-4 text-3xl font-bold">Créer une annonce</h1>
      <p class="mt-2 text-white/60">Remplissez le formulaire pour publier votre annonce</p>
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

        <!-- Images -->
        <div>
          <label class="mb-2 block text-sm font-medium">Images * (format carré requis)</label>
          <div class="space-y-4">
            <!-- Preview grid -->
            <div v-if="imagePreviews.length > 0" class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div
                v-for="(preview, index) in imagePreviews"
                :key="index"
                class="relative aspect-square overflow-hidden rounded-lg border border-white/20"
              >
                <img :src="preview" alt="Preview" class="h-full w-full object-cover" />
                <button
                  type="button"
                  class="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition-colors"
                  @click="removeImage(index)"
                >
                  <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Image cropper component -->
            <div v-if="imagePreviews.length < 5">
              <ListingImageCropper
                :max-images="5"
                :current-images-count="imagePreviews.length"
                @cropped="handleImageCropped"
              />
            </div>
            <div v-else class="rounded-lg border border-white/20 p-4 text-center text-sm text-white/60">
              Maximum de 5 images atteint
            </div>
          </div>
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
          
          <!-- Slider -->
          <div class="mb-4">
            <input
              v-model.number="sliderPosition"
              type="range"
              min="0"
              max="100"
              step="0.1"
              class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary-500 transition-all"
            />
            <!-- Markers with relative positioning -->
            <div class="relative mt-1 h-4">
              <div class="absolute left-0 text-xs text-white/60">0</div>
              <div class="absolute left-[25%] -translate-x-1/2 text-xs text-white/60">50</div>
              <div class="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-primary-400">100</div>
              <div class="absolute left-[60.53%] -translate-x-1/2 text-xs text-white/60">500</div>
              <div class="absolute left-[73.68%] -translate-x-1/2 text-xs text-white/60">1000</div>
              <div class="absolute right-0 text-xs text-white/60">2000</div>
            </div>
          </div>

          <!-- Input and Unit -->
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
                max="2000"
                :step="getStep(form.price)"
                required
                @input="(e: Event) => {
                  const target = e.target as HTMLInputElement
                  const value = Number(target.value)
                  if (value >= 0 && value <= 2000) {
                    const step = getStep(value)
                    form.price = roundToStep(value, step)
                  }
                }"
              />
            </div>
            <!-- XPF conversion indicator floating above the field, right side, vertically centered -->
            <div class="absolute left-[3rem] bottom-[-17px] sm:bottom-auto sm:left-[6rem] sm:top-1/2 sm:-translate-y-1/2 pointer-events-none text-xs text-white/40 z-20">
              ≈ {{ form.price ? (form.price * 100).toFixed(0) : '0' }} XPF
            </div>
            <USelect
              v-model="form.priceUnit"
              :items="priceUnitOptions"
              :placeholder="form.type ? 'Unité' : 'Sélectionnez d\'abord un type'"
              size="lg"
              class="w-48 flex-shrink-0"
              :disabled="!form.type"
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
            Publier l'annonce
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
