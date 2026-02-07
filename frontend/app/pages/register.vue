<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useAuthStore } from '~/stores/useAuthStore'
import { useFacebook } from '~/composables/useFacebook'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const isFacebookLoading = ref(false)
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

const handleFacebookLogin = async () => {
  error.value = ''
  success.value = ''
  isFacebookLoading.value = true

  try {
    // Get Facebook composable (only on client side)
    const { initFacebook, login: facebookLogin } = useFacebook()
    
    // Initialize Facebook SDK if needed
    await initFacebook()
    
    // Login with Facebook
    const fbResponse = await facebookLogin()
    
    // Use email if available, otherwise use Facebook ID (backend will generate temp email)
    const emailToUse = fbResponse.email || `fb_${fbResponse.userID}@facebook.temp`

    // Call backend (will create account if new, or login if exists)
    const result = await authStore.facebookLogin(
      fbResponse.userID,
      emailToUse,
      fbResponse.accessToken
    )

    if (result.success) {
      success.value = 'Connexion réussie ! Redirection...'
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      error.value = result.error || 'Erreur lors de la connexion Facebook'
    }
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la connexion Facebook'
  } finally {
    isFacebookLoading.value = false
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
            :disabled="isLoading || isFacebookLoading"
          >
            S'inscrire
          </UButton>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/10"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-900 text-white/60">Ou</span>
            </div>
          </div>

          <UButton
            color="neutral"
            variant="outline"
            block
            size="lg"
            class="mt-6"
            :loading="isFacebookLoading"
            :disabled="isLoading || isFacebookLoading"
            @click="handleFacebookLogin"
          >
            <UIcon name="i-simple-icons-facebook" class="w-5 h-5 mr-2" />
            Continuer avec Facebook
          </UButton>
        </div>

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
