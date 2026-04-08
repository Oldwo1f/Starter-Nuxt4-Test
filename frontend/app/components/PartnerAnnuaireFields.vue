<script setup lang="ts">
import type { Partner } from '~/stores/usePartnerStore'

const props = defineProps<{
  partner: Partner
}>()

const { t } = useI18n()

function displayField(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return t('partnersPage.emptyField')
  return String(value)
}
</script>

<template>
  <div class="space-y-3">
    <h2
      v-if="props.partner.activity?.trim()"
      class="mb-1 text-center text-base font-semibold leading-snug text-white/95"
    >
      {{ props.partner.activity }}
    </h2>
    <dl class="space-y-3 text-sm">
      <div>
        <dt class="mb-0.5 text-xs font-medium uppercase tracking-wide text-white/50">
          {{ t('partnersPage.colName') }}
        </dt>
        <dd class="flex flex-wrap items-center gap-2 text-white/90">
          <span class="font-medium">{{ props.partner.name }}</span>
          <a
            v-if="props.partner.link"
            :href="props.partner.link"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex shrink-0 text-primary-400 hover:text-primary-300"
            :aria-label="t('partnersPage.visitWebsite', { name: props.partner.name })"
          >
            <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-5 w-5" />
          </a>
        </dd>
      </div>
      <div>
        <dt class="mb-0.5 text-xs font-medium uppercase tracking-wide text-white/50">
          {{ t('partnersPage.colEmail') }}
        </dt>
        <dd>
          <a
            v-if="props.partner.email"
            :href="`mailto:${props.partner.email}`"
            class="break-all text-primary-400 hover:text-primary-300"
          >
            {{ props.partner.email }}
          </a>
          <span v-else class="text-white/50">{{ displayField(props.partner.email) }}</span>
        </dd>
      </div>
      <div>
        <dt class="mb-0.5 text-xs font-medium uppercase tracking-wide text-white/50">
          {{ t('partnersPage.colPhone') }}
        </dt>
        <dd>
          <a
            v-if="props.partner.phone"
            :href="`tel:${String(props.partner.phone).replace(/\s/g, '')}`"
            class="text-primary-400 hover:text-primary-300"
          >
            {{ props.partner.phone }}
          </a>
          <span v-else class="text-white/50">{{ displayField(props.partner.phone) }}</span>
        </dd>
      </div>
      <div>
        <dt class="mb-0.5 text-xs font-medium uppercase tracking-wide text-white/50">
          {{ t('partnersPage.colDescription') }}
        </dt>
        <dd
          class="whitespace-pre-wrap break-words text-white/85"
          :class="{ 'text-white/50': !props.partner.description?.trim() }"
        >
          {{ displayField(props.partner.description) }}
        </dd>
      </div>
    </dl>
  </div>
</template>
