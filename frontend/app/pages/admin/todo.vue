<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Todo',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
const toast = useToast()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'

interface Todo {
  id: number
  title: string
  description: string | null
  status: 'en_cours' | 'finish' | 'pour_plus_tard'
  assignedTo: 'naho' | 'tamiga' | 'alexis' | 'vai'
  createdAt: string
  updatedAt: string
}

const todos = ref<Todo[]>([])
const isLoading = ref(false)
const isCreating = ref(false)
const isUpdating = ref<number | null>(null)
const isDeleting = ref<number | null>(null)

// Formulaire de création
const newTodo = ref({
  title: '',
  description: '',
  assignedTo: 'alexis' as Todo['assignedTo'],
  status: 'en_cours' as Todo['status'],
})

// Options pour les selects (format Nuxt UI: { label, value })
const assignedToOptions = [
  { label: 'Alexis', value: 'alexis' },
  { label: 'Naho', value: 'naho' },
  { label: 'Tamiga', value: 'tamiga' },
  { label: 'Vai', value: 'vai' },
]

const statusOptions = [
  { label: 'En cours', value: 'en_cours' },
  { label: 'Finish', value: 'finish' },
  { label: 'Pour plus tard', value: 'pour_plus_tard' },
]

// Filtrer les todos
const activeTodos = computed(() => {
  return todos.value.filter((todo) => todo.status === 'en_cours')
})

const laterTodos = computed(() => {
  return todos.value.filter((todo) => todo.status === 'pour_plus_tard')
})

const finishedTodos = computed(() => {
  return todos.value.filter((todo) => todo.status === 'finish')
})

// Fonctions de formatage
const getAssignedToLabel = (assignedTo: string) => {
  const option = assignedToOptions.find((opt) => opt.value === assignedTo)
  return option?.label || assignedTo
}

const getStatusLabel = (status: string) => {
  const option = statusOptions.find((opt) => opt.value === status)
  return option?.label || status
}

const getAssignedToColor = (assignedTo: string) => {
  const colors: Record<string, string> = {
    naho: 'green',
    tamiga: 'blue',
    alexis: 'teal',
    vai: 'pink',
  }
  return colors[assignedTo] || 'gray'
}

const getAssignedToClass = (assignedTo: string) => {
  const classes: Record<string, string> = {
    naho: 'bg-green-500 text-white',
    tamiga: 'bg-blue-500 text-white',
    alexis: 'bg-teal-500 text-white',
    vai: 'bg-pink-500 text-white',
  }
  return classes[assignedTo] || 'bg-gray-500 text-white'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    en_cours: 'blue',
    finish: 'green',
    pour_plus_tard: 'gray',
  }
  return colors[status] || 'gray'
}

// Charger les todos
const fetchTodos = async () => {
  if (!authStore.accessToken) {
    return
  }

  isLoading.value = true
  try {
    const response = await $fetch<Todo[]>(`${API_BASE_URL}/todos`, {
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })
    todos.value = response
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de charger les tâches',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}

// Créer une todo
const createTodo = async () => {
  if (!authStore.accessToken || !newTodo.value.title.trim()) {
    return
  }

  isCreating.value = true
  try {
    await $fetch(`${API_BASE_URL}/todos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: {
        title: newTodo.value.title.trim(),
        description: newTodo.value.description.trim() || null,
        assignedTo: newTodo.value.assignedTo,
        status: newTodo.value.status,
      },
    })
    toast.add({
      title: 'Tâche créée',
      description: 'La tâche a été créée avec succès.',
      color: 'green',
    })
    // Réinitialiser le formulaire
    newTodo.value = {
      title: '',
      description: '',
      assignedTo: 'alexis',
      status: 'en_cours',
    }
    await fetchTodos()
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de créer la tâche',
      color: 'red',
    })
  } finally {
    isCreating.value = false
  }
}

// Mettre à jour une todo
const updateTodo = async (id: number, updates: Partial<Todo>) => {
  if (!authStore.accessToken) {
    return
  }

  isUpdating.value = id
  try {
    await $fetch(`${API_BASE_URL}/todos/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: updates,
    })
    toast.add({
      title: 'Tâche mise à jour',
      description: 'La tâche a été mise à jour avec succès.',
      color: 'green',
    })
    await fetchTodos()
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de mettre à jour la tâche',
      color: 'red',
    })
  } finally {
    isUpdating.value = null
  }
}

// Supprimer une todo
const deleteTodo = async (id: number) => {
  if (!authStore.accessToken) {
    return
  }

  if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
    return
  }

  isDeleting.value = id
  try {
    await $fetch(`${API_BASE_URL}/todos/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })
    toast.add({
      title: 'Tâche supprimée',
      description: 'La tâche a été supprimée avec succès.',
      color: 'green',
    })
    await fetchTodos()
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de supprimer la tâche',
      color: 'red',
    })
  } finally {
    isDeleting.value = null
  }
}

// Édition inline
const editingTodo = ref<number | null>(null)
const editTitle = ref('')
const editDescription = ref('')

const startEdit = (todo: Todo) => {
  editingTodo.value = todo.id
  editTitle.value = todo.title
  editDescription.value = todo.description || ''
}

const cancelEdit = () => {
  editingTodo.value = null
  editTitle.value = ''
  editDescription.value = ''
}

const saveEdit = async (todo: Todo) => {
  if (!editTitle.value.trim()) {
    return
  }

  await updateTodo(todo.id, {
    title: editTitle.value.trim(),
    description: editDescription.value.trim() || null,
  })
  cancelEdit()
}

onMounted(() => {
  fetchTodos()
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Todo</h1>
      <p class="text-white/60">
        Gestion des tâches internes pour l'équipe.
      </p>
    </div>

    <!-- Formulaire de création -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">Nouvelle tâche</h2>
      </template>

      <div class="space-y-6">
        <UFormGroup label="Titre" name="title" required>
          <UInput
            v-model="newTodo.title"
            placeholder="Titre de la tâche"
            size="xl"
            icon="i-heroicons-document-text"
            class="w-full"
            @keyup.enter="createTodo"
          />
        </UFormGroup>

        <UFormGroup label="Description" name="description">
          <UTextarea
            v-model="newTodo.description"
            placeholder="Description (optionnelle)"
            size="xl"
            class="w-full"
            :rows="5"
          />
        </UFormGroup>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormGroup label="Assignée à" name="assignedTo">
            <USelect
              v-model="newTodo.assignedTo"
              :items="assignedToOptions"
              size="xl"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="Statut" name="status">
            <USelect
              v-model="newTodo.status"
              :items="statusOptions"
              size="xl"
              class="w-full"
            />
          </UFormGroup>
        </div>

        <div class="flex justify-end pt-2">
          <UButton
            color="primary"
            size="lg"
            :loading="isCreating"
            :disabled="!newTodo.title.trim()"
            @click="createTodo"
          >
            <UIcon name="i-heroicons-plus" class="w-5 h-5" />
            Créer la tâche
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Liste principale (En cours / Finish) -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Tâches actives</h2>
          <UButton variant="outline" size="sm" :loading="isLoading" @click="fetchTodos">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
            Actualiser
          </UButton>
        </div>
      </template>

      <div v-if="isLoading && todos.length === 0" class="py-12 text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>

      <div v-else-if="activeTodos.length === 0" class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-check-circle" class="mx-auto mb-2 h-12 w-12 text-green-500/50" />
        <p>Aucune tâche active</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="todo in activeTodos"
          :key="todo.id"
          class="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- Édition inline -->
              <div v-if="editingTodo === todo.id" class="space-y-2">
                <UInput
                  v-model="editTitle"
                  class="bg-white/10 border-white/20"
                  @keyup.enter="saveEdit(todo)"
                  @keyup.esc="cancelEdit"
                />
                <UTextarea
                  v-model="editDescription"
                  class="bg-white/10 border-white/20"
                  :rows="2"
                />
                <div class="flex gap-2">
                  <UButton size="xs" color="green" @click="saveEdit(todo)">
                    Enregistrer
                  </UButton>
                  <UButton size="xs" variant="outline" @click="cancelEdit">
                    Annuler
                  </UButton>
                </div>
              </div>

              <!-- Affichage normal -->
              <div v-else>
                <div class="flex items-center gap-2 mb-2">
                  <h3
                    class="text-lg font-semibold text-white cursor-pointer hover:text-primary-400"
                    @dblclick="startEdit(todo)"
                  >
                    {{ todo.title }}
                  </h3>
                  <span
                    :class="getAssignedToClass(todo.assignedTo)"
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {{ getAssignedToLabel(todo.assignedTo) }}
                  </span>
                </div>
                <p
                  v-if="todo.description"
                  class="text-sm text-white/70 cursor-pointer hover:text-white/90"
                  @dblclick="startEdit(todo)"
                >
                  {{ todo.description }}
                </p>
                <p v-else class="text-xs text-white/40 italic" @dblclick="startEdit(todo)">
                  Double-cliquez pour ajouter une description
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div v-if="editingTodo !== todo.id" class="flex items-center gap-2 flex-shrink-0">
              <USelect
                :model-value="todo.status"
                :items="statusOptions"
                class="bg-white/10 border-white/20 min-w-[140px]"
                @update:model-value="updateTodo(todo.id, { status: $event as Todo['status'] })"
              />
              <USelect
                :model-value="todo.assignedTo"
                :items="assignedToOptions"
                class="bg-white/10 border-white/20 min-w-[120px]"
                @update:model-value="updateTodo(todo.id, { assignedTo: $event as Todo['assignedTo'] })"
              />
              <UButton
                variant="ghost"
                size="xs"
                color="red"
                :loading="isDeleting === todo.id"
                @click="deleteTodo(todo.id)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Liste "Pour plus tard" -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">Pour plus tard</h2>
      </template>

      <div v-if="laterTodos.length === 0" class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-clock" class="mx-auto mb-2 h-12 w-12 text-gray-500/50" />
        <p>Aucune tâche pour plus tard</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="todo in laterTodos"
          :key="todo.id"
          class="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors opacity-75"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- Édition inline -->
              <div v-if="editingTodo === todo.id" class="space-y-2">
                <UInput
                  v-model="editTitle"
                  class="bg-white/10 border-white/20"
                  @keyup.enter="saveEdit(todo)"
                  @keyup.esc="cancelEdit"
                />
                <UTextarea
                  v-model="editDescription"
                  class="bg-white/10 border-white/20"
                  :rows="2"
                />
                <div class="flex gap-2">
                  <UButton size="xs" color="green" @click="saveEdit(todo)">
                    Enregistrer
                  </UButton>
                  <UButton size="xs" variant="outline" @click="cancelEdit">
                    Annuler
                  </UButton>
                </div>
              </div>

              <!-- Affichage normal -->
              <div v-else>
                <div class="flex items-center gap-2 mb-2">
                  <h3
                    class="text-lg font-semibold text-white cursor-pointer hover:text-primary-400"
                    @dblclick="startEdit(todo)"
                  >
                    {{ todo.title }}
                  </h3>
                  <span
                    :class="getAssignedToClass(todo.assignedTo)"
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {{ getAssignedToLabel(todo.assignedTo) }}
                  </span>
                </div>
                <p
                  v-if="todo.description"
                  class="text-sm text-white/70 cursor-pointer hover:text-white/90"
                  @dblclick="startEdit(todo)"
                >
                  {{ todo.description }}
                </p>
                <p v-else class="text-xs text-white/40 italic" @dblclick="startEdit(todo)">
                  Double-cliquez pour ajouter une description
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div v-if="editingTodo !== todo.id" class="flex items-center gap-2 flex-shrink-0">
              <USelect
                :model-value="todo.status"
                :items="statusOptions"
                class="bg-white/10 border-white/20 min-w-[140px]"
                @update:model-value="updateTodo(todo.id, { status: $event as Todo['status'] })"
              />
              <USelect
                :model-value="todo.assignedTo"
                :items="assignedToOptions"
                class="bg-white/10 border-white/20 min-w-[120px]"
                @update:model-value="updateTodo(todo.id, { assignedTo: $event as Todo['assignedTo'] })"
              />
              <UButton
                variant="ghost"
                size="xs"
                color="red"
                :loading="isDeleting === todo.id"
                @click="deleteTodo(todo.id)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Liste "Terminées" -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">Tâches terminées</h2>
      </template>

      <div v-if="finishedTodos.length === 0" class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-check-badge" class="mx-auto mb-2 h-12 w-12 text-green-500/50" />
        <p>Aucune tâche terminée</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="todo in finishedTodos"
          :key="todo.id"
          class="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors opacity-60"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- Édition inline -->
              <div v-if="editingTodo === todo.id" class="space-y-2">
                <UInput
                  v-model="editTitle"
                  class="bg-white/10 border-white/20"
                  @keyup.enter="saveEdit(todo)"
                  @keyup.esc="cancelEdit"
                />
                <UTextarea
                  v-model="editDescription"
                  class="bg-white/10 border-white/20"
                  :rows="2"
                />
                <div class="flex gap-2">
                  <UButton size="xs" color="green" @click="saveEdit(todo)">
                    Enregistrer
                  </UButton>
                  <UButton size="xs" variant="outline" @click="cancelEdit">
                    Annuler
                  </UButton>
                </div>
              </div>

              <!-- Affichage normal -->
              <div v-else>
                <div class="flex items-center gap-2 mb-2">
                  <h3
                    class="text-lg font-semibold text-white cursor-pointer hover:text-primary-400 line-through"
                    @dblclick="startEdit(todo)"
                  >
                    {{ todo.title }}
                  </h3>
                  <span
                    :class="getAssignedToClass(todo.assignedTo)"
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {{ getAssignedToLabel(todo.assignedTo) }}
                  </span>
                  <UBadge
                    color="green"
                    variant="subtle"
                  >
                    Terminée
                  </UBadge>
                </div>
                <p
                  v-if="todo.description"
                  class="text-sm text-white/70 cursor-pointer hover:text-white/90"
                  @dblclick="startEdit(todo)"
                >
                  {{ todo.description }}
                </p>
                <p v-else class="text-xs text-white/40 italic" @dblclick="startEdit(todo)">
                  Double-cliquez pour ajouter une description
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div v-if="editingTodo !== todo.id" class="flex items-center gap-2 flex-shrink-0">
              <USelect
                :model-value="todo.status"
                :items="statusOptions"
                class="bg-white/10 border-white/20 min-w-[140px]"
                @update:model-value="updateTodo(todo.id, { status: $event as Todo['status'] })"
              />
              <USelect
                :model-value="todo.assignedTo"
                :items="assignedToOptions"
                class="bg-white/10 border-white/20 min-w-[120px]"
                @update:model-value="updateTodo(todo.id, { assignedTo: $event as Todo['assignedTo'] })"
              />
              <UButton
                variant="ghost"
                size="xs"
                color="red"
                :loading="isDeleting === todo.id"
                @click="deleteTodo(todo.id)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
