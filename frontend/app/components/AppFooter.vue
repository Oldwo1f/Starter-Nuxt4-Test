<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="border-t border-white/10">
    <div
      class="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-white/60 sm:px-6 lg:px-8"
    >
      <NuxtLink to="/terms/cgv" class="hover:text-white/80 transition-colors">
        {{ t('footer.cgv') }}
      </NuxtLink>
      <span class="text-white/20">•</span>
      <NuxtLink to="/terms/cgu" class="hover:text-white/80 transition-colors">
        {{ t('footer.cgu') }}
      </NuxtLink>
      <span class="text-white/20">•</span>
      <NuxtLink
        to="/politique-de-confidentialite"
        class="hover:text-white/80 transition-colors"
      >
        {{ t('footer.privacy') }}
      </NuxtLink>
      <span class="text-white/20">•</span>
      <NuxtLink to="/tarifs" class="hover:text-white/80 transition-colors">
        {{ t('footer.pricing') }}
      </NuxtLink>
      <span class="text-white/20">•</span>
      <NuxtLink to="/disclaimer" class="hover:text-white/80 transition-colors">
        {{ t('footer.disclaimer') }}
      </NuxtLink>
      <span class="text-white/20">•</span>
      <span>{{ t('footer.copyright') }}</span>
    </div>
  </footer>
</template>

