<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'admin',
  meta: { title: 'Te Natira\'a - Événements' },
})

const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
const toast = useToast()

interface TeNatiraaEvent {
  id: number
  name: string
  eventDate: string
  eventTime: string
  location: string
  description: string | null
  isActive: boolean
}

const events = ref<TeNatiraaEvent[]>([])
const isLoading = ref(false)
const showModal = ref(false)
const editingEvent = ref<TeNatiraaEvent | null>(null)
const form = ref({
  name: '',
  eventDate: '',
  eventTime: '8h00',
  location: '',
  description: '',
  isActive: true,
})

const fetchEvents = async () => {
  if (!authStore.accessToken) return
  isLoading.value = true
  try {
    events.value = await $fetch<TeNatiraaEvent[]>(`${API_BASE_URL}/te-natiraa/events`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de charger les événements',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const openCreate = () => {
  editingEvent.value = null
  form.value = {
    name: '',
    eventDate: '',
    eventTime: '8h00',
    location: '',
    description: '',
    isActive: true,
  }
  showModal.value = true
}

const openEdit = (e: TeNatiraaEvent) => {
  editingEvent.value = e
  form.value = {
    name: e.name,
    eventDate: e.eventDate.split('T')[0],
    eventTime: e.eventTime || '8h00',
    location: e.location,
    description: e.description || '',
    isActive: e.isActive,
  }
  showModal.value = true
}

const saveEvent = async () => {
  if (!authStore.accessToken) return
  try {
    const payload = {
      ...form.value,
      description: form.value.description || undefined,
    }
    if (editingEvent.value) {
      await $fetch(`${API_BASE_URL}/te-natiraa/events/${editingEvent.value.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        body: payload,
      })
      toast.add({ title: 'Événement mis à jour', color: 'success' })
    } else {
      await $fetch(`${API_BASE_URL}/te-natiraa/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        body: payload,
      })
      toast.add({ title: 'Événement créé', color: 'success' })
    }
    showModal.value = false
    fetchEvents()
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Erreur lors de l\'enregistrement',
      color: 'red',
    })
  }
}

const deleteEvent = async (e: TeNatiraaEvent) => {
  if (!confirm(`Supprimer "${e.name}" ? Les inscriptions associées seront aussi supprimées.`)) return
  if (!authStore.accessToken) return
  try {
    await $fetch(`${API_BASE_URL}/te-natiraa/events/${e.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
    toast.add({ title: 'Événement supprimé', color: 'success' })
    fetchEvents()
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de supprimer',
      color: 'red',
    })
  }
}

const isPast = (eventDate: string) => new Date(eventDate) < new Date()

onMounted(() => fetchEvents())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-white">Événements Te Natira'a</h2>
        <p class="text-white/70">
          Gérez les dates et lieux des Te Natira'a (3-4 par an maximum)
        </p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" @click="openCreate">
        Nouvel événement
      </UButton>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Liste des événements</span>
          <UButton variant="ghost" size="sm" icon="i-heroicons-arrow-path" :loading="isLoading" @click="fetchEvents">
            Actualiser
          </UButton>
        </div>
      </template>

      <div v-if="isLoading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-white/50" />
      </div>

      <div v-else-if="events.length === 0" class="py-12 text-center text-white/60">
        Aucun événement. Créez le premier pour ouvrir les inscriptions.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="e in events"
          :key="e.id"
          class="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h3 class="font-semibold text-white">{{ e.name }}</h3>
            <p class="text-sm text-white/70">
              {{ formatDate(e.eventDate) }} à {{ e.eventTime }} - {{ e.location }}
            </p>
            <UBadge v-if="isPast(e.eventDate)" color="neutral" variant="subtle" size="xs" class="mt-2">
              Passé
            </UBadge>
            <UBadge v-else color="green" variant="subtle" size="xs" class="mt-2">
              À venir
            </UBadge>
          </div>
          <div class="flex gap-2">
            <UButton variant="outline" size="sm" icon="i-heroicons-pencil" @click="openEdit(e)">
              Modifier
            </UButton>
            <UButton
              variant="outline"
              size="sm"
              color="red"
              icon="i-heroicons-trash"
              :disabled="!isPast(e.eventDate)"
              @click="deleteEvent(e)"
            >
              Supprimer
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <UModal v-model:open="showModal" :ui="{ wrapper: 'max-w-md' }">
      <template #content>
        <div class="p-6">
          <h3 class="mb-4 text-lg font-semibold text-white">
            {{ editingEvent ? 'Modifier l\'événement' : 'Nouvel événement' }}
          </h3>
          <form class="space-y-4" @submit.prevent="saveEvent">
            <UFormField label="Nom">
              <UInput v-model="form.name" placeholder="Te Natira'a - Avril 2026" required />
            </UFormField>
            <UFormField label="Date">
              <UInput v-model="form.eventDate" type="date" required />
            </UFormField>
            <UFormField label="Heure">
              <UInput v-model="form.eventTime" placeholder="8h00" />
            </UFormField>
            <UFormField label="Lieu">
              <UInput v-model="form.location" placeholder="Vallée de Tipaerui" required />
            </UFormField>
            <UFormField label="Description (optionnel)">
              <UTextarea v-model="form.description" placeholder="Description de l'événement" :rows="3" />
            </UFormField>
            <UFormField label="Actif (inscriptions ouvertes)">
              <UToggle v-model="form.isActive" />
            </UFormField>
            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="outline" @click="showModal = false">Annuler</UButton>
              <UButton type="submit" color="primary">Enregistrer</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>
