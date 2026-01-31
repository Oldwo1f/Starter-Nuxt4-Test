<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const token = ref(route.query.token as string || '')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref('')

onMounted(() => {
  if (!token.value) {
    error.value = 'Token de réinitialisation manquant'
  }
})

const handleResetPassword = async () => {
  error.value = ''
  success.value = ''

  if (!token.value) {
    error.value = 'Token de réinitialisation manquant'
    return
  }

  if (!newPassword.value || !confirmPassword.value) {
    error.value = 'Veuillez remplir tous les champs'
    return
  }

  if (newPassword.value.length < 6) {
    error.value = 'Le mot de passe doit contenir au moins 6 caractères'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }

  isLoading.value = true
  const result = await authStore.resetPassword(token.value, newPassword.value)
  isLoading.value = false

  if (result.success) {
    success.value = result.message || 'Mot de passe réinitialisé avec succès !'
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } else {
    error.value = result.error || 'Erreur lors de la réinitialisation'
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-10">
    <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-key" />
            <span class="font-medium text-lg">Réinitialiser le mot de passe</span>
          </div>
        </template>

        <form @submit.prevent="handleResetPassword" class="space-y-4">
          <div v-if="error" class="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <div v-if="success" class="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <p class="text-sm text-green-400">{{ success }}</p>
          </div>

          <p class="text-sm text-white/70">
            Entrez votre nouveau mot de passe ci-dessous.
          </p>

          <UFormGroup label="Nouveau mot de passe" name="newPassword" required>
            <UInput
              v-model="newPassword"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              :disabled="isLoading || !token"
              size="lg"
            />
            <template #hint>
              <span class="text-xs text-white/50">Minimum 6 caractères</span>
            </template>
          </UFormGroup>

          <UFormGroup label="Confirmer le nouveau mot de passe" name="confirmPassword" required>
            <UInput
              v-model="confirmPassword"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              :disabled="isLoading || !token"
              size="lg"
            />
          </UFormGroup>

          <UButton
            type="submit"
            color="primary"
            block
            size="lg"
            :loading="isLoading"
            :disabled="isLoading || !token"
          >
            Réinitialiser le mot de passe
          </UButton>
        </form>

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
