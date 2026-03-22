<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useMyBadgeCountStore } from '~/stores/useMyBadgeCountStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.pages.badges',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const myBadgeCountStore = useMyBadgeCountStore()

/** Compteur affiché à côté du titre de série ou sous une carte (GET /badges) */
type SerieStatHint =
  | 'academy'
  | 'blog'
  | 'culture'
  | 'discovery'
  | 'formateur'
  | 'referral'
  | 'soutien'
  | 'tenatiraaPresence'
  | 'testimonial'
  | 'troc'
  | 'walletPupu'

type BadgeDef = {
  name: string
  condition: string
  emoji?: string
  icon?: string
  /** Si défini, état réel via API /badges */
  badgeCode?: string
  /** Compteur optionnel sous la carte (ex. Pūpū, Toa) */
  statHint?: SerieStatHint
}

type BadgeSerie = { name: string; badges: BadgeDef[]; statHint?: SerieStatHint }

// Données des badges selon le plan badges-gamification.md
const badgeCategories: Array<{
  id: string
  name: string
  description: string
  color: string
  icon: string
  series: BadgeSerie[]
}> = [
  {
    id: 'transmettre',
    name: 'Transmettre',
    description: 'Savoir, contenu, partage',
    color: 'blue',
    icon: 'i-heroicons-academic-cap',
    series: [
      {
        name: 'Academy - Terminer des contenus',
        statHint: 'academy',
        badges: [
          {
            name: 'Gardien du Savoir',
            condition: 'Termine 1 cours Academy',
            emoji: '🛡️',
            badgeCode: 'academy_courses_completed_1',
          },
          {
            name: 'Passeur(se) de Mémoire',
            condition: 'Termine 5 cours Academy',
            emoji: '🌊',
            badgeCode: 'academy_courses_completed_5',
          },
          {
            name: 'Tāvana du Savoir',
            condition: 'Termine 15 cours Academy',
            emoji: '📜',
            badgeCode: 'academy_courses_completed_15',
          },
          {
            name: 'Maître Transmetteur',
            condition: 'Termine 25 cours Academy',
            emoji: '🏛️',
            badgeCode: 'academy_courses_completed_25',
          },
        ],
      },
      {
        name: 'Blog collaboratif - Articles validés',
        statHint: 'blog',
        badges: [
          {
            name: 'Pigiste',
            condition: '1 article validé',
            emoji: '✍️',
            badgeCode: 'blog_articles_validated_1',
          },
          {
            name: 'Rédacteur / Rédactrice',
            condition: '3 articles validés',
            emoji: '📝',
            badgeCode: 'blog_articles_validated_3',
          },
          {
            name: 'Journaliste',
            condition: '10 articles validés',
            emoji: '📰',
            badgeCode: 'blog_articles_validated_10',
          },
          {
            name: 'Rédacteur en Chef',
            condition: '25 articles validés',
            emoji: '📋',
            badgeCode: 'blog_articles_validated_25',
          },
        ],
      },
      {
        name: 'Academy - Création de formations',
        statHint: 'formateur',
        badges: [
          {
            name: 'Formateur émergent',
            condition: '1 formation publiée',
            emoji: '🌱',
            badgeCode: 'academy_formateur_points_1',
          },
          {
            name: 'Enseignant de la Communauté',
            condition: '3 formations publiées',
            emoji: '🪴',
            badgeCode: 'academy_formateur_points_3',
          },
          {
            name: 'Maître Formateur',
            condition: '5 formations publiées',
            emoji: '🌳',
            badgeCode: 'academy_formateur_points_5',
          },
          {
            name: 'Architecte du savoir',
            condition: '10 formations publiées',
            emoji: '🏛️',
            badgeCode: 'academy_formateur_points_10',
          },
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
        name: 'Troc (Nuna\'a Troc)',
        statHint: 'troc',
        badges: [
          {
            name: 'Premier Troc',
            condition: '1 transfert ou échange Pūpū',
            emoji: '🤝',
            badgeCode: 'troc_exchanges_completed_1',
          },
          {
            name: 'Tāvana du Troc',
            condition: '10 transferts ou échanges Pūpū',
            emoji: '🔄',
            badgeCode: 'troc_exchanges_completed_10',
          },
          {
            name: 'Ra\'atira du Troc',
            condition: '50 transferts ou échanges Pūpū',
            emoji: '⚓',
            badgeCode: 'troc_exchanges_completed_50',
          },
          {
            name: 'Maître Troqueur',
            condition: '100 transferts ou échanges Pūpū',
            emoji: '🏆',
            badgeCode: 'troc_exchanges_completed_100',
          },
        ],
      },
      {
        name: 'Parrainage',
        statHint: 'referral',
        badges: [
          {
            name: 'Ambassadeur / Ambassadrice',
            condition: '1 filleul validé',
            emoji: '🎖️',
            badgeCode: 'referral_filleuls_valides_1',
          },
          {
            name: 'Rameur de la Communauté',
            condition: '5 filleuls validés',
            emoji: '🛶',
            badgeCode: 'referral_filleuls_valides_5',
          },
          {
            name: 'Navigateur du Réseau',
            condition: '15 filleuls validés',
            emoji: '🧭',
            badgeCode: 'referral_filleuls_valides_15',
          },
          {
            name: 'Pilier du parrainage',
            condition: '50 filleuls validés',
            emoji: '🏛️',
            badgeCode: 'referral_filleuls_valides_50',
          },
        ],
      },
      {
        name: 'Soutien',
        statHint: 'soutien',
        badges: [
          {
            name: 'Soutien local',
            condition: '1 point soutien',
            emoji: '🤲',
            badgeCode: 'soutien_points_1',
          },
          {
            name: 'Mécène',
            condition: '5 points soutien',
            emoji: '💎',
            badgeCode: 'soutien_points_5',
          },
          {
            name: 'Bienfaiteur',
            condition: '10 points soutien',
            emoji: '💝',
            badgeCode: 'soutien_points_10',
          },
          {
            name: 'Pilier du soutien',
            condition: '20 points soutien',
            emoji: '🏛️',
            badgeCode: 'soutien_points_20',
          },
        ],
      },
      {
        name: 'Te Natira\'a (présence)',
        statHint: 'tenatiraaPresence',
        badges: [
          {
            name: 'Première présence',
            condition: '1 point présence (QR)',
            emoji: '🕯️',
            badgeCode: 'tenatiraa_presence_1',
          },
          {
            name: 'Retour au rassemblement',
            condition: '2 points présence',
            emoji: '🪷',
            badgeCode: 'tenatiraa_presence_2',
          },
          {
            name: 'Habitué du Natira\'a',
            condition: '3 points présence',
            emoji: '🏛️',
            badgeCode: 'tenatiraa_presence_3',
          },
          {
            name: 'Gardien du rassemblement',
            condition: '5 points présence',
            emoji: '🦅',
            badgeCode: 'tenatiraa_presence_5',
          },
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
        name: 'Culture - Consultation de contenus',
        statHint: 'culture',
        badges: [
          {
            name: 'Premier regard',
            condition: '1 vidéo Culture',
            emoji: '👁️',
            badgeCode: 'culture_contents_viewed_1',
          },
          {
            name: 'Archiviste',
            condition: '5 vidéos Culture',
            emoji: '📦',
            badgeCode: 'culture_contents_viewed_5',
          },
          {
            name: 'Curateur du Patrimoine',
            condition: '20 vidéos Culture',
            emoji: '🔍',
            badgeCode: 'culture_contents_viewed_20',
          },
          {
            name: 'Gardien des Mémoires',
            condition: '50 vidéos Culture',
            emoji: '🗄️',
            badgeCode: 'culture_contents_viewed_50',
          },
        ],
      },
      {
        name: 'Témoignages vidéo (validés)',
        statHint: 'testimonial',
        badges: [
          {
            name: 'Voix de la Communauté',
            condition: '1 témoignage vidéo validé',
            emoji: '🎤',
            badgeCode: 'testimonial_video_validated_1',
          },
          {
            name: 'Porte-parole',
            condition: '3 témoignages vidéo validés',
            emoji: '📢',
            badgeCode: 'testimonial_video_validated_3',
          },
          {
            name: 'Conteur public',
            condition: '5 témoignages vidéo validés',
            emoji: '📖',
            badgeCode: 'testimonial_video_validated_5',
          },
          {
            name: 'Ambassadeur des témoignages',
            condition: '10 témoignages vidéo validés',
            emoji: '🏛️',
            badgeCode: 'testimonial_video_validated_10',
          },
        ],
      },
      {
        name: 'Découverte',
        statHint: 'discovery',
        badges: [
          {
            name: 'Éclaireur',
            condition: '1 action sur le site',
            emoji: '🔦',
            badgeCode: 'discovery_first_step',
          },
          {
            name: 'Explorateur',
            condition: '1 action / univers',
            emoji: '🗺️',
            badgeCode: 'discovery_three_universes_one_each',
          },
          {
            name: 'Passeur d’horizons',
            condition: '2 actions / univers',
            emoji: '🌅',
            badgeCode: 'discovery_five_action_types',
          },
          {
            name: 'Architecte des trois mondes',
            condition: '3 actions / univers',
            emoji: '🏛️',
            badgeCode: 'discovery_two_each_universe',
          },
        ],
      },
    ],
  },
  {
    id: 'speciaux',
    name: 'Badges spéciaux',
    description: 'Chaque badge a son propre critère',
    color: 'yellow',
    icon: 'i-heroicons-star',
    series: [
      {
        name: '',
        badges: [
          {
            name: 'Membre Fondateur 2026',
            condition: 'Inscrit avant le 11 avril 2026',
            emoji: '🏴',
            badgeCode: 'special_founder_2026',
          },
          {
            name: 'Pionnier du Troc',
            condition: '1 troc complété avant le 1er mai 2026',
            emoji: '🚀',
            badgeCode: 'special_troc_pioneer_may_2026',
          },
          {
            name: 'Collectionneur de Pūpū',
            condition: '500 Pūpū en portefeuille',
            emoji: '🐚',
            badgeCode: 'special_pupu_collector_500',
            statHint: 'walletPupu',
          },
          {
            name: 'VIP Heritage',
            condition: 'Rôle VIP',
            emoji: '👑',
            badgeCode: 'special_vip_heritage',
          },
          {
            name: 'Collectionneur débutant',
            condition: '10 badges obtenus',
            emoji: '📛',
            badgeCode: 'special_badges_total_10',
          },
          {
            name: 'Grand collectionneur',
            condition: '20 badges obtenus',
            emoji: '🎖️',
            badgeCode: 'special_badges_total_20',
          },
          {
            name: 'Toa de la Communauté',
            condition: '40 badges obtenus',
            emoji: '⚔️',
            badgeCode: 'special_toa_community',
          },
          {
            name: 'Le respect des anciens',
            condition: 'Membre 75+ ans — attribué par l’équipe',
            emoji: '🌺',
            badgeCode: 'special_respect_anciens',
          },
        ],
      },
    ],
  },
]

const getCategoryBorderColor = (color: string) => {
  const map: Record<string, string> = {
    blue: 'border-blue-500/50',
    amber: 'border-amber-500/50',
    emerald: 'border-emerald-500/50',
    violet: 'border-violet-500/50',
    yellow: 'border-yellow-500/50',
  }
  return map[color] || 'border-primary-500/40'
}

const getCategoryBgColor = (color: string) => {
  const map: Record<string, string> = {
    blue: 'bg-blue-500/10',
    amber: 'bg-amber-500/10',
    emerald: 'bg-emerald-500/10',
    violet: 'bg-violet-500/10',
    yellow: 'bg-yellow-500/10',
  }
  return map[color] || 'bg-primary-500/10'
}

const getCategorySectionFrame = (color: string) => {
  const map: Record<string, { border: string; bg: string }> = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-500/20' },
    amber: { border: 'border-amber-500', bg: 'bg-amber-500/20' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500/20' },
    violet: { border: 'border-violet-500', bg: 'bg-violet-500/20' },
    yellow: { border: 'border-yellow-500', bg: 'bg-yellow-500/20' },
  }
  return map[color] || { border: 'border-primary-500', bg: 'bg-primary-500/15' }
}

const getCategoryIconColor = (color: string) => {
  const map: Record<string, string> = {
    blue: 'text-blue-400',
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

const earnedCodes = ref<Set<string>>(new Set())
const completedCourseCount = ref<number | null>(null)
const activeBlogPostCount = ref<number | null>(null)
const cultureConsultationCount = ref<number | null>(null)
const formateurPointsCount = ref<number | null>(null)
const soutienPointsCount = ref<number | null>(null)
const completedTrocExchangeCount = ref<number | null>(null)
const validatedReferralCount = ref<number | null>(null)
const tenatiraaPresencePointsCount = ref<number | null>(null)
const testimonialApprovedCount = ref<number | null>(null)
const discoveryCounts = ref<{
  transmettre: number
  connecter: number
  inspirer: number
  totalTypes: number
} | null>(null)
const walletPupuBalance = ref<number | null>(null)
const badgesLoadError = ref('')

const getSerieStatLabel = (hint: SerieStatHint | undefined): string | null => {
  if (!hint || badgesLoadError.value) return null
  switch (hint) {
    case 'academy':
      return completedCourseCount.value !== null
        ? t('account.badgesPage.academyHint', { count: completedCourseCount.value })
        : null
    case 'blog':
      return activeBlogPostCount.value !== null
        ? t('account.badgesPage.blogHint', { count: activeBlogPostCount.value })
        : null
    case 'culture':
      return cultureConsultationCount.value !== null
        ? t('account.badgesPage.cultureHint', { count: cultureConsultationCount.value })
        : null
    case 'discovery':
      return discoveryCounts.value !== null
        ? t('account.badgesPage.discoveryHint', {
            transmettre: discoveryCounts.value.transmettre,
            connecter: discoveryCounts.value.connecter,
            inspirer: discoveryCounts.value.inspirer,
            total: discoveryCounts.value.totalTypes,
          })
        : null
    case 'formateur':
      return formateurPointsCount.value !== null
        ? t('account.badgesPage.formateurHint', { count: formateurPointsCount.value })
        : null
    case 'soutien':
      return soutienPointsCount.value !== null
        ? t('account.badgesPage.soutienHint', { count: soutienPointsCount.value })
        : null
    case 'troc':
      return completedTrocExchangeCount.value !== null
        ? t('account.badgesPage.trocHint', { count: completedTrocExchangeCount.value })
        : null
    case 'referral':
      return validatedReferralCount.value !== null
        ? t('account.badgesPage.referralHint', { count: validatedReferralCount.value })
        : null
    case 'tenatiraaPresence':
      return tenatiraaPresencePointsCount.value !== null
        ? t('account.badgesPage.tenatiraaPresenceHint', { count: tenatiraaPresencePointsCount.value })
        : null
    case 'testimonial':
      return testimonialApprovedCount.value !== null
        ? t('account.badgesPage.testimonialHint', { count: testimonialApprovedCount.value })
        : null
    case 'walletPupu':
      return walletPupuBalance.value !== null
        ? t('account.badgesPage.walletPupuHint', { balance: walletPupuBalance.value })
        : null
    default:
      return null
  }
}

const loadEarnedBadges = async () => {
  badgesLoadError.value = ''
  try {
    const apiBase = config.public.apiBaseUrl || 'http://localhost:3001'
    const res = await $fetch<{
      badges: { badgeCode: string }[]
      completedCourseCount: number
      activeBlogPostCount: number
      cultureConsultationCount: number
      completedTrocExchangeCount: number
      validatedReferralCount: number
      formateurPoints: number
      soutienPoints: number
      tenatiraaPresencePoints: number
      testimonialApprovedCount: number
      walletPupuBalance: number
      discovery: {
        transmettre: number
        connecter: number
        inspirer: number
        totalTypes: number
      }
    }>(`${apiBase}/badges`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
    earnedCodes.value = new Set(res.badges.map((b) => b.badgeCode))
    myBadgeCountStore.setCount(res.badges.length)
    completedCourseCount.value = res.completedCourseCount
    activeBlogPostCount.value = res.activeBlogPostCount
    cultureConsultationCount.value = res.cultureConsultationCount
    completedTrocExchangeCount.value = res.completedTrocExchangeCount
    validatedReferralCount.value = res.validatedReferralCount
    formateurPointsCount.value = res.formateurPoints
    soutienPointsCount.value = res.soutienPoints
    tenatiraaPresencePointsCount.value = res.tenatiraaPresencePoints
    testimonialApprovedCount.value = res.testimonialApprovedCount
    walletPupuBalance.value = res.walletPupuBalance
    discoveryCounts.value = res.discovery
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    badgesLoadError.value = err?.data?.message || err?.message || t('account.badgesPage.loadError')
  }
}

onMounted(() => {
  void loadEarnedBadges()
})

const badgeDisplayName = (badge: BadgeDef) => {
  if (badge.badgeCode) {
    return t(`account.badges.codes.${badge.badgeCode}.name`)
  }
  return badge.name
}

const badgeDisplayCondition = (badge: BadgeDef) => {
  if (badge.badgeCode) {
    return t(`account.badges.codes.${badge.badgeCode}.condition`)
  }
  return badge.condition
}

const isEarned = (categoryId: string, serieIndex: number, badge: BadgeDef, badgeIndex: number) => {
  if (badge.badgeCode) {
    return earnedCodes.value.has(badge.badgeCode)
  }
  return isBadgeOwned(getBadgeKey(categoryId, serieIndex, badgeIndex))
}

const onBadgeCardClick = (categoryId: string, serieIndex: number, badge: BadgeDef, badgeIndex: number) => {
  if (badge.badgeCode) return
  toggleBadgeOwned(getBadgeKey(categoryId, serieIndex, badgeIndex))
}
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">{{ t('account.badgesPage.title') }}</h1>
      <p class="text-white/60">
        {{ t('account.badgesPage.subtitle') }}
      </p>
    </div>

    <UAlert
      v-if="badgesLoadError"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      :title="badgesLoadError"
      class="mt-4"
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
            <div
              v-if="serie.name || getSerieStatLabel(serie.statHint)"
              class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
            >
              <h3
                v-if="serie.name"
                class="text-sm font-semibold text-white/70 uppercase tracking-wider"
              >
                {{ serie.name }}
              </h3>
              <p
                v-if="getSerieStatLabel(serie.statHint)"
                :class="[
                  'text-xs font-medium text-white/55 normal-case tracking-normal text-right max-w-full sm:max-w-[55%]',
                  !serie.name ? 'w-full text-left sm:text-left' : '',
                ]"
              >
                {{ getSerieStatLabel(serie.statHint) }}
              </p>
            </div>
            <div
              :class="
                category.id === 'speciaux'
                  ? 'grid grid-cols-2 sm:grid-cols-4 gap-4'
                  : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
              "
            >
              <UCard
                v-for="(badge, badgeIndex) in serie.badges"
                :key="badgeIndex"
                :class="[
                  'bg-gradient-to-br from-white/5 to-white/[0.02] border transition-all duration-200',
                  badge.badgeCode ? 'cursor-default' : 'cursor-pointer',
                  isEarned(category.id, serieIndex, badge, badgeIndex)
                    ? 'border-amber-400 border-2 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                    : 'border-white/10 hover:border-white/20',
                ]"
                @click="onBadgeCardClick(category.id, serieIndex, badge, badgeIndex)"
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
                      v-else-if="badge.icon"
                      :name="badge.icon"
                      :class="['w-7 h-7', getCategoryIconColor(category.color)]"
                    />
                  </div>
                  <h4 class="font-semibold text-white text-sm line-clamp-2" :title="badgeDisplayName(badge)">
                    {{ badgeDisplayName(badge) }}
                  </h4>
                  <p class="text-xs text-white/50 mt-1 line-clamp-2" :title="badgeDisplayCondition(badge)">
                    {{ badgeDisplayCondition(badge) }}
                  </p>
                  <p
                    v-if="badge.statHint && getSerieStatLabel(badge.statHint)"
                    class="text-[10px] leading-tight text-white/45 mt-1.5 line-clamp-2"
                  >
                    {{ getSerieStatLabel(badge.statHint) }}
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
