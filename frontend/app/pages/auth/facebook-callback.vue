<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

/**
 * Page de callback pour le flux OAuth redirect Facebook.
 * Sur mobile, les popups sont bloquées, donc on redirige vers Facebook
 * et Facebook nous renvoie ici avec le token dans le hash.
 */
const authStore = useAuthStore()
const router = useRouter()
const error = ref('')
const isLoading = ref(true)

onMounted(async () => {
  const { parseFacebookCallbackFromHash, fetchUserInfoWithToken } = useFacebook()

  try {
    const parsed = parseFacebookCallbackFromHash()
    if (!parsed) {
      error.value = 'Aucun token Facebook reçu. Veuillez réessayer.'
      isLoading.value = false
      return
    }

    const { accessToken, state } = parsed
    const returnTo = state?.returnTo && state.returnTo.startsWith('/') ? state.returnTo : '/'

    const userInfo = await fetchUserInfoWithToken(accessToken)
    const emailToUse = userInfo.email || `fb_${userInfo.userID}@facebook.temp`

    const result = await authStore.facebookLogin(
      userInfo.userID,
      emailToUse,
      accessToken
    )

    if (result.success) {
      router.replace(returnTo)
    } else {
      error.value = result.error || 'Erreur lors de la connexion Facebook'
    }
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la connexion Facebook'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-10">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-simple-icons-facebook" />
          <span class="font-medium text-lg">Connexion Facebook</span>
        </div>
      </template>

      <div v-if="isLoading" class="flex flex-col items-center gap-4 py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-400 animate-spin" />
        <p class="text-white/70">Connexion en cours...</p>
      </div>

      <div v-else-if="error" class="space-y-4">
        <div class="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <p class="text-sm text-red-400">{{ error }}</p>
        </div>
        <UButton
          to="/login"
          color="primary"
          block
        >
          Retour à la connexion
        </UButton>
      </div>
    </UCard>
  </div>
</template>
