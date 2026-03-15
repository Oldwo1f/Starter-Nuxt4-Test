<script setup lang="ts">
definePageMeta({
  layout: 'default',
  meta: {
    title: 'Inscription confirmée - Te Natira\'a',
  },
})

const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const route = useRoute()
const router = useRouter()
const toast = useToast()

const sessionId = computed(() => route.query.session_id as string | undefined)
const isProcessing = ref(false)
const isProcessed = ref(false)
const error = ref<string | null>(null)

const processPayment = async () => {
  const sid = sessionId.value
  if (!sid || isProcessing.value) return

  isProcessing.value = true
  error.value = null
  try {
    await $fetch(`${API_BASE_URL}/te-natiraa/process-pending/${encodeURIComponent(sid)}`, {
      method: 'POST',
    })
    isProcessed.value = true
    toast.add({
      title: 'Inscription confirmée',
      description: 'Votre billet vous a été envoyé par email.',
      color: 'success',
    })
    router.replace({ path: route.path, query: {} })
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Erreur lors du traitement'
    toast.add({
      title: 'Erreur',
      description: error.value,
      color: 'red',
    })
  } finally {
    isProcessing.value = false
  }
}

onMounted(() => {
  if (sessionId.value) {
    processPayment()
  }
})
</script>

<template>
  <div class="min-h-screen bg-black">
    <div class="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-900/40 to-primary-900/30 p-8 text-center">
        <div v-if="isProcessing" class="mb-6 flex justify-center">
          <UIcon name="i-heroicons-arrow-path" class="h-16 w-16 animate-spin text-green-400" />
        </div>
        <div v-else class="mb-6 flex justify-center">
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
            <UIcon name="i-heroicons-check" class="h-10 w-10 text-green-400" />
          </div>
        </div>
        <h1 class="mb-4 text-3xl font-bold text-white">
          {{ isProcessing ? 'Traitement en cours...' : 'Inscription confirmée' }}
        </h1>
        <p v-if="isProcessing" class="mb-8 text-lg text-white/80">
          Nous enregistrons votre inscription et préparons votre billet...
        </p>
        <p v-else class="mb-8 text-lg text-white/80">
          Votre inscription au Te Natira'a est confirmée. Votre billet vous a été envoyé par email.
        </p>
        <p v-if="error" class="mb-4 text-red-400">
          {{ error }}
        </p>
        <p class="mb-8 text-sm text-white/60">
          Un seul billet sera envoyé pour toutes les personnes inscrites. Présentez-le à l'entrée le jour de l'événement.
        </p>
        <div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <UButton to="/te-natiraa" color="primary" size="lg" :disabled="isProcessing">
            Retour au Te Natira'a
          </UButton>
          <UButton to="/" variant="outline" size="lg" :disabled="isProcessing">
            Retour à l'accueil
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
