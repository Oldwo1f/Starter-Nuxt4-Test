<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref('')

const handleForgotPassword = async () => {
  error.value = ''
  success.value = ''

  if (!email.value) {
    error.value = 'Veuillez entrer votre adresse email'
    return
  }

  isLoading.value = true
  const result = await authStore.forgotPassword(email.value)
  isLoading.value = false

  if (result.success) {
    success.value = result.message || 'Si un compte avec cet email existe, un lien de réinitialisation a été envoyé.'
  } else {
    error.value = result.error || 'Erreur lors de la demande de réinitialisation'
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-10">
    <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-key" />
            <span class="font-medium text-lg">Mot de passe oublié</span>
          </div>
        </template>

        <form @submit.prevent="handleForgotPassword" class="space-y-4">
          <div v-if="error" class="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <div v-if="success" class="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <p class="text-sm text-green-400">{{ success }}</p>
          </div>

          <p class="text-sm text-white/70">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>

          <UFormGroup label="Email" name="email" required>
            <UInput
              v-model="email"
              type="email"
              placeholder="votre@email.com"
              icon="i-heroicons-envelope"
              :disabled="isLoading"
              size="lg"
            />
          </UFormGroup>

          <UButton
            type="submit"
            color="primary"
            block
            size="lg"
            :loading="isLoading"
            :disabled="isLoading"
          >
            Envoyer le lien de réinitialisation
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
