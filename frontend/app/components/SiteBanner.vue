<script setup lang="ts">
type SiteBannerConfig = {
  id: number
  desktopImageUrl: string | null
  mobileImageUrl: string | null
  isActive: boolean
  updatedAt: string
}

const { apiBaseUrl, getImageUrl } = useApi()

const { data } = await useFetch<SiteBannerConfig>(`${apiBaseUrl}/banner`, {
  key: 'site-banner-config',
})

const desktopUrl = computed(() => (data.value?.desktopImageUrl ? getImageUrl(data.value.desktopImageUrl) : null))
const mobileUrl = computed(() => (data.value?.mobileImageUrl ? getImageUrl(data.value.mobileImageUrl) : null))

const isVisible = computed(() => {
  if (!data.value?.isActive) return false
  return !!desktopUrl.value || !!mobileUrl.value
})
</script>

<template>
  <section v-if="isVisible" class="bg-transparent">
    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 sm:py-12">
      <div class="overflow-hidden rounded-2xl border border-white/15 bg-transparent">
        <picture class="block">
          <source v-if="desktopUrl" :srcset="desktopUrl" media="(min-width: 768px)" />
          <img
            :src="mobileUrl || desktopUrl || ''"
            alt="Bannière"
            class="w-full h-auto object-cover"
            loading="lazy"
          />
        </picture>
      </div>
    </div>
  </section>
</template>

