<template>
  <div
    class="relative inline-flex shrink-0 overflow-visible"
    :title="badgeLevelTitle"
  >
    <span class="sr-only">{{ badgeLevelTitle }}</span>
    <UAvatar
      v-if="src"
      :src="src"
      :alt="alt"
      :size="size"
      :text="text"
      :class="[
        isCertified ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900' : '',
        avatarClass,
      ]"
    />
    <UAvatar
      v-else
      :alt="alt"
      :text="text"
      :size="size"
      :class="[
        isCertified ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900' : '',
        avatarClass,
      ]"
    />
    <span
      class="pointer-events-none absolute bottom-0 left-1/2 z-[1] -translate-x-1/2 translate-y-[55%] rounded-full border border-amber-400/60 bg-black/65 text-center font-bold tabular-nums leading-none text-amber-300 shadow-[0_1px_3px_rgba(0,0,0,0.9)] [text-shadow:0_0_8px_rgba(251,191,36,0.35)]"
      :class="pillSizeClass"
      aria-hidden="true"
    >
      {{ badgeLevel }}
    </span>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

interface Props {
  src?: string | null
  alt?: string
  text?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isCertified?: boolean
  avatarClass?: string
  /** Nombre total de badges (niveau) — toujours affiché en pastille dorée. */
  badgeLevel?: number
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  alt: '',
  text: '',
  size: 'md',
  isCertified: false,
  avatarClass: '',
  badgeLevel: 0,
})

const badgeLevelTitle = computed(() =>
  t('marketplace.memberProfile.level', { n: props.badgeLevel }),
)

const pillSizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'min-w-[1rem] px-1 py-px text-[9px]'
    case 'sm':
      return 'px-1.5 py-px text-[10px]'
    case 'lg':
      return 'px-2 py-0.5 text-xs'
    case 'xl':
      return 'px-2 py-0.5 text-xs'
    default:
      return 'px-2 py-0.5 text-[11px]'
  }
})
</script>
