<script setup lang="ts">
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.pages.editListing',
})

const route = useRoute()
const { apiBaseUrl, getImageUrl } = useApi()
const marketplaceStore = useMarketplaceStore()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

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

const bienPriceUnitOptions = computed(() => [
  { label: t('marketplaceEdit.unitUnite'), value: "l'unité" },
  { label: t('marketplaceEdit.unitPaquet'), value: 'le paquet' },
  { label: t('marketplaceEdit.unitKilo'), value: 'le kilo' },
  { label: t('marketplaceEdit.unitLot'), value: 'Le lot' },
  { label: t('marketplaceEdit.unitPiece'), value: 'La pièce' },
])

const servicePriceUnitOptions = computed(() => [
  { label: t('marketplaceEdit.unitHeure'), value: 'par heure' },
  { label: t('marketplaceEdit.unitJour'), value: 'par jour' },
  { label: t('marketplaceEdit.unitDemiJournee'), value: 'demi-journée' },
  { label: t('marketplaceEdit.unitSeance'), value: 'la séance' },
])

const priceUnitOptions = computed(() =>
  form.value.type === 'service' ? servicePriceUnitOptions.value : bienPriceUnitOptions.value,
)

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
      }
      currentStatus.value = data.status
      existingImages.value = data.images || []
    }

    locations.value = locs || []
    allCategories.value = cats || [] // Store all categories
  } catch (error) {
    console.error('Error fetching data:', error)
    toast.add({
      title: t('pollUi.errorTitle'),
      description: t('account.listingsEdit.loadError'),
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
  const currentOptions = form.value.type === 'service' ? servicePriceUnitOptions.value : bienPriceUnitOptions.value
  const isValidUnit = currentOptions.some(opt => opt.value === form.value.priceUnit)
  if (!isValidUnit && form.value.priceUnit) {
    form.value.priceUnit = ''
  }
})

// Delete image immediately
const handleDeleteImage = async (imageUrl: string) => {
  if (existingImages.value.length <= 1) {
    toast.add({
      title: t('account.listingsEdit.cannotDeleteTitle'),
      description: t('account.listingsEdit.cannotDeleteDesc'),
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
        title: t('account.listingsEdit.imageRemovedTitle'),
        description: t('account.listingsEdit.imageRemovedDesc'),
        color: 'success',
      })
    } else {
      toast.add({
        title: t('pollUi.errorTitle'),
        description: result.error || t('account.listingsEdit.imageDeleteError'),
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: error.message || t('account.listingsEdit.imageDeleteError'),
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
      title: t('account.listingsEdit.maxImagesTitle'),
      description: t('account.listingsEdit.maxImagesDesc'),
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
        title: t('account.listingsEdit.imageAddedTitle'),
        description: t('account.listingsEdit.imageAddedDesc'),
        color: 'success',
      })
    } else {
      toast.add({
        title: t('pollUi.errorTitle'),
        description: result.error || t('account.listingsEdit.imageAddError'),
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: error.message || t('account.listingsEdit.imageAddError'),
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
      title: t('account.listingsEdit.missingFieldsTitle'),
      description: t('account.listingsEdit.missingFieldsDesc'),
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
        title: t('account.listingsEdit.updateOkTitle'),
        description: t('account.listingsEdit.updateOkDesc'),
        color: 'success',
      })
      router.push(`/account/listings`)
    } else {
      toast.add({
        title: t('pollUi.errorTitle'),
        description: result.error || t('account.listingsEdit.updateError'),
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: error.message || t('account.listingsEdit.updateError'),
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
            {{ t('account.listingsEdit.back') }}
          </UButton>
          <h1 class="text-3xl font-bold">{{ t('account.listingsEdit.title') }}</h1>
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
            <label class="mb-2 block text-sm font-medium">{{ t('marketplaceEdit.typeLabel') }}</label>
            <div class="flex gap-2">
              <UButton
                :variant="form.type === 'bien' ? 'solid' : 'outline'"
                color="success"
                size="xl"
                class="flex-1"
                @click="form.type = 'bien'"
              >
                {{ t('account.listingsEdit.typeBien') }}
              </UButton>
              <UButton
                :variant="form.type === 'service' ? 'solid' : 'outline'"
                color="info"
                size="xl"
                class="flex-1"
                @click="form.type = 'service'"
              >
                {{ t('account.listingsEdit.typeService') }}
              </UButton>
            </div>
          </div>

          <!-- Title -->
          <div class="w-full">
            <label class="mb-2 block text-sm font-medium">{{ t('marketplaceEdit.titleLabel') }}</label>
            <UInput
              v-model="form.title"
              :placeholder="t('marketplaceEdit.titlePh')"
              size="lg"
              class="w-full"
              required
            />
          </div>

          <!-- Description -->
          <div class="w-full">
            <label class="mb-2 block text-sm font-medium">{{ t('marketplaceEdit.descLabel') }}</label>
            <UTextarea
              v-model="form.description"
              :placeholder="t('account.listingsEdit.descPh')"
              :rows="6"
              size="lg"
              class="w-full"
              required
            />
            <p class="mt-1 text-xs text-white/60">{{ t('marketplaceEdit.chars', { n: form.description.length }) }}</p>
          </div>

          <!-- Category and Location (side by side) -->
          <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Category -->
            <div class="w-full">
              <label class="mb-2 block text-sm font-medium">{{ t('marketplaceEdit.categoryLabel') }}</label>
              <USelect
                v-model="form.categoryId"
                :items="categories.length > 0 ? categories.map(c => ({ label: c.name, value: c.id })) : []"
                :placeholder="t('marketplaceEdit.categoryPh')"
                size="lg"
                class="w-full"
                :disabled="categories.length === 0"
                required
              />
              <p v-if="categories.length === 0 && !isLoading" class="mt-1 text-xs text-red-500">
                {{ t('account.listingsEdit.noCategory') }}
              </p>
            </div>

            <!-- Location -->
            <div class="w-full">
              <label class="mb-2 block text-sm font-medium">{{ t('marketplaceEdit.locationLabel') }}</label>
              <USelect
                v-model="form.locationId"
                :items="locations.length > 0 ? locations.map(l => ({ label: `${l.commune} - ${l.ile} (${l.archipel})`, value: l.id })) : []"
                :placeholder="t('marketplaceEdit.locationPh')"
                size="lg"
                class="w-full"
                :disabled="locations.length === 0"
                required
              />
              <p v-if="locations.length === 0 && !isLoading" class="mt-1 text-xs text-red-500">
                {{ t('account.listingsEdit.noLocation') }}
              </p>
            </div>
          </div>

          <!-- Price -->
          <div class="w-full">
            <label class="mb-2 block text-sm font-medium">{{ t('marketplaceEdit.priceLabel') }}</label>
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
                :placeholder="t('marketplaceEdit.unitPh')"
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
              {{ t('marketplaceEdit.save') }}
            </UButton>
          </div>
        </form>
      </UCard>

      <!-- Images Management (separate from form) -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">{{ t('account.listingsEdit.imagesTitle') }}</h2>
          <p class="mt-1 text-sm text-white/60">
            {{ t('account.listingsEdit.imagesHint') }}
          </p>
        </template>

        <!-- Existing Images -->
        <div v-if="existingImages.length > 0" class="mb-6">
          <label class="mb-3 block text-sm font-medium">{{ t('account.listingsEdit.currentImages', { n: existingImages.length }) }}</label>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="(image, index) in existingImages"
              :key="image"
              class="relative aspect-square overflow-hidden rounded-lg border border-white/20 group"
            >
              <img :src="getImageUrl(image)" :alt="t('marketplaceEdit.imageAlt')" class="h-full w-full object-cover" />
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
          <label class="mb-3 block text-sm font-medium">{{ t('account.listingsEdit.addImages') }}</label>
          <div v-if="existingImages.length < 5" class="space-y-4">
            <ListingImageCropper
              :max-images="5"
              :current-images-count="existingImages.length"
              @cropped="handleImageCropped"
            />
          </div>
          <div v-else class="rounded-lg border border-white/20 p-4 text-center text-sm text-white/60">
            {{ t('account.listingsEdit.maxImagesReached') }}
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
