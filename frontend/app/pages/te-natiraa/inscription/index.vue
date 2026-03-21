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
const { t } = useI18n()
const { dateLocale } = useLocaleDate()
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
  if (!form.value.lastName?.trim()) {
    errors.value.lastName = t('teNatiraaRegister.errLastName')
  }
  if (!form.value.firstName?.trim()) {
    errors.value.firstName = t('teNatiraaRegister.errFirstName')
  }
  if (!form.value.email?.trim()) {
    errors.value.email = t('teNatiraaRegister.errEmailRequired')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = t('teNatiraaRegister.errEmailInvalid')
  }
  if (form.value.adultCount < 0) {
    errors.value.adultCount = t('teNatiraaRegister.errAdults')
  }
  if (form.value.childCount < 0) {
    errors.value.childCount = t('teNatiraaRegister.errChildren')
  }
  if (form.value.adultCount === 0 && form.value.childCount === 0) {
    errors.value.adultCount = t('teNatiraaRegister.errAtLeastOne')
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
        title: t('pollUi.errorTitle'),
        description: t('teNatiraaRegister.toastSessionError'),
        color: 'red',
      })
    }
  } catch (err: any) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description:
        err.data?.message ||
        err.message ||
        t('teNatiraaRegister.toastSubmitError'),
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
        title: t('teNatiraaRegister.toastClosedTitle'),
        description: t('teNatiraaRegister.toastClosedDesc'),
        color: 'amber',
      })
      await navigateTo('/te-natiraa')
      return
    }
  } catch {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: t('teNatiraaRegister.toastLoadError'),
      color: 'red',
    })
    await navigateTo('/te-natiraa')
    return
  }
  isCheckingEvent.value = false
  if (route.query.canceled === 'true') {
    toast.add({
      title: t('teNatiraaRegister.toastCanceledTitle'),
      description: t('teNatiraaRegister.toastCanceledDesc'),
      color: 'amber',
    })
    router.replace({ query: {} })
  }
})

const formatEventDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString(dateLocale.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
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
        {{ t('teNatiraaRegister.back') }}
      </NuxtLink>

      <div v-if="isCheckingEvent" class="flex justify-center py-24">
        <UIcon name="i-heroicons-arrow-path" class="h-12 w-12 animate-spin text-primary-400" />
      </div>

      <div
        v-else-if="nextEvent"
        class="rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-900/40 to-primary-800/30 p-8"
      >
        <h1 class="mb-2 text-3xl font-bold text-white">
          {{ t('teNatiraaRegister.title') }}
        </h1>
        <p class="mb-8 text-white/70">
          {{ t('teNatiraa.eventSummary', { date: formatEventDate(nextEvent.eventDate), time: nextEvent.eventTime, place: nextEvent.location }) }}
        </p>

        <!-- Message tarif membre si non connecté -->
        <div
          v-if="!authStore.isAuthenticated"
          class="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
        >
          <p class="text-amber-200">
            {{ t('teNatiraaRegister.memberHint') }}
          </p>
          <NuxtLink
            :to="`/login?returnUrl=${encodeURIComponent('/te-natiraa/inscription')}`"
            class="mt-2 inline-block font-semibold text-amber-300 underline"
          >
            {{ t('teNatiraaRegister.login') }}
          </NuxtLink>
        </div>

        <!-- Tarifs affichés -->
        <div class="mb-8 rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 class="mb-2 font-semibold text-white">{{ t('teNatiraaRegister.pricesTitle') }}</h3>
          <p v-if="isMember" class="text-primary-300">
            {{ t('teNatiraaRegister.priceMember') }} {{ displayedPrice.preVente.toLocaleString('fr-FR') }} XPF 
          </p>
          <p v-else class="text-white/80">
            {{ t('teNatiraaRegister.pricePublic') }} {{ displayedPrice.preVente.toLocaleString('fr-FR') }} XPF
          </p>
          <p class="mt-2 text-sm text-white/60">
            {{ t('teNatiraaRegister.freeNote') }}
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="submit">
          <div class="grid gap-6 sm:grid-cols-2">
            <UFormField :label="t('teNatiraaRegister.labelLastName')" :error="errors.lastName">
              <UInput
                v-model="form.lastName"
                :placeholder="t('teNatiraaRegister.placeholderLastName')"
                size="lg"
                :disabled="isLoading"
                class="bg-white/5"
              />
            </UFormField>
            <UFormField :label="t('teNatiraaRegister.labelFirstName')" :error="errors.firstName">
              <UInput
                v-model="form.firstName"
                :placeholder="t('teNatiraaRegister.placeholderFirstName')"
                size="lg"
                :disabled="isLoading"
                class="bg-white/5"
              />
            </UFormField>
          </div>

          <UFormField :label="t('teNatiraaRegister.labelEmail')" :error="errors.email">
            <UInput
              v-model="form.email"
              type="email"
              :placeholder="t('teNatiraaRegister.placeholderEmail')"
              size="lg"
              :disabled="isLoading"
              class="bg-white/5"
            />
          </UFormField>

          <div class="grid gap-6 sm:grid-cols-2">
            <UFormField :label="t('teNatiraaRegister.labelAdults')" :error="errors.adultCount">
              <UInput
                v-model.number="form.adultCount"
                type="number"
                min="0"
                size="lg"
                :disabled="isLoading"
                class="bg-white/5"
              />
            </UFormField>
            <UFormField :label="t('teNatiraaRegister.labelChildren')" :error="errors.childCount">
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
            {{ t('teNatiraaRegister.pay') }}
          </UButton>

          <p class="text-center text-sm text-white/60">
            {{ t('teNatiraaRegister.stripeNote') }}
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
