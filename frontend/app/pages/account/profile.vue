<script setup lang="ts">
definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.menuProfile',
})

import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

const authStore = useAuthStore()
const walletStore = useWalletStore()
const marketplaceStore = useMarketplaceStore()
const toast = useToast()
const { t } = useI18n()
const { getImageUrl, apiBaseUrl } = useApi()

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
      Promise.all([walletStore.fetchBalance(), walletStore.fetchJijiBalance()]),
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

const user = computed(() => authStore.user)

// Form state
const isEditing = ref(false)
const formData = ref({
  firstName: '',
  lastName: '',
  avatarImage: '',
  phoneNumber: '',
  commune: '',
})

// Contact preferences state
const isEditingContactPreferences = ref(false)
const contactPreferences = ref({
  order: ['phone', 'messenger', 'telegram', 'whatsapp'],
  accounts: {
    messenger: '',
    telegram: '',
    whatsapp: '',
  },
})
const contactPreferencesBackup = ref({
  order: ['phone', 'messenger', 'telegram', 'whatsapp'],
  accounts: {
    messenger: '',
    telegram: '',
    whatsapp: '',
  },
})

// Trading preferences state
const isEditingTradingPreferences = ref(false)
const tradingPreferences = ref<string[]>([])
const tradingPreferencesBackup = ref<string[]>([])

const tradingTags = computed(() => [
  { id: 'poisson', type: 'product' as const, label: t('account.profileExtra.tagPoisson'), icon: 'ph:fish-simple-fill' },
  { id: 'fruit', type: 'product' as const, label: t('account.profileExtra.tagFruit'), icon: 'streamline-ultimate:fruit-banana-bold' },
  { id: 'legumes', type: 'product' as const, label: t('account.profileExtra.tagLegumes'), icon: 'fluent:food-carrot-20-regular' },
  { id: 'maa', type: 'product' as const, label: t('account.profileExtra.tagMaa'), icon: 'streamline:food-pizza-drink-cook-fast-cooking-nutrition-pizza-food' },
  { id: 'seefood', type: 'product' as const, label: t('account.profileExtra.tagSeafood'), icon: 'maki:restaurant-seafood' },
  { id: 'electronique', type: 'product' as const, label: t('account.profileExtra.tagElectronique'), icon: 'i-material-symbols-devices-outline' },
  { id: 'jouet-vetement-bebe', type: 'product' as const, label: t('account.profileExtra.tagBebe'), icon: 'streamline:shopping-catergories-baby-botlle-bottle-milk-family-children-formula-care-child-kid-baby' },
  { id: 'jouet-vetement-enfants', type: 'product' as const, label: t('account.profileExtra.tagEnfants'), icon: 'fa7-solid:children' },
  { id: 'service-jardin', type: 'service' as const, label: t('account.profileExtra.tagJardin'), icon: 'ph:tree-duotone' },
  { id: 'service-batiment', type: 'service' as const, label: t('account.profileExtra.tagBatiment'), icon: 'material-symbols:tools-power-drill-outline-sharp' },
  { id: 'service-transport', type: 'service' as const, label: t('account.profileExtra.tagTransport'), icon: 'i-material-symbols-local-shipping-outline' },
  { id: 'service-informatique', type: 'service' as const, label: t('account.profileExtra.tagInfo'), icon: 'i-material-symbols-computer-outline' },
])

// Communes list
const communes = ref<string[]>([])
const isLoadingCommunes = ref(false)

// Fetch communes
const fetchCommunes = async () => {
  isLoadingCommunes.value = true
  try {
    const hierarchy = await $fetch<any[]>(`${apiBaseUrl}/locations/hierarchy`)
    const uniqueCommunes = new Set<string>()
    hierarchy.forEach((archipel) => {
      archipel.communes.forEach((commune: any) => {
        uniqueCommunes.add(commune.commune)
      })
    })
    communes.value = Array.from(uniqueCommunes).sort()
  } catch (error) {
    console.error('Error fetching communes:', error)
    communes.value = []
  } finally {
    isLoadingCommunes.value = false
  }
}

// Initialize form data from user
watch(user, (newUser) => {
  if (newUser) {
    formData.value = {
      firstName: newUser.firstName || '',
      lastName: newUser.lastName || '',
      avatarImage: newUser.avatarImage || '',
      phoneNumber: newUser.phoneNumber || '',
      commune: newUser.commune || '',
    }
    
    // Initialize contact preferences
    if (newUser.contactPreferences) {
      contactPreferences.value = {
        order: newUser.contactPreferences.order || ['phone', 'messenger', 'telegram', 'whatsapp'],
        accounts: {
          messenger: newUser.contactPreferences.accounts?.messenger || '',
          telegram: newUser.contactPreferences.accounts?.telegram || '',
          whatsapp: newUser.contactPreferences.accounts?.whatsapp || '',
        },
      }
    } else {
      contactPreferences.value = {
        order: ['phone', 'messenger', 'telegram', 'whatsapp'],
        accounts: {
          messenger: '',
          telegram: '',
          whatsapp: '',
        },
      }
    }
    
    // Initialize trading preferences
    tradingPreferences.value = newUser.tradingPreferences || []
    tradingPreferencesBackup.value = [...(newUser.tradingPreferences || [])]
  }
}, { immediate: true })

const isSaving = ref(false)
const isSavingContactPreferences = ref(false)
const isSavingTradingPreferences = ref(false)

const startEditing = () => {
  if (user.value) {
    formData.value = {
      firstName: user.value.firstName || '',
      lastName: user.value.lastName || '',
      avatarImage: user.value.avatarImage || '',
      phoneNumber: user.value.phoneNumber || '',
      commune: user.value.commune || '',
    }
    
    // Initialize contact preferences
    if (user.value.contactPreferences) {
      contactPreferences.value = {
        order: user.value.contactPreferences.order || ['phone', 'messenger', 'telegram', 'whatsapp'],
        accounts: {
          messenger: user.value.contactPreferences.accounts?.messenger || '',
          telegram: user.value.contactPreferences.accounts?.telegram || '',
          whatsapp: user.value.contactPreferences.accounts?.whatsapp || '',
        },
      }
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
      phoneNumber: user.value.phoneNumber || '',
      commune: user.value.commune || '',
    }
    
    // Reset contact preferences
    if (user.value.contactPreferences) {
      contactPreferences.value = {
        order: user.value.contactPreferences.order || ['phone', 'messenger', 'telegram', 'whatsapp'],
        accounts: {
          messenger: user.value.contactPreferences.accounts?.messenger || '',
          telegram: user.value.contactPreferences.accounts?.telegram || '',
          whatsapp: user.value.contactPreferences.accounts?.whatsapp || '',
        },
      }
    }
  }
  isEditing.value = false
}

const saveProfile = async () => {
  isSaving.value = true
  try {
    const result = await authStore.updateProfile({
      firstName: formData.value.firstName || null,
      lastName: formData.value.lastName || null,
      phoneNumber: formData.value.phoneNumber || null,
      commune: formData.value.commune || null,
      contactPreferences: contactPreferences.value,
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

// Validation computed
const missingPersonalInfoFields = computed(() => {
  if (!user.value) return [] as string[]
  const missing: string[] = []
  if (!user.value.phoneNumber || !user.value.phoneNumber.trim()) missing.push('phone')
  if (!user.value.firstName || !user.value.firstName.trim()) missing.push('firstName')
  if (!user.value.lastName || !user.value.lastName.trim()) missing.push('lastName')
  if (!user.value.commune || !user.value.commune.trim()) missing.push('commune')
  return missing
})

const isPersonalInfoValid = computed(() => {
  return missingPersonalInfoFields.value.length === 0
})

const labelForMissingField = (code: string) => {
  if (code === 'phone') return t('account.profileExtra.missingPhone')
  if (code === 'firstName') return t('account.profileExtra.missingFirstName')
  if (code === 'lastName') return t('account.profileExtra.missingLastName')
  return t('account.profileExtra.missingCommune')
}

const personalInfoMessage = computed(() => {
  const codes = missingPersonalInfoFields.value
  if (codes.length === 0) return ''
  const labels = codes.map(labelForMissingField)
  if (labels.length === 1) {
    return t('account.profileExtra.profileInvalidOne', { item: labels[0] })
  }
  if (labels.length === 2) {
    return t('account.profileExtra.profileInvalidTwo', { a: labels[0], b: labels[1] })
  }
  const head = labels.slice(0, -1).join(', ')
  const last = labels[labels.length - 1]
  return t('account.profileExtra.profileInvalidMany', { head, last })
})

// Trading preferences functions
const startEditingTradingPreferences = () => {
  if (user.value) {
    tradingPreferences.value = [...(user.value.tradingPreferences || [])]
    tradingPreferencesBackup.value = [...(user.value.tradingPreferences || [])]
  }
  isEditingTradingPreferences.value = true
}

const cancelEditingTradingPreferences = () => {
  tradingPreferences.value = [...tradingPreferencesBackup.value]
  isEditingTradingPreferences.value = false
}

const toggleTradingTag = (tagId: string) => {
  const index = tradingPreferences.value.indexOf(tagId)
  if (index > -1) {
    tradingPreferences.value.splice(index, 1)
  } else {
    tradingPreferences.value.push(tagId)
  }
}

const isTagSelected = (tagId: string) => {
  return tradingPreferences.value.includes(tagId)
}

// Séparer les tags par type
const productTags = computed(() => tradingTags.value.filter(tag => tag.type === 'product'))
const serviceTags = computed(() => tradingTags.value.filter(tag => tag.type === 'service'))

const saveTradingPreferences = async () => {
  isSavingTradingPreferences.value = true
  try {
    const result = await authStore.updateProfile({
      tradingPreferences: tradingPreferences.value,
    })

    if (result.success) {
      toast.add({
        title: t('account.profileExtra.prefsUpdatedTitle'),
        description: t('account.profileExtra.prefsUpdatedDesc'),
        color: 'success',
      })
      isEditingTradingPreferences.value = false
      tradingPreferencesBackup.value = [...tradingPreferences.value]
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
    isSavingTradingPreferences.value = false
  }
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

// Drag & drop handlers for contact preferences
const draggedIndex = ref<number | null>(null)

const handleDragStart = (index: number) => {
  draggedIndex.value = index
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault()
  if (draggedIndex.value === null) return
  
  const items = [...contactPreferences.value.order]
  const draggedItem = items[draggedIndex.value]
  items.splice(draggedIndex.value, 1)
  items.splice(dropIndex, 0, draggedItem)
  contactPreferences.value.order = items
  draggedIndex.value = null
}

const getContactMethodLabel = (method: string) => {
  const keys: Record<string, string> = {
    phone: 'account.profileExtra.methodPhone',
    messenger: 'account.profileExtra.methodMessenger',
    telegram: 'account.profileExtra.methodTelegram',
    whatsapp: 'account.profileExtra.methodWhatsapp',
  }
  const key = keys[method]
  return key ? t(key) : method
}

const getContactMethodIcon = (method: string) => {
  const icons: Record<string, string> = {
    phone: 'i-heroicons-phone',
    messenger: 'i-heroicons-chat-bubble-left-right',
    telegram: 'i-heroicons-paper-airplane',
    whatsapp: 'i-heroicons-chat-bubble-oval-left',
  }
  return icons[method] || 'i-heroicons-circle-stack'
}

// Contact preferences editing functions
const phoneNumberBackup = ref('')

const startEditingContactPreferences = () => {
  if (user.value) {
    // Backup current phone number
    phoneNumberBackup.value = formData.value.phoneNumber
    
    // Backup current values
    if (user.value.contactPreferences) {
      contactPreferencesBackup.value = {
        order: [...(user.value.contactPreferences.order || ['phone', 'messenger', 'telegram', 'whatsapp'])],
        accounts: {
          messenger: user.value.contactPreferences.accounts?.messenger || '',
          telegram: user.value.contactPreferences.accounts?.telegram || '',
          whatsapp: user.value.contactPreferences.accounts?.whatsapp || '',
        },
      }
      contactPreferences.value = {
        order: [...(user.value.contactPreferences.order || ['phone', 'messenger', 'telegram', 'whatsapp'])],
        accounts: {
          messenger: user.value.contactPreferences.accounts?.messenger || '',
          telegram: user.value.contactPreferences.accounts?.telegram || '',
          whatsapp: user.value.contactPreferences.accounts?.whatsapp || '',
        },
      }
    } else {
      contactPreferencesBackup.value = {
        order: ['phone', 'messenger', 'telegram', 'whatsapp'],
        accounts: {
          messenger: '',
          telegram: '',
          whatsapp: '',
        },
      }
      contactPreferences.value = {
        order: ['phone', 'messenger', 'telegram', 'whatsapp'],
        accounts: {
          messenger: '',
          telegram: '',
          whatsapp: '',
        },
      }
    }
    isEditingContactPreferences.value = true
  }
}

const cancelEditingContactPreferences = () => {
  // Restore phone number from backup
  formData.value.phoneNumber = phoneNumberBackup.value
  
  // Restore from backup
  contactPreferences.value = {
    order: [...contactPreferencesBackup.value.order],
    accounts: {
      messenger: contactPreferencesBackup.value.accounts.messenger,
      telegram: contactPreferencesBackup.value.accounts.telegram,
      whatsapp: contactPreferencesBackup.value.accounts.whatsapp,
    },
  }
  isEditingContactPreferences.value = false
}

const saveContactPreferences = async () => {
  isSavingContactPreferences.value = true
  try {
    const result = await authStore.updateProfile({
      phoneNumber: formData.value.phoneNumber || null,
      contactPreferences: {
        order: contactPreferences.value.order,
        accounts: {
          messenger: contactPreferences.value.accounts.messenger || null,
          telegram: contactPreferences.value.accounts.telegram || null,
          whatsapp: contactPreferences.value.accounts.whatsapp || null,
        },
      },
    })

    if (result.success) {
      toast.add({
        title: t('account.profileExtra.prefsUpdatedTitle'),
        description: t('account.profileExtra.prefsUpdatedDesc'),
        color: 'success',
      })
      isEditingContactPreferences.value = false
      // Update backup with new values
      contactPreferencesBackup.value = {
        order: [...contactPreferences.value.order],
        accounts: {
          messenger: contactPreferences.value.accounts.messenger,
          telegram: contactPreferences.value.accounts.telegram,
          whatsapp: contactPreferences.value.accounts.whatsapp,
        },
      }
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
    isSavingContactPreferences.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchCommunes()
})
</script>

<template>
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
            <span>{{ Math.round(walletStore.balance) }}</span>
          </div>
          <UButton to="/account/wallet" variant="ghost" size="sm" class="mt-2">
            {{ t('profilePublic.seeWallet') }}
          </UButton>
        </div>
      </UCard>
      <UCard class="bg-gradient-to-r from-amber-500/20 to-amber-600/20">
        <div class="text-center">
          <div class="mb-2 text-sm text-white/60">{{ t('account.dashboard.gameTokens') }}</div>
            <div class="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-amber-500">
              <JijiIcon size="md" />
              <span>{{ Math.round(walletStore.jijiBalance) }}</span>
            </div>
          <UButton to="/games/bingo" variant="ghost" size="sm" class="mt-2">
            {{ t('games.play') }}
          </UButton>
        </div>
      </UCard>
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <div class="text-center">
          <div class="mb-2 text-sm text-white/60">{{ t('profilePublic.listings') }}</div>
          <div class="text-3xl font-bold">{{ stats.listingsCount }}</div>
          <UButton to="/account/listings" variant="ghost" size="sm" class="mt-2">
            {{ t('profilePublic.myListings') }}
          </UButton>
        </div>
      </UCard>
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <div class="text-center">
          <div class="mb-2 text-sm text-white/60">{{ t('profilePublic.transactions') }}</div>
          <div class="text-3xl font-bold">{{ stats.transactionsCount }}</div>
          <UButton to="/account/transactions" variant="ghost" size="sm" class="mt-2">
            {{ t('profilePublic.history') }}
          </UButton>
        </div>
      </UCard>
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <div class="text-center">
          <div class="mb-2 text-sm text-white/60">{{ t('profilePublic.role') }}</div>
          <div class="text-lg font-semibold">{{ user?.role || t('profilePublic.member') }}</div>
          <UBadge v-if="user?.role === 'member'" color="green" variant="subtle" class="mt-2">
            {{ t('profilePublic.certifiedBadge') }}
          </UBadge>
        </div>
      </UCard>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
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
            avatar-class="ring-2 ring-primary-500/20"
          />
          <div>
            <h3 class="text-lg font-semibold">{{ getDisplayName }}</h3>
          </div>
        </div>

        <div v-if="!isEditing" class="space-y-4">
          <!-- Email - Première ligne -->
          <div class="grid gap-2 sm:grid-cols-2">
            <UFormGroup :label="t('profilePublic.email')" name="email" class="sm:col-span-2">
              <UInput
                :value="user.email"
                disabled
                icon="i-heroicons-envelope"
                size="lg"
                class="w-full"
              />
            </UFormGroup>
          </div>

          <!-- Nom et Prénom - Deuxième ligne -->
          <div class="grid gap-2 sm:grid-cols-2">
            <UFormGroup :label="t('profilePublic.firstName')" name="firstName">
              <UInput
                :value="user.firstName || t('profilePublic.notProvided')"
                disabled
                icon="i-heroicons-user"
                size="lg"
                class="w-full"
              />
            </UFormGroup>

            <UFormGroup label="Nom" name="lastName">
              <UInput
                :value="user.lastName || 'Non renseigné'"
                disabled
                icon="i-heroicons-user"
                size="lg"
                class="w-full"
              />
            </UFormGroup>
          </div>

          <!-- Téléphone et Commune - Troisième ligne -->
          <div class="grid gap-2 sm:grid-cols-2">
            <UFormGroup :label="t('account.profileExtra.phoneLabel')" name="phoneNumber">
              <UInput
                :value="user.phoneNumber || t('profilePublic.notProvided')"
                disabled
                icon="i-heroicons-phone"
                size="lg"
                class="w-full"
              />
            </UFormGroup>

            <UFormGroup :label="t('account.profileExtra.communeLabel')" name="commune">
              <UInput
                :value="user.commune || t('profilePublic.notProvided')"
                disabled
                icon="i-heroicons-map-pin"
                size="lg"
                class="w-full"
              />
            </UFormGroup>
          </div>
        </div>

        <div v-else class="space-y-4">
          <!-- Email - Première ligne -->
          <div class="grid gap-2 sm:grid-cols-2">
            <UFormGroup :label="t('profilePublic.email')" name="email" class="sm:col-span-2">
              <UInput
                :value="user.email"
                disabled
                icon="i-heroicons-envelope"
                size="lg"
                class="w-full"
              />
            </UFormGroup>
          </div>

          <!-- Nom et Prénom - Deuxième ligne -->
          <div class="grid gap-2 sm:grid-cols-2">
            <UFormGroup :label="t('profilePublic.firstName')" name="firstName">
              <UInput
                v-model="formData.firstName"
                :placeholder="t('profilePublic.placeholderFirstName')"
                icon="i-heroicons-user"
                size="lg"
                class="w-full"
              />
            </UFormGroup>

            <UFormGroup :label="t('profilePublic.lastName')" name="lastName">
              <UInput
                v-model="formData.lastName"
                :placeholder="t('profilePublic.placeholderLastName')"
                icon="i-heroicons-user"
                size="lg"
                class="w-full"
              />
            </UFormGroup>
          </div>

          <!-- Téléphone et Commune - Troisième ligne -->
          <div class="grid gap-2 sm:grid-cols-2">
            <UFormGroup :label="t('account.profileExtra.phoneLabel')" name="phoneNumber">
              <UInput
                v-model="formData.phoneNumber"
                placeholder="+689 87 12 34 56"
                icon="i-heroicons-phone"
                size="lg"
                class="w-full"
              />
            </UFormGroup>

            <UFormGroup :label="t('account.profileExtra.communeLabel')" name="commune">
              <USelect
                v-model="formData.commune"
                :items="communes.map(c => ({ label: c, value: c }))"
                :placeholder="t('account.profileExtra.communePh')"
                searchable
                icon="i-heroicons-map-pin"
                size="lg"
                :loading="isLoadingCommunes"
                class="w-full"
              />
            </UFormGroup>
          </div>

          <!-- Avatar -->
          <UFormGroup :label="t('profilePublic.avatar')" name="avatarImage">
            <AvatarUpload
              :current-avatar="user?.avatarImage ? getImageUrl(user.avatarImage) : null"
              :user-id="user?.id"
              @uploaded="handleAvatarUploaded"
            />
          </UFormGroup>

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

        <!-- Alerte validation informations personnelles -->
        <UAlert
          v-if="!isPersonalInfoValid"
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          :title="t('account.profileExtra.profileIncompleteTitle')"
          :description="personalInfoMessage"
          class="text-left"
        />
      </div>

      <div v-else class="text-center py-8">
        <p class="text-white/60">{{ t('profilePublic.loading') }}</p>
      </div>
    </UCard>

    <!-- Contact Preferences Section -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-chat-bubble-left-right" />
            <span class="font-medium">{{ t('account.profileExtra.contactPrefsTitle') }}</span>
          </div>
          <UButton
            v-if="!isEditingContactPreferences"
            @click="startEditingContactPreferences"
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
        <div v-if="!isEditingContactPreferences" class="space-y-4">
          <div>
            <p class="mb-3 text-sm font-medium text-white/80">{{ t('account.profileExtra.contactOrder') }}</p>
            <div class="space-y-2">
              <div
                v-for="(method, index) in (user.contactPreferences?.order || ['phone', 'messenger', 'telegram', 'whatsapp'])"
                :key="method"
                class="flex items-center gap-3 rounded-lg bg-white/5 p-3"
              >
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-sm font-semibold text-primary-400">
                  {{ index + 1 }}
                </div>
                <UIcon :name="getContactMethodIcon(method)" class="h-5 w-5 text-white/60" />
                <span class="w-32 font-medium">{{ getContactMethodLabel(method) }}</span>
                <span v-if="method === 'phone'" class="flex-1 text-sm text-white/60">
                  {{ user.phoneNumber || t('profilePublic.notProvided') }}
                </span>
                <span v-else-if="method === 'messenger' && user.contactPreferences?.accounts?.messenger" class="flex-1 text-sm text-white/60">
                  {{ user.contactPreferences.accounts.messenger }}
                </span>
                <span v-else-if="method === 'telegram' && user.contactPreferences?.accounts?.telegram" class="flex-1 text-sm text-white/60">
                  {{ user.contactPreferences.accounts.telegram }}
                </span>
                <span v-else-if="method === 'whatsapp' && user.contactPreferences?.accounts?.whatsapp" class="flex-1 text-sm text-white/60">
                  {{ user.contactPreferences.accounts.whatsapp }}
                </span>
                <span v-else class="flex-1 text-sm text-white/40 italic">
                  {{ t('profilePublic.notProvided') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="space-y-6">
          <div>
            <p class="mb-3 text-sm font-medium text-white/80">{{ t('account.profileExtra.contactOrderDrag') }}</p>
            <div class="space-y-2">
              <div
                v-for="(method, index) in contactPreferences.order"
                :key="method"
                :draggable="true"
                @dragstart="handleDragStart(index)"
                @dragover="handleDragOver"
                @drop="handleDrop($event, index)"
                class="flex cursor-move items-center gap-3 rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-sm font-semibold text-primary-400">
                  {{ index + 1 }}
                </div>
                <UIcon name="i-heroicons-bars-3" class="h-5 w-5 text-white/40" />
                <UIcon :name="getContactMethodIcon(method)" class="h-5 w-5 text-white/60" />
                <span class="w-32 font-medium">{{ getContactMethodLabel(method) }}</span>
                <div v-if="method === 'phone'" class="flex-1">
                  <UInput
                    v-model="formData.phoneNumber"
                    placeholder="+689 87 12 34 56"
                    size="sm"
                    class="max-w-xs"
                  />
                </div>
                <div v-else-if="method === 'messenger'" class="flex-1">
                  <UInput
                    v-model="contactPreferences.accounts.messenger"
                    :placeholder="t('account.profileExtra.messengerPh')"
                    size="sm"
                    class="max-w-xs"
                  />
                </div>
                <div v-else-if="method === 'telegram'" class="flex-1">
                  <UInput
                    v-model="contactPreferences.accounts.telegram"
                    :placeholder="t('account.profileExtra.telegramPh')"
                    size="sm"
                    class="max-w-xs"
                  />
                </div>
                <div v-else-if="method === 'whatsapp'" class="flex-1">
                  <UInput
                    v-model="contactPreferences.accounts.whatsapp"
                    placeholder="+689 87 12 34 56"
                    size="sm"
                    class="max-w-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 pt-4 border-t border-white/10">
            <UButton
              @click="saveContactPreferences"
              color="primary"
              :loading="isSavingContactPreferences"
              :disabled="isSavingContactPreferences"
            >
              {{ t('profilePublic.save') }}
            </UButton>
            <UButton
              @click="cancelEditingContactPreferences"
              color="gray"
              variant="outline"
              :disabled="isSavingContactPreferences"
            >
              {{ t('profilePublic.cancel') }}
            </UButton>
          </div>
        </div>

      </div>
    </UCard>

    <!-- Trading Preferences Section -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-path" />
            <span class="font-medium">{{ t('account.profileExtra.trocPrefsTitle') }}</span>
          </div>
          <UButton
            v-if="!isEditingTradingPreferences"
            @click="startEditingTradingPreferences"
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
        <div v-if="!isEditingTradingPreferences" class="space-y-4">
          <p class="text-sm text-white/70">
            {{ t('account.profileExtra.trocPrefsIntro') }}
          </p>
          
          <div v-if="tradingPreferences.length === 0" class="py-8 text-center">
            <UIcon name="i-heroicons-tag" class="mx-auto mb-4 h-12 w-12 text-white/40" />
            <p class="mb-4 text-white/60">{{ t('account.profileExtra.trocNone') }}</p>
            <UButton
              @click="startEditingTradingPreferences"
              color="primary"
              icon="i-heroicons-plus"
            >
              {{ t('account.profileExtra.trocAddPrefs') }}
            </UButton>
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <UBadge
              v-for="tagId in tradingPreferences"
              :key="tagId"
              color="primary"
              variant="soft"
              size="lg"
            >
              <UIcon 
                :name="tradingTags.find(tg => tg.id === tagId)?.icon || 'i-heroicons-tag'" 
                class="mr-1 h-4 w-4"
              />
              {{ tradingTags.find(tg => tg.id === tagId)?.label || tagId }}
            </UBadge>
          </div>
        </div>

        <div v-else class="space-y-6">
          <div>
            <p class="mb-2 text-sm text-white/70">
              {{ t('account.profileExtra.trocPrefsIntro') }}
            </p>
            <p class="mb-4 text-sm font-medium text-white/80">{{ t('account.profileExtra.trocSelectTitle') }}</p>
            
            <!-- Produits -->
            <div class="mb-6">
              <h4 class="mb-3 text-sm font-semibold text-white/80">{{ t('account.profileExtra.trocProducts') }}</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <button
                  v-for="tag in productTags"
                  :key="tag.id"
                  type="button"
                  class="group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] p-4"
                  :class="{
                    'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20': isTagSelected(tag.id),
                    'border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-white/20': !isTagSelected(tag.id),
                  }"
                  @click="toggleTradingTag(tag.id)"
                >
                  <div class="flex flex-col items-center gap-2">
                    <UIcon 
                      :name="tag.icon" 
                      class="h-8 w-8 transition-colors"
                      :class="{
                        'text-primary-300': isTagSelected(tag.id),
                        'text-white/60': !isTagSelected(tag.id),
                      }"
                    />
                    <span
                      class="text-sm font-medium text-center transition-colors"
                      :class="{
                        'text-primary-300': isTagSelected(tag.id),
                        'text-white': !isTagSelected(tag.id),
                      }"
                    >
                      {{ tag.label }}
                    </span>
                    
                    <!-- Indicateur de sélection -->
                    <div
                      v-if="isTagSelected(tag.id)"
                      class="absolute top-2 right-2"
                    >
                      <div class="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500">
                        <UIcon name="i-heroicons-check" class="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Séparation horizontale -->
            <hr class="my-6 border-white/10" />

            <!-- Services -->
            <div>
              <h4 class="mb-3 text-sm font-semibold text-white/80">{{ t('account.profileExtra.trocServices') }}</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <button
                  v-for="tag in serviceTags"
                  :key="tag.id"
                  type="button"
                  class="group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] p-4"
                  :class="{
                    'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20': isTagSelected(tag.id),
                    'border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-white/20': !isTagSelected(tag.id),
                  }"
                  @click="toggleTradingTag(tag.id)"
                >
                  <div class="flex flex-col items-center gap-2">
                    <UIcon 
                      :name="tag.icon" 
                      class="h-8 w-8 transition-colors"
                      :class="{
                        'text-primary-300': isTagSelected(tag.id),
                        'text-white/60': !isTagSelected(tag.id),
                      }"
                    />
                    <span
                      class="text-sm font-medium text-center transition-colors"
                      :class="{
                        'text-primary-300': isTagSelected(tag.id),
                        'text-white': !isTagSelected(tag.id),
                      }"
                    >
                      {{ tag.label }}
                    </span>
                    
                    <!-- Indicateur de sélection -->
                    <div
                      v-if="isTagSelected(tag.id)"
                      class="absolute top-2 right-2"
                    >
                      <div class="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500">
                        <UIcon name="i-heroicons-check" class="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 pt-4 border-t border-white/10">
            <UButton
              @click="saveTradingPreferences"
              color="primary"
              :loading="isSavingTradingPreferences"
              :disabled="isSavingTradingPreferences"
            >
              {{ t('profilePublic.save') }}
            </UButton>
            <UButton
              @click="cancelEditingTradingPreferences"
              color="gray"
              variant="outline"
              :disabled="isSavingTradingPreferences"
            >
              {{ t('profilePublic.cancel') }}
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Password Change Section -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
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
</template>
