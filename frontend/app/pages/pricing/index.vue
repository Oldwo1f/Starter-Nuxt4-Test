<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const authStore = useAuthStore()

// Pricing plans data
const plans = ref([
  {
    name: 'Gratuit',
    price: 0,
    description: 'Accès de base à la communauté',
    features: [
      'Accès à la marketplace',
      'Création d\'annonces',
      'Participation aux échanges',
      'Accès au blog',
    ],
    button: {
      label: authStore.isAuthenticated ? 'Déjà membre' : 'S\'inscrire',
      to: authStore.isAuthenticated ? undefined : '/register',
      color: 'primary' as const,
    },
  },
  {
    name: 'Membre',
    price: 10,
    description: 'Accès complet avec avantages',
    features: [
      'Tout du plan Gratuit',
      'Goodies exclusifs',
      'Support prioritaire',
      'Badge membre',
    ],
    button: {
      label: 'Devenir membre',
      to: '/register',
      color: 'primary' as const,
    },
  },
  {
    name: 'Premium',
    price: 25,
    description: 'Le meilleur pour les utilisateurs actifs',
    features: [
      'Tout du plan Membre',
      'Annonces illimitées',
      'Mise en avant des annonces',
      'Statistiques détaillées',
      'Support dédié',
    ],
    button: {
      label: 'Passer Premium',
      to: '/register',
      color: 'primary' as const,
    },
    badge: 'Populaire',
  },
  {
    name: 'VIP',
    price: 50,
    description: 'Pour les membres les plus engagés',
    features: [
      'Tout du plan Premium',
      'Accès early à nouvelles fonctionnalités',
      'Événements exclusifs',
      'Badge VIP',
      'Support 24/7',
    ],
    button: {
      label: 'Devenir VIP',
      to: '/register',
      color: 'primary' as const,
    },
  },
])
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Tarifs</h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        Choisissez le plan qui vous convient le mieux
      </p>
    </div>

    <UPricingPlans :plans="plans" />
  </div>
</template>
