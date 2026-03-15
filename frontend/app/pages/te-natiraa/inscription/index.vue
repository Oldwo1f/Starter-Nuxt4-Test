<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useMemberCheck } from '~/composables/useMemberCheck'

definePageMeta({
  layout: 'default',
  middleware: 'te-natiraa-redirect',
  meta: {
    title: 'Inscription Te Natira\'a',
  },
})

const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
const { canCreateListing } = useMemberCheck()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const isMember = computed(() => canCreateListing.value)

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  adultCount: 1,
  childCount: 0,
})

const isLoading = ref(false)
const errors = ref<Record<string, string>>({})

// Pré-remplir si connecté
watch(
  () => authStore.user,
  (user) => {
    if (user) {
      form.value.firstName = user.firstName || ''
      form.value.lastName = user.lastName || ''
      form.value.email = user.email || ''
    }
  },
  { immediate: true },
)

const memberPrice = { preVente: 1000, pleinTarif: 1500 }
const publicPrice = { preVente: 1500, pleinTarif: 2000 }

const displayedPrice = computed(() =>
  isMember.value ? memberPrice : publicPrice,
)

const validate = () => {
  errors.value = {}
  if (!form.value.firstName?.trim()) {
    errors.value.firstName = 'Le nom est requis'
  }
  if (!form.value.lastName?.trim()) {
    errors.value.lastName = 'Le prénom est requis'
  }
  if (!form.value.email?.trim()) {
    errors.value.email = "L'email est requis"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = "L'email n'est pas valide"
  }
  if (form.value.adultCount < 0) {
    errors.value.adultCount = 'Le nombre d\'adultes doit être positif'
  }
  if (form.value.childCount < 0) {
    errors.value.childCount = 'Le nombre d\'enfants doit être positif'
  }
  if (form.value.adultCount === 0 && form.value.childCount === 0) {
    errors.value.adultCount = 'Indiquez au moins un adulte ou un enfant'
  }
  return Object.keys(errors.value).length === 0
}

const submit = async () => {
  if (!validate()) return

  isLoading.value = true
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authStore.accessToken) {
      headers.Authorization = `Bearer ${authStore.accessToken}`
    }

    const response = await $fetch<{ sessionId: string; url: string }>(
      `${API_BASE_URL}/te-natiraa/create-checkout-session`,
      {
        method: 'POST',
        headers,
        body: {
          firstName: form.value.firstName.trim(),
          lastName: form.value.lastName.trim(),
          email: form.value.email.trim(),
          adultCount: form.value.adultCount,
          childCount: form.value.childCount,
        },
      },
    )

    if (response.url) {
      window.location.href = response.url
    } else {
      toast.add({
        title: 'Erreur',
        description: 'Impossible de créer la session de paiement',
        color: 'red',
      })
    }
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description:
        err.data?.message ||
        err.message ||
        'Une erreur est survenue lors de l\'inscription',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}

const nextEvent = ref<{ id: number; eventDate: string; eventTime: string; location: string } | null>(null)
const isCheckingEvent = ref(true)

onMounted(async () => {
  authStore.fetchProfile().catch(() => {})
  try {
    nextEvent.value = await $fetch(`${API_BASE_URL}/te-natiraa/next-event`)
    if (!nextEvent.value) {
      toast.add({
        title: 'Inscriptions fermées',
        description: 'Aucun Te Natira\'a à venir pour le moment.',
        color: 'amber',
      })
      await navigateTo('/te-natiraa')
      return
    }
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les informations.',
      color: 'red',
    })
    await navigateTo('/te-natiraa')
    return
  }
  isCheckingEvent.value = false
  if (route.query.canceled === 'true') {
    toast.add({
      title: 'Paiement annulé',
      description: 'Vous pouvez réessayer quand vous le souhaitez.',
      color: 'amber',
    })
    router.replace({ query: {} })
  }
})

const formatEventDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-black">
    <div class="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <NuxtLink
        to="/te-natiraa"
        class="mb-8 inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
      >
        <UIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
        Retour au Te Natira'a
      </NuxtLink>

      <div v-if="isCheckingEvent" class="flex justify-center py-24">
        <UIcon name="i-heroicons-arrow-path" class="h-12 w-12 animate-spin text-primary-400" />
      </div>

      <div
        v-else-if="nextEvent"
        class="rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-900/40 to-primary-800/30 p-8"
      >
        <h1 class="mb-2 text-3xl font-bold text-white">
          Inscription au Te Natira'a
        </h1>
        <p class="mb-8 text-white/70">
          {{ formatEventDate(nextEvent.eventDate) }} à {{ nextEvent.eventTime }} - {{ nextEvent.location }}
        </p>

        <!-- Message tarif membre si non connecté -->
        <div
          v-if="!authStore.isAuthenticated"
          class="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
        >
          <p class="text-amber-200">
            Connectez-vous avec votre compte membre pour profiter du tarif membre.
          </p>
          <NuxtLink
            :to="`/login?returnUrl=${encodeURIComponent('/te-natiraa/inscription')}`"
            class="mt-2 inline-block font-semibold text-amber-300 underline"
          >
            Se connecter
          </NuxtLink>
        </div>

        <!-- Tarifs affichés -->
        <div class="mb-8 rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 class="mb-2 font-semibold text-white">Tarifs</h3>
          <p v-if="isMember" class="text-primary-300">
            Tarif membre : {{ displayedPrice.preVente.toLocaleString('fr-FR') }} XPF 
          </p>
          <p v-else class="text-white/80">
            Tarif public : {{ displayedPrice.preVente.toLocaleString('fr-FR') }} XPF
          </p>
          <p class="mt-2 text-sm text-white/60">
            Gratuit pour les enfants et les jeunes de moins de 18 ans. <br> Gratuit pour les étudiants (sur présentation de la carte étudiant).
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="submit">
          <div class="grid gap-6 sm:grid-cols-2">
            <UFormField label="Nom" :error="errors.lastName">
              <UInput
                v-model="form.lastName"
                placeholder="Votre nom"
                size="lg"
                :disabled="isLoading"
                class="bg-white/5"
              />
            </UFormField>
            <UFormField label="Prénom" :error="errors.firstName">
              <UInput
                v-model="form.firstName"
                placeholder="Votre prénom"
                size="lg"
                :disabled="isLoading"
                class="bg-white/5"
              />
            </UFormField>
          </div>

          <UFormField label="Email" :error="errors.email">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="votre@email.com"
              size="lg"
              :disabled="isLoading"
              class="bg-white/5"
            />
          </UFormField>

          <div class="grid gap-6 sm:grid-cols-2">
            <UFormField label="Nombre d'adultes" :error="errors.adultCount">
              <UInput
                v-model.number="form.adultCount"
                type="number"
                min="0"
                size="lg"
                :disabled="isLoading"
                class="bg-white/5"
              />
            </UFormField>
            <UFormField label="Nombre d'enfants/étudiants" :error="errors.childCount">
              <UInput
                v-model.number="form.childCount"
                type="number"
                min="0"
                size="lg"
                :disabled="isLoading"
                class="bg-white/5"
              />
            </UFormField>
          </div>

          <UButton
            type="submit"
            size="xl"
            color="primary"
            block
            :loading="isLoading"
            icon="i-heroicons-credit-card"
          >
            Procéder au paiement
          </UButton>

          <p class="text-center text-sm text-white/60">
            Paiement sécurisé par carte bancaire via Stripe
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
