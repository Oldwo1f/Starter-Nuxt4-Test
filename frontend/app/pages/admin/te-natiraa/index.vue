<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'admin',
  meta: { title: 'Te Natira\'a - Inscriptions' },
})

const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
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
  event?: { id: number; name: string; eventDate: string; eventTime: string; location: string }
}

interface GroupedData {
  event: { id: number; name: string; eventDate: string; eventTime: string; location: string }
  registrations: Registration[]
}

const groupedData = ref<GroupedData[]>([])
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

const formatEventDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
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
    groupedData.value = await $fetch<GroupedData[]>(`${API_BASE_URL}/te-natiraa/registrations/grouped`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
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

const totalRegistrations = computed(() =>
  groupedData.value.reduce((sum, g) => sum + g.registrations.length, 0),
)

const totalAdults = computed(() =>
  groupedData.value.reduce(
    (sum, g) => sum + g.registrations.reduce((s, r) => s + (r.adultCount || 0), 0),
    0,
  ),
)

const totalChildren = computed(() =>
  groupedData.value.reduce(
    (sum, g) => sum + g.registrations.reduce((s, r) => s + (r.childCount || 0), 0),
    0,
  ),
)

const getGroupTotals = (registrations: Registration[]) => ({
  adults: registrations.reduce((s, r) => s + (r.adultCount || 0), 0),
  children: registrations.reduce((s, r) => s + (r.childCount || 0), 0),
})

onMounted(() => fetchRegistrations())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-white">Inscriptions Te Natira'a</h2>
        <p class="text-white/70">
          {{ totalRegistrations }} inscription(s) au total
          <span class="text-white/50">•</span>
          {{ totalAdults }} adulte(s)
          <span class="text-white/50">•</span>
          {{ totalChildren }} enfant(s)
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/admin/te-natiraa/events">
          <UButton variant="outline" icon="i-heroicons-calendar">
            Gérer les événements
          </UButton>
        </NuxtLink>
        <NuxtLink to="/admin/te-natiraa/scanner">
          <UButton color="primary" icon="i-heroicons-qr-code" size="lg">
            Ouvrir le scanner QR
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Inscriptions par événement</span>
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

      <div v-else-if="groupedData.length === 0" class="py-12 text-center text-white/60">
        Aucune inscription pour le moment
      </div>

      <div v-else class="space-y-8">
        <div
          v-for="group in groupedData"
          :key="group.event.id"
          class="rounded-lg border border-white/10 bg-white/5 p-4"
        >
          <h3 class="mb-2 font-semibold text-white">
            {{ group.event.name }}
          </h3>
          <p class="mb-4 text-sm text-white/70">
            {{ formatEventDate(group.event.eventDate) }} à {{ group.event.eventTime }} - {{ group.event.location }}
          </p>
          <div class="overflow-x-auto">
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
                  v-for="r in group.registrations"
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
                    <UBadge :color="getStatusColor(r.status)" variant="subtle" size="xs">
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
          <p class="mt-3 text-sm text-white/60">
            {{ group.registrations.length }} inscription(s)
            <span class="text-white/50">•</span>
            {{ getGroupTotals(group.registrations).adults }} adulte(s)
            <span class="text-white/50">•</span>
            {{ getGroupTotals(group.registrations).children }} enfant(s)
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
