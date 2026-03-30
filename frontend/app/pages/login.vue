<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useAuthStore } from '~/stores/useAuthStore'
// import { useFacebook } from '~/composables/useFacebook'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
// const isFacebookLoading = ref(false)
const error = ref('')

// Récupérer l'URL de retour depuis les query params
const getReturnUrl = () => {
  const returnUrl = route.query.returnUrl as string | undefined
  return returnUrl && returnUrl.startsWith('/') ? returnUrl : '/'
}

const handleLogin = async () => {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = t('auth.login.fillAll')
    return
  }

  isLoading.value = true
  const result = await authStore.login(email.value, password.value)
  isLoading.value = false

  if (result.success) {
    router.push(getReturnUrl())
  } else {
    error.value = result.error || t('auth.login.errorGeneric')
  }
}

// const handleFacebookLogin = async () => {
//   error.value = ''
//   isFacebookLoading.value = true
//
//   try {
//     const { initFacebook, login: facebookLogin, isMobile, redirectToFacebookLogin } = useFacebook()
//
//     // Sur mobile, les popups sont souvent bloquées → utiliser le flux redirect
//     if (isMobile()) {
//       redirectToFacebookLogin(getReturnUrl(), 'login')
//       return // La page va se recharger pour la redirection
//     }
//
//     // Desktop : flux popup classique
//     await initFacebook()
//     const fbResponse = await facebookLogin()
//     const emailToUse = fbResponse.email || `fb_${fbResponse.userID}@facebook.temp`
//
//     const result = await authStore.facebookLogin(
//       fbResponse.userID,
//       emailToUse,
//       fbResponse.accessToken
//     )
//
//     if (result.success) {
//       router.push(getReturnUrl())
//     } else {
//       error.value = result.error || t('auth.login.facebookError')
//     }
//   } catch (err: any) {
//     error.value = err.message || t('auth.login.facebookError')
//   } finally {
//     isFacebookLoading.value = false
//   }
// }
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-10">
    <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-lock-closed" />
            <span class="font-medium text-lg">{{ t('auth.login.title') }}</span>
          </div>
        </template>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div v-if="error" class="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <UFormGroup :label="t('auth.login.email')" name="email" required>
            <UInput
              v-model="email"
              type="email"
              :placeholder="t('auth.login.emailPlaceholder')"
              icon="i-heroicons-envelope"
              :disabled="isLoading"
              size="lg"
            />
          </UFormGroup>

          <UFormGroup :label="t('auth.login.password')" name="password" required>
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              :disabled="isLoading"
              size="lg"
            />
          </UFormGroup>

          <div class="flex items-center justify-between">
            <NuxtLink
              to="/forgot-password"
              class="text-sm text-primary-400 hover:text-primary-300"
            >
              {{ t('auth.login.forgot') }}
            </NuxtLink>
          </div>

          <UButton
            type="submit"
            color="primary"
            block
            size="lg"
            :loading="isLoading"
            :disabled="isLoading"
          >
            {{ t('auth.login.submit') }}
          </UButton>
        </form>

        <!--
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/10"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-900 text-white/60">{{ t('auth.login.or') }}</span>
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
            {{ t('auth.login.facebook') }}
          </UButton>
        </div>
        -->

        <div class="mt-6 text-center">
          <p class="text-sm text-white/60">
            {{ t('auth.login.noAccount') }}
            <NuxtLink
              to="/register"
              class="text-primary-400 hover:text-primary-300 font-medium"
            >
              {{ t('auth.login.registerLink') }}
            </NuxtLink>
          </p>
        </div>
    </UCard>
  </div>
</template>
