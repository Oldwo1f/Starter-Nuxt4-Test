<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Gestion des partenaires',
})

import { usePartnerStore } from '~/stores/usePartnerStore'
import type { Partner } from '~/stores/usePartnerStore'

const partnerStore = usePartnerStore()
const toast = useToast()

// Configuration des colonnes pour UTable
const columns = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    enableSorting: true,
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Nom',
    enableSorting: true,
  },
  {
    id: 'link',
    accessorKey: 'link',
    header: 'Lien',
    enableSorting: false,
  },
  {
    id: 'banners',
    accessorKey: 'banners',
    header: 'Bannières',
    enableSorting: false,
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
  },
]

// Gestionnaire pour le double-clic sur les lignes du tableau
const handleTableDoubleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const row = target.closest('tr')
  
  if (!row) return
  
  // Ignorer si on clique sur un bouton ou un lien
  if (target.closest('button') || target.closest('a')) {
    return
  }
  
  // Trouver l'index de la ligne dans le tableau
  const tbody = row.closest('tbody')
  if (!tbody) return
  
  const rows = Array.from(tbody.querySelectorAll('tr'))
  const rowIndex = rows.indexOf(row)
  
  // Récupérer le partenaire correspondant
  if (rowIndex >= 0 && rowIndex < partnerStore.partners.length) {
    const partner = partnerStore.partners[rowIndex]
    if (partner) {
      partnerStore.openEditModal(partner)
    }
  }
}

// Wrapper pour fetchPartners avec gestion des toasts
const handleFetchPartners = async () => {
  await partnerStore.fetchPartners()
  if (partnerStore.error && partnerStore.partners.length === 0) {
    toast.add({
      title: 'Erreur',
      description: partnerStore.error,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour savePartner avec gestion des toasts
const handleSavePartner = async () => {
  const result = await partnerStore.savePartner()
  if (result.success) {
    toast.add({
      title: partnerStore.isEditMode ? 'Partenaire mis à jour' : 'Partenaire créé',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour deletePartner avec gestion des toasts
const handleDeletePartner = async () => {
  const result = await partnerStore.deletePartner()
  if (result.success) {
    toast.add({
      title: 'Partenaire supprimé',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleConfirmDelete = (partner: Partner) => {
  partnerStore.openDeleteConfirm(partner)
}

// Validation des dimensions d'image côté frontend
const validateImageDimensions = (file: File, expectedWidth: number, expectedHeight: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width === expectedWidth && img.height === expectedHeight) {
        resolve(true)
      } else {
        reject(new Error(`Dimensions incorrectes. Attendu: ${expectedWidth}x${expectedHeight}, Reçu: ${img.width}x${img.height}`))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Impossible de charger l\'image'))
    }
    img.src = url
  })
}

const handleBannerHorizontalChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    await validateImageDimensions(file, 1080, 400)
    partnerStore.form.bannerHorizontal = file
    partnerStore.form.existingBannerHorizontal = null
    partnerStore.form.deleteBannerHorizontal = false // Réinitialiser le flag de suppression
  } catch (error: any) {
    toast.add({
      title: 'Erreur de validation',
      description: error.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    target.value = ''
  }
}

const handleBannerVerticalChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    await validateImageDimensions(file, 600, 1080)
    partnerStore.form.bannerVertical = file
    partnerStore.form.existingBannerVertical = null
    partnerStore.form.deleteBannerVertical = false // Réinitialiser le flag de suppression
  } catch (error: any) {
    toast.add({
      title: 'Erreur de validation',
      description: error.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    target.value = ''
  }
}

const { getImageUrl } = useApi()
const getBannerPreview = (file: File | null | undefined, existingUrl: string | null | undefined): string | null => {
  if (file) {
    return URL.createObjectURL(file)
  }
  if (existingUrl) {
    return getImageUrl(existingUrl)
  }
  return null
}

const removeBannerHorizontal = () => {
  partnerStore.form.bannerHorizontal = undefined
  // Si on est en mode édition et qu'il y a une bannière existante, marquer pour suppression
  if (partnerStore.isEditMode && partnerStore.form.existingBannerHorizontal) {
    partnerStore.form.deleteBannerHorizontal = true
    partnerStore.form.existingBannerHorizontal = null
  } else {
    partnerStore.form.existingBannerHorizontal = null
    partnerStore.form.deleteBannerHorizontal = false
  }
}

const removeBannerVertical = () => {
  partnerStore.form.bannerVertical = undefined
  // Si on est en mode édition et qu'il y a une bannière existante, marquer pour suppression
  if (partnerStore.isEditMode && partnerStore.form.existingBannerVertical) {
    partnerStore.form.deleteBannerVertical = true
    partnerStore.form.existingBannerVertical = null
  } else {
    partnerStore.form.existingBannerVertical = null
    partnerStore.form.deleteBannerVertical = false
  }
}

// Charger les partenaires au montage
onMounted(() => {
  handleFetchPartners()
})
</script>

<template>
  <div>
    <div class="space-y-6">
      <!-- Tableau des partenaires -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-arrow-path"
                @click="handleFetchPartners"
                :loading="partnerStore.isLoading"
              />
              <span class="font-medium">Liste des partenaires</span>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                @click="partnerStore.openAddModal"
              >
                Nouveau partenaire
              </UButton>
            </div>
          </div>
        </template>

        <div 
          class="overflow-auto"
          @dblclick="handleTableDoubleClick"
        >
          <UTable
            v-if="!partnerStore.isLoading && partnerStore.partners.length > 0"
            :data="partnerStore.partners"
            :columns="columns"
            :loading="partnerStore.isLoading"
            :ui="{
              tr: {
                base: 'cursor-pointer hover:bg-white/5 transition-colors',
              },
            }"
          >
            <template #link-cell="{ row }">
              <!-- Debug: {{ JSON.stringify(row) }} -->
              <a
                v-if="(row.original || row)?.link"
                :href="(row.original || row).link"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-400 hover:text-primary-300 underline truncate max-w-xs"
              >
                {{ (row.original || row).link }}
              </a>
              <span v-else class="text-white/40">-</span>
            </template>

            <template #banners-cell="{ row }">
              <div class="flex items-center gap-2">
                <span
                  v-if="(row.original || row)?.bannerHorizontalUrl"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400"
                >
                  <UIcon name="i-heroicons-check-circle" class="w-3 h-3" />
                  Horizontale
                </span>
                <span
                  v-if="(row.original || row)?.bannerVerticalUrl"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400"
                >
                  <UIcon name="i-heroicons-check-circle" class="w-3 h-3" />
                  Verticale
                </span>
                <span v-if="!(row.original || row)?.bannerHorizontalUrl && !(row.original || row)?.bannerVerticalUrl" class="text-white/40">Aucune</span>
              </div>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex items-center gap-2">
                <UButton
                  label="Éditer"
                  icon="i-heroicons-pencil"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  @click="partnerStore.openEditModal(row.original || row)"
                />
                <UButton
                  label="Supprimer"
                  icon="i-heroicons-trash"
                  color="error"
                  variant="subtle"
                  size="sm"
                  @click="handleConfirmDelete(row.original || row)"
                />
              </div>
            </template>
          </UTable>
        </div>

        <div v-if="partnerStore.isLoading" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-white/60" />
          <p class="text-white/60 mt-4">Chargement des partenaires...</p>
        </div>

        <div v-else-if="partnerStore.partners.length === 0" class="text-center py-8">
          <p class="text-white/60">Aucun partenaire trouvé</p>
        </div>
      </UCard>
    </div>

    <!-- Modal pour créer/éditer un partenaire -->
    <UModal v-model:open="partnerStore.isModalOpen" :ui="{ wrapper: 'max-w-2xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon :name="partnerStore.isEditMode ? 'i-heroicons-pencil' : 'i-heroicons-plus'" class="w-5 h-5" />
            <span class="font-medium">{{ partnerStore.isEditMode ? 'Éditer le partenaire' : 'Nouveau partenaire' }}</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="partnerStore.closeModal"
          />
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UFormGroup label="Nom" name="name" required>
            <UInput
              v-model="partnerStore.form.name"
              placeholder="Nom du partenaire"
              icon="i-heroicons-building-office"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Lien" name="link">
            <UInput
              v-model="partnerStore.form.link"
              placeholder="https://example.com"
              icon="i-heroicons-link"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <!-- Bannière horizontale -->
          <UFormGroup label="Bannière horizontale (1080 x 400 px)" name="bannerHorizontal">
            <div class="space-y-2">
              <div v-if="getBannerPreview(partnerStore.form.bannerHorizontal, partnerStore.form.existingBannerHorizontal)" class="relative">
                <img
                  :src="getBannerPreview(partnerStore.form.bannerHorizontal, partnerStore.form.existingBannerHorizontal)!"
                  alt="Bannière horizontale"
                  class="w-full h-auto rounded-lg border-0"
                />
                <UButton
                  color="error"
                  variant="solid"
                  icon="i-heroicons-trash"
                  size="xs"
                  class="absolute top-2 right-2"
                  @click="removeBannerHorizontal"
                />
              </div>
              <UInput
                type="file"
                accept="image/*"
                @change="handleBannerHorizontalChange"
              />
            </div>
          </UFormGroup>

          <!-- Bannière verticale -->
          <UFormGroup label="Bannière verticale (600 x 1080 px)" name="bannerVertical">
            <div class="space-y-2">
              <div v-if="getBannerPreview(partnerStore.form.bannerVertical, partnerStore.form.existingBannerVertical)" class="relative max-w-xs">
                <img
                  :src="getBannerPreview(partnerStore.form.bannerVertical, partnerStore.form.existingBannerVertical)!"
                  alt="Bannière verticale"
                  class="w-full h-auto rounded-lg border-0"
                />
                <UButton
                  color="error"
                  variant="solid"
                  icon="i-heroicons-trash"
                  size="xs"
                  class="absolute top-2 right-2"
                  @click="removeBannerVertical"
                />
              </div>
              <UInput
                type="file"
                accept="image/*"
                @change="handleBannerVerticalChange"
              />
            </div>
          </UFormGroup>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="partnerStore.closeModal"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            @click="handleSavePartner"
          >
            {{ partnerStore.isEditMode ? 'Mettre à jour' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="partnerStore.isDeleteConfirmOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-error" />
          <span class="font-medium">Confirmer la suppression</span>
        </div>
      </template>

      <template #body>
        <p class="text-white/70">
          Êtes-vous sûr de vouloir supprimer le partenaire <strong>{{ partnerStore.selectedPartner?.name }}</strong> ?
          Cette action est irréversible.
        </p>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="partnerStore.closeDeleteConfirm"
          >
            Annuler
          </UButton>
          <UButton
            color="error"
            :loading="partnerStore.isDeleting"
            @click="handleDeletePartner"
          >
            Supprimer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
