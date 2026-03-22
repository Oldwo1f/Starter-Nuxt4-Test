<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'
import { useMyBadgeCountStore } from '~/stores/useMyBadgeCountStore'

const authStore = useAuthStore()
const myBadgeCountStore = useMyBadgeCountStore()
const walletStore = useWalletStore()
const marketplaceStore = useMarketplaceStore()
const router = useRouter()
const toast = useToast()
const { getImageUrl } = useApi()
const { t } = useI18n()

// Stats
const stats = ref({
  listingsCount: 0,
  transactionsCount: 0,
})

// Fetch data
const fetchData = async () => {
  if (authStore.isAuthenticated) {
    await Promise.all([
      authStore.fetchProfile(),
      walletStore.fetchBalance(),
      fetchStats(),
    ])
  }
}

const fetchStats = async () => {
  try {
    // Fetch user listings count
    const listingsResult = await marketplaceStore.fetchListings(1, 1, {
      sellerId: authStore.user?.id,
    })
    stats.value.listingsCount = listingsResult.data?.total || 0

    // Fetch transactions count
    const transactionsResult = await walletStore.fetchTransactions(1, 1)
    stats.value.transactionsCount = transactionsResult.data?.total || 0
  } catch (error) {
    console.error('Error fetching stats:', error)
  }
}

// Redirect to login if not authenticated
onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
  } else {
    fetchData()
  }
})

const user = computed(() => authStore.user)

// Form state
const isEditing = ref(false)
const formData = ref({
  firstName: '',
  lastName: '',
  avatarImage: '',
})

// Initialize form data from user
watch(user, (newUser) => {
  if (newUser) {
    formData.value = {
      firstName: newUser.firstName || '',
      lastName: newUser.lastName || '',
      avatarImage: newUser.avatarImage || '',
    }
  }
}, { immediate: true })

const isSaving = ref(false)

const startEditing = () => {
  if (user.value) {
    formData.value = {
      firstName: user.value.firstName || '',
      lastName: user.value.lastName || '',
      avatarImage: user.value.avatarImage || '',
    }
    isEditing.value = true
  }
}

const cancelEditing = () => {
  if (user.value) {
    formData.value = {
      firstName: user.value.firstName || '',
      lastName: user.value.lastName || '',
      avatarImage: user.value.avatarImage || '',
    }
  }
  isEditing.value = false
}

const saveProfile = async () => {
  isSaving.value = true
  try {
    const result = await authStore.updateProfile({
      firstName: formData.value.firstName || undefined,
      lastName: formData.value.lastName || undefined,
      // avatarImage n'est plus géré ici car il est géré par AvatarUpload
    })

    if (result.success) {
      toast.add({
        title: t('profilePublic.toastUpdatedTitle'),
        description: t('profilePublic.toastUpdatedDesc'),
        color: 'success',
      })
      isEditing.value = false
    } else {
      toast.add({
        title: t('profilePublic.toastErrorTitle'),
        description: result.error || t('profilePublic.toastErrorUpdate'),
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: t('profilePublic.toastErrorTitle'),
      description: error.message || t('profilePublic.toastErrorUpdate'),
      color: 'red',
    })
  } finally {
    isSaving.value = false
  }
}

const getDisplayName = computed(() => {
  if (!user.value) return t('profilePublic.userFallback')
  if (user.value.firstName && user.value.lastName) {
    return `${user.value.firstName} ${user.value.lastName}`
  }
  if (user.value.firstName) {
    return user.value.firstName
  }
  if (user.value.lastName) {
    return user.value.lastName
  }
  return user.value.email
})

const getAvatarText = computed(() => {
  if (!user.value) return 'U'
  if (user.value.firstName) {
    return user.value.firstName.charAt(0).toUpperCase()
  }
  if (user.value.lastName) {
    return user.value.lastName.charAt(0).toUpperCase()
  }
  return user.value.email?.charAt(0).toUpperCase() || 'U'
})

const handleAvatarUploaded = async (avatarUrl: string) => {
  // Rafraîchir le profil pour obtenir les dernières données
  await authStore.fetchProfile()
}

// Password change state
const isChangingPassword = ref(false)
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const isSavingPassword = ref(false)

const startChangingPassword = () => {
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
  isChangingPassword.value = true
}

const cancelChangingPassword = () => {
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
  isChangingPassword.value = false
}

const savePassword = async () => {
  // Validation
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    toast.add({
      title: t('profilePublic.toastErrorTitle'),
      description: t('profilePublic.toastPwFill'),
      color: 'red',
    })
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    toast.add({
      title: t('profilePublic.toastErrorTitle'),
      description: t('profilePublic.toastPwShort'),
      color: 'red',
    })
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.add({
      title: t('profilePublic.toastErrorTitle'),
      description: t('profilePublic.toastPwMismatch'),
      color: 'red',
    })
    return
  }

  isSavingPassword.value = true
  try {
    const result = await authStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    )

    if (result.success) {
      toast.add({
        title: t('profilePublic.toastPwSuccessTitle'),
        description: t('profilePublic.toastPwSuccessDesc'),
        color: 'success',
      })
      cancelChangingPassword()
    } else {
      toast.add({
        title: t('profilePublic.toastErrorTitle'),
        description: result.error || t('profilePublic.toastPwError'),
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: t('profilePublic.toastErrorTitle'),
      description: error.message || t('profilePublic.toastPwError'),
      color: 'red',
    })
  } finally {
    isSavingPassword.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10">
    <div class="space-y-6">
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight">{{ t('profilePublic.title') }}</h1>
        <p class="text-white/70">{{ t('profilePublic.subtitle') }}</p>
      </div>

      <!-- Wallet Balance & Stats -->
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <UCard class="bg-gradient-to-r from-primary-500/20 to-primary-600/20">
          <div class="text-center">
            <div class="mb-2 text-sm text-white/60">{{ t('profilePublic.balancePupu') }}</div>
            <div class="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-primary-500">
              <span>🐚</span>
              <span>{{ walletStore.balance.toFixed(2) }}</span>
            </div>
            <UButton to="/account/wallet" variant="ghost" size="sm" class="mt-2">
              {{ t('profilePublic.seeWallet') }}
            </UButton>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="mb-2 text-sm text-white/60">{{ t('profilePublic.listings') }}</div>
            <div class="text-3xl font-bold">{{ stats.listingsCount }}</div>
            <UButton to="/account/listings" variant="ghost" size="sm" class="mt-2">
              {{ t('profilePublic.myListings') }}
            </UButton>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="mb-2 text-sm text-white/60">{{ t('profilePublic.transactions') }}</div>
            <div class="text-3xl font-bold">{{ stats.transactionsCount }}</div>
            <UButton to="/account/transactions" variant="ghost" size="sm" class="mt-2">
              {{ t('profilePublic.history') }}
            </UButton>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="mb-2 text-sm text-white/60">{{ t('profilePublic.role') }}</div>
            <div class="text-lg font-semibold">{{ user?.role || t('profilePublic.member') }}</div>
            <UBadge v-if="user?.role === 'member'" color="green" variant="subtle" class="mt-2">
              {{ t('profilePublic.certifiedBadge') }}
            </UBadge>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user-circle" />
              <span class="font-medium">{{ t('profilePublic.personalInfo') }}</span>
            </div>
            <UButton
              v-if="!isEditing"
              @click="startEditing"
              color="primary"
              variant="outline"
              size="sm"
            >
              <UIcon name="i-heroicons-pencil" class="mr-2" />
              {{ t('profilePublic.edit') }}
            </UButton>
          </div>
        </template>

        <div v-if="user" class="space-y-6">
          <div class="flex items-center gap-4">
            <CertifiedAvatar
              :src="user.avatarImage ? getImageUrl(user.avatarImage) : null"
              :alt="getDisplayName"
              :text="getAvatarText"
              size="xl"
              :is-certified="user.isCertified === true"
              :badge-level="myBadgeCountStore.count"
              avatar-class="ring-2 ring-primary-500/20"
            />
            <div>
              <h3 class="text-lg font-semibold">{{ getDisplayName }}</h3>
              <p class="text-sm text-white/60">{{ user.email }}</p>
            </div>
          </div>

          <div v-if="!isEditing" class="grid gap-4 sm:grid-cols-2">
            <UFormGroup :label="t('profilePublic.firstName')" name="firstName">
              <UInput
                :value="user.firstName || t('profilePublic.notProvided')"
                disabled
                icon="i-heroicons-user"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup :label="t('profilePublic.lastName')" name="lastName">
              <UInput
                :value="user.lastName || t('profilePublic.notProvided')"
                disabled
                icon="i-heroicons-user"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup :label="t('profilePublic.email')" name="email">
              <UInput
                :value="user.email"
                disabled
                icon="i-heroicons-envelope"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup :label="t('profilePublic.role')" name="role">
              <UInput
                :value="user.role"
                disabled
                icon="i-heroicons-shield-check"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup :label="t('profilePublic.avatar')" name="avatarImage">
              <div class="flex items-center gap-4">
                <CertifiedAvatar
                  :src="user.avatarImage ? getImageUrl(user.avatarImage) : null"
                  :alt="getDisplayName"
                  :text="getAvatarText"
                  size="lg"
                  :is-certified="user.isCertified === true"
                  :badge-level="myBadgeCountStore.count"
                  avatar-class="ring-2 ring-primary-500/20"
                />
                <p class="text-sm text-white/60">
                  {{ user.avatarImage ? t('profilePublic.avatarCustom') : t('profilePublic.avatarNone') }}
                </p>
              </div>
            </UFormGroup>
          </div>

          <div v-else class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormGroup :label="t('profilePublic.firstName')" name="firstName">
                <UInput
                  v-model="formData.firstName"
                  :placeholder="t('profilePublic.placeholderFirstName')"
                  icon="i-heroicons-user"
                  size="lg"
                />
              </UFormGroup>

              <UFormGroup :label="t('profilePublic.lastName')" name="lastName">
                <UInput
                  v-model="formData.lastName"
                  :placeholder="t('profilePublic.placeholderLastName')"
                  icon="i-heroicons-user"
                  size="lg"
                />
              </UFormGroup>

              <UFormGroup :label="t('profilePublic.avatar')" name="avatarImage" class="sm:col-span-2">
                <AvatarUpload
                  :current-avatar="user?.avatarImage ? getImageUrl(user.avatarImage) : null"
                  :user-id="user?.id"
                  @uploaded="handleAvatarUploaded"
                />
              </UFormGroup>
            </div>

            <div class="flex items-center gap-3 pt-4 border-t border-white/10">
              <UButton
                @click="saveProfile"
                color="primary"
                :loading="isSaving"
                :disabled="isSaving"
              >
                {{ t('profilePublic.save') }}
              </UButton>
              <UButton
                @click="cancelEditing"
                color="gray"
                variant="outline"
                :disabled="isSaving"
              >
                {{ t('profilePublic.cancel') }}
              </UButton>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <p class="text-white/60">{{ t('profilePublic.loading') }}</p>
        </div>
      </UCard>

      <!-- Password Change Section -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-key" />
              <span class="font-medium">{{ t('profilePublic.security') }}</span>
            </div>
            <UButton
              v-if="!isChangingPassword"
              @click="startChangingPassword"
              color="primary"
              variant="outline"
              size="sm"
            >
              <UIcon name="i-heroicons-lock-closed" class="mr-2" />
              {{ t('profilePublic.changePassword') }}
            </UButton>
          </div>
        </template>

        <div v-if="!isChangingPassword" class="space-y-2">
          <p class="text-sm text-white/60">
            {{ t('profilePublic.securityHint') }}
          </p>
          <p class="text-xs text-white/50">
            {{ t('profilePublic.passwordMinHint') }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <UFormGroup :label="t('profilePublic.currentPassword')" name="currentPassword" required>
            <UInput
              v-model="passwordForm.currentPassword"
              type="password"
              :placeholder="t('profilePublic.placeholderCurrentPw')"
              icon="i-heroicons-lock-closed"
              size="lg"
              :disabled="isSavingPassword"
            />
          </UFormGroup>

          <UFormGroup :label="t('profilePublic.newPassword')" name="newPassword" required>
            <UInput
              v-model="passwordForm.newPassword"
              type="password"
              :placeholder="t('profilePublic.placeholderNewPw')"
              icon="i-heroicons-lock-closed"
              size="lg"
              :disabled="isSavingPassword"
            />
            <template #hint>
              <span class="text-xs text-white/50">{{ t('profilePublic.hintMin6') }}</span>
            </template>
          </UFormGroup>

          <UFormGroup :label="t('profilePublic.confirmNewPassword')" name="confirmPassword" required>
            <UInput
              v-model="passwordForm.confirmPassword"
              type="password"
              :placeholder="t('profilePublic.placeholderConfirmPw')"
              icon="i-heroicons-lock-closed"
              size="lg"
              :disabled="isSavingPassword"
            />
          </UFormGroup>

          <div class="flex items-center gap-3 pt-4 border-t border-white/10">
            <UButton
              @click="savePassword"
              color="primary"
              :loading="isSavingPassword"
              :disabled="isSavingPassword"
            >
              {{ t('profilePublic.save') }}
            </UButton>
            <UButton
              @click="cancelChangingPassword"
              color="gray"
              variant="outline"
              :disabled="isSavingPassword"
            >
              {{ t('profilePublic.cancel') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
