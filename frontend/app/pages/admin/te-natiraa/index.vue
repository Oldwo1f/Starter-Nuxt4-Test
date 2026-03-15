<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Te Natira\'a - Inscriptions',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const toast = useToast()
const router = useRouter()

onMounted(() => {
  const role = authStore.user?.role?.toLowerCase()
  if (role === 'moderator') {
    router.push('/admin/dashboard')
    toast.add({
      title: 'Accès refusé',
      description: 'Vous n\'avez pas les permissions nécessaires.',
      color: 'red',
    })
  }
})

interface Registration {
  id: number
  firstName: string
  lastName: string
  email: string
  adultCount: number
  childCount: number
  status: string
  qrCode: string
  createdAt: string
}

const registrations = ref<Registration[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const isLoading = ref(false)

const formatDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'paid':
      return 'Payé'
    case 'validated':
      return 'Validé'
    default:
      return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'amber'
    case 'paid':
      return 'green'
    case 'validated':
      return 'primary'
    default:
      return 'neutral'
  }
}

const fetchRegistrations = async () => {
  if (!authStore.accessToken) return

  isLoading.value = true
  try {
    const response = await $fetch<{
      items: Registration[]
      total: number
      page: number
      totalPages: number
    }>(`${API_BASE_URL}/te-natiraa/registrations`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      query: { page: page.value, limit: 50 },
    })
    registrations.value = response.items
    total.value = response.total
    totalPages.value = response.totalPages
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de charger les inscriptions',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchRegistrations()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-white">Inscriptions Te Natira'a</h2>
        <p class="text-white/70">
          {{ total }} inscription(s) au total
        </p>
      </div>
      <NuxtLink to="/admin/te-natiraa/scanner">
        <UButton
          color="primary"
          icon="i-heroicons-qr-code"
          size="lg"
        >
          Ouvrir le scanner QR
        </UButton>
      </NuxtLink>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Liste des inscriptions</span>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-heroicons-arrow-path"
            :loading="isLoading"
            @click="fetchRegistrations"
          >
            Actualiser
          </UButton>
        </div>
      </template>

      <div v-if="isLoading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-white/50" />
      </div>

      <div v-else-if="registrations.length === 0" class="py-12 text-center text-white/60">
        Aucune inscription pour le moment
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10 text-left text-sm text-white/70">
              <th class="pb-3 pr-4 font-medium">Nom</th>
              <th class="pb-3 pr-4 font-medium">Email</th>
              <th class="pb-3 pr-4 font-medium">Adultes</th>
              <th class="pb-3 pr-4 font-medium">Enfants</th>
              <th class="pb-3 pr-4 font-medium">Statut</th>
              <th class="pb-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in registrations"
              :key="r.id"
              class="border-b border-white/5 text-white/90"
            >
              <td class="py-3 pr-4">
                {{ r.firstName }} {{ r.lastName }}
              </td>
              <td class="py-3 pr-4">
                {{ r.email }}
              </td>
              <td class="py-3 pr-4">
                {{ r.adultCount }}
              </td>
              <td class="py-3 pr-4">
                {{ r.childCount }}
              </td>
              <td class="py-3 pr-4">
                <UBadge
                  :color="getStatusColor(r.status)"
                  variant="subtle"
                  size="xs"
                >
                  {{ getStatusLabel(r.status) }}
                </UBadge>
              </td>
              <td class="py-3">
                {{ formatDate(r.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template v-if="totalPages > 1" #footer>
        <div class="flex items-center justify-between">
          <p class="text-sm text-white/60">
            Page {{ page }} / {{ totalPages }}
          </p>
          <div class="flex gap-2">
            <UButton
              variant="outline"
              size="sm"
              :disabled="page <= 1"
              @click="page--; fetchRegistrations()"
            >
              Précédent
            </UButton>
            <UButton
              variant="outline"
              size="sm"
              :disabled="page >= totalPages"
              @click="page++; fetchRegistrations()"
            >
              Suivant
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
