<script setup lang="ts">
import { useBillingStore, type BankTransferPack } from '~/stores/useBillingStore'
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  meta: {
    title: 'Paiement',
  },
})

const billingStore = useBillingStore()
const authStore = useAuthStore()
const toast = useToast()

const pack = ref<BankTransferPack>('teOhi')

const packOptions = [
  { label: 'Te Ohi — 5 000 XPF / an', value: 'teOhi' },
  { label: 'Umete — 20 000 XPF / an', value: 'umete' },
]

const expectedAmount = computed(() => (pack.value === 'umete' ? 20000 : 5000))

const formatDate = (isoOrNull?: string | null) => {
  if (!isoOrNull) return null
  const d = new Date(isoOrNull)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const refresh = async () => {
  await billingStore.fetchMyBankTransfer()
}

const generateReference = async () => {
  const res = await billingStore.createOrReuseIntent(pack.value)
  if (!res.success) {
    toast.add({
      title: 'Erreur',
      description: res.error || 'Impossible de générer la référence',
      color: 'red',
    })
    return
  }
  toast.add({
    title: 'Référence générée',
    description: 'Copiez la référence et utilisez-la comme libellé de votre virement.',
    color: 'green',
  })
}

const copyReference = async () => {
  const refId = billingStore.payment?.referenceId
  if (!refId) return
  try {
    await navigator.clipboard.writeText(refId)
    toast.add({ title: 'Copié', description: 'Référence copiée dans le presse-papier', color: 'green' })
  } catch {
    toast.add({ title: 'Erreur', description: 'Copie impossible (navigateur)', color: 'red' })
  }
}

const paidAccessUntil = computed(() => {
  const expiresAt = billingStore.userAccess?.paidAccessExpiresAt || authStore.user?.paidAccessExpiresAt || null
  return formatDate(expiresAt)
})

onMounted(async () => {
  await refresh()
})
</script>

<template>
  <div class="space-y-6">
    <ProfileIncompleteBanner />
    
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Paiement (virement)</h1>
      <p class="text-white/60">
        Générez une référence unique, puis faites votre virement. Une fois détecté, vos droits sont activés 1 an.
      </p>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">1) Choisir un pack</h2>
      </template>

      <div class="space-y-4">
        <UFormGroup label="Pack" name="pack">
          <USelect v-model="pack" :items="packOptions" size="xl" class="w-full" />
        </UFormGroup>

        <div class="rounded-lg border border-white/10 bg-black/20 p-4">
          <div class="text-sm text-white/60">Montant à virer</div>
          <div class="mt-1 text-2xl font-bold">{{ expectedAmount.toLocaleString('fr-FR') }} XPF</div>
          <div class="mt-2 text-sm text-white/60">
            La facture sera disponible automatiquement après confirmation (phase suivante).
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton color="primary" :loading="billingStore.isLoading" @click="generateReference">
            Générer ma référence
          </UButton>
          <UButton variant="outline" :loading="billingStore.isLoading" @click="refresh">
            Rafraîchir le statut
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">2) Référence à utiliser</h2>
      </template>

      <div v-if="!billingStore.payment" class="text-white/60">
        Aucune référence générée pour l’instant.
      </div>

      <div v-else class="space-y-4">
        <div class="rounded-lg border border-white/10 bg-black/30 p-4">
          <div class="text-sm text-white/60">Libellé / Référence</div>
          <div class="mt-1 font-mono text-lg break-all">
            {{ billingStore.payment.referenceId }}
          </div>
          <div class="mt-3 flex flex-wrap gap-3">
            <UButton size="sm" color="primary" variant="outline" @click="copyReference">
              Copier
            </UButton>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-sm text-white/60">Statut</div>
          <UBadge
            v-if="billingStore.payment.status === 'paid'"
            color="green"
            variant="subtle"
          >
            Payé
          </UBadge>
          <UBadge
            v-else-if="billingStore.payment.status === 'pending'"
            color="amber"
            variant="subtle"
          >
            En attente
          </UBadge>
          <UBadge v-else color="gray" variant="subtle">Annulé</UBadge>
        </div>

        <div v-if="billingStore.payment.status === 'paid'" class="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div class="font-semibold">Paiement confirmé</div>
          <div class="mt-1 text-sm text-white/70">
            Vos droits sont actifs
            <span v-if="paidAccessUntil">jusqu’au {{ paidAccessUntil }}</span>
            <span v-else>pour 1 an</span>.
          </div>
        </div>
      </div>
    </UCard>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">3) Facture</h2>
      </template>

      <div class="text-white/60">
        Facture disponible après confirmation du paiement (phase suivante).
      </div>

      <div class="mt-4">
        <UButton disabled variant="outline" icon="i-heroicons-document-arrow-down">
          Télécharger ma facture
        </UButton>
      </div>
    </UCard>

    <div v-if="billingStore.error" class="text-sm text-red-400">
      {{ billingStore.error }}
    </div>
  </div>
</template>

