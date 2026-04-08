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
const confirmPassword = ref('')
const phoneNumber = ref('')
const referralCode = ref('')
const isLoading = ref(false)
// const isFacebookLoading = ref(false)
const error = ref('')
const success = ref('')

// Récupérer le code de parrainage depuis l'URL
onMounted(() => {
  const refParam = route.query.ref as string
  if (refParam) {
    referralCode.value = refParam.toUpperCase()
  }
})

const handleRegister = async () => {
  error.value = ''
  success.value = ''

  if (!email.value || !password.value || !confirmPassword.value || !phoneNumber.value?.trim()) {
    error.value = t('auth.register.fillAll')
    return
  }

  if (password.value.length < 6) {
    error.value = t('auth.register.passwordShort')
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = t('auth.register.passwordMismatch')
    return
  }

  isLoading.value = true
  const result = await authStore.register(
    email.value,
    password.value,
    phoneNumber.value.trim(),
    referralCode.value || undefined
  )
  isLoading.value = false

  if (result.success) {
    success.value = t('auth.register.success')
    setTimeout(() => {
      router.push('/account/profile')
    }, 1000)
  } else {
    error.value = result.error || t('auth.register.errorGeneric')
  }
}

// const handleFacebookLogin = async () => {
//   error.value = ''
//   success.value = ''
//   isFacebookLoading.value = true
//
//   try {
//     const { initFacebook, login: facebookLogin, isMobile, redirectToFacebookLogin } = useFacebook()
//
//     // Sur mobile, les popups sont souvent bloquées → utiliser le flux redirect
//     if (isMobile()) {
//       redirectToFacebookLogin('/', 'register')
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
//       success.value = t('auth.register.facebookSuccess')
//       setTimeout(() => {
//         router.push('/account/profile')
//       }, 1000)
//     } else {
//       error.value = result.error || t('auth.register.facebookError')
//     }
//   } catch (err: any) {
//     error.value = err.message || t('auth.register.facebookError')
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
            <UIcon name="i-heroicons-user-plus" />
            <span class="font-medium text-lg">{{ t('auth.register.title') }}</span>
          </div>
        </template>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div v-if="error" class="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <div v-if="success" class="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <p class="text-sm text-green-400">{{ success }}</p>
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

          <UFormGroup :label="t('auth.register.phone')" name="phoneNumber" required>
            <UInput
              v-model="phoneNumber"
              type="tel"
              :placeholder="t('auth.register.phonePlaceholder')"
              icon="i-heroicons-phone"
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
            <template #hint>
              <span class="text-xs text-white/50">{{ t('auth.register.passwordHint') }}</span>
            </template>
          </UFormGroup>

          <UFormGroup :label="t('auth.register.confirmPassword')" name="confirmPassword" required>
            <UInput
              v-model="confirmPassword"
              type="password"
              placeholder="••••••••"
              icon="i-heroicons-lock-closed"
              :disabled="isLoading"
              size="lg"
            />
          </UFormGroup>

          <UFormGroup :label="t('auth.register.referralOptional')" name="referralCode">
            <UInput
              v-model="referralCode"
              type="text"
              placeholder="ABC12345"
              icon="i-heroicons-gift"
              :disabled="isLoading"
              size="lg"
              class="font-mono uppercase"
              @input="referralCode = referralCode.toUpperCase()"
            />
            <template #hint>
              <span class="text-xs text-white/50">{{ t('auth.register.referralHint') }}</span>
            </template>
          </UFormGroup>

          <UButton
            type="submit"
            color="primary"
            block
            size="lg"
            :loading="isLoading"
            :disabled="isLoading"
          >
            {{ t('auth.register.submit') }}
          </UButton>
        </form>

        <!--
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/10"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-900 text-white/60">{{ t('auth.register.or') }}</span>
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
            {{ t('auth.register.facebook') }}
          </UButton>
        </div>
        -->

        <div class="mt-6 text-center">
          <p class="text-sm text-white/60">
            {{ t('auth.register.hasAccount') }}
            <NuxtLink
              to="/login"
              class="text-primary-400 hover:text-primary-300 font-medium"
            >
              {{ t('auth.register.loginLink') }}
            </NuxtLink>
          </p>
        </div>
    </UCard>
  </div>
</template>
