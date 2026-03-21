<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const authStore = useAuthStore()
const { t } = useI18n()

const plans = computed(() => [
  {
    name: t('pricingPage.freeName'),
    price: 0,
    description: t('pricingPage.freeDesc'),
    features: [
      t('pricingPage.freeF0'),
      t('pricingPage.freeF1'),
      t('pricingPage.freeF2'),
      t('pricingPage.freeF3'),
    ],
    button: {
      label: authStore.isAuthenticated ? t('pricingPage.freeBtnMember') : t('pricingPage.freeBtnSignup'),
      to: authStore.isAuthenticated ? undefined : '/register',
      color: 'primary' as const,
    },
  },
  {
    name: t('pricingPage.memberName'),
    price: 10,
    description: t('pricingPage.memberDesc'),
    features: [
      t('pricingPage.memberF0'),
      t('pricingPage.memberF1'),
      t('pricingPage.memberF2'),
      t('pricingPage.memberF3'),
    ],
    button: {
      label: t('pricingPage.memberBtn'),
      to: '/register',
      color: 'primary' as const,
    },
  },
  {
    name: t('pricingPage.premiumName'),
    price: 25,
    description: t('pricingPage.premiumDesc'),
    features: [
      t('pricingPage.premiumF0'),
      t('pricingPage.premiumF1'),
      t('pricingPage.premiumF2'),
      t('pricingPage.premiumF3'),
      t('pricingPage.premiumF4'),
    ],
    button: {
      label: t('pricingPage.premiumBtn'),
      to: '/register',
      color: 'primary' as const,
    },
    badge: t('pricingPage.badgePopular'),
  },
  {
    name: t('pricingPage.vipName'),
    price: 50,
    description: t('pricingPage.vipDesc'),
    features: [
      t('pricingPage.vipF0'),
      t('pricingPage.vipF1'),
      t('pricingPage.vipF2'),
      t('pricingPage.vipF3'),
      t('pricingPage.vipF4'),
    ],
    button: {
      label: t('pricingPage.vipBtn'),
      to: '/register',
      color: 'primary' as const,
    },
  },
])
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">{{ t('pricingPage.title') }}</h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        {{ t('pricingPage.subtitle') }}
      </p>
    </div>

    <UPricingPlans :plans="plans" />
  </div>
</template>
