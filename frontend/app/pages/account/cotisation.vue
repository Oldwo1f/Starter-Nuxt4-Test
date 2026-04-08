<script setup lang="ts">
import {
  useBillingStore,
  type BankTransferPack,
  type ManualTransferFlowChannel,
} from '~/stores/useBillingStore'
import { useStripeStore } from '~/stores/useStripeStore'
import { useAuthStore } from '~/stores/useAuthStore'
import teohiImage from '~/assets/images/pictopack/teohi.jpeg'
import umeteImage from '~/assets/images/pictopack/umete.jpeg'
import nahoImage from '~/assets/images/staff/naho.png'
import tamigaImage from '~/assets/images/staff/tamiga.png'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.pages.cotisation',
})

const authStore = useAuthStore()
const billingStore = useBillingStore()
const stripeStore = useStripeStore()
const toast = useToast()
const { t } = useI18n()
const { formatDate: formatDateLocale } = useLocaleDate()

const pack = ref<BankTransferPack>('teOhi')
const openAccordion = ref<string | null>(null)
const selectedPaidWith = ref<'naho' | 'tamiga' | null>(null)

// Vérifier si une vérification legacy est en cours
const hasPendingLegacyVerification = computed(() => {
  return billingStore.legacyVerification?.status === 'pending'
})

const hasPendingManualFlowVerification = computed(() => {
  return billingStore.manualTransferFlowVerification?.status === 'pending'
})

const isManualFlowConfirmOpen = ref(false)
const pendingManualFlowChannel = ref<ManualTransferFlowChannel | null>(null)

const manualFlowProofFileByChannel = reactive<
  Partial<Record<ManualTransferFlowChannel, File>>
>({})
const manualFlowProofPreviewUrlByChannel = reactive<
  Partial<Record<ManualTransferFlowChannel, string>>
>({})

const resetManualFlowProof = (channel: ManualTransferFlowChannel) => {
  const url = manualFlowProofPreviewUrlByChannel[channel]
  if (url) {
    URL.revokeObjectURL(url)
  }
  delete manualFlowProofFileByChannel[channel]
  delete manualFlowProofPreviewUrlByChannel[channel]
}

const onManualFlowProofFileChange = (channel: ManualTransferFlowChannel, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  const prev = manualFlowProofPreviewUrlByChannel[channel]
  if (prev) {
    URL.revokeObjectURL(prev)
  }
  if (file) {
    manualFlowProofFileByChannel[channel] = file
    manualFlowProofPreviewUrlByChannel[channel] = URL.createObjectURL(file)
  } else {
    delete manualFlowProofFileByChannel[channel]
    delete manualFlowProofPreviewUrlByChannel[channel]
  }
}

const clearManualFlowProofInput = (channel: ManualTransferFlowChannel) => {
  resetManualFlowProof(channel)
  if (import.meta.client) {
    const el = document.getElementById(`cotisation-proof-${channel}`) as HTMLInputElement | null
    if (el) {
      el.value = ''
    }
  }
}

onUnmounted(() => {
  for (const ch of Object.keys(manualFlowProofPreviewUrlByChannel) as ManualTransferFlowChannel[]) {
    const u = manualFlowProofPreviewUrlByChannel[ch]
    if (u) {
      URL.revokeObjectURL(u)
    }
  }
})

watch(isManualFlowConfirmOpen, (open) => {
  if (!open) {
    pendingManualFlowChannel.value = null
  }
})

const hasPendingPaymentVerification = computed(
  () => hasPendingLegacyVerification.value || hasPendingManualFlowVerification.value,
)

const manualFlowChannelMessageKey = (channel: ManualTransferFlowChannel) => {
  return `account.cotisation.manualFlowChannel_${channel}` as const
}

const packs = [
  {
    id: 'teOhi' as BankTransferPack,
    name: 'Te Ohi',
    price: 5000,
    image: teohiImage,
    billing: 'year' as const,
  },
  {
    id: 'umete' as BankTransferPack,
    name: 'Umete',
    price: 20000,
    image: umeteImage,
    billing: 'once' as const,
  },
]

// const expectedAmount = computed(() => (pack.value === 'umete' ? 20000 : 5000))

// Helper pour obtenir l'URL d'embed YouTube
const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return null
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(youtubeRegex)
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`
  }
  return null
}

// URL YouTube (à configurer plus tard)
const youtubeVideoUrl = ref<string | null>(null)

// Toggle accordéon
const toggleAccordion = (panel: string) => {
  if (openAccordion.value === panel) {
    openAccordion.value = null
  } else {
    openAccordion.value = panel
  }
}

type BankRibRow = { labelKey: string; value: string }

type BankTransferBlock =
  | {
      kind: 'rib'
      titleKey: string
      subtitleKey?: string
      rows: BankRibRow[]
    }
  | {
      kind: 'deblock'
      titleKey: string
      handle: string
      hintKey: string
    }
  | {
      kind: 'cash'
      titleKey: string
      introKey: string
    }

type BankAccordionPanel = {
  panelId: string
  icon: string
  block: BankTransferBlock
  manualChannel?: ManualTransferFlowChannel
}

const bankAccordionPanels: BankAccordionPanel[] = [
  {
    panelId: 'bank-ccp',
    icon: 'i-heroicons-building-library',
    manualChannel: 'ccp_marama',
    block: {
      kind: 'rib',
      titleKey: 'account.cotisation.bankCcpTitle',
      subtitleKey: 'account.cotisation.bankCcpSubtitle',
      rows: [
        { labelKey: 'account.cotisation.bankFieldBankCode', value: '14168' },
        { labelKey: 'account.cotisation.bankFieldGuichet', value: '00001' },
        { labelKey: 'account.cotisation.bankFieldAccount', value: '10017214801' },
        { labelKey: 'account.cotisation.bankFieldKey', value: '29' },
      ],
    },
  },
  {
    panelId: 'bank-deblock-rib',
    icon: 'i-heroicons-building-office-2',
    manualChannel: 'deblock_rib',
    block: {
      kind: 'rib',
      titleKey: 'account.cotisation.bankDeblockRibTitle',
      rows: [
        { labelKey: 'account.cotisation.bankFieldBankCode', value: '17748' },
        { labelKey: 'account.cotisation.bankFieldGuichet', value: '01984' },
        { labelKey: 'account.cotisation.bankFieldAccount', value: 'RVASRU8KUGM' },
        { labelKey: 'account.cotisation.bankFieldKey', value: '44' },
      ],
    },
  },
  {
    panelId: 'bank-deblock-app',
    icon: 'i-heroicons-device-phone-mobile',
    manualChannel: 'deblock_instant',
    block: {
      kind: 'deblock',
      titleKey: 'account.cotisation.bankDeblockAppTitle',
      handle: '@nohorai',
      hintKey: 'account.cotisation.bankDeblockAppHint',
    },
  },
  {
    panelId: 'bank-cash',
    icon: 'i-heroicons-banknotes',
    block: {
      kind: 'cash',
      titleKey: 'account.cotisation.bankCashSectionTitle',
      introKey: 'account.cotisation.bankCashIntro',
    },
  },
]

const copyBankDetail = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: t('account.cotisation.toastCopiedTitle'),
      description: t('account.cotisation.toastCopiedDesc'),
      color: 'success',
    })
  } catch {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: t('account.cotisation.toastCopyFail'),
      color: 'error',
    })
  }
}

// Vérifier si l'utilisateur est déjà membre ou premium
// Vérifie à la fois le rôle ET la date d'expiration
const isMemberOrPremium = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  const hasValidRole = role === 'member' || role === 'premium' || role === 'vip'
  
  if (!hasValidRole) {
    return false
  }
  
  // Vérifier aussi que la date d'expiration est valide (dans le futur)
  const expiresAt = authStore.user?.paidAccessExpiresAt || 
                    stripeStore.userAccess?.paidAccessExpiresAt || 
                    billingStore.userAccess?.paidAccessExpiresAt
  
  if (!expiresAt) {
    return false // Pas de date d'expiration = pas de cotisation active
  }
  
  const expirationDate = new Date(expiresAt)
  const now = new Date()
  
  // La date d'expiration doit être dans le futur
  return expirationDate > now
})

const isOnlyMember = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  return role === 'member'
})

const renewalDate = computed(() => {
  const expiresAt = authStore.user?.paidAccessExpiresAt ||
    stripeStore.userAccess?.paidAccessExpiresAt ||
    billingStore.userAccess?.paidAccessExpiresAt
  if (!expiresAt) return null
  const d = new Date(expiresAt)
  if (Number.isNaN(d.getTime())) return null
  return formatDateLocale(d, { day: 'numeric', month: 'long', year: 'numeric' })
})

const memberRoleLabel = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  if (role === 'premium') return t('account.cotisation.rolePremium')
  if (role === 'vip') return t('account.cotisation.roleVip')
  return t('account.cotisation.roleMember')
})

// Paiements par virement: mis en pause pour l'instant
// const copyBankReference = async () => {
//   const refId = billingStore.payment?.referenceId
//   if (!refId) return
//   try {
//     await navigator.clipboard.writeText(refId)
//     toast.add({
//       title: t('account.cotisation.toastCopiedTitle'),
//       description: t('account.cotisation.toastCopiedDesc'),
//       color: 'success',
//     })
//   } catch {
//     toast.add({
//       title: t('pollUi.errorTitle'),
//       description: t('account.cotisation.toastCopyFail'),
//       color: 'red',
//     })
//   }
// }

// Paiement par carte : mis en pause pour l'instant
// const handleCardPayment = async () => {
//   const res = await stripeStore.createCheckoutSession(pack.value as StripePack)
//   if (!res.success) {
//     toast.add({
//       title: t('pollUi.errorTitle'),
//       description: res.error || t('account.cotisation.toastSessionError'),
//       color: 'error',
//     })
//   }
//   // La redirection vers Stripe se fait automatiquement dans le store
// }

// Paiements par virement: mis en pause pour l'instant
// const handleBankTransfer = async () => {
//   const res = await billingStore.createOrReuseIntent(pack.value)
//   if (!res.success) {
//     toast.add({
//       title: t('pollUi.errorTitle'),
//       description: res.error || t('account.cotisation.toastBankError'),
//       color: 'red',
//     })
//     return
//   }
//   toast.add({
//     title: t('account.cotisation.toastRefOkTitle'),
//     description: t('account.cotisation.toastRefOkDesc'),
//     color: 'success',
//   })
// }

// Upgrade vers Premium (Stripe carte) : mis en pause avec le paiement par carte
// const handleUpgradeToPremium = async () => {
//   pack.value = 'umete'
//   await handleCardPayment()
// }

// Gérer la vérification legacy
const handleManualTransferFlowVerification = async (
  channel: ManualTransferFlowChannel,
  proofFile: File,
) => {
  const res = await billingStore.requestManualTransferFlowVerification(channel, proofFile)
  if (res.success) {
    await billingStore.fetchMyManualTransferFlowVerification()
    openAccordion.value = null
    resetManualFlowProof(channel)
  } else {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: res.error || t('account.cotisation.toastVerificationError'),
      color: 'error',
    })
  }
}

const openManualFlowConfirm = (channel: ManualTransferFlowChannel) => {
  if (!manualFlowProofFileByChannel[channel]) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: t('account.cotisation.toastProofRequired'),
      color: 'error',
    })
    return
  }
  pendingManualFlowChannel.value = channel
  isManualFlowConfirmOpen.value = true
}

const cancelManualFlowConfirm = () => {
  isManualFlowConfirmOpen.value = false
}

const confirmManualFlowVerificationFromModal = async () => {
  const channel = pendingManualFlowChannel.value
  if (!channel) {
    return
  }
  const proofFile = manualFlowProofFileByChannel[channel]
  if (!proofFile) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: t('account.cotisation.toastProofRequired'),
      color: 'error',
    })
    isManualFlowConfirmOpen.value = false
    return
  }
  try {
    await handleManualTransferFlowVerification(channel, proofFile)
  } finally {
    isManualFlowConfirmOpen.value = false
  }
}

const handleLegacyVerification = async () => {
  if (!selectedPaidWith.value) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: t('account.cotisation.toastSelectPaidWith'),
      color: 'error',
    })
    return
  }

  const res = await billingStore.requestLegacyVerification(selectedPaidWith.value)
  if (res.success) {
    // Rafraîchir la vérification
    await billingStore.fetchMyLegacyVerification()
    // Fermer l'accordéon
    openAccordion.value = null
    selectedPaidWith.value = null
  } else {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: res.error || t('account.cotisation.toastVerificationError'),
      color: 'error',
    })
  }
}

// Vérifier les paramètres de l'URL après retour de Stripe
const route = useRoute()
const router = useRouter()

onMounted(async () => {
  // await billingStore.fetchMyBankTransfer()
  await billingStore.fetchMyLegacyVerification()
  await billingStore.fetchMyManualTransferFlowVerification()
  await stripeStore.fetchMyStripePayment()

  // Vérifier si on revient de Stripe
  if (route.query.success === 'true') {
    const sessionId = route.query.session_id as string | undefined
    // Traiter le paiement si session_id présent (fallback si webhook pas encore reçu)
    let paymentOk = true
    if (sessionId) {
      const res = await stripeStore.processPendingPayment(sessionId)
      if (!res.success) {
        paymentOk = false
        toast.add({
          title: t('pollUi.errorTitle'),
          description: stripeStore.error || t('account.cotisation.toastStripeFail'),
          color: 'error',
        })
      }
    }
    if (paymentOk) {
      toast.add({
        title: t('account.cotisation.toastPaymentOkTitle'),
        description: t('account.cotisation.toastPaymentOkDesc'),
        color: 'success',
      })
    }
    // Rafraîchir les données
    await authStore.fetchProfile()
    await stripeStore.fetchMyStripePayment()
    // Nettoyer l'URL
    router.replace({ query: {} })
  } else if (route.query.canceled === 'true') {
    toast.add({
      title: t('account.cotisation.toastCanceledTitle'),
      description: t('account.cotisation.toastCanceledDesc'),
      color: 'warning',
    })
    // Nettoyer l'URL
    router.replace({ query: {} })
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">{{ t('account.cotisation.title') }}</h1>
      <p class="text-white/60">
        {{ t('account.cotisation.subtitle') }}
      </p>
    </div>

    <!-- Card Vérification en cours (legacy ou virement CCP / Déblock) -->
    <UCard
      v-if="hasPendingPaymentVerification"
      class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
            <UIcon name="i-heroicons-clock" class="h-6 w-6 text-purple-400" />
          </div>
          <h2 class="text-xl font-semibold">{{ t('account.cotisation.verificationHeader') }}</h2>
        </div>
      </template>

      <div class="space-y-4">
        <div class="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
          <p class="text-sm text-purple-300 font-medium">
            {{ t('account.cotisation.verificationP1') }}
          </p>
        </div>

        <div class="space-y-3 text-white/80">
          <p>
            {{ t('account.cotisation.verificationP2') }}
          </p>
          
          <p>
            {{ t('account.cotisation.verificationMeantime') }}
          </p>
          
          <ul class="list-disc list-inside space-y-2 ml-4 text-white/70">
            <li>{{ t('account.cotisation.verificationLi1') }}</li>
            <li>{{ t('account.cotisation.verificationLi2') }}</li>
            <li>{{ t('account.cotisation.verificationLi3') }}</li>
          </ul>
        </div>

        <div
          v-if="hasPendingLegacyVerification && billingStore.legacyVerification"
          class="rounded-lg border border-white/10 bg-black/20 p-4"
        >
          <div class="text-sm text-white/60 mb-1">{{ t('account.cotisation.paidWith') }}</div>
          <div class="text-lg font-semibold text-white">
            {{ billingStore.legacyVerification.paidWith === 'naho' ? 'Naho' : 'Tamiga' }}
          </div>
        </div>

        <div
          v-if="hasPendingManualFlowVerification && billingStore.manualTransferFlowVerification"
          class="rounded-lg border border-white/10 bg-black/20 p-4"
        >
          <div class="text-sm text-white/60 mb-1">{{ t('account.cotisation.paymentMethodLabel') }}</div>
          <div class="text-lg font-semibold text-white">
            {{ t(manualFlowChannelMessageKey(billingStore.manualTransferFlowVerification.channel)) }}
          </div>
        </div>
      </div>
    </UCard>

    <!-- Card Paiement des cotisations -->
    <UCard
      v-else
      class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0"
    >
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('account.cotisation.paymentHeader') }}</h2>
      </template>

      <div class="space-y-6">
        <!-- Message si déjà membre/premium -->
        <div
          v-if="isMemberOrPremium"
          class="rounded-lg border border-green-500/30 bg-green-500/10 p-6 space-y-4"
        >
          <div class="flex items-start gap-4">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 text-green-400 shrink-0 mt-0.5" />
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-green-300 mb-2">
                {{ t('account.cotisation.upToDateTitle') }}
              </h3>
              <p class="text-white/80 mb-3">
                {{ t('account.cotisation.upToDateLine', { role: memberRoleLabel }) }}
              </p>
              <div v-if="renewalDate" class="text-sm text-white/70">
                <span class="font-medium">{{ t('account.cotisation.renewalLabel') }}</span>
                <span class="ml-2">{{ renewalDate }}</span>
              </div>
            </div>
          </div>

          <!-- Paiement carte en pause : upgrade Premium via les options ci-dessous (accordéons) -->
          <div
            v-if="isOnlyMember"
            class="pt-4 border-t border-green-500/20 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/75"
          >
            Pour passer à Premium, utilise pour l’instant les moyens indiqués dans « J’ai déjà payé ma cotisation » ou « Je ne peux pas payer par carte » (paiement par carte bientôt de retour).
          </div>
        </div>

        <!-- Formulaire de paiement si pas encore membre -->
        <div v-else class="space-y-4">
          <!-- Sélection du pack avec cards -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-white/80">{{ t('account.cotisation.choosePack') }}</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                v-for="packOption in packs"
                :key="packOption.id"
                type="button"
                class="group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]"
                :class="{
                  'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20': pack === packOption.id,
                  'border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-white/20': pack !== packOption.id,
                }"
                @click="pack = packOption.id"
              >
                <div class="p-4 space-y-3">
                  <!-- Image du pack -->
                  <div class="flex justify-center">
                    <img
                      :src="packOption.image"
                      :alt="packOption.name"
                      class="h-16 w-16 rounded-lg object-cover"
                    />
                  </div>
                  
                  <!-- Nom du pack -->
                  <h3
                    class="text-center text-lg font-bold transition-colors"
                    :class="{
                      'text-primary-300': pack === packOption.id,
                      'text-white': pack !== packOption.id,
                    }"
                  >
                    {{ packOption.name }}
                  </h3>
                  
                  <!-- Prix -->
                  <div class="text-center">
                    <div
                      class="text-2xl font-bold transition-colors"
                      :class="{
                        'text-primary-300': pack === packOption.id,
                        'text-white': pack !== packOption.id,
                      }"
                    >
                      {{ packOption.price.toLocaleString('fr-FR') }} XPF
                    </div>
                    <div v-if="packOption.billing === 'year'" class="text-xs text-white/60 mt-1">
                      {{ t('account.cotisation.perYear') }}
                    </div>
                    <div v-else class="text-xs text-white/60 mt-1 leading-snug">
                      {{ t('account.cotisation.umeteOneTimeLine') }}
                    </div>
                  </div>
                  
                  <!-- Indicateur de sélection -->
                  <div
                    v-if="pack === packOption.id"
                    class="absolute top-2 right-2"
                  >
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                      <UIcon name="i-heroicons-check" class="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Paiement par carte : mis en pause pour l'instant
          <div class="pt-4 border-t border-white/10">
            <UButton
              color="primary"
              size="lg"
              block
              :loading="stripeStore.isLoading"
              @click="handleCardPayment"
            >
              <UIcon name="i-heroicons-credit-card" class="h-5 w-5 mr-2" />
              {{ t('account.cotisation.payCard') }}
            </UButton>
            <p class="mt-2 text-sm text-white/60 text-center">
              {{ t('account.cotisation.stripeHint') }}
            </p>
          </div>
          -->
          <!-- <div class="pt-4 border-t border-white/10 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
            <p class="text-sm text-amber-100/90 text-center">
              Le paiement par carte est temporairement indisponible. Utilise les options dans les sections ci-dessous (déjà payé, espèces, virement).
            </p>
          </div> -->

          <!-- Accordéon J'ai déjà payé ma cotisation -->
          <div class="pt-4 border-t border-white/10">
            <div
              class="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-white/5 to-white/[0.02] transition-all duration-500"
              :class="{
                'ring-2 ring-purple-500/50 shadow-2xl shadow-purple-500/20': openAccordion === 'legacy',
              }"
            >
              <button
                class="flex w-full items-center justify-between p-6 text-left transition-all hover:bg-white/5"
                @click="toggleAccordion('legacy')"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 transition-all"
                    :class="{
                      'bg-purple-500/30 scale-110': openAccordion === 'legacy',
                    }"
                  >
                    <UIcon
                      name="i-heroicons-clock"
                      class="h-6 w-6 text-purple-400 transition-all"
                      :class="{
                        'text-purple-300 scale-110': openAccordion === 'legacy',
                      }"
                    />
                  </div>
                  <h3
                    class="text-xl font-bold text-white transition-all sm:text-2xl"
                    :class="{
                      'text-purple-400': openAccordion === 'legacy',
                    }"
                  >
                    {{ t('account.cotisation.accordionLegacy') }}
                  </h3>
                </div>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="h-6 w-6 text-white/60 transition-all duration-300"
                  :class="{
                    'rotate-180 text-purple-400': openAccordion === 'legacy',
                  }"
                />
              </button>

              <!-- Contenu accordéon legacy -->
              <div
                class="overflow-hidden transition-all duration-500"
                :class="{
                  'max-h-0': openAccordion !== 'legacy',
                  'max-h-[800px]': openAccordion === 'legacy',
                }"
              >
                <div class="border-t border-white/10 p-6 space-y-6">
                  <!-- Question -->
                  <div class="space-y-3">
                    <h4 class="text-lg font-semibold text-white">{{ t('account.cotisation.paidWithQuestion') }}</h4>
                    
                    <!-- Sélection Naho/Tamiga -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        class="group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]"
                        :class="{
                          'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20': selectedPaidWith === 'naho',
                          'border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-white/20': selectedPaidWith !== 'naho',
                        }"
                        @click="selectedPaidWith = 'naho'"
                      >
                        <div class="p-4 space-y-3">
                          <div class="flex justify-center">
                            <img
                              :src="nahoImage"
                              alt="Naho"
                              class="h-16 w-16 rounded-lg object-cover"
                            />
                          </div>
                          <h3
                            class="text-center text-lg font-bold transition-colors"
                            :class="{
                              'text-purple-300': selectedPaidWith === 'naho',
                              'text-white': selectedPaidWith !== 'naho',
                            }"
                          >
                            Naho
                          </h3>
                          <div
                            v-if="selectedPaidWith === 'naho'"
                            class="absolute top-2 right-2"
                          >
                            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500">
                              <UIcon name="i-heroicons-check" class="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        class="group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]"
                        :class="{
                          'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20': selectedPaidWith === 'tamiga',
                          'border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-white/20': selectedPaidWith !== 'tamiga',
                        }"
                        @click="selectedPaidWith = 'tamiga'"
                      >
                        <div class="p-4 space-y-3">
                          <div class="flex justify-center">
                            <img
                              :src="tamigaImage"
                              alt="Tamiga"
                              class="h-16 w-16 rounded-lg object-cover"
                            />
                          </div>
                          <h3
                            class="text-center text-lg font-bold transition-colors"
                            :class="{
                              'text-purple-300': selectedPaidWith === 'tamiga',
                              'text-white': selectedPaidWith !== 'tamiga',
                            }"
                          >
                            Tamiga
                          </h3>
                          <div
                            v-if="selectedPaidWith === 'tamiga'"
                            class="absolute top-2 right-2"
                          >
                            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500">
                              <UIcon name="i-heroicons-check" class="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <!-- Avertissement en rouge -->
                  <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <p class="text-sm text-red-300">
                      {{ t('account.cotisation.legacyWarning') }}
                    </p>
                  </div>

                  <!-- Bouton lancer la vérification -->
                  <UButton
                    color="primary"
                    variant="solid"
                    size="lg"
                    block
                    :disabled="!selectedPaidWith"
                    :loading="billingStore.isLoading"
                    class="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    @click="handleLegacyVerification"
                  >
                    {{ t('account.cotisation.startVerification') }}
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <!-- Paiement sans carte : cartes-accordéons (virements, Déblock, espèces) -->
          <div class="pt-4 border-t border-white/10 space-y-4">
            <!-- <div class="space-y-1">
              <h3 class="text-lg font-semibold text-white sm:text-xl">
                {{ t('account.cotisation.bankPanelsSectionTitle') }}
              </h3>
              <p class="text-sm text-white/65 leading-relaxed">
                {{ t('account.cotisation.bankPanelsSectionSubtitle') }}
              </p>
            </div> -->

            <div
              v-for="panel in bankAccordionPanels"
              :key="panel.panelId"
              class="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-white/5 to-white/[0.02] transition-all duration-500"
              :class="{
                'ring-2 ring-orange-500/50 shadow-xl shadow-orange-500/15': openAccordion === panel.panelId,
              }"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 p-4 text-left transition-all hover:bg-white/5 sm:p-5"
                @click="toggleAccordion(panel.panelId)"
              >
                <div class="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 transition-all sm:h-12 sm:w-12"
                    :class="{
                      'bg-orange-500/30 scale-105': openAccordion === panel.panelId,
                    }"
                  >
                    <UIcon
                      :name="panel.icon"
                      class="h-5 w-5 text-orange-400 transition-all sm:h-6 sm:w-6"
                      :class="{
                        'text-orange-300': openAccordion === panel.panelId,
                      }"
                    />
                  </div>
                  <h4
                    class="min-w-0 text-base font-bold leading-snug text-white transition-colors sm:text-lg"
                    :class="{
                      'text-orange-300': openAccordion === panel.panelId,
                    }"
                  >
                    {{ t(panel.block.titleKey) }}
                  </h4>
                </div>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="h-5 w-5 shrink-0 text-white/60 transition-all duration-300 sm:h-6 sm:w-6"
                  :class="{
                    'rotate-180 text-orange-400': openAccordion === panel.panelId,
                  }"
                />
              </button>

              <div
                class="overflow-hidden transition-all duration-500"
                :class="{
                  'max-h-0': openAccordion !== panel.panelId,
                  'max-h-[min(85vh,1400px)]': openAccordion === panel.panelId,
                }"
              >
                <div class="space-y-3 border-t border-white/10 p-4 sm:p-5">
                  <p
                    v-if="panel.block.kind === 'rib' && panel.block.subtitleKey"
                    class="text-sm text-white/55"
                  >
                    {{ t(panel.block.subtitleKey) }}
                  </p>

                  <template v-if="panel.block.kind === 'rib'">
                    <dl class="space-y-2">
                      <div
                        v-for="(row, idx) in panel.block.rows"
                        :key="idx"
                        class="flex flex-wrap items-center gap-2 gap-y-1 justify-between rounded-lg border border-white/5 bg-black/25 px-3 py-2"
                      >
                        <dt class="shrink-0 text-xs text-white/50">
                          {{ t(row.labelKey) }}
                        </dt>
                        <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
                          <dd class="break-all text-right font-mono text-sm tabular-nums text-orange-100">
                            {{ row.value }}
                          </dd>
                          <button
                            type="button"
                            class="shrink-0 rounded-md p-1.5 text-orange-300 transition-colors hover:bg-white/10"
                            :aria-label="t('account.cotisation.bankCopyAria')"
                            @click.stop="copyBankDetail(row.value)"
                          >
                            <UIcon name="i-heroicons-clipboard-document" class="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </dl>

                    <div
                      v-if="panel.manualChannel"
                      class="space-y-3 border-t border-white/10 pt-4"
                    >
                      <p class="text-sm leading-relaxed text-white/75">
                        {{ t('account.cotisation.transferProofHint') }}
                      </p>
                      <div class="space-y-2">
                        <label
                          class="flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed border-white/20 bg-black/20 p-4 transition-colors hover:border-orange-500/40 hover:bg-black/30"
                          :for="'cotisation-proof-' + panel.manualChannel"
                        >
                          <span class="text-sm font-medium text-white/90">{{
                            t('account.cotisation.transferProofLabel')
                          }}</span>
                          <input
                            :id="'cotisation-proof-' + panel.manualChannel"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/*"
                            class="sr-only"
                            @change="onManualFlowProofFileChange(panel.manualChannel!, $event)"
                          />
                          <span class="text-xs text-white/50">{{
                            t('account.cotisation.transferProofFormats')
                          }}</span>
                        </label>
                        <div
                          v-if="manualFlowProofPreviewUrlByChannel[panel.manualChannel]"
                          class="flex items-start gap-3"
                        >
                          <img
                            :src="manualFlowProofPreviewUrlByChannel[panel.manualChannel]"
                            alt=""
                            class="max-h-40 max-w-full rounded-lg border border-white/10 object-contain"
                          />
                          <UButton
                            type="button"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            @click.stop="clearManualFlowProofInput(panel.manualChannel!)"
                          >
                            {{ t('account.cotisation.transferProofRemove') }}
                          </UButton>
                        </div>
                      </div>
                      <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                        <p class="text-sm text-red-300">
                          {{ t('account.cotisation.legacyWarning') }}
                        </p>
                      </div>
                      <UButton
                        color="success"
                        variant="solid"
                        size="lg"
                        block
                        :disabled="
                          hasPendingManualFlowVerification ||
                          !panel.manualChannel ||
                          !manualFlowProofFileByChannel[panel.manualChannel]
                        "
                        :loading="billingStore.isLoading"
                        class="bg-green-600 hover:bg-green-700 font-semibold text-white"
                        @click.stop="
                          panel.manualChannel && openManualFlowConfirm(panel.manualChannel)
                        "
                      >
                        {{ t('account.cotisation.startVerification') }}
                      </UButton>
                    </div>
                  </template>

                  <template v-else-if="panel.block.kind === 'deblock'">
                    <div class="flex flex-wrap items-center gap-3">
                      <span class="font-mono text-xl font-semibold tracking-tight text-orange-200">
                        {{ panel.block.handle }}
                      </span>
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/15 px-3 py-1.5 text-sm text-orange-200 transition-colors hover:bg-orange-500/25"
                        :aria-label="t('account.cotisation.bankCopyAria')"
                        @click.stop="copyBankDetail(panel.block.handle)"
                      >
                        <UIcon name="i-heroicons-clipboard-document" class="h-4 w-4" />
                        {{ t('account.cotisation.bankCopyButton') }}
                      </button>
                    </div>
                    <p class="text-sm leading-relaxed text-white/70">
                      {{ t(panel.block.hintKey, { pseudo: panel.block.handle }) }}
                      <a
                        class="whitespace-nowrap text-orange-300 underline underline-offset-2 hover:text-orange-200"
                        href="tel:+68987384716"
                      >
                        +689 87 38 47 16
                      </a>
                    </p>

                    <div
                      v-if="panel.manualChannel"
                      class="space-y-3 border-t border-white/10 pt-4"
                    >
                      <p class="text-sm leading-relaxed text-white/75">
                        {{ t('account.cotisation.transferProofHint') }}
                      </p>
                      <div class="space-y-2">
                        <label
                          class="flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed border-white/20 bg-black/20 p-4 transition-colors hover:border-orange-500/40 hover:bg-black/30"
                          :for="'cotisation-proof-' + panel.manualChannel"
                        >
                          <span class="text-sm font-medium text-white/90">{{
                            t('account.cotisation.transferProofLabel')
                          }}</span>
                          <input
                            :id="'cotisation-proof-' + panel.manualChannel"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/*"
                            class="sr-only"
                            @change="onManualFlowProofFileChange(panel.manualChannel!, $event)"
                          />
                          <span class="text-xs text-white/50">{{
                            t('account.cotisation.transferProofFormats')
                          }}</span>
                        </label>
                        <div
                          v-if="manualFlowProofPreviewUrlByChannel[panel.manualChannel]"
                          class="flex items-start gap-3"
                        >
                          <img
                            :src="manualFlowProofPreviewUrlByChannel[panel.manualChannel]"
                            alt=""
                            class="max-h-40 max-w-full rounded-lg border border-white/10 object-contain"
                          />
                          <UButton
                            type="button"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            @click.stop="clearManualFlowProofInput(panel.manualChannel!)"
                          >
                            {{ t('account.cotisation.transferProofRemove') }}
                          </UButton>
                        </div>
                      </div>
                      <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                        <p class="text-sm text-red-300">
                          {{ t('account.cotisation.legacyWarning') }}
                        </p>
                      </div>
                      <UButton
                        color="success"
                        variant="solid"
                        size="lg"
                        block
                        :disabled="
                          hasPendingManualFlowVerification ||
                          !panel.manualChannel ||
                          !manualFlowProofFileByChannel[panel.manualChannel]
                        "
                        :loading="billingStore.isLoading"
                        class="bg-green-600 hover:bg-green-700 font-semibold text-white"
                        @click.stop="
                          panel.manualChannel && openManualFlowConfirm(panel.manualChannel)
                        "
                      >
                        {{ t('account.cotisation.startVerification') }}
                      </UButton>
                    </div>
                  </template>

                  <template v-else-if="panel.block.kind === 'cash'">
                    <p class="text-sm text-white/65">
                      {{ t(panel.block.introKey) }}
                    </p>
                    <ul class="space-y-3 pt-1">
                      <li class="rounded-lg border border-white/10 bg-black/20 p-4">
                        <div class="font-semibold text-white">
                          {{ t('account.cotisation.bankCashPk18Title') }}
                        </div>
                        <div class="mt-1 text-sm text-white/70">
                          {{ t('account.cotisation.bankContactTamiga') }} —
                          <a class="text-orange-300 underline underline-offset-2 hover:text-orange-200" href="tel:+68989780115">
                            +689 89 78 01 15
                          </a>
                        </div>
                      </li>
                      <li class="rounded-lg border border-white/10 bg-black/20 p-4">
                        <div class="font-semibold text-white">
                          {{ t('account.cotisation.bankCashTaravaoTitle') }}
                        </div>
                        <div class="mt-1 text-sm text-white/70">
                          {{ t('account.cotisation.bankContactNaho') }} —
                          <a class="text-orange-300 underline underline-offset-2 hover:text-orange-200" href="tel:+68987384716">
                            +689 87 38 47 16
                          </a>
                        </div>
                      </li>
                    </ul>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Message d'erreur -->
    <div v-if="billingStore.error" class="text-sm text-red-400">
      {{ billingStore.error }}
    </div>

    <UModal v-model:open="isManualFlowConfirmOpen" :ui="{ wrapper: 'max-w-md' }">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-banknotes" class="h-5 w-5 text-green-400" />
          <span class="font-medium">{{ t('account.cotisation.manualFlowConfirmTitle') }}</span>
        </div>
      </template>

      <template #body>
        <div class="space-y-4 p-6 pt-0">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :description="t('account.cotisation.manualFlowConfirmDescription')"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="billingStore.isLoading"
            @click="cancelManualFlowConfirm"
          >
            {{ t('account.cotisation.manualFlowConfirmCancel') }}
          </UButton>
          <UButton
            color="success"
            class="bg-green-600 hover:bg-green-700 font-semibold text-white"
            :loading="billingStore.isLoading"
            :disabled="billingStore.isLoading"
            icon="i-heroicons-check-circle"
            @click="confirmManualFlowVerificationFromModal"
          >
            {{ t('account.cotisation.startVerification') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
