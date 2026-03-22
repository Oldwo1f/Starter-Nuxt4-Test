<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const toast = useToast()

const token = computed(() => {
  const q = route.query.t
  return typeof q === 'string' && q.trim() ? q.trim() : ''
})

type UiState = 'need_login' | 'claiming' | 'success' | 'already' | 'error' | 'invalid'
const state = ref<UiState>('invalid')
const errorMessage = ref('')

const loginUrl = computed(() => `/login?returnUrl=${encodeURIComponent(route.fullPath)}`)

function notifyNewBadges(codes: string[]) {
  for (const code of codes) {
    const key = `account.badges.codes.${code}.name`
    const title = t(key)
    const label = title === key ? t('account.badges.earnedFallback') : title
    toast.add({
      title: label,
      color: 'success',
      icon: 'i-heroicons-trophy',
    })
  }
}

const claimHandled = ref(false)

async function runClaim() {
  if (!token.value || !authStore.accessToken) return
  state.value = 'claiming'
  errorMessage.value = ''
  try {
    const apiBase = config.public.apiBaseUrl || 'http://localhost:3001'
    const res = await $fetch<{
      alreadyClaimed: boolean
      tenatiraaPresencePoints: number
      newBadgeCodes: string[]
    }>(`${apiBase}/te-natiraa/presence/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      body: { token: token.value },
    })
    notifyNewBadges(res.newBadgeCodes || [])
    state.value = res.alreadyClaimed ? 'already' : 'success'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMessage.value = err?.data?.message || err?.message || t('teNatiraaPresence.errorGeneric')
    state.value = 'error'
  }
}

watch(
  () => [token.value, authStore.isAuthenticated, authStore.accessToken] as const,
  () => {
    if (!token.value) {
      state.value = 'invalid'
      errorMessage.value = t('teNatiraaPresence.missingToken')
      return
    }
    if (!authStore.isAuthenticated || !authStore.accessToken) {
      state.value = 'need_login'
      return
    }
    if (claimHandled.value) return
    claimHandled.value = true
    void runClaim()
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
    <div class="max-w-md w-full text-center space-y-6">
      <UIcon name="i-heroicons-qr-code" class="w-16 h-16 mx-auto text-primary-400" />

      <h1 class="text-2xl font-bold text-white">
        {{ t('teNatiraaPresence.title') }}
      </h1>

      <template v-if="state === 'invalid'">
        <p class="text-white/70">{{ errorMessage }}</p>
        <UButton to="/te-natiraa" color="primary" variant="soft">
          {{ t('teNatiraaPresence.backTeNatiraa') }}
        </UButton>
      </template>

      <template v-else-if="state === 'need_login'">
        <p class="text-white/80">{{ t('teNatiraaPresence.needLogin') }}</p>
        <UButton :to="loginUrl" color="primary" size="lg">
          {{ t('teNatiraaPresence.loginCta') }}
        </UButton>
      </template>

      <template v-else-if="state === 'claiming'">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 mx-auto animate-spin text-primary-400" />
        <p class="text-white/70">{{ t('teNatiraaPresence.claiming') }}</p>
      </template>

      <template v-else-if="state === 'success'">
        <p class="text-lg text-emerald-300">{{ t('teNatiraaPresence.success') }}</p>
        <UButton to="/account/badges" color="primary" variant="soft">
          {{ t('teNatiraaPresence.seeBadges') }}
        </UButton>
      </template>

      <template v-else-if="state === 'already'">
        <p class="text-lg text-amber-200">{{ t('teNatiraaPresence.already') }}</p>
        <UButton to="/account/badges" color="primary" variant="soft">
          {{ t('teNatiraaPresence.seeBadges') }}
        </UButton>
      </template>

      <template v-else-if="state === 'error'">
        <p class="text-red-300">{{ errorMessage }}</p>
        <div class="flex flex-wrap gap-2 justify-center">
          <UButton color="primary" @click="() => void runClaim()">
            {{ t('teNatiraaPresence.retry') }}
          </UButton>
          <UButton to="/te-natiraa" variant="ghost" color="neutral">
            {{ t('teNatiraaPresence.backTeNatiraa') }}
          </UButton>
        </div>
      </template>
    </div>
  </div>
</template>
