<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Gestion des goodies',
})

import { useGoodiesStore } from '~/stores/useGoodiesStore'
import type { Goodie } from '~/stores/useGoodiesStore'

const goodieStore = useGoodiesStore()
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
    id: 'offeredBy',
    accessorKey: 'offeredByName',
    header: 'Offert par',
    enableSorting: false,
  },
  {
    id: 'image',
    accessorKey: 'imageUrl',
    header: 'Image',
    enableSorting: false,
  },
  {
    id: 'isPublic',
    accessorKey: 'isPublic',
    header: 'Public',
    enableSorting: true,
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
  },
]

// Wrapper pour fetchGoodies avec gestion des toasts
const handleFetchGoodies = async () => {
  await goodieStore.fetchGoodies()
  if (goodieStore.error && goodieStore.goodies.length === 0) {
    toast.add({
      title: 'Erreur',
      description: goodieStore.error,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour saveGoodie avec gestion des toasts
const handleSaveGoodie = async () => {
  const result = await goodieStore.saveGoodie()
  if (result.success) {
    toast.add({
      title: goodieStore.isEditMode ? 'Goodie mis à jour' : 'Goodie créé',
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

// Wrapper pour deleteGoodie avec gestion des toasts
const handleDeleteGoodie = async () => {
  const result = await goodieStore.deleteGoodie()
  if (result.success) {
    toast.add({
      title: 'Goodie supprimé',
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

const handleConfirmDelete = (goodie: Goodie) => {
  goodieStore.openDeleteConfirm(goodie)
}

// Gérer l'image croppée
const handleImageCropped = (file: File) => {
  goodieStore.form.image = file
  goodieStore.form.existingImage = null
  goodieStore.form.deleteImage = false
}

const { getImageUrl } = useApi()
const getImagePreview = (): string | null => {
  if (goodieStore.form.image) {
    return URL.createObjectURL(goodieStore.form.image)
  }
  if (goodieStore.form.existingImage) {
    return getImageUrl(goodieStore.form.existingImage)
  }
  return null
}

const removeImage = () => {
  goodieStore.form.image = undefined
  // Si on est en mode édition et qu'il y a une image existante, marquer pour suppression
  if (goodieStore.isEditMode && goodieStore.form.existingImage) {
    goodieStore.form.deleteImage = true
    goodieStore.form.existingImage = null
  } else {
    goodieStore.form.existingImage = null
    goodieStore.form.deleteImage = false
  }
}

// Gérer la sélection d'un fichier
const handleFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    goodieStore.form.file = target.files[0]
    goodieStore.form.existingFile = null
    goodieStore.form.deleteFile = false
  }
}

// Obtenir le preview du fichier
const getFilePreview = (): string | null => {
  if (goodieStore.form.file) {
    return goodieStore.form.file.name
  }
  if (goodieStore.form.existingFile) {
    return goodieStore.form.existingFile
  }
  return null
}

// Obtenir le nom du fichier
const getFileName = (): string => {
  if (goodieStore.form.file) {
    return goodieStore.form.file.name
  }
  if (goodieStore.form.existingFile) {
    // Extraire le nom du fichier depuis l'URL
    const parts = goodieStore.form.existingFile.split('/')
    return parts[parts.length - 1] || 'Fichier'
  }
  return ''
}

// Obtenir la taille du fichier
const getFileSize = (): string => {
  if (goodieStore.form.file) {
    const size = goodieStore.form.file.size
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }
  return ''
}

// Supprimer le fichier
const removeFile = () => {
  goodieStore.form.file = undefined
  // Si on est en mode édition et qu'il y a un fichier existant, marquer pour suppression
  if (goodieStore.isEditMode && goodieStore.form.existingFile) {
    goodieStore.form.deleteFile = true
    goodieStore.form.existingFile = null
  } else {
    goodieStore.form.existingFile = null
    goodieStore.form.deleteFile = false
  }
}

// Charger les goodies au montage
onMounted(() => {
  handleFetchGoodies()
})
</script>

<template>
  <div>
    <div class="space-y-6">
      <!-- Tableau des goodies -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-arrow-path"
                @click="handleFetchGoodies"
                :loading="goodieStore.isLoading"
              />
              <span class="font-medium">Liste des goodies</span>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                @click="goodieStore.openAddModal"
              >
                Nouveau goodie
              </UButton>
            </div>
          </div>
        </template>

        <div class="overflow-auto">
          <UTable
            v-if="!goodieStore.isLoading && Array.isArray(goodieStore.goodies) && goodieStore.goodies.length > 0"
            :data="goodieStore.goodies"
            :columns="columns"
            :loading="goodieStore.isLoading"
          >
            <template #link-cell="{ row }">
              <a
                v-if="(row.original || row).link"
                :href="(row.original || row).link"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-400 hover:text-primary-300 underline truncate max-w-xs"
              >
                {{ (row.original || row).link }}
              </a>
              <span v-else class="text-white/40">-</span>
            </template>

            <template #offeredBy-cell="{ row }">
              <div class="flex flex-col gap-1">
                <span v-if="(row.original || row).offeredByName" class="text-white/90">
                  {{ (row.original || row).offeredByName }}
                </span>
                <a
                  v-if="(row.original || row).offeredByLink"
                  :href="(row.original || row).offeredByLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary-400 hover:text-primary-300 underline text-sm truncate max-w-xs"
                >
                  {{ (row.original || row).offeredByLink }}
                </a>
                <span v-if="!(row.original || row).offeredByName && !(row.original || row).offeredByLink" class="text-white/40">-</span>
              </div>
            </template>

            <template #image-cell="{ row }">
              <div class="flex items-center gap-2">
                <img
                  v-if="(row.original || row).imageUrl"
                  :src="getImageUrl((row.original || row).imageUrl)"
                  :alt="(row.original || row).name"
                  class="w-12 h-12 object-cover rounded"
                />
                <span v-else class="text-white/40">Aucune</span>
              </div>
            </template>

            <template #isPublic-cell="{ row }">
              <UBadge :color="(row.original || row).isPublic ? 'success' : 'neutral'" variant="subtle">
                {{ (row.original || row).isPublic ? 'Public' : 'Privé' }}
              </UBadge>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex items-center gap-2">
                <UButton
                  label="Éditer"
                  icon="i-heroicons-pencil"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  @click="goodieStore.openEditModal(row.original || row)"
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

        <div v-if="goodieStore.isLoading" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-white/60" />
          <p class="text-white/60 mt-4">Chargement des goodies...</p>
        </div>

        <div v-else-if="!Array.isArray(goodieStore.goodies) || goodieStore.goodies.length === 0" class="text-center py-8">
          <p class="text-white/60">Aucun goodie trouvé</p>
        </div>
      </UCard>
    </div>

    <!-- Modal pour créer/éditer un goodie -->
    <UModal v-model:open="goodieStore.isModalOpen" :ui="{ wrapper: 'max-w-2xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon :name="goodieStore.isEditMode ? 'i-heroicons-pencil' : 'i-heroicons-plus'" class="w-5 h-5" />
            <span class="font-medium">{{ goodieStore.isEditMode ? 'Éditer le goodie' : 'Nouveau goodie' }}</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="goodieStore.closeModal"
          />
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UFormGroup label="Nom" name="name" required>
            <UInput
              v-model="goodieStore.form.name"
              placeholder="Nom du goodie"
              icon="i-heroicons-gift"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Lien" name="link">
            <UInput
              v-model="goodieStore.form.link"
              placeholder="https://example.com"
              icon="i-heroicons-link"
              size="xl"
              class="w-full"
            />
            <template #description>
              <span class="text-xs text-white/60">Utilisé uniquement si aucun fichier n'est uploadé</span>
            </template>
          </UFormGroup>

          <!-- Fichier uploadé (zip, pdf, etc.) -->
          <UFormGroup label="Fichier (zip, pdf, etc.)" name="file">
            <div class="space-y-4">
              <!-- Afficher le fichier existant -->
              <div v-if="getFilePreview()" class="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
                <UIcon name="i-heroicons-document" class="w-6 h-6 text-primary-400" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{{ getFileName() }}</p>
                  <p class="text-xs text-white/60">{{ getFileSize() }}</p>
                </div>
                <UButton
                  color="error"
                  variant="solid"
                  icon="i-heroicons-trash"
                  size="xs"
                  @click="removeFile"
                />
              </div>

              <!-- Input pour uploader un nouveau fichier -->
              <div v-if="!getFilePreview()" class="space-y-2">
                <UInput
                  type="file"
                  accept=".zip,.pdf,application/zip,application/x-zip-compressed,application/pdf,application/x-pdf"
                  @change="handleFileSelected"
                  class="w-full"
                />
                <p class="text-xs text-white/60">Formats acceptés : ZIP, PDF (max 50MB)</p>
              </div>
            </div>
            <template #description>
              <span class="text-xs text-white/60">Si un fichier est uploadé, il prendra la priorité sur le lien</span>
            </template>
          </UFormGroup>

          <UFormGroup label="Description" name="description">
            <UTextarea
              v-model="goodieStore.form.description"
              placeholder="Description du goodie"
              :rows="4"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Nom de la personne qui offre" name="offeredByName">
            <UInput
              v-model="goodieStore.form.offeredByName"
              placeholder="Nom de la personne"
              icon="i-heroicons-user"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Lien de la personne qui offre" name="offeredByLink">
            <UInput
              v-model="goodieStore.form.offeredByLink"
              placeholder="https://example.com/profile"
              icon="i-heroicons-link"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <!-- Image carrée -->
          <UFormGroup label="Image (format carré requis)" name="image">
            <div class="space-y-4">
              <!-- Preview de l'image existante ou nouvelle -->
              <div v-if="getImagePreview()" class="relative inline-block">
                <img
                  :src="getImagePreview()!"
                  alt="Image du goodie"
                  class="w-48 h-48 object-cover rounded-lg border border-white/10"
                />
                <UButton
                  color="error"
                  variant="solid"
                  icon="i-heroicons-trash"
                  size="xs"
                  class="absolute top-2 right-2"
                  @click="removeImage"
                />
              </div>

              <!-- Composant de crop -->
              <div v-if="!getImagePreview()">
                <GoodieImageCropper @cropped="handleImageCropped" />
              </div>
            </div>
          </UFormGroup>

          <UFormGroup label="Visibilité" name="isPublic">
            <USwitch
              v-model="goodieStore.form.isPublic"
              label="Public (accessible à tous)"
              description="Si désactivé, le goodie sera réservé aux membres connectés"
            />
          </UFormGroup>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="goodieStore.closeModal"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            @click="handleSaveGoodie"
          >
            {{ goodieStore.isEditMode ? 'Mettre à jour' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="goodieStore.isDeleteConfirmOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-error" />
          <span class="font-medium">Confirmer la suppression</span>
        </div>
      </template>

      <template #body>
        <p class="text-white/70">
          Êtes-vous sûr de vouloir supprimer le goodie <strong>{{ goodieStore.selectedGoodie?.name }}</strong> ?
          Cette action est irréversible.
        </p>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="goodieStore.closeDeleteConfirm"
          >
            Annuler
          </UButton>
          <UButton
            color="error"
            :loading="goodieStore.isDeleting"
            @click="handleDeleteGoodie"
          >
            Supprimer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
