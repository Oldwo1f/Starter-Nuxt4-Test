<script setup lang="ts">
definePageMeta({
  layout: 'default',
  meta: {
    title: 'Inscription confirmée - Te Natira\'a',
  },
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const sessionId = computed(() => route.query.session_id as string | undefined)

// Traitement côté SERVEUR au chargement de la page (plus fiable que client)
const { data: processResult, error: processError, pending: processPending } = await useFetch(
  () => `/api/te-natiraa/process-pending/${encodeURIComponent(sessionId.value!)}`,
  {
    method: 'POST',
    server: true,
    immediate: !!sessionId.value,
    watch: false,
  },
)

const isProcessed = computed(() => !!processResult.value)
const isProcessingServer = computed(() => !!sessionId.value && processPending.value)
const error = computed(() => {
  if (processError.value) {
    const err = processError.value as any
    return err.data?.message || err.message || t('teNatiraaSuccess.processErrorFallback')
  }
  return null
})

// Fallback client si le traitement serveur n'a pas eu lieu (ex: navigation client)
const isProcessing = ref(false)
const processPayment = async () => {
  const sid = sessionId.value
  if (!sid || isProcessing.value) return

  isProcessing.value = true
  try {
    await $fetch(`/api/te-natiraa/process-pending/${encodeURIComponent(sid)}`, {
      method: 'POST',
    })
    toast.add({
      title: t('teNatiraaSuccess.toastOkTitle'),
      description: t('teNatiraaSuccess.toastOkDesc'),
      color: 'success',
    })
    router.replace({ path: route.path, query: {} })
  } catch (err: any) {
    toast.add({
      title: t('teNatiraaSuccess.toastErrTitle'),
      description: err.data?.message || err.message || t('teNatiraaSuccess.processErrorFallback'),
      color: 'red',
    })
  } finally {
    isProcessing.value = false
  }
}

onMounted(() => {
  if (sessionId.value && !processResult.value && !processError.value) {
    processPayment()
  } else if (isProcessed.value) {
    toast.add({
      title: t('teNatiraaSuccess.toastOkTitle'),
      description: t('teNatiraaSuccess.toastOkDesc'),
      color: 'success',
    })
  }
})

const hasNoSessionId = computed(() => !sessionId.value && !isProcessing.value && !error.value)
</script>

<template>
  <div class="min-h-screen bg-black">
    <div class="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-900/40 to-primary-900/30 p-8 text-center">
        <div v-if="isProcessing || isProcessingServer" class="mb-6 flex justify-center">
          <UIcon name="i-heroicons-arrow-path" class="h-16 w-16 animate-spin text-green-400" />
        </div>
        <div v-else class="mb-6 flex justify-center">
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
            <UIcon name="i-heroicons-check" class="h-10 w-10 text-green-400" />
          </div>
        </div>
        <h1 class="mb-4 text-3xl font-bold text-white">
          {{ (isProcessing || isProcessingServer) ? t('teNatiraaSuccess.processing') : hasNoSessionId ? t('teNatiraaSuccess.paidNoSession') : t('teNatiraaSuccess.confirmed') }}
        </h1>
        <p v-if="isProcessing || isProcessingServer" class="mb-8 text-lg text-white/80">
          {{ t('teNatiraaSuccess.processingDesc') }}
        </p>
        <p v-else-if="hasNoSessionId" class="mb-8 text-lg text-white/80">
          {{ t('teNatiraaSuccess.paidDesc') }}
        </p>
        <p v-else class="mb-8 text-lg text-white/80">
          {{ t('teNatiraaSuccess.confirmedDesc') }}
        </p>
        <p v-if="error" class="mb-4 text-red-400">
          {{ error }}
        </p>
        <p class="mb-8 text-sm text-white/60">
          {{ t('teNatiraaSuccess.ticketNote') }}
        </p>
        <div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <UButton
            v-if="error"
            color="amber"
            size="lg"
            icon="i-heroicons-arrow-path"
            @click="processPayment"
          >
            {{ t('teNatiraaSuccess.retry') }}
          </UButton>
          <UButton to="/te-natiraa" color="primary" size="lg" :disabled="isProcessing || isProcessingServer">
            {{ t('teNatiraaSuccess.backTeNatiraa') }}
          </UButton>
          <UButton to="/" variant="outline" size="lg" :disabled="isProcessing || isProcessingServer">
            {{ t('teNatiraaSuccess.backHome') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
