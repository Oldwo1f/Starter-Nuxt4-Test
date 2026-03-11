<script setup lang="ts">
definePageMeta({
  layout: 'account',
  middleware: 'auth',
  meta: {
    title: 'Mes badges',
  },
})

// Données des badges selon le plan badges-gamification.md
const badgeCategories = [
  {
    id: 'transmettre',
    name: 'Transmettre',
    description: 'Savoir, contenu, partage',
    color: 'amber',
    icon: 'i-heroicons-academic-cap',
    series: [
      {
        name: 'Academy - Terminer des contenus',
        badges: [
          { name: 'Gardien du Savoir', condition: 'Termine 1 cours Academy (100%)', emoji: '🛡️' },
          { name: 'Passeur(se) de Mémoire', condition: 'Termine 5 cours', emoji: '🌊' },
          { name: 'Tāvana du Savoir', condition: 'Termine 15 cours', emoji: '📜' },
          { name: 'Maître Transmetteur', condition: 'Termine 25 cours', emoji: '🏛️' },
        ],
      },
      {
        name: 'Blog collaboratif - Articles validés',
        badges: [
          { name: 'Pigiste', condition: '1 article validé', emoji: '✍️' },
          { name: 'Rédacteur / Rédactrice', condition: '3 articles validés', emoji: '📝' },
          { name: 'Journaliste', condition: '10 articles validés', emoji: '📰' },
          { name: 'Rédacteur en Chef', condition: '25 articles validés', emoji: '📋' },
        ],
      },
      {
        name: 'Culture - Consultation de contenus',
        badges: [
          { name: 'Archiviste', condition: 'Consulte 5 contenus Culture', emoji: '📦' },
          { name: 'Curateur du Patrimoine', condition: 'Consulte 20 contenus', emoji: '🔍' },
          { name: 'Gardien des Mémoires', condition: 'Consulte 50 contenus', emoji: '🗄️' },
        ],
      },
      {
        name: 'Academy - Création de formations (à venir)',
        badges: [
          { name: 'Formateur émergent', condition: 'Publie 1 formation validée', emoji: '🌱' },
          { name: 'Enseignant de la Communauté', condition: 'Publie 3 formations', emoji: '🪴' },
          { name: 'Maître Formateur', condition: 'Publie 5 formations', emoji: '🌳' },
        ],
      },
    ],
  },
  {
    id: 'connecter',
    name: 'Connecter',
    description: 'Réseau, échanges, communauté',
    color: 'emerald',
    icon: 'i-heroicons-link',
    series: [
      {
        name: 'Profil',
        badges: [
          { name: 'Premier Lien', condition: 'Complète son profil', emoji: '🔗' },
        ],
      },
      {
        name: 'Troc (Nuna\'a Troc)',
        badges: [
          { name: 'Premier Troc', condition: 'Réussit 1 échange', emoji: '🤝' },
          { name: 'Tāvana du Troc', condition: '5 trocs', emoji: '🔄' },
          { name: 'Fa\'a\'apu de la Communauté', condition: '15 trocs', emoji: '🌾' },
          { name: 'Ra\'atira du Troc', condition: '50 trocs', emoji: '⚓' },
          { name: 'Maître Troqueur', condition: '100 trocs', emoji: '🏆' },
        ],
      },
      {
        name: 'Parrainage',
        badges: [
          { name: 'Ambassadeur / Ambassadrice', condition: 'Parraine 1 membre validé', emoji: '🎖️' },
          { name: 'Rameur de la Communauté', condition: 'Parraine 5 membres', emoji: '🛶' },
          { name: 'Navigateur du Réseau', condition: 'Parraine 15 membres', emoji: '🧭' },
        ],
      },
      {
        name: 'Soutien',
        badges: [
          { name: 'Soutien Local', condition: '1 achat chez un partenaire', emoji: '🤲' },
          { name: 'Mécène', condition: '5 achats chez des partenaires', emoji: '💎' },
          { name: 'Bienfaiteur', condition: '15 achats chez des partenaires', emoji: '💝' },
        ],
      },
    ],
  },
  {
    id: 'inspirer',
    name: 'Inspirer',
    description: 'Engagement, événements, soutien',
    color: 'violet',
    icon: 'i-heroicons-sparkles',
    series: [
      {
        name: 'Te Natira\'a',
        badges: [
          { name: 'Présence au Natira\'a', condition: 'Participe 1 fois', emoji: '🕯️' },
          { name: 'Habitué du Rassemblement', condition: 'Participe 2 fois', emoji: '🪷' },
          { name: 'Pilier du Natira\'a', condition: 'Participe 3 fois', emoji: '🏛️' },
          { name: 'Gardien du Rassemblement', condition: 'Participe 5 fois', emoji: '🦅' },
        ],
      },
      {
        name: 'Témoignages',
        badges: [
          { name: 'Voix de la Communauté', condition: 'Laisse 1 témoignage validé', emoji: '🎤' },
          { name: 'Porte-parole', condition: '3 témoignages validés', emoji: '📢' },
          { name: 'Conteur Public', condition: '5 témoignages validés', emoji: '📖' },
        ],
      },
      {
        name: 'Découverte',
        badges: [
          { name: 'Éclaireur', condition: 'Visite 3 univers de la plateforme', emoji: '🔦' },
          { name: 'Explorateur', condition: 'Visite tous les univers 5 fois chacun', emoji: '🗺️' },
          { name: 'Passeur d\'Horizons', condition: 'Complète 1 action dans chaque univers', emoji: '🌅' },
        ],
      },
    ],
  },
  {
    id: 'speciaux',
    name: 'Badges spéciaux',
    description: 'Hors catégories',
    color: 'yellow',
    icon: 'i-heroicons-star',
    series: [
      {
        name: 'Exclusifs',
        badges: [
          { name: 'Membre Fondateur 2026', condition: 'Inscription avant Te Natira\'a (11 avril 2026)', emoji: '🏴' },
          { name: 'Pionnier du Troc', condition: '1 troc complété avant avril 2026', emoji: '🚀' },
          { name: 'Collectionneur de Pūpū', condition: 'Atteint 500 Pūpū en solde', emoji: '🐚' },
          { name: 'VIP Heritage', condition: 'Rôle VIP', emoji: '👑' },
          { name: 'Toa de la Communauté', condition: 'Badge ultime : combine Transmettre + Connecter + Inspirer', emoji: '⚔️' },
        ],
      },
    ],
  },
]

const getCategoryBorderColor = (color: string) => {
  const map: Record<string, string> = {
    amber: 'border-amber-500/50',
    emerald: 'border-emerald-500/50',
    violet: 'border-violet-500/50',
    yellow: 'border-yellow-500/50',
  }
  return map[color] || 'border-primary-500/40'
}

const getCategoryBgColor = (color: string) => {
  const map: Record<string, string> = {
    amber: 'bg-amber-500/10',
    emerald: 'bg-emerald-500/10',
    violet: 'bg-violet-500/10',
    yellow: 'bg-yellow-500/10',
  }
  return map[color] || 'bg-primary-500/10'
}

const getCategorySectionFrame = (color: string) => {
  const map: Record<string, { border: string; bg: string }> = {
    amber: { border: 'border-amber-500', bg: 'bg-amber-500/20' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500/20' },
    violet: { border: 'border-violet-500', bg: 'bg-violet-500/20' },
    yellow: { border: 'border-yellow-500', bg: 'bg-yellow-500/20' },
  }
  return map[color] || { border: 'border-primary-500', bg: 'bg-primary-500/15' }
}

const getCategoryIconColor = (color: string) => {
  const map: Record<string, string> = {
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
    yellow: 'text-yellow-400',
  }
  return map[color] || 'text-primary-400'
}

// Badges "possédés" (simulés au clic pour le visuel)
const ownedBadgeKeys = ref<Set<string>>(new Set())

const getBadgeKey = (categoryId: string, serieIndex: number, badgeIndex: number) =>
  `${categoryId}-${serieIndex}-${badgeIndex}`

const toggleBadgeOwned = (key: string) => {
  const next = new Set(ownedBadgeKeys.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  ownedBadgeKeys.value = next
}

const isBadgeOwned = (key: string) => ownedBadgeKeys.value.has(key)
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Mes badges</h1>
      <p class="text-white/60">
        Collectez des badges en participant à la vie de Nuna Heritage. Transmettez, connectez-vous et inspirez la communauté.
      </p>
    </div>

    <!-- Légende : tous les badges sont affichés (implémentation à venir) -->
    <UAlert
      color="primary"
      variant="soft"
      icon="i-heroicons-information-circle"
      title="En cours de développement"
      description="Tous les badges sont affichés ci-dessous. L'attribution automatique sera implémentée prochainement."
    />

    <div class="space-y-8">
      <section
        v-for="category in badgeCategories"
        :key="category.id"
        :class="[
          'rounded-2xl border-2 p-5 md:p-6',
          getCategorySectionFrame(category.color).bg,
          getCategorySectionFrame(category.color).border,
        ]"
      >
        <!-- En-tête de catégorie -->
        <div class="flex items-center gap-3 mb-6">
          <div
            :class="[
              'flex items-center justify-center w-10 h-10 rounded-lg',
              getCategoryBgColor(category.color),
            ]"
          >
            <UIcon :name="category.icon" :class="['w-6 h-6', getCategoryIconColor(category.color)]" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">{{ category.name }}</h2>
            <p class="text-sm text-white/60">{{ category.description }}</p>
          </div>
        </div>

        <!-- Séries de badges -->
        <div class="space-y-6">
          <div
            v-for="(serie, serieIndex) in category.series"
            :key="serieIndex"
            class="space-y-3"
          >
            <h3 class="text-sm font-semibold text-white/70 uppercase tracking-wider">
              {{ serie.name }}
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              <UCard
                v-for="(badge, badgeIndex) in serie.badges"
                :key="badgeIndex"
                :class="[
                  'bg-gradient-to-br from-white/5 to-white/[0.02] border transition-all duration-200 cursor-pointer',
                  isBadgeOwned(getBadgeKey(category.id, serieIndex, badgeIndex))
                    ? 'border-amber-400 border-2 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                    : 'border-white/10 hover:border-white/20',
                ]"
                @click="toggleBadgeOwned(getBadgeKey(category.id, serieIndex, badgeIndex))"
              >
                <div class="flex flex-col items-center text-center">
                  <!-- Icône du badge -->
                  <div
                    :class="[
                      'flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center mb-3 text-2xl',
                      getCategoryBgColor(category.color),
                    ]"
                  >
                    <span v-if="badge.emoji">{{ badge.emoji }}</span>
                    <UIcon
                      v-else
                      :name="badge.icon"
                      :class="['w-7 h-7', getCategoryIconColor(category.color)]"
                    />
                  </div>
                  <h4 class="font-semibold text-white text-sm line-clamp-2" :title="badge.name">
                    {{ badge.name }}
                  </h4>
                  <p class="text-xs text-white/50 mt-1 line-clamp-2" :title="badge.condition">
                    {{ badge.condition }}
                  </p>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
