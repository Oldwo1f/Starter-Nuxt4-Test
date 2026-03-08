<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Gestion des sondages',
})

import { usePollStore, PollType, PollStatus, PollAccessLevel } from '~/stores/usePollStore'
import type { Poll } from '~/stores/usePollStore'

const pollStore = usePollStore()
const toast = useToast()

// États pour la modal des votes
const isVotesModalOpen = ref(false)
const selectedPollForVotes = ref<Poll | null>(null)
const pollResponses = ref<any[]>([])
const isLoadingResponses = ref(false)
const responseToDelete = ref<number | null>(null)
const isDeleteResponseConfirmOpen = ref(false)

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
    enableSorting: false,
  },
  {
    id: 'accessLevel',
    accessorKey: 'accessLevel',
    header: 'Accès',
    enableSorting: false,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Statut',
    enableSorting: false,
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

// Gestionnaire pour éditer un sondage
const handleEditPoll = (pollId: number) => {
  const poll = pollStore.polls.find(p => p.id === pollId)
  if (poll) {
    pollStore.openEditModal(poll)
  }
}

// Gestionnaire pour le double-clic sur les lignes du tableau
const handleTableDoubleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const row = target.closest('tr')

  if (!row) return

  if (target.closest('button') || target.closest('a')) {
    return
  }

  const tbody = row.closest('tbody')
  if (!tbody) return

  const rows = Array.from(tbody.querySelectorAll('tr'))
  const rowIndex = rows.indexOf(row)

  if (rowIndex >= 0 && rowIndex < pollStore.polls.length) {
    const poll = pollStore.polls[rowIndex]
    if (poll) {
      pollStore.openEditModal(poll)
    }
  }
}

// Wrapper pour fetchPolls avec gestion des toasts
const handleFetchPolls = async () => {
  try {
    await pollStore.fetchPolls(pollStore.pagination.page, pollStore.pagination.pageSize)
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.message || 'Erreur lors du chargement des sondages',
      color: 'red',
    })
  }
}

// Handler pour changement de page
const handlePageChange = async (page: number) => {
  await pollStore.fetchPolls(page, pollStore.pagination.pageSize)
}

// Handler pour création/édition
const handleSave = async () => {
  try {
    if (pollStore.isEditMode && pollStore.selectedPoll) {
      await pollStore.updatePoll(pollStore.selectedPoll.id)
      toast.add({
        title: 'Succès',
        description: 'Sondage mis à jour avec succès',
        color: 'success',
      })
    } else {
      await pollStore.createPoll()
      toast.add({
        title: 'Succès',
        description: 'Sondage créé avec succès',
        color: 'success',
      })
    }
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.message || 'Erreur lors de la sauvegarde',
      color: 'red',
    })
  }
}

// Handler pour suppression
const handleDelete = async () => {
  if (!pollStore.selectedPoll) return

  try {
    await pollStore.deletePoll(pollStore.selectedPoll.id)
    toast.add({
      title: 'Succès',
      description: 'Sondage supprimé avec succès',
      color: 'success',
    })
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.message || 'Erreur lors de la suppression',
      color: 'red',
    })
  }
}

// Gestion des options
const addOption = () => {
  pollStore.form.options.push({
    text: '',
    order: pollStore.form.options.length,
  })
}

const removeOption = (index: number) => {
  pollStore.form.options.splice(index, 1)
  // Réassigner les ordres
  pollStore.form.options.forEach((opt, idx) => {
    opt.order = idx
  })
}

// Drag & Drop pour réordonner les options (admin)
const draggedOptionIndex = ref<number | null>(null)

const handleOptionDragStart = (index: number) => {
  draggedOptionIndex.value = index
}

const handleOptionDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const handleOptionDrop = (targetIndex: number) => {
  if (draggedOptionIndex.value === null || draggedOptionIndex.value === targetIndex) {
    draggedOptionIndex.value = null
    return
  }

  const options = [...pollStore.form.options]
  const draggedOption = options[draggedOptionIndex.value]
  options.splice(draggedOptionIndex.value, 1)
  options.splice(targetIndex, 0, draggedOption)

  // Réassigner les ordres
  pollStore.form.options = options.map((opt, idx) => ({
    ...opt,
    order: idx,
  }))

  draggedOptionIndex.value = null
}

const handleOptionDragEnd = () => {
  draggedOptionIndex.value = null
}

// Ouvrir la modal des votes
const openVotesModal = async (poll: Poll) => {
  isLoadingResponses.value = true
  isVotesModalOpen.value = true
  
  try {
    // Recharger le poll avec ses options pour avoir les textes des options
    const pollWithOptions = await pollStore.fetchPoll(poll.id)
    selectedPollForVotes.value = pollWithOptions
    
    // Charger les réponses
    pollResponses.value = await pollStore.getPollResponses(poll.id)
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.message || 'Erreur lors du chargement des votes',
      color: 'red',
    })
    pollResponses.value = []
    selectedPollForVotes.value = poll // Fallback sur le poll original
  } finally {
    isLoadingResponses.value = false
  }
}

// Fermer la modal des votes
const closeVotesModal = () => {
  isVotesModalOpen.value = false
  selectedPollForVotes.value = null
  pollResponses.value = []
}

// Ouvrir la confirmation de suppression d'un vote
const openDeleteResponseConfirm = (responseId: number) => {
  responseToDelete.value = responseId
  isDeleteResponseConfirmOpen.value = true
}

// Fermer la confirmation
const closeDeleteResponseConfirm = () => {
  isDeleteResponseConfirmOpen.value = false
  responseToDelete.value = null
}

// Supprimer un vote
const handleDeleteResponse = async () => {
  if (!responseToDelete.value) return

  try {
    await pollStore.deleteResponse(responseToDelete.value)
    // Recharger les votes
    if (selectedPollForVotes.value) {
      pollResponses.value = await pollStore.getPollResponses(selectedPollForVotes.value.id)
    }
    closeDeleteResponseConfirm()
    toast.add({
      title: 'Succès',
      description: 'Vote supprimé avec succès',
      color: 'success',
    })
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.message || 'Erreur lors de la suppression du vote',
      color: 'red',
    })
  }
}

onMounted(() => {
  handleFetchPolls()
  calculateTableHeight()
  if (import.meta.client) {
    window.addEventListener('resize', calculateTableHeight)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', calculateTableHeight)
  }
})
</script>

<template>
  <div>
    <div class="space-y-6">
      <!-- Tableau des sondages -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-arrow-path"
                @click="handleFetchPolls"
                :loading="pollStore.isLoading"
              />
              <span class="font-medium">Liste des sondages</span>
            </div>
            <UButton
              color="primary"
              icon="i-heroicons-plus"
              @click="pollStore.openAddModal"
            >
              Créer un sondage
            </UButton>
          </div>
        </template>

        <div v-if="pollStore.isLoading" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
        </div>

        <div v-else>
          <UTable
            :data="pollStore.polls"
            :columns="columns"
            :height="tableHeight"
            @dblclick="handleTableDoubleClick"
            :ui="{
              tr: {
                base: 'cursor-pointer hover:bg-white/5 transition-colors',
              },
            }"
          >
            <template #title-cell="{ row }">
              <span class="text-white/90">{{ (row.original || row).title }}</span>
            </template>

            <template #type-cell="{ row }">
              <span
                :class="{
                  'rounded-full bg-primary-500/20 px-2 py-1 text-xs font-semibold text-primary-300': true,
                }"
              >
                {{ (row.original || row).type === 'qcm' ? 'QCM' : 'Classement' }}
              </span>
            </template>

            <template #accessLevel-cell="{ row }">
              <div class="flex items-center gap-2">
                <UIcon
                  v-if="(row.original || row).accessLevel === 'member'"
                  name="i-heroicons-lock-closed"
                  class="h-4 w-4 text-white/60"
                />
                <span>{{ (row.original || row).accessLevel === 'public' ? 'Public' : 'Membres' }}</span>
              </div>
            </template>

            <template #status-cell="{ row }">
              <span
                :class="{
                  'rounded-full px-2 py-1 text-xs font-semibold': true,
                  'bg-yellow-500/20 text-yellow-300': (row.original || row).status === 'draft',
                  'bg-green-500/20 text-green-300': (row.original || row).status === 'active',
                  'bg-gray-500/20 text-gray-300': (row.original || row).status === 'ended',
                }"
              >
                {{ (row.original || row).status === 'draft' ? 'Brouillon' : (row.original || row).status === 'active' ? 'En cours' : 'Terminé' }}
              </span>
            </template>

            <template #createdAt-cell="{ row }">
              <span class="text-white/70">
                {{ new Date((row.original || row).createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }) }}
              </span>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex items-center gap-2">
                <UButton
                  label="Voir votes"
                  icon="i-heroicons-chart-bar"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  @click="openVotesModal((row.original || row))"
                />
                <UButton
                  label="Éditer"
                  icon="i-heroicons-pencil"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  @click="handleEditPoll((row.original || row).id)"
                />
                <UButton
                  label="Supprimer"
                  icon="i-heroicons-trash"
                  color="error"
                  variant="subtle"
                  size="sm"
                  @click="pollStore.openDeleteConfirm((row.original || row))"
                />
              </div>
            </template>
          </UTable>

          <!-- Pagination -->
          <div v-if="pollStore.pagination.totalPages > 1" class="mt-4 flex justify-center">
            <UPagination
              v-model="pollStore.pagination.page"
              :page-count="pollStore.pagination.pageSize"
              :total="pollStore.pagination.total"
              :max="7"
              @update:model-value="handlePageChange"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Modal création/édition -->
    <UModal v-model:open="pollStore.isModalOpen" :ui="{ wrapper: 'max-w-3xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon :name="pollStore.isEditMode ? 'i-heroicons-pencil' : 'i-heroicons-plus'" class="w-5 h-5" />
            <span class="font-medium">{{ pollStore.isEditMode ? 'Modifier le sondage' : 'Créer un sondage' }}</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="pollStore.closeModal"
          />
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UFormGroup label="Titre" name="title" required>
            <UInput
              v-model="pollStore.form.title"
              placeholder="Ex: Seriez-vous favorable à l'ouverture d'une formation création de Savon coco?"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Description" name="description">
            <UTextarea
              v-model="pollStore.form.description"
              placeholder="Description du sondage (optionnel)"
              :rows="3"
              class="w-full"
            />
          </UFormGroup>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Type" name="type" required>
              <USelect
                v-model="pollStore.form.type"
                :items="[
                  { value: 'qcm', label: 'QCM' },
                  { value: 'ranking', label: 'Classement' },
                ]"
                placeholder="Sélectionner un type"
                size="xl"
                class="w-full"
              />
            </UFormGroup>

            <UFormGroup label="Niveau d'accès" name="accessLevel" required>
              <USelect
                v-model="pollStore.form.accessLevel"
                :items="[
                  { value: 'public', label: 'Public' },
                  { value: 'member', label: 'Membres' },
                ]"
                placeholder="Sélectionner un niveau d'accès"
                size="xl"
                class="w-full"
              />
            </UFormGroup>
          </div>

          <UFormGroup label="Statut" name="status" required>
            <USelect
              v-model="pollStore.form.status"
              :items="[
                { value: 'draft', label: 'Brouillon' },
                { value: 'active', label: 'En cours' },
                { value: 'ended', label: 'Terminé' },
              ]"
              placeholder="Sélectionner un statut"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <!-- Options -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium">Options</label>
              <UButton
                size="xs"
                icon="i-heroicons-plus"
                @click="addOption"
              >
                Ajouter
              </UButton>
            </div>

            <div class="space-y-2">
              <div
                v-for="(option, index) in pollStore.form.options"
                :key="index"
                draggable="true"
                class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
                :class="{
                  'opacity-50': draggedOptionIndex === index,
                }"
                @dragstart="handleOptionDragStart(index)"
                @dragover="handleOptionDragOver"
                @drop="handleOptionDrop(index)"
                @dragend="handleOptionDragEnd"
              >
                <UIcon name="i-heroicons-bars-3" class="h-5 w-5 cursor-move text-white/40" />
                <UInput
                  v-model="option.text"
                  :placeholder="`Option ${index + 1}`"
                  class="flex-1"
                  required
                />
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  color="red"
                  @click="removeOption(index)"
                />
              </div>
            </div>

            <p v-if="pollStore.form.options.length === 0" class="text-sm text-white/60">
              Aucune option. Cliquez sur "Ajouter" pour en créer une.
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="pollStore.closeModal"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            :loading="pollStore.isLoading"
            @click="handleSave"
          >
            {{ pollStore.isEditMode ? 'Enregistrer' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal confirmation suppression -->
    <UModal v-model:open="pollStore.isDeleteConfirmOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
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
            description="Cette action est irréversible. Le sondage sera définitivement supprimé."
          />
          <template v-if="pollStore.selectedPoll">
            <p class="text-white/90">
              Êtes-vous sûr de vouloir supprimer le sondage
              <strong class="text-white">"{{ pollStore.selectedPoll.title }}"</strong> ?
            </p>
          </template>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="pollStore.closeDeleteConfirm"
            :disabled="pollStore.isDeleting"
          >
            Annuler
          </UButton>
          <UButton
            color="error"
            :loading="pollStore.isDeleting"
            :disabled="pollStore.isDeleting"
            @click="handleDelete"
          >
            Supprimer
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal des votes -->
    <UModal v-model:open="isVotesModalOpen" :ui="{ wrapper: 'max-w-4xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-chart-bar" class="w-5 h-5" />
            <span class="font-medium">Votes du sondage</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="closeVotesModal"
          />
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <div v-if="selectedPollForVotes">
            <h3 class="text-lg font-semibold text-white mb-2">{{ selectedPollForVotes.title }}</h3>
            <p class="text-sm text-white/60 mb-4">
              Type: {{ selectedPollForVotes.type === 'qcm' ? 'QCM' : 'Classement' }}
            </p>
          </div>

          <div v-if="isLoadingResponses" class="flex justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-primary-500" />
          </div>

          <div v-else-if="pollResponses.length === 0" class="text-center py-8">
            <UIcon name="i-heroicons-clipboard-document" class="mx-auto mb-4 h-12 w-12 text-white/40" />
            <p class="text-white/60">Aucun vote pour ce sondage</p>
          </div>

          <div v-else class="space-y-3">
            <div class="mb-4 flex items-center justify-between">
              <p class="text-sm text-white/70">
                Total: {{ pollResponses.length }} {{ pollResponses.length > 1 ? 'votes' : 'vote' }}
              </p>
            </div>

            <div class="space-y-2 max-h-[500px] overflow-y-auto">
              <div
                v-for="response in pollResponses"
                :key="response.id"
                class="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 space-y-2">
                    <div class="flex items-center gap-2 text-sm text-white/60">
                      <UIcon name="i-heroicons-user" class="h-4 w-4" />
                      <span v-if="response.user">
                        {{ response.user.email }}
                      </span>
                      <span v-else class="text-white/40">Anonyme</span>
                    </div>
                    
                    <div class="text-sm text-white/80">
                      <span v-if="selectedPollForVotes?.type === 'qcm' && response.option">
                        Réponse: <strong class="text-white">{{ response.option.text }}</strong>
                      </span>
                      <div v-else-if="selectedPollForVotes?.type === 'ranking' && response.ranking" class="space-y-1">
                        <p class="font-medium text-white">Classement:</p>
                        <div class="space-y-1 pl-4">
                          <div
                            v-for="(item, index) in response.ranking"
                            :key="item.optionId"
                            class="flex items-center gap-2 text-sm"
                          >
                            <span class="text-white/60">#{{ item.position }}</span>
                            <span class="text-white">
                              {{ selectedPollForVotes?.options.find(opt => opt.id === item.optionId)?.text || 'Option supprimée' }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="text-xs text-white/50">
                      {{ new Date(response.createdAt).toLocaleString('fr-FR') }}
                    </div>
                  </div>

                  <UButton
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-trash"
                    color="red"
                    @click="openDeleteResponseConfirm(response.id)"
                    :loading="pollStore.isLoading"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            @click="closeVotesModal"
          >
            Fermer
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal confirmation suppression d'un vote -->
    <UModal v-model:open="isDeleteResponseConfirmOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
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
            description="Cette action est irréversible. Le vote sera définitivement supprimé."
          />
          <p class="text-white/90">
            Êtes-vous sûr de vouloir supprimer ce vote ?
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="closeDeleteResponseConfirm"
            :disabled="pollStore.isLoading"
          >
            Annuler
          </UButton>
          <UButton
            color="error"
            :loading="pollStore.isLoading"
            :disabled="pollStore.isLoading"
            @click="handleDeleteResponse"
          >
            Supprimer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
