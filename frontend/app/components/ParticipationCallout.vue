<script setup lang="ts">
const props = defineProps<{
  context: 'goodies' | 'partners' | 'academy' | 'polls'
}>()

const { t } = useI18n()

const mailtoHref = computed(() => {
  const subj = encodeURIComponent(t(`participationCallout.${props.context}.mailSubject`))
  return `mailto:nunaaheritage@gmail.com?subject=${subj}`
})
</script>

<template>
  <div
    class="mb-8 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5"
  >
    <p class="text-center text-sm text-white/80 sm:text-left sm:text-base">
      {{ t(`participationCallout.${context}.message`) }}
    </p>
    <UButton
      :to="mailtoHref"
      external
      variant="outline"
      color="primary"
      icon="i-heroicons-envelope"
      class="shrink-0 self-center sm:self-auto"
    >
      {{ t('participationCallout.contactCta') }}
    </UButton>
  </div>
</template>
