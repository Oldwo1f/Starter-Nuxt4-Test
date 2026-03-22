<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

export type MemberBadgeProfileResponse = {
  firstName: string | null
  lastName: string | null
  avatarImage: string | null
  isCertified: boolean
  totalBadgeCount: number
  displayBadges: { badgeCode: string; earnedAt: string }[]
}

const props = withDefaults(
  defineProps<{
    userId: number | null
    /** Si ouvert depuis une annonce, pré-remplit le fil de discussion. */
    listingId?: number | null
  }>(),
  { listingId: null }
)

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { apiBaseUrl } = useApi()
const authStore = useAuthStore()
const { badgeEmoji } = useBadgeEmoji()

const canContact = computed(
  () =>
    authStore.isAuthenticated &&
    props.userId != null &&
    authStore.user?.id !== props.userId
)

function openChat() {
  const uid = props.userId
  if (uid == null) return
  isOpen.value = false
  const query: Record<string, string> = { userId: String(uid) }
  if (props.listingId != null) {
    query.listingId = String(props.listingId)
  }
  navigateTo({
    path: '/account/messages',
    query,
  })
}

const profile = ref<MemberBadgeProfileResponse | null>(null)
const loading = ref(false)
const loadError = ref(false)

function displayName(p: MemberBadgeProfileResponse) {
  const n = `${p.firstName || ''} ${p.lastName || ''}`.trim()
  return n || t('common.anonymous')
}

function avatarSrc(path: string | null) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${apiBaseUrl}${path}`
}

function avatarInitials(p: MemberBadgeProfileResponse) {
  if (p.firstName?.length) {
    return p.firstName.charAt(0).toUpperCase()
  }
  if (p.lastName?.length) {
    return p.lastName.charAt(0).toUpperCase()
  }
  return 'U'
}

function badgeDisplayName(code: string) {
  const key = `account.badges.codes.${code}.name`
  const label = t(key)
  return label === key ? code : label
}

function badgeConditionLine(code: string) {
  const key = `account.badges.codes.${code}.condition`
  const label = t(key)
  return label === key ? '' : label
}

async function loadProfile() {
  const id = props.userId
  if (!id || !authStore.accessToken) {
    return
  }
  loading.value = true
  loadError.value = false
  profile.value = null
  try {
    profile.value = await $fetch<MemberBadgeProfileResponse>(
      `${apiBaseUrl}/badges/members/${id}/profile`,
      {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }
    )
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => [isOpen.value, props.userId] as const,
  ([open, uid]) => {
    if (open && uid) {
      loadProfile()
    }
    if (!open) {
      profile.value = null
      loadError.value = false
    }
  }
)
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{
      wrapper: 'w-full max-w-lg',
    }"
  >
    <template #header>
      <h3 class="text-lg font-semibold text-white">
        {{ t('marketplace.memberProfile.title') }}
      </h3>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-10">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
      </div>
      <div v-else-if="loadError" class="py-6 text-center text-red-400">
        {{ t('marketplace.memberProfile.loadError') }}
      </div>
      <div v-else-if="profile" class="space-y-6">
        <div class="flex items-center gap-4">
          <CertifiedAvatar
            :src="avatarSrc(profile.avatarImage)"
            :alt="displayName(profile)"
            :text="avatarInitials(profile)"
            size="xl"
            :is-certified="profile.isCertified === true"
            :badge-level="profile.totalBadgeCount"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate text-lg font-semibold">{{ displayName(profile) }}</span>
              <UBadge
                v-if="profile.isCertified"
                color="warning"
                variant="soft"
                size="sm"
                class="flex shrink-0 items-center gap-1"
              >
                <UIcon name="i-heroicons-shield-check" class="h-3 w-3" />
                {{ t('marketplaceListing.certified') }}
              </UBadge>
            </div>
            <UButton
              v-if="canContact"
              color="primary"
              block
              icon="i-heroicons-chat-bubble-left-right"
              class="mt-3"
              @click="openChat"
            >
              {{ t('marketplace.memberProfile.contact') }}
            </UButton>
          </div>
        </div>

        <div>
          <h4 class="mb-3 text-sm font-medium text-white/80">
            {{ t('marketplace.memberProfile.badgesTitle') }}
          </h4>
          <p v-if="profile.displayBadges.length === 0" class="text-sm text-white/50">
            {{ t('marketplace.memberProfile.noBadges') }}
          </p>
          <ul v-else class="max-h-64 space-y-2 overflow-y-auto pr-1">
            <li
              v-for="b in profile.displayBadges"
              :key="b.badgeCode"
              class="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <span class="text-2xl leading-none">{{ badgeEmoji(b.badgeCode) }}</span>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-white">
                  {{ badgeDisplayName(b.badgeCode) }}
                </p>
                <p v-if="badgeConditionLine(b.badgeCode)" class="text-xs text-white/50">
                  {{ badgeConditionLine(b.badgeCode) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </UModal>
</template>
