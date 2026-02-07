<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Gestion des vidéos Culture',
})

import { useCultureStore } from '~/stores/useCultureStore'
import type { Culture } from '~/stores/useCultureStore'

const cultureStore = useCultureStore()
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
    id: 'director',
    accessorKey: 'director',
    header: 'Réalisateur',
    enableSorting: false,
  },
  {
    id: 'youtubeUrl',
    accessorKey: 'youtubeUrl',
    header: 'URL YouTube',
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

// Helper pour obtenir la miniature YouTube
const getYouTubeThumbnail = (url: string) => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(youtubeRegex)
  
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
  }
  
  return null
}

// Wrapper pour fetchCultures avec gestion des toasts
const handleFetchCultures = async () => {
  await cultureStore.fetchCultures()
  if (cultureStore.error && cultureStore.cultures.length === 0) {
    toast.add({
      title: 'Erreur',
      description: cultureStore.error,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour saveCulture avec gestion des toasts
const handleSaveCulture = async () => {
  const result = await cultureStore.saveCulture()
  if (result.success) {
    toast.add({
      title: cultureStore.isEditMode ? 'Vidéo mise à jour' : 'Vidéo créée',
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

// Wrapper pour deleteCulture avec gestion des toasts
const handleDeleteCulture = async () => {
  const result = await cultureStore.deleteCulture()
  if (result.success) {
    toast.add({
      title: 'Vidéo supprimée',
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

const handleConfirmDelete = (culture: Culture) => {
  cultureStore.openDeleteConfirm(culture)
}

// Options pour le type de vidéo
const typeOptions = [
  { label: 'Reportage', value: 'reportage' },
  { label: 'Documentaire', value: 'documentaire' },
  { label: 'Interview', value: 'interview' },
]

// Charger les vidéos au montage
onMounted(() => {
  handleFetchCultures()
})
</script>

<template>
  <div>
    <div class="space-y-6">
      <!-- Tableau des vidéos -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-arrow-path"
                @click="handleFetchCultures"
                :loading="cultureStore.isLoading"
              />
              <span class="font-medium">Liste des vidéos Culture</span>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                @click="cultureStore.openAddModal"
              >
                Nouvelle vidéo
              </UButton>
            </div>
          </div>
        </template>

        <div class="overflow-auto">
          <UTable
            v-if="!cultureStore.isLoading && Array.isArray(cultureStore.cultures) && cultureStore.cultures.length > 0"
            :data="cultureStore.cultures"
            :columns="columns"
            :loading="cultureStore.isLoading"
          >
            <template #type-cell="{ row }">
              <UBadge
                :color="
                  (row.original || row).type === 'reportage'
                    ? 'blue'
                    : (row.original || row).type === 'documentaire'
                      ? 'purple'
                      : 'green'
                "
                variant="subtle"
              >
                {{ (row.original || row).type === 'reportage' ? 'Reportage' : (row.original || row).type === 'documentaire' ? 'Documentaire' : 'Interview' }}
              </UBadge>
            </template>

            <template #director-cell="{ row }">
              <span v-if="(row.original || row).director" class="text-white/90">
                {{ (row.original || row).director }}
              </span>
              <span v-else class="text-white/40">-</span>
            </template>

            <template #youtubeUrl-cell="{ row }">
              <a
                :href="(row.original || row).youtubeUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-400 hover:text-primary-300 underline truncate max-w-xs flex items-center gap-2"
              >
                <UIcon name="i-heroicons-video-camera" class="w-4 h-4" />
                <span>Voir sur YouTube</span>
              </a>
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
                  @click="cultureStore.openEditModal(row.original || row)"
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

        <div v-if="cultureStore.isLoading" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-white/60" />
          <p class="text-white/60 mt-4">Chargement des vidéos...</p>
        </div>

        <div v-else-if="!Array.isArray(cultureStore.cultures) || cultureStore.cultures.length === 0" class="text-center py-8">
          <p class="text-white/60">Aucune vidéo trouvée</p>
        </div>
      </UCard>
    </div>

    <!-- Modal pour créer/éditer une vidéo -->
    <UModal v-model:open="cultureStore.isModalOpen" :ui="{ wrapper: 'max-w-2xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon :name="cultureStore.isEditMode ? 'i-heroicons-pencil' : 'i-heroicons-plus'" class="w-5 h-5" />
            <span class="font-medium">{{ cultureStore.isEditMode ? 'Éditer la vidéo' : 'Nouvelle vidéo' }}</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="cultureStore.closeModal"
          />
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UFormGroup label="Titre" name="title" required>
            <UInput
              v-model="cultureStore.form.title"
              placeholder="Titre de la vidéo"
              icon="i-heroicons-video-camera"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Type" name="type" required>
            <USelect
              v-model="cultureStore.form.type"
              :items="typeOptions"
              placeholder="Sélectionner un type"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="URL YouTube" name="youtubeUrl" required>
            <UInput
              v-model="cultureStore.form.youtubeUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              icon="i-heroicons-link"
              size="xl"
              class="w-full"
            />
            <template #hint>
              Collez l'URL complète de la vidéo YouTube
            </template>
          </UFormGroup>

          <!-- Aperçu de la vidéo YouTube -->
          <div v-if="cultureStore.form.youtubeUrl && getYouTubeThumbnail(cultureStore.form.youtubeUrl)" class="rounded-lg overflow-hidden border border-white/10">
            <img
              :src="getYouTubeThumbnail(cultureStore.form.youtubeUrl)!"
              alt="Aperçu vidéo"
              class="w-full h-48 object-cover"
            />
          </div>

          <UFormGroup label="Réalisateur" name="director">
            <UInput
              v-model="cultureStore.form.director"
              placeholder="Nom du réalisateur"
              icon="i-heroicons-user"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Visibilité" name="isPublic">
            <USwitch
              v-model="cultureStore.form.isPublic"
              label="Public (accessible à tous)"
              description="Si désactivé, la vidéo sera réservée aux membres connectés"
            />
          </UFormGroup>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="cultureStore.closeModal"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            @click="handleSaveCulture"
            :loading="cultureStore.isLoading"
          >
            {{ cultureStore.isEditMode ? 'Modifier' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="cultureStore.isDeleteConfirmOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-error" />
          <span class="font-medium">Confirmer la suppression</span>
        </div>
      </template>

      <template #body>
        <p class="text-white/70">
          Êtes-vous sûr de vouloir supprimer la vidéo <strong>{{ cultureStore.selectedCulture?.title }}</strong> ?
          Cette action est irréversible.
        </p>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="cultureStore.closeDeleteConfirm"
          >
            Annuler
          </UButton>
          <UButton
            color="error"
            :loading="cultureStore.isDeleting"
            @click="handleDeleteCulture"
          >
            Supprimer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
