<script setup lang="ts">
import { useReferralStore } from '~/stores/useReferralStore'
import { useApi } from '~/composables/useApi'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  meta: {
    title: 'Parrainage',
  },
})

const referralStore = useReferralStore()
const { getImageUrl } = useApi()
const router = useRouter()
const config = useRuntimeConfig()
const frontendUrl = config.public.frontendUrl || 'http://localhost:3000'

// State
const copied = ref(false)
const shareMethod = ref<'link' | 'code'>('link')

// Compte à rebours pour Tenatira - 11 avril 2026 à 12h00
const countdown = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
})

const targetDate = new Date('2026-04-11T12:00:00').getTime()

const updateCountdown = () => {
  const now = new Date().getTime()
  const distance = targetDate - now

  if (distance > 0) {
    countdown.value = {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000),
    }
  } else {
    countdown.value = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    }
  }
}

let countdownInterval: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  updateCountdown()
  countdownInterval = setInterval(updateCountdown, 1000)
}

// Fetch data
const fetchData = async () => {
  await referralStore.fetchAll()
}

onMounted(() => {
  fetchData()
  startCountdown()
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

// Computed
const referralLink = computed(() => referralStore.getReferralLink())
const referralCode = computed(() => referralStore.referralCode || '')

// Methods
const handleCopy = async (text: string) => {
  const result = await referralStore.copyToClipboard(text)
  if (result.success) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'inscrit':
      return 'Inscrit'
    case 'membre':
      return 'Membre'
    case 'validee':
      return 'Validée'
    default:
      return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'inscrit':
      return 'gray'
    case 'membre':
      return 'blue'
    case 'validee':
      return 'green'
    default:
      return 'gray'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'inscrit':
      return 'i-heroicons-user'
    case 'membre':
      return 'i-heroicons-check-circle'
    case 'validee':
      return 'i-heroicons-check-badge'
    default:
      return 'i-heroicons-user'
  }
}
</script>

<template>
  <div class="space-y-6">
    <ProfileIncompleteBanner />
    
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Parrainage</h1>
      <p class="text-white/60">Partagez votre lien de parrainage et gagnez des Pūpū</p>
    </div>

    <!-- Contest Banner -->
    <UCard class="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border-2 border-yellow-500/30">
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <UIcon name="i-heroicons-trophy" class="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-bold text-yellow-400 mb-2">
              Nuna'a heritage s'agrandit vite !
            </h2>
            <p class="text-white/90 mb-3">
              Les 3 membres avec le plus de filleuls validés à la date du <strong>Te Natira'a, le Samedi 11 avril 2026 à 12h00</strong> vont gagner un petit jackpot de Pūpū.
            </p>

            <!-- Compte à rebours -->
            <div class="mb-4 rounded-lg bg-black/30 p-4 border border-yellow-500/30">
              <div class="mb-3 text-center">
                <p class="text-sm font-medium text-yellow-300 mb-2">Temps restant avant la clôture du concours</p>
              </div>
              <div class="grid grid-cols-4 gap-2 sm:gap-3">
                <div class="text-center">
                  <div class="mb-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">
                    {{ countdown.days.toString().padStart(2, '0') }}
                  </div>
                  <div class="text-xs font-medium text-white/70 sm:text-sm">
                    Jours
                  </div>
                </div>
                <div class="text-center">
                  <div class="mb-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">
                    {{ countdown.hours.toString().padStart(2, '0') }}
                  </div>
                  <div class="text-xs font-medium text-white/70 sm:text-sm">
                    Heures
                  </div>
                </div>
                <div class="text-center">
                  <div class="mb-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">
                    {{ countdown.minutes.toString().padStart(2, '0') }}
                  </div>
                  <div class="text-xs font-medium text-white/70 sm:text-sm">
                    Minutes
                  </div>
                </div>
                <div class="text-center">
                  <div class="mb-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">
                    {{ countdown.seconds.toString().padStart(2, '0') }}
                  </div>
                  <div class="text-xs font-medium text-white/70 sm:text-sm">
                    Secondes
                  </div>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div class="bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 rounded-lg p-3 border border-yellow-500/40">
                <div class="flex items-center gap-2 mb-1">
                  <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-yellow-400" />
                  <span class="font-bold text-yellow-300">1er lot</span>
                </div>
                <div class="text-2xl font-bold text-white">200 🐚</div>
              </div>
              <div class="bg-gradient-to-br from-gray-400/30 to-gray-500/20 rounded-lg p-3 border border-gray-400/40">
                <div class="flex items-center gap-2 mb-1">
                  <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-gray-300" />
                  <span class="font-bold text-gray-300">2ème lot</span>
                </div>
                <div class="text-2xl font-bold text-white">150 🐚</div>
              </div>
              <div class="bg-gradient-to-br from-orange-500/30 to-orange-600/20 rounded-lg p-3 border border-orange-500/40">
                <div class="flex items-center gap-2 mb-1">
                  <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-orange-400" />
                  <span class="font-bold text-orange-300">3ème lot</span>
                </div>
                <div class="text-2xl font-bold text-white">100 🐚</div>
              </div>
            </div>

            <div class="bg-white/10 rounded-lg p-3 border border-white/20">
              <div class="flex items-center gap-2 mb-1">
                <UIcon name="i-heroicons-gift" class="w-5 h-5 text-primary-400" />
                <span class="font-semibold text-primary-300">Lots de consolation</span>
              </div>
              <p class="text-white/90">
                <strong>10 🐚</strong> pour les <strong>7 personnes suivantes</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Stats Cards -->
    <div v-if="referralStore.stats" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <div class="text-center">
          <div class="text-2xl font-bold text-primary-500">{{ referralStore.stats.total }}</div>
          <div class="text-sm text-white/60 mt-1">Total filleuls</div>
        </div>
      </UCard>
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-400">{{ referralStore.stats.inscrits }}</div>
          <div class="text-sm text-white/60 mt-1">Inscrits</div>
        </div>
      </UCard>
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-400">{{ referralStore.stats.membres }}</div>
          <div class="text-sm text-white/60 mt-1">Membres</div>
        </div>
      </UCard>
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-500">
            {{ referralStore.stats.rewardsEarned }} 🐚
          </div>
          <div class="text-sm text-white/60 mt-1">Récompenses</div>
        </div>
      </UCard>
    </div>

    <!-- Referral Code/Link Card -->
    <UCard class="bg-gradient-to-r from-primary-500/20 to-primary-600/20">
      <template #header>
        <h2 class="text-xl font-semibold">Mon lien de parrainage</h2>
      </template>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-white/70 mb-2">
            Choisir le format à partager
          </label>
          <div class="flex gap-2">
            <UButton
              :variant="shareMethod === 'link' ? 'solid' : 'outline'"
              :color="shareMethod === 'link' ? 'primary' : 'gray'"
              @click="shareMethod = 'link'"
            >
              Lien complet
            </UButton>
            <UButton
              :variant="shareMethod === 'code' ? 'solid' : 'outline'"
              :color="shareMethod === 'code' ? 'primary' : 'gray'"
              @click="shareMethod = 'code'"
            >
              Code uniquement
            </UButton>
          </div>
        </div>

        <div v-if="shareMethod === 'link'">
          <label class="block text-sm font-medium text-white/70 mb-2">
            Lien de parrainage
          </label>
          <div class="flex gap-2">
            <UInput
              :model-value="referralLink"
              readonly
              class="flex-1"
            />
            <UButton
              :color="copied ? 'green' : 'primary'"
              :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
              @click="handleCopy(referralLink)"
            >
              {{ copied ? 'Copié !' : 'Copier' }}
            </UButton>
          </div>
        </div>

        <div v-else>
          <label class="block text-sm font-medium text-white/70 mb-2">
            Code de parrainage
          </label>
          <div class="flex gap-2">
            <UInput
              :model-value="referralCode"
              readonly
              class="flex-1 font-mono text-lg font-bold"
            />
            <UButton
              :color="copied ? 'green' : 'primary'"
              :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
              @click="handleCopy(referralCode)"
            >
              {{ copied ? 'Copié !' : 'Copier' }}
            </UButton>
          </div>
        </div>

        <div class="bg-white/5 rounded-lg p-4 text-sm text-white/70">
          <p class="font-semibold mb-2">💡 Comment ça marche ?</p>
          <ul class="space-y-1 list-disc list-inside">
            <li>Partagez votre lien ou code avec vos amis</li>
            <li>Quand ils s'inscrivent, ils deviennent vos filleuls</li>
            <li>Quand un filleul devient membre, vous gagnez <strong>50 Pūpū</strong></li>
            <li>Chaque filleul ne peut vous rapporter qu'une seule fois</li>
          </ul>
        </div>
      </div>
    </UCard>

    <!-- Referrals List -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Mes filleuls</h2>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-heroicons-arrow-path"
            :loading="referralStore.isLoading"
            @click="referralStore.fetchReferrals()"
          >
            Actualiser
          </UButton>
        </div>
      </template>

      <div v-if="referralStore.isLoading" class="text-center py-8">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>

      <div v-else-if="referralStore.referrals.length > 0" class="space-y-4">
        <div
          v-for="referral in referralStore.referrals"
          :key="referral.id"
          class="flex items-center justify-between border-b border-white/10 pb-4 last:border-0"
        >
          <div class="flex items-center gap-4 flex-1">
            <UAvatar
              v-if="referral.referred.avatarImage"
              :src="getImageUrl(referral.referred.avatarImage)"
              :alt="referral.referred.email"
              size="md"
            />
            <UAvatar
              v-else
              :alt="referral.referred.email"
              :text="(referral.referred.firstName?.[0] || referral.referred.email[0]).toUpperCase()"
              size="md"
            />
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate">
                {{ referral.referred.firstName && referral.referred.lastName
                  ? `${referral.referred.firstName} ${referral.referred.lastName}`
                  : referral.referred.email }}
              </div>
              <div class="text-sm text-white/60 truncate">
                {{ referral.referred.email }}
              </div>
              <div class="text-xs text-white/40 mt-1">
                Inscrit le {{ new Date(referral.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }) }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              :color="getStatusColor(referral.status)"
              variant="subtle"
              :icon="getStatusIcon(referral.status)"
            >
              {{ getStatusLabel(referral.status) }}
            </UBadge>
            <div v-if="referral.status === 'validee'" class="text-green-500 font-semibold">
              +50 🐚
            </div>
          </div>
        </div>
      </div>

      <div v-else class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-user-group" class="mx-auto mb-4 h-12 w-12" />
        <p>Vous n'avez pas encore de filleuls</p>
        <p class="text-sm mt-2">Partagez votre lien pour inviter vos amis !</p>
      </div>
    </UCard>
  </div>
</template>
