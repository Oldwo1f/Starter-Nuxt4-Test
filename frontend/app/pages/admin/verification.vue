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

interface PendingLegacyVerification {
  id: number
  paidWith: 'naho' | 'tamiga'
  createdAt: string
  user: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
  }
}

const pendingVerifications = ref<PendingVerification[]>([])
const pendingLegacyVerifications = ref<PendingLegacyVerification[]>([])
const isLoading = ref(false)
const isLoadingLegacy = ref(false)
const isConfirming = ref<number | null>(null)
const isRejecting = ref<number | null>(null)
const activeTab = ref<'bank' | 'legacy'>('bank')
const upgradeToPremium = ref<Record<number, boolean>>({})
const customExpirationDay = ref<Record<number, number | null>>({})
const customExpirationMonth = ref<Record<number, number | null>>({})

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

const fetchPendingLegacyVerifications = async () => {
  if (!authStore.accessToken) {
    return
  }

  isLoadingLegacy.value = true
  try {
    const response = await $fetch<PendingLegacyVerification[]>(
      `${API_BASE_URL}/billing/legacy/pending-verifications`,
      {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      }
    )
    pendingLegacyVerifications.value = response
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de charger les vérifications legacy en attente',
      color: 'red',
    })
  } finally {
    isLoadingLegacy.value = false
  }
}

const confirmLegacyVerification = async (verificationId: number) => {
  if (!authStore.accessToken) {
    return
  }

  // Validation: si jour ou mois est renseigné, les deux doivent l'être
  const day = customExpirationDay.value[verificationId]
  const month = customExpirationMonth.value[verificationId]
  if ((day && !month) || (!day && month)) {
    toast.add({
      title: 'Erreur',
      description: 'Veuillez renseigner à la fois le jour et le mois, ou aucun des deux.',
      color: 'red',
    })
    return
  }

  isConfirming.value = verificationId
  try {
    const body: any = {
      upgradeToPremium: upgradeToPremium.value[verificationId] || false,
    }
    
    // Ajouter les paramètres de date seulement si les deux sont renseignés
    if (day && month) {
      body.expirationDay = Number(day)
      body.expirationMonth = Number(month)
    }
    
    await $fetch(`${API_BASE_URL}/billing/legacy/confirm-verification/${verificationId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body,
    })
    toast.add({
      title: 'Vérification confirmée',
      description: 'La vérification a été confirmée et les Pūpū d\'inscription ont été attribués.',
      color: 'green',
    })
    delete upgradeToPremium.value[verificationId]
    delete customExpirationDay.value[verificationId]
    delete customExpirationMonth.value[verificationId]
    await fetchPendingLegacyVerifications()
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

const rejectLegacyVerification = async (verificationId: number) => {
  if (!authStore.accessToken) {
    return
  }

  if (!confirm('Êtes-vous sûr de vouloir rejeter cette vérification ? Les droits de l\'utilisateur seront retirés.')) {
    return
  }

  isRejecting.value = verificationId
  try {
    await $fetch(`${API_BASE_URL}/billing/legacy/reject-verification/${verificationId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })
    toast.add({
      title: 'Vérification rejetée',
      description: 'La vérification a été rejetée et les droits de l\'utilisateur ont été retirés.',
      color: 'amber',
    })
    delete upgradeToPremium.value[verificationId]
    delete customExpirationDay.value[verificationId]
    delete customExpirationMonth.value[verificationId]
    await fetchPendingLegacyVerifications()
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de rejeter la vérification',
      color: 'red',
    })
  } finally {
    isRejecting.value = null
  }
}

const getPaidWithLabel = (paidWith: string) => {
  return paidWith === 'naho' ? 'Naho' : 'Tamiga'
}

onMounted(() => {
  fetchPendingVerifications()
  fetchPendingLegacyVerifications()
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

    <!-- Onglets -->
    <div class="flex gap-2 border-b border-white/10">
      <button
        class="px-4 py-2 font-medium transition-colors"
        :class="{
          'text-primary-400 border-b-2 border-primary-400': activeTab === 'bank',
          'text-white/60 hover:text-white/80': activeTab !== 'bank',
        }"
        @click="activeTab = 'bank'"
      >
        Virements bancaires
      </button>
      <button
        class="px-4 py-2 font-medium transition-colors"
        :class="{
          'text-primary-400 border-b-2 border-primary-400': activeTab === 'legacy',
          'text-white/60 hover:text-white/80': activeTab !== 'legacy',
        }"
        @click="activeTab = 'legacy'"
      >
        Ancien système (Naho/Tamiga)
      </button>
    </div>

    <!-- Vérifications virement bancaire -->
    <UCard v-if="activeTab === 'bank'" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
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
                  variant="solid"
                  size="sm"
                  class="bg-green-600 hover:bg-green-700 text-white"
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

    <!-- Vérifications legacy -->
    <UCard v-if="activeTab === 'legacy'" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Vérifications legacy (Ancien système)</h2>
          <UButton variant="outline" size="sm" :loading="isLoadingLegacy" @click="fetchPendingLegacyVerifications">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
            Actualiser
          </UButton>
        </div>
      </template>

      <div v-if="isLoadingLegacy && pendingLegacyVerifications.length === 0" class="py-12 text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>

      <div v-else-if="pendingLegacyVerifications.length === 0" class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-check-circle" class="mx-auto mb-2 h-12 w-12 text-green-500/50" />
        <p>Aucune vérification legacy en attente</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10">
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Date de la demande</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Nom</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Prénom</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Email</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-white/80">Payé avec</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-white/80">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="verification in pendingLegacyVerifications"
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
                <UBadge color="purple" variant="subtle">
                  {{ getPaidWithLabel(verification.paidWith) }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-3">
                  <div class="flex items-center justify-end gap-2">
                    <label class="flex items-center gap-2 text-xs text-white/60">
                      <input
                        type="checkbox"
                        :checked="upgradeToPremium[verification.id] || false"
                        @change="upgradeToPremium[verification.id] = ($event.target as HTMLInputElement).checked"
                        class="rounded"
                      />
                      Premium
                    </label>
                  </div>
                  
                  <!-- Champs jour et mois pour date d'expiration personnalisée -->
                  <div class="flex items-center justify-end gap-2 text-xs">
                    <span class="text-white/60">Expiration:</span>
                    <select
                      v-model.number="customExpirationMonth[verification.id]"
                      class="rounded bg-white/10 border border-white/20 text-white px-2 py-1 text-xs min-w-[100px] [&>option]:bg-gray-900 [&>option]:text-white"
                    >
                      <option :value="null">Mois</option>
                      <option v-for="month in 12" :key="month" :value="month">
                        {{ new Date(2024, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long' }) }}
                      </option>
                    </select>
                    <select
                      v-model.number="customExpirationDay[verification.id]"
                      class="rounded bg-white/10 border border-white/20 text-white px-2 py-1 text-xs min-w-[70px] [&>option]:bg-gray-900 [&>option]:text-white"
                      :class="{ 'opacity-50 cursor-not-allowed': !customExpirationMonth[verification.id] }"
                      :disabled="!customExpirationMonth[verification.id]"
                    >
                      <option :value="null">Jour</option>
                      <option v-for="day in 31" :key="day" :value="day">{{ day }}</option>
                    </select>
                  </div>
                  
                  <div class="flex items-center justify-end gap-2">
                    <UButton
                      color="green"
                      variant="solid"
                      size="sm"
                      class="bg-green-600 hover:bg-green-700 text-white"
                      :loading="isConfirming === verification.id"
                      @click="confirmLegacyVerification(verification.id)"
                    >
                      Confirmer
                    </UButton>
                    <UButton
                      color="red"
                      variant="solid"
                      size="sm"
                      class="bg-red-600 hover:bg-red-700 text-white"
                      :loading="isRejecting === verification.id"
                      @click="rejectLegacyVerification(verification.id)"
                    >
                      Rejeter
                    </UButton>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
/* Style pour les options des selects avec fond foncé */
select option {
  background-color: #111827 !important; /* gray-900 */
  color: white !important;
}

select:focus option:checked {
  background-color: #3b82f6 !important; /* primary-500 */
  color: white !important;
}
</style>
