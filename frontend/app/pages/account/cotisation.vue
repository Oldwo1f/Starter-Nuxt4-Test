<script setup lang="ts">
import { useBillingStore, type BankTransferPack } from '~/stores/useBillingStore'
import { useStripeStore, type StripePack } from '~/stores/useStripeStore'
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

const packs = [
  {
    id: 'teOhi' as BankTransferPack,
    name: 'Te Ohi',
    price: 5000,
    image: teohiImage,
  },
  {
    id: 'umete' as BankTransferPack,
    name: 'Umete',
    price: 20000,
    image: umeteImage,
  },
]

const expectedAmount = computed(() => (pack.value === 'umete' ? 20000 : 5000))

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

const copyBankReference = async () => {
  const refId = billingStore.payment?.referenceId
  if (!refId) return
  try {
    await navigator.clipboard.writeText(refId)
    toast.add({
      title: t('account.cotisation.toastCopiedTitle'),
      description: t('account.cotisation.toastCopiedDesc'),
      color: 'success',
    })
  } catch {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: t('account.cotisation.toastCopyFail'),
      color: 'red',
    })
  }
}

// Gérer le paiement par carte
const handleCardPayment = async () => {
  const res = await stripeStore.createCheckoutSession(pack.value as StripePack)
  if (!res.success) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: res.error || t('account.cotisation.toastSessionError'),
      color: 'red',
    })
  }
  // La redirection vers Stripe se fait automatiquement dans le store
}

// Gérer le paiement par virement
const handleBankTransfer = async () => {
  const res = await billingStore.createOrReuseIntent(pack.value)
  if (!res.success) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: res.error || t('account.cotisation.toastBankError'),
      color: 'red',
    })
    return
  }
  toast.add({
    title: t('account.cotisation.toastRefOkTitle'),
    description: t('account.cotisation.toastRefOkDesc'),
    color: 'success',
  })
}

// Upgrade vers Premium
const handleUpgradeToPremium = async () => {
  pack.value = 'umete'
  // Lancer directement le processus de paiement pour Umete
  await handleCardPayment()
}

// Gérer la vérification legacy
const handleLegacyVerification = async () => {
  if (!selectedPaidWith.value) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: t('account.cotisation.toastSelectPaidWith'),
      color: 'red',
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
      color: 'red',
    })
  }
}

// Vérifier les paramètres de l'URL après retour de Stripe
const route = useRoute()
const router = useRouter()

onMounted(async () => {
  await billingStore.fetchMyBankTransfer()
  await billingStore.fetchMyLegacyVerification()
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
          color: 'red',
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
      color: 'amber',
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

    <!-- Card Vérification en cours -->
    <UCard
      v-if="hasPendingLegacyVerification"
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

        <div v-if="billingStore.legacyVerification" class="rounded-lg border border-white/10 bg-black/20 p-4">
          <div class="text-sm text-white/60 mb-1">{{ t('account.cotisation.paidWith') }}</div>
          <div class="text-lg font-semibold text-white">
            {{ billingStore.legacyVerification.paidWith === 'naho' ? 'Naho' : 'Tamiga' }}
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

          <!-- Bouton Upgrade to Premium si seulement membre -->
          <div v-if="isOnlyMember" class="pt-4 border-t border-green-500/20">
            <UButton
              color="primary"
              size="lg"
              block
              @click="handleUpgradeToPremium"
            >
              <UIcon name="i-heroicons-arrow-up" class="h-5 w-5 mr-2" />
              Passer à Premium
            </UButton>
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
                    <div class="text-xs text-white/60 mt-1">{{ t('account.cotisation.perYear') }}</div>
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

          <!-- Bouton Payer par carte (hors accordéon) -->
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
                    color="purple"
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

          <!-- Accordéon Je ne peux pas payer par carte -->
          <div class="pt-4 border-t border-white/10">
            <div
              class="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-white/5 to-white/[0.02] transition-all duration-500"
              :class="{
                'ring-2 ring-orange-500/50 shadow-2xl shadow-orange-500/20': openAccordion === 'bank',
              }"
            >
              <button
                class="flex w-full items-center justify-between p-6 text-left transition-all hover:bg-white/5"
                @click="toggleAccordion('bank')"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20 transition-all"
                    :class="{
                      'bg-orange-500/30 scale-110': openAccordion === 'bank',
                    }"
                  >
                    <UIcon
                      name="i-heroicons-banknotes"
                      class="h-6 w-6 text-orange-400 transition-all"
                      :class="{
                        'text-orange-300 scale-110': openAccordion === 'bank',
                      }"
                    />
                  </div>
                  <h3
                    class="text-xl font-bold text-white transition-all sm:text-2xl"
                    :class="{
                      'text-orange-400': openAccordion === 'bank',
                    }"
                  >
                    {{ t('account.cotisation.accordionBank') }}
                  </h3>
                </div>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="h-6 w-6 text-white/60 transition-all duration-300"
                  :class="{
                    'rotate-180 text-orange-400': openAccordion === 'bank',
                  }"
                />
              </button>

              <!-- Contenu accordéon virement -->
              <div
                class="overflow-hidden transition-all duration-500"
                :class="{
                  'max-h-0': openAccordion !== 'bank',
                  'max-h-[1000px]': openAccordion === 'bank',
                }"
              >
                <div class="border-t border-white/10 p-6 space-y-6">
                  <!-- Vidéo YouTube -->
                  <div v-if="youtubeVideoUrl && getYouTubeEmbedUrl(youtubeVideoUrl)" class="space-y-2">
                    <h4 class="text-lg font-semibold text-white">{{ t('account.cotisation.videoTitle') }}</h4>
                    <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                      <iframe
                        :src="getYouTubeEmbedUrl(youtubeVideoUrl)!"
                        class="h-full w-full"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                      />
                    </div>
                  </div>

                  <!-- Bouton virement bancaire -->
                  <div class="space-y-4">
                    <p class="text-white/80">
                      {{ t('account.cotisation.bankIntro') }}
                    </p>
                    <UButton
                      color="orange"
                      size="lg"
                      block
                      :loading="billingStore.isLoading"
                      @click="handleBankTransfer"
                    >
                      {{ t('account.cotisation.payBank') }}
                    </UButton>

                    <!-- Affichage de la référence si disponible -->
                    <div
                      v-if="billingStore.payment && billingStore.payment.referenceId"
                      class="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3"
                    >
                      <div class="text-sm text-white/60">
                        {{ t('account.cotisation.refForTransfer') }}
                      </div>
                      <div class="flex items-center gap-3">
                        <div class="flex-1 font-mono text-sm break-all text-white">
                          {{ billingStore.payment.referenceId }}
                        </div>
                        <UButton
                          size="xs"
                          color="primary"
                          variant="outline"
                          @click="copyBankReference"
                        >
                          {{ t('account.paiement.copy') }}
                        </UButton>
                      </div>
                      <UBadge
                        v-if="billingStore.payment.status === 'paid'"
                        color="green"
                        variant="subtle"
                      >
                        {{ t('account.cotisation.badgePaid') }}
                      </UBadge>
                      <UBadge
                        v-else-if="billingStore.payment.status === 'pending'"
                        color="amber"
                        variant="subtle"
                      >
                        {{ t('account.cotisation.badgePendingTransfer') }}
                      </UBadge>
                    </div>
                  </div>
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
  </div>
</template>
