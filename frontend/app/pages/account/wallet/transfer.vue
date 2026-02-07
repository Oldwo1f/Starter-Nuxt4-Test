<script setup lang="ts">
import { useWalletStore } from '~/stores/useWalletStore'
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
})

const walletStore = useWalletStore()
const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()
const { getImageUrl } = useApi()

// Form
const form = ref({
  toUserId: undefined as number | undefined,
  toUserEmail: '',
  amount: 0,
  description: '',
})

const isSubmitting = ref(false)

// User search
const searchTerm = ref('')
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const selectedUser = ref<any | null>(null)
const showSearchResults = ref(false)

// Get display name for user
const getUserDisplayName = (user: any) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) {
    return user.firstName
  }
  if (user.lastName) {
    return user.lastName
  }
  return user.email
}

// Get avatar URL
const getAvatarUrl = (user: any) => {
  if (user.avatarImage) {
    return getImageUrl(user.avatarImage)
  }
  return null
}

// Get avatar text (initiales)
const getAvatarText = (user: any) => {
  if (user.firstName) {
    return user.firstName.charAt(0).toUpperCase()
  }
  if (user.lastName) {
    return user.lastName.charAt(0).toUpperCase()
  }
  return user.email?.charAt(0).toUpperCase() || 'U'
}

// Search users
const searchUsers = async () => {
  if (searchTerm.value.length < 2) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }

  isSearching.value = true
  try {
    const result = await walletStore.searchUsers(searchTerm.value, 20)
    if (result.success) {
      // Filter out current user
      searchResults.value = (result.data || []).filter(
        (user: any) => user.id !== authStore.user?.id
      )
      showSearchResults.value = searchResults.value.length > 0
    }
  } catch (error) {
    console.error('Error searching users:', error)
    searchResults.value = []
    showSearchResults.value = false
  } finally {
    isSearching.value = false
  }
}

// Select user
const selectUser = (user: any) => {
  selectedUser.value = user
  form.value.toUserId = user.id
  form.value.toUserEmail = user.email
  searchTerm.value = getUserDisplayName(user)
  showSearchResults.value = false
  searchResults.value = []
}

// Clear selection
const clearSelection = () => {
  selectedUser.value = null
  form.value.toUserId = undefined
  form.value.toUserEmail = ''
  searchTerm.value = ''
  showSearchResults.value = false
  searchResults.value = []
}

// Handle input focus
const handleInputFocus = () => {
  if (!selectedUser.value && searchTerm.value.length >= 2) {
    showSearchResults.value = true
  }
}

// Handle input change
const handleInputChange = () => {
  if (selectedUser.value) {
    clearSelection()
  }
}

// Debounce search
let searchTimeout: NodeJS.Timeout | null = null

// Watch search term with debounce
watch(searchTerm, () => {
  if (selectedUser.value) {
    return
  }

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    searchUsers()
  }, 300) // 300ms debounce
})

// Close search results when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.user-search-container')) {
    showSearchResults.value = false
  }
}

// Load pre-filled data from query params
const loadPrefilledData = async () => {
  const route = useRoute()
  const query = route.query

  // Pre-fill amount if provided
  if (query.amount) {
    const amount = parseFloat(query.amount as string)
    if (!isNaN(amount) && amount > 0) {
      form.value.amount = amount
    }
  }

  // Pre-fill description if provided
  if (query.description) {
    form.value.description = decodeURIComponent(query.description as string)
  }

  // Pre-fill user if email or userId is provided
  if (query.toUserEmail || query.toUserId) {
    const email = query.toUserEmail ? decodeURIComponent(query.toUserEmail as string) : null
    const userId = query.toUserId ? parseInt(query.toUserId as string, 10) : null

    if (email || userId) {
      // Search for the user
      isSearching.value = true
      try {
        // Use email for search if available, otherwise use a generic search
        const searchTermToUse = email || ''
        const result = await walletStore.searchUsers(searchTermToUse, 50) // Increase limit to find the user
        if (result.success && result.data) {
          // Find the matching user by ID first (more reliable), then by email
          let matchingUser = null
          if (userId) {
            matchingUser = result.data.find((user: any) => user.id === userId)
          }
          if (!matchingUser && email) {
            matchingUser = result.data.find((user: any) => user.email === email)
          }

          if (matchingUser) {
            // Filter out current user
            if (matchingUser.id !== authStore.user?.id) {
              selectUser(matchingUser)
            }
          } else if (email) {
            // If user not found but we have email, create a temporary user object
            // This allows the form to work even if the user search doesn't return results
            // The backend will validate the email anyway
            selectedUser.value = {
              id: userId || 0,
              email: email,
              firstName: null,
              lastName: null,
              avatarImage: null,
            }
            form.value.toUserId = userId || undefined
            form.value.toUserEmail = email
            searchTerm.value = email
          }
        } else if (email) {
          // If search fails but we have email, still pre-fill
          selectedUser.value = {
            id: userId || 0,
            email: email,
            firstName: null,
            lastName: null,
            avatarImage: null,
          }
          form.value.toUserId = userId || undefined
          form.value.toUserEmail = email
          searchTerm.value = email
        }
      } catch (error) {
        console.error('Error loading pre-filled user:', error)
        // Still try to pre-fill with email if available
        if (email) {
          selectedUser.value = {
            id: userId || 0,
            email: email,
            firstName: null,
            lastName: null,
            avatarImage: null,
          }
          form.value.toUserId = userId || undefined
          form.value.toUserEmail = email
          searchTerm.value = email
        }
      } finally {
        isSearching.value = false
      }
    }
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  await walletStore.fetchBalance()
  await loadPrefilledData()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Submit
const handleSubmit = async () => {
  if (!form.value.toUserEmail || !form.value.amount || form.value.amount <= 0) {
    toast.add({
      title: 'Champs manquants',
      description: 'Veuillez sélectionner un destinataire et un montant',
      color: 'red',
    })
    return
  }

  if (!selectedUser.value) {
    toast.add({
      title: 'Destinataire invalide',
      description: 'Veuillez sélectionner un utilisateur dans la liste',
      color: 'red',
    })
    return
  }

  if (!form.value.description || form.value.description.trim().length === 0) {
    toast.add({
      title: 'Description manquante',
      description: 'Veuillez renseigner une description pour cette transaction',
      color: 'red',
    })
    return
  }

  if (form.value.amount > walletStore.balance) {
    toast.add({
      title: 'Solde insuffisant',
      description: 'Vous n\'avez pas assez de Pūpū pour effectuer ce transfert',
      color: 'red',
    })
    return
  }

  isSubmitting.value = true
  try {
    const result = await walletStore.transfer(
      form.value.toUserEmail,
      form.value.amount,
      form.value.description
    )

    if (result.success) {
      toast.add({
        title: 'Transfert réussi',
        description: `${form.value.amount} Pūpū ont été transférés à ${getUserDisplayName(selectedUser.value)}`,
        color: 'green',
      })
      // Reset form
      form.value = {
        toUserId: undefined,
        toUserEmail: '',
        amount: 0,
        description: '',
      }
      clearSelection()
      // Refresh balance
      await walletStore.fetchBalance()
      // Navigate back
      router.push('/account/wallet')
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Erreur lors du transfert',
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors du transfert',
      color: 'red',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <UButton to="/account/wallet" variant="ghost" icon="i-heroicons-arrow-left">
        Retour
      </UButton>
      <h1 class="text-3xl font-bold">Transférer des Pūpū</h1>
      <p class="text-white/60">Envoyez des Pūpū à un autre membre</p>
    </div>

    <!-- Balance info -->
    <UCard class="bg-gradient-to-r from-primary-500/20 to-primary-600/20">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-white/60">Solde disponible</div>
          <div class="text-2xl font-bold text-primary-500">
            🐚 {{ Math.round(walletStore.balance) }}
          </div>
        </div>
      </div>
    </UCard>

    <!-- Transfer form -->
    <UCard>
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Recipient search -->
        <div class="user-search-container relative">
          <label class="mb-2 block text-sm font-medium">Destinataire *</label>
          <div class="relative">
            <UInput
              v-model="searchTerm"
              :placeholder="selectedUser ? getUserDisplayName(selectedUser) : 'Rechercher un utilisateur...'"
              size="lg"
              :disabled="!!selectedUser"
              :loading="isSearching"
              icon="i-heroicons-magnifying-glass"
              autocomplete="off"
              @focus="handleInputFocus"
              @input="handleInputChange"
            />
            <UButton
              v-if="selectedUser"
              variant="ghost"
              color="red"
              size="xs"
              icon="i-heroicons-x-mark"
              class="absolute right-2 top-1/2 -translate-y-1/2 z-10"
              @click.stop="clearSelection"
            />
          </div>

          <!-- Search results dropdown -->
          <div
            v-if="showSearchResults && searchResults.length > 0"
            class="absolute z-50 mt-2 w-full rounded-lg border border-white/10 bg-gray-900 shadow-lg max-h-80 overflow-y-auto"
          >
            <div class="p-2 space-y-1">
              <div
                v-for="user in searchResults"
                :key="user.id"
                class="flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-white/10"
                @click="selectUser(user)"
              >
                <UAvatar
                  v-if="getAvatarUrl(user)"
                  :src="getAvatarUrl(user)"
                  :alt="getUserDisplayName(user)"
                  size="sm"
                />
                <UAvatar
                  v-else
                  :alt="getUserDisplayName(user)"
                  :text="getAvatarText(user)"
                  size="sm"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm">{{ getUserDisplayName(user) }}</div>
                  <div class="text-xs text-white/60">{{ user.email }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- No results -->
          <div
            v-if="showSearchResults && searchResults.length === 0 && !isSearching && searchTerm.length >= 2"
            class="absolute z-50 mt-2 w-full rounded-lg border border-white/10 bg-gray-900 p-4 text-center text-sm text-white/60"
          >
            Aucun utilisateur trouvé
          </div>
        </div>

        <!-- Amount -->
        <div>
          <label class="mb-2 block text-sm font-medium">Montant (Pūpū) *</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🐚</span>
            <UInput
              v-model.number="form.amount"
              type="number"
              placeholder="0"
              size="lg"
              class="pl-12"
              min="0.01"
              step="0.01"
              :max="walletStore.balance"
              required
            />
          </div>
          <p class="mt-1 text-xs text-white/60">
            {{ form.amount ? `≈ ${(form.amount * 100).toFixed(0)} XPF` : '' }}
            <span v-if="form.amount > walletStore.balance" class="text-red-500">
              (Solde insuffisant)
            </span>
          </p>
        </div>

        <!-- Description -->
        <div>
          <label class="mb-2 block text-sm font-medium">Description *</label>
          <UInput
            v-model="form.description"
            placeholder="Ex: Paiement pour services"
            size="lg"
            required
          />
          <p class="mt-1 text-xs text-white/60">
            Décrivez la raison de ce transfert
          </p>
        </div>

        <!-- Submit -->
        <div class="flex gap-4">
          <UButton
            type="submit"
            color="primary"
            size="xl"
            block
            :loading="isSubmitting"
            :disabled="form.amount > walletStore.balance || form.amount <= 0"
            icon="i-heroicons-arrow-path"
          >
            Transférer
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
