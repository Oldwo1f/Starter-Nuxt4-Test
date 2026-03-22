<script setup lang="ts">
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useAuthStore } from '~/stores/useAuthStore'

dayjs.extend(utc)
dayjs.extend(timezone)

definePageMeta({
  layout: 'admin',
  title: 'Mode lancement',
})

const { t } = useI18n()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const apiBase = config.public.apiBaseUrl || 'http://localhost:3001'
const router = useRouter()
const toast = useToast()

const enabled = ref(false)
const allowedIpsText = ref('')
const launchOpensAtLocal = ref('')
const isLoading = ref(true)
const isSaving = ref(false)

function parseIps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

async function load() {
  isLoading.value = true
  try {
    const row = await $fetch<{
      enabled: boolean
      allowedIps: string[]
      launchOpensAt: string
    }>(`${apiBase}/launch-mode/admin`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
    enabled.value = row.enabled
    allowedIpsText.value = row.allowedIps.join('\n')
    launchOpensAtLocal.value = dayjs(row.launchOpensAt)
      .tz('Pacific/Tahiti')
      .format('YYYY-MM-DDTHH:mm')
  } catch (err: any) {
    toast.add({
      title: t('launch.admin.loadErrorTitle'),
      description: err?.data?.message || err?.message || t('launch.admin.loadErrorDesc'),
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!authStore.accessToken) return
  isSaving.value = true
  try {
    const launchOpensAt = dayjs
      .tz(launchOpensAtLocal.value, 'Pacific/Tahiti')
      .utc()
      .toISOString()
    await $fetch(`${apiBase}/launch-mode/admin`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      body: {
        enabled: enabled.value,
        allowedIps: parseIps(allowedIpsText.value),
        launchOpensAt,
      },
    })
    toast.add({
      title: t('launch.admin.saveOkTitle'),
      description: t('launch.admin.saveOkDesc'),
      color: 'success',
    })
  } catch (err: any) {
    toast.add({
      title: t('launch.admin.saveErrTitle'),
      description: err?.data?.message || err?.message || t('launch.admin.saveErrDesc'),
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  const role = authStore.user?.role?.toLowerCase()
  if (role === 'moderator') {
    router.push('/admin/dashboard')
    toast.add({
      title: t('launch.admin.accessDeniedTitle'),
      description: t('launch.admin.accessDeniedDesc'),
      color: 'error',
      icon: 'i-heroicons-shield-exclamation',
    })
    return
  }
  authStore.initialize()
  if (!authStore.accessToken) {
    router.push('/login')
    return
  }
  load()
})
</script>

<template>
  <div class="space-y-8 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold">{{ t('launch.admin.title') }}</h1>
      <p class="mt-1 text-sm text-white/60">
        {{ t('launch.admin.subtitle') }}
      </p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else class="space-y-6">
      <UFormField :label="t('launch.admin.enabledLabel')">
        <USwitch v-model="enabled" />
      </UFormField>

      <UFormField
        :label="t('launch.admin.ipsLabel')"
        :description="t('launch.admin.ipsHelp')"
      >
        <UTextarea
          v-model="allowedIpsText"
          :rows="6"
          autoresize
          :placeholder="t('launch.admin.ipsPlaceholder')"
          class="w-full font-mono text-sm"
        />
      </UFormField>

      <UFormField
        :label="t('launch.admin.targetLabel')"
        :description="t('launch.admin.targetHelp')"
      >
        <UInput
          v-model="launchOpensAtLocal"
          type="datetime-local"
          class="w-full max-w-md"
        />
      </UFormField>

      <UButton
        :loading="isSaving"
        icon="i-heroicons-check"
        @click="save"
      >
        {{ t('launch.admin.save') }}
      </UButton>
    </div>
  </div>
</template>
