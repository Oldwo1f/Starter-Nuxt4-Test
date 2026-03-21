<script setup lang="ts">
import frFlag from '~/assets/images/Flag_of_France.svg'
import tyFlag from '~/assets/images/Flag_of_French_Polynesia.svg'

const { t, locale, setLocale } = useI18n()

const flags = { fr: frFlag, ty: tyFlag } as const

type LocaleCode = keyof typeof flags

const currentSrc = computed(() => flags[locale.value === 'ty' ? 'ty' : 'fr'])
const otherLocale = computed<LocaleCode>(() => (locale.value === 'ty' ? 'fr' : 'ty'))
const otherSrc = computed(() => flags[otherLocale.value])

const currentLabel = computed(() =>
  locale.value === 'ty' ? t('common.tahitian') : t('common.french'),
)
const otherLabel = computed(() =>
  otherLocale.value === 'ty' ? t('common.tahitian') : t('common.french'),
)

async function switchTo(code: LocaleCode, close?: () => void) {
  await setLocale(code)
  close?.()
}

const flagBtnClassHeader =
  'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/25 transition hover:ring-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

const flagBtnClassMenu =
  'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/25 transition hover:ring-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
</script>

<template>
  <UPopover :content="{ align: 'end', sideOffset: 8 }">
    <button
      type="button"
      :class="flagBtnClassHeader"
      :aria-label="`${t('common.language')}: ${currentLabel}`"
      :title="currentLabel"
    >
      <img
        :src="currentSrc"
        alt=""
        class="h-full w-full object-cover"
        width="24"
        height="24"
        decoding="async"
      />
    </button>

    <template #content="{ close }">
      <div class="p-1.5">
        <button
          type="button"
          :class="flagBtnClassMenu"
          :aria-label="`${t('common.language')}: ${otherLabel}`"
          :title="otherLabel"
          @click="switchTo(otherLocale, close)"
        >
          <img
            :src="otherSrc"
            alt=""
            class="h-full w-full object-cover"
            width="36"
            height="36"
            decoding="async"
          />
        </button>
      </div>
    </template>
  </UPopover>
</template>
