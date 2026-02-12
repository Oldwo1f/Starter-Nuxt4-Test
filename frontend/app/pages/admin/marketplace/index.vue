<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Gestion des annonces',
})

import { useMarketplaceStore, type Listing } from '~/stores/useMarketplaceStore'

const marketplaceStore = useMarketplaceStore()
const toast = useToast()
const { apiBaseUrl, getImageUrl } = useApi()

// Configuration des colonnes pour UTable
const columns = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    enableSorting: true,
  },
  {
    id: 'title',
    accessorKey: 'title',
    header: 'Titre',
    enableSorting: true,
  },
  {
    id: 'type',
    accessorKey: 'type',
    header: 'Type',
    enableSorting: true,
  },
  {
    id: 'price',
    accessorKey: 'price',
    header: 'Prix',
    enableSorting: true,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Statut',
    enableSorting: true,
  },
  {
    id: 'seller',
    accessorKey: 'seller',
    header: 'Vendeur',
    enableSorting: false,
  },
  {
    id: 'location',
    accessorKey: 'location',
    header: 'Localisation',
    enableSorting: false,
  },
  {
    id: 'viewCount',
    accessorKey: 'viewCount',
    header: 'Vues',
    enableSorting: true,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Créé le',
    enableSorting: true,
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
  },
]

// États pour les modals
const isModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const isDeleting = ref(false)
const isEditMode = ref(false)
const selectedListing = ref<Listing | null>(null)

// Form pour créer/éditer une annonce
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

// Images
const images = ref<File[]>([])
const existingImages = ref<string[]>([])
const imagePreviews = ref<string[]>([])

// Options pour les formulaires
const locations = ref<any[]>([])
const allCategories = ref<any[]>([])
const isLoadingOptions = ref(false)

// Computed property to filter categories by type
const categories = computed(() => {
  if (!form.value.type) return []
  return (allCategories.value || []).filter((c: any) => c.type === form.value.type)
})

// Price unit options
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

const priceUnitOptions = computed(() => {
  return form.value.type === 'service' ? servicePriceUnitOptions : bienPriceUnitOptions
})

// Filtres pour le tableau
const globalFilter = ref('')
const statusFilter = ref<'active' | 'sold' | 'archived' | null>(null)
const typeFilter = ref<'bien' | 'service' | null>(null)

// Pagination
const currentPage = ref(1)
const pageSize = ref(20)

// Calcul de la hauteur disponible pour le tableau
const tableHeight = ref('600px')

const calculateTableHeight = () => {
  if (import.meta.client) {
    const viewportHeight = window.innerHeight
    const layoutTopBar = 64
    const pagePadding = 32
    const pageHeader = 0
    const cardHeader = 70
    const pagination = 60
    const margins = 24
    
    const availableHeight = viewportHeight - layoutTopBar - pagePadding - pageHeader - cardHeader - pagination - margins
    const maxHeight = 680
    const calculatedHeight = Math.min(maxHeight, availableHeight)
    
    tableHeight.value = `${Math.max(300, calculatedHeight)}px`
  }
}

// Fetch options (locations et categories)
const fetchOptions = async () => {
  isLoadingOptions.value = true
  try {
    const [locs, cats] = await Promise.all([
      $fetch<any[]>(`${apiBaseUrl}/locations`),
      $fetch<any[]>(`${apiBaseUrl}/categories`),
    ])
    locations.value = Array.isArray(locs) ? locs : []
    allCategories.value = Array.isArray(cats) ? cats : []
  } catch (error) {
    console.error('Error fetching options:', error)
    locations.value = []
    allCategories.value = []
  } finally {
    isLoadingOptions.value = false
  }
}

// Wrapper pour fetchListings avec gestion des toasts
const handleFetchListings = async () => {
  const filters: any = {
    showAll: true, // En admin, on veut voir toutes les annonces par défaut
  }
  if (globalFilter.value) filters.search = globalFilter.value
  if (statusFilter.value) filters.status = statusFilter.value
  if (typeFilter.value) filters.type = typeFilter.value

  const result = await marketplaceStore.fetchListings(currentPage.value, pageSize.value, filters)
  if (!result.success && marketplaceStore.listings.length === 0) {
    toast.add({
      title: 'Erreur',
      description: result.error || 'Erreur lors du chargement des annonces',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour saveListing avec gestion des toasts
const handleSaveListing = async () => {
  if (!form.value.title.trim()) {
    toast.add({
      title: 'Erreur',
      description: 'Le titre est requis',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!form.value.description.trim()) {
    toast.add({
      title: 'Erreur',
      description: 'La description est requise',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!form.value.categoryId) {
    toast.add({
      title: 'Erreur',
      description: 'La catégorie est requise',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!form.value.locationId) {
    toast.add({
      title: 'Erreur',
      description: 'La localisation est requise',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (isEditMode.value && selectedListing.value) {
    // Mise à jour
    const result = await marketplaceStore.updateListing(selectedListing.value.id, {
      title: form.value.title,
      description: form.value.description,
      price: form.value.price,
      priceUnit: form.value.priceUnit || undefined,
      type: form.value.type,
      categoryId: form.value.categoryId,
      locationId: form.value.locationId,
      status: form.value.status,
    })

    // Ajouter de nouvelles images si nécessaire
    if (images.value.length > 0) {
      await marketplaceStore.addListingImages(selectedListing.value.id, images.value)
    }

    if (result.success) {
      toast.add({
        title: 'Annonce mise à jour',
        description: 'L\'annonce a été modifiée avec succès.',
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
      closeModal()
      await handleFetchListings()
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Erreur lors de la mise à jour de l\'annonce',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    }
  } else {
    // Création
    const result = await marketplaceStore.createListing({
      title: form.value.title,
      description: form.value.description,
      price: form.value.price,
      priceUnit: form.value.priceUnit || undefined,
      type: form.value.type,
      categoryId: form.value.categoryId!,
      locationId: form.value.locationId!,
      images: images.value.length > 0 ? images.value : undefined,
    })

    if (result.success) {
      toast.add({
        title: 'Annonce créée',
        description: 'L\'annonce a été créée avec succès.',
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
      closeModal()
      await handleFetchListings()
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Erreur lors de la création de l\'annonce',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    }
  }
}

// Wrapper pour deleteListing avec gestion des toasts
const handleDeleteListing = async () => {
  if (!selectedListing.value) return

  isDeleting.value = true
  const result = await marketplaceStore.deleteListing(selectedListing.value.id)
  isDeleting.value = false

  if (result.success) {
    toast.add({
      title: 'Annonce supprimée',
      description: 'L\'annonce a été supprimée avec succès.',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    closeDeleteConfirm()
    await handleFetchListings()
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error || 'Erreur lors de la suppression de l\'annonce',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Ouvrir le modal d'ajout
const openAddModal = () => {
  isEditMode.value = false
  selectedListing.value = null
  form.value = {
    title: '',
    description: '',
    price: 0,
    priceUnit: '',
    type: 'bien',
    categoryId: undefined,
    locationId: undefined,
    status: 'active',
  }
  images.value = []
  existingImages.value = []
  imagePreviews.value = []
  isModalOpen.value = true
  fetchOptions()
}

// Ouvrir le modal d'édition
const openEditModal = (listing: Listing) => {
  isEditMode.value = true
  selectedListing.value = listing
  form.value = {
    title: listing.title,
    description: listing.description,
    price: listing.price,
    priceUnit: listing.priceUnit || '',
    type: listing.type,
    categoryId: listing.categoryId,
    locationId: listing.locationId,
    status: listing.status,
  }
  images.value = []
  existingImages.value = listing.images || []
  imagePreviews.value = []
  isModalOpen.value = true
  fetchOptions()
}

// Fermer le modal
const closeModal = () => {
  isModalOpen.value = false
  selectedListing.value = null
  form.value = {
    title: '',
    description: '',
    price: 0,
    priceUnit: '',
    type: 'bien',
    categoryId: undefined,
    locationId: undefined,
    status: 'active',
  }
  images.value = []
  existingImages.value = []
  imagePreviews.value = []
}

// Ouvrir le modal de confirmation de suppression
const openDeleteConfirm = (listing: Listing) => {
  selectedListing.value = listing
  isDeleteConfirmOpen.value = true
}

// Fermer le modal de confirmation
const closeDeleteConfirm = () => {
  isDeleteConfirmOpen.value = false
  selectedListing.value = null
}

// Gérer l'ajout d'images
const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const newFiles = Array.from(target.files)
    const totalImages = images.value.length + existingImages.value.length + newFiles.length
    if (totalImages > 10) {
      toast.add({
        title: 'Erreur',
        description: 'Vous ne pouvez pas ajouter plus de 10 images',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
      return
    }
    images.value.push(...newFiles)
    newFiles.forEach((file) => {
      if (import.meta.client && window.URL) {
        imagePreviews.value.push(window.URL.createObjectURL(file))
      }
    })
  }
}

// Supprimer une image
const removeImage = (index: number) => {
  images.value.splice(index, 1)
  if (imagePreviews.value[index]) {
    if (import.meta.client && window.URL) {
      window.URL.revokeObjectURL(imagePreviews.value[index])
    }
    imagePreviews.value.splice(index, 1)
  }
}

// Supprimer une image existante
const removeExistingImage = (index: number) => {
  existingImages.value.splice(index, 1)
}

// Watch type pour réinitialiser categoryId
watch(() => form.value.type, () => {
  form.value.categoryId = undefined
  if (form.value.priceUnit) {
    const currentOptions = form.value.type === 'service' ? servicePriceUnitOptions : bienPriceUnitOptions
    const isValidUnit = currentOptions.some(opt => opt.value === form.value.priceUnit)
    if (!isValidUnit) {
      form.value.priceUnit = ''
    }
  }
})

// Watch filters pour recharger les annonces
watch([globalFilter, statusFilter, typeFilter, currentPage, pageSize], () => {
  handleFetchListings()
}, { deep: true })

// Formatage des données pour le tableau
const tableData = computed(() => {
  return marketplaceStore.listings.map((listing) => ({
    ...listing,
    createdAtFormatted: new Date(listing.createdAt).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  }))
})

// Charger les annonces au montage
onMounted(() => {
  handleFetchListings()
  calculateTableHeight()
  if (import.meta.client) {
    window.addEventListener('resize', calculateTableHeight)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', calculateTableHeight)
    // Nettoyer les URLs d'objets
    imagePreviews.value.forEach((url) => {
      window.URL.revokeObjectURL(url)
    })
  }
})
</script>

<template>
  <div>
    <div class="space-y-6">
      <!-- Tableau des annonces -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-arrow-path"
                @click="handleFetchListings"
                :loading="marketplaceStore.isLoading"
              />
              <span class="font-medium">Liste des annonces</span>
            </div>
            <div class="flex items-center gap-2">
              <UInput
                v-model="globalFilter"
                placeholder="Rechercher..."
                icon="i-heroicons-magnifying-glass"
                clearable
                class="w-64"
              />
              <USelect
                v-model="statusFilter"
                :items="[
                  { label: 'Tous les statuts', value: null },
                  { label: 'Active', value: 'active' },
                  { label: 'Vendu', value: 'sold' },
                  { label: 'Archivée', value: 'archived' },
                ]"
                placeholder="Statut"
                class="w-40"
              />
              <USelect
                v-model="typeFilter"
                :items="[
                  { label: 'Tous les types', value: null },
                  { label: 'Bien', value: 'bien' },
                  { label: 'Service', value: 'service' },
                ]"
                placeholder="Type"
                class="w-40"
              />
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                @click="openAddModal"
              >
                Nouvelle annonce
              </UButton>
            </div>
          </div>
        </template>

        <div class="overflow-auto" :style="{ maxHeight: tableHeight }">
          <UTable
            v-if="!marketplaceStore.isLoading && marketplaceStore.listings.length > 0"
            :data="tableData"
            :columns="columns"
            :loading="marketplaceStore.isLoading"
          >
            <template #type-cell="{ row }">
              <UBadge :color="row.original.type === 'bien' ? 'blue' : 'purple'" variant="subtle">
                {{ row.original.type === 'bien' ? 'Bien' : 'Service' }}
              </UBadge>
            </template>

            <template #price-cell="{ row }">
              <div class="flex items-center gap-1">
                <span class="font-medium">{{ row.original.price }}</span>
                <span class="text-xs text-white/60">Pūpū</span>
                <span v-if="row.original.priceUnit" class="text-xs text-white/60">
                  / {{ row.original.priceUnit }}
                </span>
              </div>
            </template>

            <template #status-cell="{ row }">
              <UBadge
                :color="
                  row.original.status === 'active'
                    ? 'success'
                    : row.original.status === 'sold'
                      ? 'warning'
                      : 'neutral'
                "
                variant="subtle"
              >
                {{
                  row.original.status === 'active'
                    ? 'Active'
                    : row.original.status === 'sold'
                      ? 'Vendu'
                      : 'Archivée'
                }}
              </UBadge>
            </template>

            <template #seller-cell="{ row }">
              <div class="flex flex-col">
                <span v-if="row.original.seller?.email" class="text-sm">
                  {{ row.original.seller.email }}
                </span>
                <span v-else class="text-white/40">-</span>
              </div>
            </template>

            <template #location-cell="{ row }">
              <div v-if="row.original.location" class="text-sm">
                {{ row.original.location.commune }} - {{ row.original.location.ile }}
              </div>
              <span v-else class="text-white/40">-</span>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex items-center gap-2">
                <UButton
                  label="Éditer"
                  icon="i-heroicons-pencil"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  @click="openEditModal(row.original)"
                />
                <UButton
                  label="Supprimer"
                  icon="i-heroicons-trash"
                  color="error"
                  variant="subtle"
                  size="sm"
                  @click="openDeleteConfirm(row.original)"
                />
              </div>
            </template>
          </UTable>
        </div>

        <!-- Pagination -->
        <div
          v-if="!marketplaceStore.isLoading && marketplaceStore.listings.length > 0"
          class="flex items-center justify-between px-4 py-3 border-t border-white/10"
        >
          <div class="flex items-center gap-4">
            <div class="text-sm text-white/70">
              Affichage de
              {{ (currentPage - 1) * pageSize + 1 }} à
              {{ Math.min(currentPage * pageSize, marketplaceStore.pagination.total) }}
              sur {{ marketplaceStore.pagination.total }} annonce{{
                marketplaceStore.pagination.total > 1 ? 's' : ''
              }}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-white/70">Par page :</span>
              <USelect
                v-model="pageSize"
                :items="[
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                ]"
                option-attribute="label"
                value-attribute="value"
                class="w-20"
                @update:model-value="currentPage = 1"
              />
            </div>
          </div>
          <UPagination
            v-model:page="currentPage"
            :total="marketplaceStore.pagination.total"
            :items-per-page="pageSize"
            show-first
            show-last
          />
        </div>

        <div v-else-if="marketplaceStore.isLoading" class="text-center py-8">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-8 h-8 animate-spin mx-auto text-white/60"
          />
          <p class="text-white/60 mt-4">Chargement des annonces...</p>
        </div>

        <div v-else class="text-center py-8">
          <p class="text-white/60">Aucune annonce trouvée</p>
        </div>
      </UCard>
    </div>

    <!-- Modal pour créer/éditer une annonce -->
    <UModal v-model:open="isModalOpen" :ui="{ wrapper: 'max-w-3xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              :name="isEditMode ? 'i-heroicons-pencil' : 'i-heroicons-plus'"
              class="w-5 h-5"
            />
            <span class="font-medium">
              {{ isEditMode ? 'Éditer l\'annonce' : 'Nouvelle annonce' }}
            </span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="closeModal"
          />
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UFormGroup label="Titre" name="title" required>
            <UInput
              v-model="form.title"
              placeholder="Titre de l'annonce"
              icon="i-heroicons-document-text"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Description" name="description" required>
            <UTextarea
              v-model="form.description"
              placeholder="Description de l'annonce"
              :rows="6"
              class="w-full"
            />
          </UFormGroup>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormGroup label="Type" name="type" required>
              <USelect
                v-model="form.type"
                :items="[
                  { label: 'Bien', value: 'bien' },
                  { label: 'Service', value: 'service' },
                ]"
                placeholder="Type"
                size="xl"
                class="w-full"
              />
            </UFormGroup>

            <UFormGroup label="Statut" name="status" required>
              <USelect
                v-model="form.status"
                :items="[
                  { label: 'Active', value: 'active' },
                  { label: 'Vendu', value: 'sold' },
                  { label: 'Archivée', value: 'archived' },
                ]"
                placeholder="Statut"
                size="xl"
                class="w-full"
              />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormGroup label="Catégorie" name="categoryId" required>
              <USelect
                v-model="form.categoryId"
                :items="
                  categories.length > 0
                    ? categories.map((c) => ({ label: c.name, value: c.id }))
                    : []
                "
                placeholder="Sélectionnez une catégorie"
                size="xl"
                class="w-full"
                :disabled="categories.length === 0 || isLoadingOptions"
              />
            </UFormGroup>

            <UFormGroup label="Localisation" name="locationId" required>
              <USelect
                v-model="form.locationId"
                :items="
                  locations.length > 0
                    ? locations.map((l) => ({
                        label: `${l.commune} - ${l.ile} (${l.archipel})`,
                        value: l.id,
                      }))
                    : []
                "
                placeholder="Sélectionnez une localisation"
                size="xl"
                class="w-full"
                :disabled="locations.length === 0 || isLoadingOptions"
              />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormGroup label="Valeur (Pūpū)" name="price" required>
              <UInput
                v-model.number="form.price"
                type="number"
                placeholder="0"
                icon="i-heroicons-currency-dollar"
                size="xl"
                class="w-full"
                :min="0"
              />
            </UFormGroup>

            <UFormGroup label="Unité de prix" name="priceUnit">
              <USelect
                v-model="form.priceUnit"
                :items="priceUnitOptions"
                placeholder="Unité (optionnel)"
                size="xl"
                class="w-full"
              />
            </UFormGroup>
          </div>

          <!-- Images existantes -->
          <UFormGroup
            v-if="existingImages.length > 0"
            label="Images actuelles"
          >
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div
                v-for="(image, index) in existingImages"
                :key="index"
                class="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/20 group"
              >
                <img
                  :src="getImageUrl(image)"
                  alt="Image"
                  class="h-full w-full object-cover"
                />
                <button
                  type="button"
                  class="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                  @click="removeExistingImage(index)"
                >
                  <UIcon name="i-heroicons-trash" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </UFormGroup>

          <!-- Ajouter des images -->
          <UFormGroup
            label="Images (ratio 4/3)"
            description="Ajoutez jusqu'à 10 images au total"
          >
            <div
              v-if="images.length + existingImages.length < 10"
              class="space-y-4"
            >
              <input
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                ref="imageInput"
                @change="handleImageSelect"
              />
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-photo"
                @click="() => {
                  const input = $refs.imageInput as HTMLInputElement
                  if (input) input.click()
                }"
              >
                Ajouter des images
              </UButton>
            </div>
            <div
              v-else
              class="rounded-lg border border-white/20 p-4 text-center text-sm text-white/60"
            >
              Maximum de 10 images atteint
            </div>

            <!-- Prévisualisation des nouvelles images -->
            <div
              v-if="imagePreviews.length > 0"
              class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3"
            >
              <div
                v-for="(preview, index) in imagePreviews"
                :key="index"
                class="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/20 group"
              >
                <img
                  :src="preview"
                  alt="Preview"
                  class="h-full w-full object-cover"
                />
                <button
                  type="button"
                  class="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                  @click="removeImage(index)"
                >
                  <UIcon name="i-heroicons-trash" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </UFormGroup>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="closeModal"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            @click="handleSaveListing"
            :loading="marketplaceStore.isLoading"
          >
            {{ isEditMode ? 'Enregistrer' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="isDeleteConfirmOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-5 h-5 text-red-400"
          />
          <span class="font-medium">Confirmer la suppression</span>
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            title="Action irréversible"
            description="Cette action est irréversible. L'annonce sera définitivement supprimée."
          />
          <template v-if="selectedListing">
            <p class="text-white/90">
              Êtes-vous sûr de vouloir supprimer l'annonce
              <strong class="text-white">"{{ selectedListing.title }}"</strong> ?
            </p>
          </template>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="closeDeleteConfirm"
            :disabled="isDeleting"
          >
            Annuler
          </UButton>
          <UButton
            color="error"
            @click="handleDeleteListing"
            :loading="isDeleting"
            :disabled="isDeleting"
          >
            Supprimer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
