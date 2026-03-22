<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import logoUrl from '~/assets/images/logo-nuna-heritage.png'

const { t } = useI18n()
const { appName, tagline } = useAppInfo()
const config = useRuntimeConfig()
const apiBase = config.public.apiBaseUrl || 'http://localhost:3001'

definePageMeta({
  layout: false,
})

useHead({
  title: () => `${t('launch.pageTitle')} — ${appName}`,
})

type Parts = { d: number; h: number; m: number; s: number }

const COUNTDOWN_SEGMENTS: (keyof Parts)[] = ['d', 'h', 'm', 's']

const targetAt = ref<Date | null>(null)
const parts = ref<Parts | null>(null)
const loadError = ref(false)
const isLoading = ref(true)

let timer: ReturnType<typeof setInterval> | undefined

function computeParts(ms: number): Parts | null {
  if (ms <= 0) return null
  const sec = Math.floor(ms / 1000)
  return {
    d: Math.floor(sec / 86400),
    h: Math.floor((sec % 86400) / 3600),
    m: Math.floor((sec % 3600) / 60),
    s: sec % 60,
  }
}

function tick() {
  if (!targetAt.value) return
  const p = computeParts(targetAt.value.getTime() - Date.now())
  parts.value = p
  if (!p) {
    if (timer) clearInterval(timer)
    navigateTo('/')
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    const authStore = useAuthStore()
    authStore.initialize()
    if (authStore.accessToken) {
      try {
        const { allowed } = await $fetch<{ allowed: boolean }>(`${apiBase}/launch-mode/access`, {
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
        })
        if (allowed) {
          await navigateTo('/')
          return
        }
      } catch {
        /* ignore */
      }
    }

    const pub = await $fetch<{ enabled: boolean; launchOpensAt: string }>(
      `${apiBase}/launch-mode/public`,
    )
    if (!pub.enabled || Date.now() >= new Date(pub.launchOpensAt).getTime()) {
      await navigateTo('/')
      return
    }
    const target = new Date(pub.launchOpensAt)
    if (Number.isNaN(target.getTime())) {
      loadError.value = true
      return
    }
    targetAt.value = target
    tick()
    timer = setInterval(tick, 1000)
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div
    class="min-h-dvh flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-gray-950 via-gray-900 to-primary-950/40"
  >
    <div class="max-w-lg w-full text-center space-y-10">
      <img :src="logoUrl" :alt="appName" class="h-16 w-auto mx-auto" />
      <div>
        <h1 class="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          {{ t('launch.heading') }}
        </h1>
        <p class="mt-3 text-white/65 text-sm sm:text-base leading-relaxed">
          {{ t('launch.subheading', { appName }) }}
        </p>
        <p class="mt-2 text-xs text-white/45">
          {{ t('launch.tahitiNote') }}
        </p>
      </div>

      <div v-if="loadError" class="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-red-300">
        {{ t('launch.loadError') }}
      </div>

      <div
        v-else-if="isLoading"
        class="flex flex-col items-center justify-center gap-3 py-8 text-white/50"
      >
        <UIcon name="i-heroicons-arrow-path" class="h-10 w-10 animate-spin text-emerald-400/90" />
        <span class="text-sm">{{ t('launch.loading') }}</span>
      </div>

      <div
        v-else-if="parts"
        class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
      >
        <div
          v-for="segment in COUNTDOWN_SEGMENTS"
          :key="segment"
          class="rounded-xl border border-white/10 bg-white/5 px-3 py-4 sm:py-5"
        >
          <div class="text-2xl sm:text-3xl font-bold text-emerald-400 tabular-nums">
            {{ parts[segment] }}
          </div>
          <div class="mt-1 text-xs uppercase tracking-wide text-white/50">
            {{ t(`launch.unit.${segment}`) }}
          </div>
        </div>
      </div>

      <p class="text-xs text-white/40">
        {{ tagline }}
      </p>
    </div>
  </div>
</template>
