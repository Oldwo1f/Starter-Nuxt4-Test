<script setup lang="ts">
import { useBillingStore, type BankTransferPack } from '~/stores/useBillingStore'
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  meta: {
    title: 'Cotisation',
  },
})

const billingStore = useBillingStore()
const authStore = useAuthStore()
const toast = useToast()

const pack = ref<BankTransferPack>('teOhi')
const paymentMethod = ref<'virement_bancaire' | 'virement_ccp'>('virement_bancaire')

const packOptions = [
  { label: 'Te Ohi — 5 000 XPF / an', value: 'teOhi' },
  { label: 'Umete — 20 000 XPF / an', value: 'umete' },
]

const paymentMethodOptions = [
  { label: 'Virement bancaire', value: 'virement_bancaire' },
  { label: 'Virement CCP Poste', value: 'virement_ccp' },
]

const expectedAmount = computed(() => (pack.value === 'umete' ? 20000 : 5000))

const formatDate = (isoOrNull?: string | null) => {
  if (!isoOrNull) return null
  const d = new Date(isoOrNull)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const copyReference = async () => {
  const refId = billingStore.payment?.referenceId
  if (!refId) return
  try {
    await navigator.clipboard.writeText(refId)
    toast.add({
      title: 'Copié',
      description: 'Référence copiée dans le presse-papier',
      color: 'green',
    })
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Copie impossible (navigateur)',
      color: 'red',
    })
  }
}

const ensureReferenceForPack = async () => {
  // Crée ou réutilise automatiquement une référence pour le pack courant
  const res = await billingStore.createOrReuseIntent(pack.value)
  if (!res.success) {
    toast.add({
      title: 'Erreur',
      description: res.error || 'Impossible de générer automatiquement la référence',
      color: 'red',
    })
  }
}

const paidAccessUntil = computed(() => {
  const expiresAt =
    billingStore.userAccess?.paidAccessExpiresAt || authStore.user?.paidAccessExpiresAt || null
  return formatDate(expiresAt)
})

const showVerificationModal = ref(false)

const canRequestVerification = computed(() => {
  return (
    billingStore.payment &&
    billingStore.payment.status === 'pending' &&
    !(billingStore.payment as any).needsVerification
  )
})

const handleRequestVerification = async () => {
  if (!billingStore.payment) return

  const res = await billingStore.requestVerification(billingStore.payment.id)
  if (res.success) {
    toast.add({
      title: 'Vérification demandée',
      description:
        'Vos droits temporaires ont été activés. Un administrateur va vérifier votre paiement et vous attribuera vos Pūpū d\'inscription.',
      color: 'green',
    })
    showVerificationModal.value = false
  } else {
    toast.add({
      title: 'Erreur',
      description: res.error || 'Impossible de lancer la vérification',
      color: 'red',
    })
  }
}

onMounted(async () => {
  // Récupère l'état existant puis s'assure d'avoir une référence pour le pack sélectionné
  await billingStore.fetchMyBankTransfer()
  if (!billingStore.payment || billingStore.payment.pack !== pack.value) {
    await ensureReferenceForPack()
  }
})

watch(
  () => pack.value,
  async () => {
    // Si l'utilisateur change de pack, on génère automatiquement une nouvelle référence adaptée
    await ensureReferenceForPack()
  }
)
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Cotisation</h1>
      <p class="text-white/60">
        Réglez votre cotisation annuelle, puis laissez le système valider automatiquement votre
        virement pour activer vos droits pendant 1 an.
      </p>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">Payer ma cotisation</h2>
      </template>

      <div class="space-y-4">
        <UFormGroup label="Choisir un pack" name="pack">
          <USelect v-model="pack" :items="packOptions" size="xl" class="w-full" />
        </UFormGroup>

        <UFormGroup label="Choisir un moyen de paiement" name="paymentMethod">
          <USelect v-model="paymentMethod" :items="paymentMethodOptions" size="xl" class="w-full" />
        </UFormGroup>

        <div class="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2">
          <div class="text-sm text-white/60">Montant de la cotisation</div>
          <div class="mt-1 text-2xl font-bold">
            {{ expectedAmount.toLocaleString('fr-FR') }} XPF
          </div>

          <div v-if="billingStore.payment" class="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-xs text-white/60">
                Référence à indiquer dans le libellé de votre virement
              </div>
              <div class="mt-1 font-mono text-sm break-all">
                {{ billingStore.payment.referenceId }}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <UBadge
                v-if="billingStore.payment.status === 'paid'"
                color="green"
                variant="subtle"
              >
                Cotisation payée
              </UBadge>
              <UBadge
                v-else-if="billingStore.payment.status === 'pending'"
                color="amber"
                variant="subtle"
              >
                En attente de virement
              </UBadge>
              <UBadge v-else color="gray" variant="subtle">Annulée</UBadge>

              <UButton size="xs" color="primary" variant="outline" @click="copyReference">
                Copier
              </UButton>
            </div>
          </div>

          <div v-else class="mt-3 text-sm text-white/60">
            La référence de virement sera générée automatiquement en fonction du pack choisi.
          </div>

          <div class="mt-3 rounded-md bg-amber-500/10 border border-amber-500/40 p-3 text-sm text-amber-100">
            <p class="font-semibold">
              Important pour le traitement automatique :
            </p>
            <ul class="mt-1 list-disc space-y-1 pl-4">
              <li>
                Ne pas oublier d’indiquer la
                <span class="font-semibold">référence</span> ci-dessus dans le
                <span class="font-semibold">libellé de votre virement</span>.
              </li>
              <li>
                Si votre banque ne permet pas d’ajouter de libellé,
                <span class="font-semibold">votre nom et prénom</span> doivent
                correspondre exactement à ceux de votre
                <span class="font-semibold">compte Nuna’a Heritage</span> et de votre compte en banque.
              </li>
            </ul>
          </div>
        </div>

        <div v-if="canRequestVerification" class="pt-4 border-t border-white/10">
          <div class="mb-3 text-sm text-white/70">
            Assurez-vous d'avoir effectué le virement avant de lancer la vérification.
          </div>
          <UButton
            color="primary"
            :loading="billingStore.isLoading"
            @click="showVerificationModal = true"
          >
            Lancer le processus de vérification
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">Statut de ma cotisation & facture</h2>
      </template>

      <div class="space-y-4">
        <div v-if="billingStore.payment && billingStore.payment.status === 'paid'" class="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div class="font-semibold">Cotisation confirmée</div>
          <div class="mt-1 text-sm text-white/70">
            Vos droits sont actifs
            <span v-if="paidAccessUntil">jusqu’au {{ paidAccessUntil }}</span>
            <span v-else>pour 1 an</span>.
          </div>
        </div>

        <div v-else class="text-white/60">
          Dès que votre virement sera détecté, la cotisation passera automatiquement au statut
          <span class="font-semibold">payée</span> et vos droits seront activés pour 1 an.
        </div>

        <div class="pt-3 border-t border-white/10">
          <div class="text-sm font-medium text-white/80 mb-2">Facture</div>
          <div class="text-white/60">
            La facture de votre cotisation sera disponible automatiquement après confirmation du
            paiement (phase suivante).
          </div>

          <div class="mt-4">
            <UButton disabled variant="outline" icon="i-heroicons-document-arrow-down">
              Télécharger ma facture
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <div v-if="billingStore.error" class="text-sm text-red-400">
      {{ billingStore.error }}
    </div>

    <!-- Modal de confirmation pour la vérification -->
    <UModal v-model:open="showVerificationModal" title="Confirmer la demande de vérification">
      <template #body>
        <div class="space-y-4">
          <p class="text-white/80">
            Êtes-vous sûr d'avoir effectué le virement ?
          </p>
          <p class="text-sm text-white/60">
            En confirmant, vous recevrez temporairement vos droits d'accès pour 1 an. Un administrateur vérifiera ensuite votre paiement et vous attribuera vos Pūpū d'inscription.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" @click="showVerificationModal = false">
            Annuler
          </UButton>
          <UButton color="primary" :loading="billingStore.isLoading" @click="handleRequestVerification">
            Oui, j'ai effectué le virement
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

