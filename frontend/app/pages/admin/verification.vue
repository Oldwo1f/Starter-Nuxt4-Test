<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Vérification des paiements',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
const toast = useToast()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'

interface PendingVerification {
  id: number
  referenceId: string
  pack: 'teOhi' | 'umete'
  amountXpf: number
  createdAt: string
  user: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
  }
}

const pendingVerifications = ref<PendingVerification[]>([])
const isLoading = ref(false)
const isConfirming = ref<number | null>(null)

const formatDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date invalide'
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getUserDisplayName = (user: PendingVerification['user']) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) {
    return user.firstName
  }
  if (user.lastName) {
    return user.lastName
  }
  return user.email
}

const getPackLabel = (pack: string) => {
  return pack === 'teOhi' ? 'Te Ohi' : 'Umete'
}

const fetchPendingVerifications = async () => {
  if (!authStore.accessToken) {
    return
  }

  isLoading.value = true
  try {
    const response = await $fetch<PendingVerification[]>(
      `${API_BASE_URL}/billing/bank-transfer/pending-verifications`,
      {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      }
    )
    pendingVerifications.value = response
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de charger les vérifications en attente',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}

const confirmVerification = async (paymentId: number) => {
  if (!authStore.accessToken) {
    return
  }

  isConfirming.value = paymentId
  try {
    await $fetch(`${API_BASE_URL}/billing/bank-transfer/confirm-verification/${paymentId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })
    toast.add({
      title: 'Vérification confirmée',
      description: 'Le paiement a été confirmé et les Pūpū d\'inscription ont été attribués.',
      color: 'green',
    })
    await fetchPendingVerifications()
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de confirmer la vérification',
      color: 'red',
    })
  } finally {
    isConfirming.value = null
  }
}

onMounted(() => {
  fetchPendingVerifications()
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Vérification des paiements</h1>
      <p class="text-white/60">
        Liste des utilisateurs ayant demandé une vérification manuelle de leur paiement.
      </p>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Paiements à vérifier</h2>
          <UButton variant="outline" size="sm" :loading="isLoading" @click="fetchPendingVerifications">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
            Actualiser
          </UButton>
        </div>
      </template>

      <div v-if="isLoading && pendingVerifications.length === 0" class="py-12 text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>

      <div v-else-if="pendingVerifications.length === 0" class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-check-circle" class="mx-auto mb-2 h-12 w-12 text-green-500/50" />
        <p>Aucun paiement en attente de vérification</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10">
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Date de l'ordre</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Nom</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Prénom</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Email</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Pack</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Montant</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Référence</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-white/80">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="verification in pendingVerifications"
              :key="verification.id"
              class="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td class="px-4 py-3 text-sm text-white/70">
                {{ formatDate(verification.createdAt) }}
              </td>
              <td class="px-4 py-3 text-sm text-white/70">
                {{ verification.user.lastName || '-' }}
              </td>
              <td class="px-4 py-3 text-sm text-white/70">
                {{ verification.user.firstName || '-' }}
              </td>
              <td class="px-4 py-3 text-sm text-white/70">
                {{ verification.user.email }}
              </td>
              <td class="px-4 py-3 text-sm">
                <UBadge :color="verification.pack === 'umete' ? 'purple' : 'blue'" variant="subtle">
                  {{ getPackLabel(verification.pack) }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-sm font-semibold text-white/80">
                {{ verification.amountXpf.toLocaleString('fr-FR') }} XPF
              </td>
              <td class="px-4 py-3 text-sm font-mono text-white/60">
                {{ verification.referenceId }}
              </td>
              <td class="px-4 py-3 text-right">
                <UButton
                  color="green"
                  size="sm"
                  :loading="isConfirming === verification.id"
                  @click="confirmVerification(verification.id)"
                >
                  Confirmer
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
