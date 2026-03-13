<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const token = ref((route.query.token as string) || '')
const isLoading = ref(false)
const error = ref('')
const success = ref('')

onMounted(async () => {
  if (!token.value) {
    error.value = 'Lien de vérification invalide ou expiré'
    return
  }

  isLoading.value = true
  const result = await authStore.verifyEmail(token.value)
  isLoading.value = false

  if (result.success) {
    success.value = result.message || 'Votre adresse email a été vérifiée avec succès.'
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } else {
    error.value = result.error || 'Ce lien de vérification est invalide ou a expiré.'
  }
})
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-10">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-envelope-check" />
          <span class="font-medium text-lg">Vérification de l'email</span>
        </div>
      </template>

      <div class="space-y-4">
        <div v-if="error" class="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <p class="text-sm text-red-400">{{ error }}</p>
        </div>

        <div v-if="success" class="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
          <p class="text-sm text-green-400">{{ success }}</p>
          <p class="text-xs text-white/50 mt-1">Redirection vers la page de connexion...</p>
        </div>

        <div v-if="isLoading" class="flex flex-col items-center gap-3 py-6">
          <UIcon name="i-heroicons-arrow-path" class="size-8 animate-spin text-primary-400" />
          <p class="text-sm text-white/70">Vérification en cours...</p>
        </div>

        <p v-else-if="!token" class="text-sm text-white/70">
          Le lien de vérification est manquant. Vérifiez que vous avez bien cliqué sur le lien complet reçu par email.
        </p>
      </div>

      <div class="mt-6 text-center">
        <NuxtLink
          to="/login"
          class="text-sm text-primary-400 hover:text-primary-300 font-medium"
        >
          ← Retour à la connexion
        </NuxtLink>
      </div>
    </UCard>
  </div>
</template>
