<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref('')

const handleRegister = async () => {
  error.value = ''
  success.value = ''

  if (!email.value || !password.value || !confirmPassword.value) {
    error.value = 'Veuillez remplir tous les champs'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Le mot de passe doit contenir au moins 6 caractères'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }

  isLoading.value = true
  const result = await authStore.register(email.value, password.value)
  isLoading.value = false

  if (result.success) {
    success.value = 'Inscription réussie ! Redirection...'
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } else {
    error.value = result.error || 'Erreur lors de l\'inscription'
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-10">
    <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user-plus" />
            <span class="font-medium text-lg">Inscription</span>
          </div>
        </template>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div v-if="error" class="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <div v-if="success" class="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <p class="text-sm text-green-400">{{ success }}</p>
          </div>

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

          <UFormGroup label="Mot de passe" name="password" required>
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              :disabled="isLoading"
              size="lg"
            />
            <template #hint>
              <span class="text-xs text-white/50">Minimum 6 caractères</span>
            </template>
          </UFormGroup>

          <UFormGroup label="Confirmer le mot de passe" name="confirmPassword" required>
            <UInput
              v-model="confirmPassword"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
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
            S'inscrire
          </UButton>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-white/60">
            Déjà un compte ?
            <NuxtLink
              to="/login"
              class="text-primary-400 hover:text-primary-300 font-medium"
            >
              Se connecter
            </NuxtLink>
          </p>
        </div>
    </UCard>
  </div>
</template>
