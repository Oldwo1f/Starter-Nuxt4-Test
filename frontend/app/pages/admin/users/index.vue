<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Gestion des utilisateurs',
})

import { useUserStore } from '~/stores/useUserStore'
import { useAuthStore } from '~/stores/useAuthStore'
import type { User } from '~/stores/useUserStore'

const userStore = useUserStore()
const authStore = useAuthStore()
const toast = useToast()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'

// État pour les données de parrainage
const referralData = ref<{
  referralCode: string | null
  stats: {
    total: number
    inscrits: number
    membres: number
    validees: number
    rewardsEarned: number
    jijiRewardsEarned: number
  } | null
  referrals: any[]
} | null>(null)
const isLoadingReferral = ref(false)

// État pour le formulaire de crédit Pūpū
const creditForm = ref({
  amount: 0,
  description: '',
})
const isCreditingUser = ref(false)

// État pour le formulaire de crédit Jiji
const creditJijiForm = ref({
  amount: 0,
  description: '',
})
const isCreditingJiji = ref(false)

const pointsFormateurDelta = ref(1)
const pointsSoutienDelta = ref(1)
const isAddingFormateurPoints = ref(false)
const isAddingSoutienPoints = ref(false)

// Wrapper pour fetchUsers avec gestion des toasts
const handleFetchUsers = async () => {
  await userStore.fetchUsers()
  if (userStore.error && userStore.users.length === 0) {
    toast.add({
      title: 'Erreur',
      description: userStore.error,
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour saveProfile avec gestion des toasts
const handleSaveProfile = async () => {
  const result = await userStore.saveProfile()
  if (result.success) {
    toast.add({
      title: 'Profil mis à jour',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error,
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour updateUserRole avec gestion des toasts
const handleUpdateUserRole = async (userId: number, newRole: string) => {
  const result = await userStore.updateUserRole(userId, newRole)
  if (result.success) {
    toast.add({
      title: 'Rôle mis à jour',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error,
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour deleteUser (archivage côté API) avec gestion des toasts
const handleDeleteUser = async () => {
  const result = await userStore.deleteUser()
  if (result.success) {
    toast.add({
      title: 'Utilisateur archivé',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error,
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Archivage depuis le tableau (icône corbeille)
const handleDeleteUserFromTable = (user: User) => {
  userStore.selectedUser = user
  userStore.confirmDelete()
}

const canArchiveSelectedUser = computed(() => {
  const u = userStore.selectedUser
  if (!u || u.archivedAt) return false
  if (authStore.user?.id != null && u.id === authStore.user.id) return false
  return true
})

const canArchiveUserRow = (user: User) => {
  if (user.archivedAt) return false
  if (authStore.user?.id != null && user.id === authStore.user.id) return false
  return true
}

// Wrapper pour selectedRole avec gestion des toasts
const selectedRole = computed({
  get: () => userStore.selectedRole,
  set: async (value: string) => {
    if (userStore.selectedUser) {
      await handleUpdateUserRole(userStore.selectedUser.id, value)
    }
  },
})

const roleOptions = [
  { value: 'user', label: 'Utilisateur' },
  { value: 'member', label: 'Membre' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
  { value: 'moderator', label: 'Modérateur' },
  { value: 'admin', label: 'Administrateur' },
  { value: 'superadmin', label: 'Super Admin' },
]

// Options pour le select de filtre (avec option "Tous les rôles")
const roleFilterOptions = [
  { value: 'all', label: 'Tous les rôles' },
  ...roleOptions,
]

const usersScopeFilterOptions = [
  { value: 'active', label: 'Comptes actifs' },
  { value: 'archived', label: 'Archivés' },
  { value: 'all', label: 'Tous' },
]

const getRoleLabel = (role: string) => {
  return roleOptions.find((opt) => opt.value === role)?.label || role
}

const getRoleColor = (role: string) => {
  if (role === 'superadmin' || role === 'admin') return 'error'
  if (role === 'moderator') return 'warning'
  return 'primary'
}

// Fonction pour récupérer les données de parrainage
const fetchReferralData = async (userId: number) => {
  if (!authStore.accessToken) return
  
  isLoadingReferral.value = true
  try {
    const response = await $fetch<{
      referralCode: string
      stats: {
        total: number
        inscrits: number
        membres: number
        validees: number
        rewardsEarned: number
        jijiRewardsEarned: number
      }
      referrals: any[]
    }>(`${API_BASE_URL}/referral/user/${userId}/stats`, {
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })
    referralData.value = response
  } catch (error: any) {
    console.error('Erreur lors de la récupération des données de parrainage:', error)
    referralData.value = null
  } finally {
    isLoadingReferral.value = false
  }
}

// Watcher pour charger les données de parrainage quand un utilisateur est sélectionné
watch(() => userStore.selectedUser, (newUser) => {
  if (newUser) {
    fetchReferralData(newUser.id)
    // Réinitialiser le formulaire de crédit
    creditForm.value = {
      amount: 0,
      description: '',
    }
    pointsFormateurDelta.value = 1
    pointsSoutienDelta.value = 1
  } else {
    referralData.value = null
  }
})

const handleAddFormateurPoints = async () => {
  if (!userStore.selectedUser || !authStore.accessToken) return
  const d = Math.floor(Number(pointsFormateurDelta.value))
  if (!Number.isFinite(d) || d < 1 || d > 500) {
    toast.add({
      title: 'Erreur',
      description: 'Indiquez un nombre entier entre 1 et 500',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }
  isAddingFormateurPoints.value = true
  try {
    const updated = await $fetch<User>(`${API_BASE_URL}/users/${userStore.selectedUser.id}/points/formateur`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: { delta: d },
    })
    if (userStore.selectedUser?.id === updated.id) {
      userStore.selectedUser = { ...userStore.selectedUser, ...updated }
    }
    await handleFetchUsers()
    toast.add({
      title: 'Formations publiées mises à jour',
      description: `Total : ${updated.formateurPoints ?? 0} formation(s) publiée(s)`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    pointsFormateurDelta.value = 1
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || error.message || 'Impossible de mettre à jour les formations publiées',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    isAddingFormateurPoints.value = false
  }
}

const handleAddSoutienPoints = async () => {
  if (!userStore.selectedUser || !authStore.accessToken) return
  const d = Math.floor(Number(pointsSoutienDelta.value))
  if (!Number.isFinite(d) || d < 1 || d > 500) {
    toast.add({
      title: 'Erreur',
      description: 'Indiquez un nombre entier entre 1 et 500',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }
  isAddingSoutienPoints.value = true
  try {
    const updated = await $fetch<User>(`${API_BASE_URL}/users/${userStore.selectedUser.id}/points/soutien`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: { delta: d },
    })
    if (userStore.selectedUser?.id === updated.id) {
      userStore.selectedUser = { ...userStore.selectedUser, ...updated }
    }
    await handleFetchUsers()
    toast.add({
      title: 'Points soutien ajoutés',
      description: `Total : ${updated.soutienPoints ?? 0} point(s)`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    pointsSoutienDelta.value = 1
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || error.message || 'Impossible d’ajouter les points',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    isAddingSoutienPoints.value = false
  }
}

// Fonction pour créditer un utilisateur
const handleCreditUser = async () => {
  if (!userStore.selectedUser || !authStore.accessToken) return

  if (!creditForm.value.amount || creditForm.value.amount <= 0) {
    toast.add({
      title: 'Erreur',
      description: 'Le montant doit être supérieur à 0',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!creditForm.value.description || creditForm.value.description.trim().length === 0) {
    toast.add({
      title: 'Erreur',
      description: 'La description est requise',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  isCreditingUser.value = true
  try {
    const response = await $fetch(
      `${API_BASE_URL}/wallet/admin/credit/${userStore.selectedUser.id}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          amount: creditForm.value.amount,
          description: creditForm.value.description.trim(),
        },
      }
    )

    toast.add({
      title: 'Succès',
      description: `${creditForm.value.amount} Pūpū ont été crédités à ${userStore.selectedUser.email}`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    // Réinitialiser le formulaire
    creditForm.value = {
      amount: 0,
      description: '',
    }

    // Recharger les utilisateurs pour mettre à jour le solde
    await handleFetchUsers()
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || error.message || 'Erreur lors du crédit',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    isCreditingUser.value = false
  }
}

// Fonction pour créditer des Jiji à un utilisateur
const handleCreditJijiUser = async () => {
  if (!userStore.selectedUser) return

  if (creditJijiForm.value.amount <= 0) {
    toast.add({
      title: 'Erreur',
      description: 'Le montant doit être supérieur à 0',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!creditJijiForm.value.description || creditJijiForm.value.description.trim().length === 0) {
    toast.add({
      title: 'Erreur',
      description: 'La description est requise',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  isCreditingJiji.value = true
  try {
    await $fetch(
      `${API_BASE_URL}/wallet/admin/credit-jiji/${userStore.selectedUser.id}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          amount: creditJijiForm.value.amount,
          description: creditJijiForm.value.description.trim(),
        },
      }
    )

    toast.add({
      title: 'Succès',
      description: `${creditJijiForm.value.amount} Jiji ont été crédités à ${userStore.selectedUser.email}`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    creditJijiForm.value = {
      amount: 0,
      description: '',
    }

    await handleFetchUsers()
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || error.message || 'Erreur lors du crédit Jiji',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    isCreditingJiji.value = false
  }
}

// Vérifier si l'utilisateur connecté peut modifier les rôles
const canModifyRoles = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  return role === 'admin' || role === 'superadmin'
})

/** Compteur formations publiées (badges création Academy) : admin / superadmin uniquement */
const canGiveFormateurPoints = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  return role === 'admin' || role === 'superadmin'
})

/** Points soutien : admin / superadmin / modérateur */
const canGiveSoutienPoints = computed(() => {
  const role = authStore.user?.role?.toLowerCase()
  return role === 'admin' || role === 'superadmin' || role === 'moderator'
})

// État pour suivre les mises à jour en cours
const updatingCertified = ref<number | null>(null)

// Fonction pour toggle rapidement le statut certifié
const handleToggleCertified = async (user: User) => {
  if (updatingCertified.value === user.id) return // Éviter les doubles clics

  const newCertifiedStatus = !user.isCertified
  updatingCertified.value = user.id

  const result = await userStore.updateUserCertified(user.id, newCertifiedStatus)

  if (result.success) {
    toast.add({
      title: newCertifiedStatus ? 'Membre certifié' : 'Certification retirée',
      description: newCertifiedStatus 
        ? `${user.email} a été certifié`
        : `${user.email} n'est plus certifié`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error || 'Erreur lors de la mise à jour',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  }

  updatingCertified.value = null
}

// Configuration des colonnes pour UTable
const columns = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'avatar',
    accessorKey: 'avatar',
    header: 'Avatar',
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    enableSorting: true,
  },
  {
    id: 'firstName',
    accessorKey: 'firstName',
    header: 'Prénom',
    enableSorting: true,
  },
  {
    id: 'lastName',
    accessorKey: 'lastName',
    header: 'Nom',
    enableSorting: true,
  },
  {
    id: 'phoneNumber',
    accessorKey: 'phoneNumber',
    header: 'Téléphone',
    enableSorting: true,
  },
  {
    id: 'role',
    accessorKey: 'role',
    header: 'Rôle',
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'createdAtFormatted',
    accessorKey: 'createdAtFormatted',
    header: 'Créé le',
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    id: 'actions',
    header: 'Actions',
    enableColumnFilter: false,
    enableSorting: false,
  },
]


// Ref pour le conteneur du tableau
const tableContainer = ref<HTMLElement | null>(null)

// Calcul de la hauteur disponible pour le tableau
const tableHeight = ref('600px')

const calculateTableHeight = () => {
  if (import.meta.client) {
    // Hauteur du viewport
    const viewportHeight = window.innerHeight
    
    // Hauteurs fixes à soustraire (ajustées pour optimiser l'espace vertical)
    const layoutTopBar = 64 // Top bar du layout admin
    const pagePadding = 32 // p-4 = 16px * 2 (réduit)
    const pageHeader = 0 // Header avec titre et bouton (réduit)
    const cardHeader = 70 // Header de la UCard avec filtres (réduit)
    const pagination = 60 // Barre de pagination (réduit)
    const margins = 24 // Marges entre les éléments (réduit)
    
    const availableHeight = viewportHeight - layoutTopBar - pagePadding - pageHeader - cardHeader - pagination - margins
    
    // Limiter à 680px maximum pour un écran 1920x1080
    const maxHeight = 680
    const calculatedHeight = Math.min(maxHeight, availableHeight)
    
    // S'assurer d'avoir une hauteur minimale
    tableHeight.value = `${Math.max(300, calculatedHeight)}px`
  }
}

// Gestionnaire pour le double-clic sur les lignes du tableau
const handleTableDoubleClick = (event: MouseEvent) => {
  // Trouver l'élément <tr> le plus proche
  const target = event.target as HTMLElement
  const row = target.closest('tr')
  
  if (!row) return
  
  // Ignorer si on clique sur un bouton ou un lien
  if (target.closest('button') || target.closest('a')) {
    return
  }
  
  // Trouver l'index de la ligne dans le tableau
  const tbody = row.closest('tbody')
  if (!tbody) return
  
  const rows = Array.from(tbody.querySelectorAll('tr'))
  const rowIndex = rows.indexOf(row)
  
  // Récupérer l'utilisateur correspondant
  if (rowIndex >= 0 && rowIndex < userStore.data.length) {
    const user = userStore.data[rowIndex]
    if (user) {
      userStore.openUserDetails(user)
    }
  }
}

onMounted(() => {
  handleFetchUsers()
  calculateTableHeight()
  if (import.meta.client) {
    window.addEventListener('resize', calculateTableHeight)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', calculateTableHeight)
  }
})
</script>

<template>
  <div>
    <div class="space-y-6">
          <!-- Tableau des utilisateurs -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <UButton
          color="primary"
          variant="soft"
          icon="i-heroicons-arrow-path"
          @click="handleFetchUsers"
          :loading="userStore.isLoading"
        >
          
        </UButton>
              <span class="font-medium">Liste des utilisateurs </span>
            </div>
            <div class="flex items-center gap-2">
              <UInput
                v-model="userStore.globalFilter"
                placeholder="Rechercher par email, ID, rôle..."
                icon="i-heroicons-magnifying-glass"
                clearable
                class="w-64"
              />
              <USelect
                v-model="userStore.roleFilter"
                :items="roleFilterOptions"
                option-attribute="label"
                value-attribute="value"
                placeholder="Tous les rôles"
                class="w-48"
              />
              <USelect
                v-model="userStore.usersScope"
                :items="usersScopeFilterOptions"
                option-attribute="label"
                value-attribute="value"
                class="w-44"
              />
            </div>
          </div>
        </template>

        <div 
          ref="tableContainer"
          class="overflow-auto" 
          :style="{ maxHeight: tableHeight }"
          @dblclick="handleTableDoubleClick"
        >
          <UTable
            v-if="!userStore.isLoading && userStore.users.length > 0"
            v-model:sorting="userStore.sorting"
            :data="userStore.data"
            :columns="columns"
            :loading="userStore.isLoading"
            manual-pagination
            manual-sorting
            sticky
            :ui="{
              tr: {
                base: 'cursor-pointer hover:bg-white/5 transition-colors',
              },
            }"
          >
          <template #email-cell="{ row }">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-white/90">{{ row.original.email }}</span>
              <UBadge
                v-if="row.original.archivedAt"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                Archivé
              </UBadge>
              <UIcon
                v-if="row.original.emailVerified"
                name="i-heroicons-check-badge"
                class="h-4 w-4 text-green-400 shrink-0"
                title="Email vérifié"
              />
            </div>
          </template>

          <template #avatar-cell="{ row }">
            <div class="flex items-center gap-3">
              <CertifiedAvatar
                :src="userStore.getAvatarUrl(row.original)"
                :alt="userStore.getDisplayName(row.original)"
                :text="userStore.getAvatarText(row.original)"
                size="sm"
                :is-certified="row.original.isCertified === true"
                :badge-level="row.original.badgeCount ?? 0"
              />
              <div class="flex items-center gap-2 text-sm">
                <div class="flex items-center gap-1 text-primary-500 font-semibold">
                  <span>🐚</span>
                  <span>{{ Math.round(row.original.walletBalance || 0) }}</span>
                </div>
                <div class="flex items-center gap-1 text-amber-500 font-semibold">
                  <JijiIcon size="xs" />
                  <span>{{ Math.round(row.original.jijiBalance || 0) }}</span>
                </div>
              </div>
            </div>
          </template>

          <template #firstName-cell="{ row }">
            <span class="text-white/90">{{ row.original.firstName || '-' }}</span>
          </template>

          <template #lastName-cell="{ row }">
            <span class="text-white/90">{{ row.original.lastName || '-' }}</span>
          </template>

          <template #phoneNumber-cell="{ row }">
            <span class="text-white/90">{{ row.original.phoneNumber || '-' }}</span>
          </template>

          <template #role-cell="{ row }">
            <div class="flex items-center gap-2">
              <UBadge
                :color="getRoleColor(row.original.role)"
                variant="soft"
                class="capitalize"
              >
                {{ getRoleLabel(row.original.role) }}
              </UBadge>
              <UIcon
                v-if="row.original.isCertified"
                name="i-heroicons-star"
                class="h-4 w-4 text-amber-400"
                title="Membre certifié"
              />
            </div>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-2">
              <UButton
                label="Voir"
                icon="i-heroicons-eye"
                color="neutral"
                variant="subtle"
                size="xs"
                @click="userStore.openUserDetails(row.original)"
              />
              <UButton
                v-if="canModifyRoles"
                :icon="row.original.isCertified ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                :color="row.original.isCertified ? 'amber' : 'neutral'"
                variant="subtle"
                size="xs"
                :loading="updatingCertified === row.original.id"
                :disabled="updatingCertified === row.original.id"
                @click="handleToggleCertified(row.original)"
                :title="row.original.isCertified ? 'Retirer la certification' : 'Certifier ce membre'"
              />
              <UButton
                v-if="canModifyRoles && canArchiveUserRow(row.original)"
                icon="i-heroicons-archive-box-arrow-down"
                color="warning"
                variant="subtle"
                size="xs"
                @click="handleDeleteUserFromTable(row.original)"
                :title="`Archiver ${row.original.email}`"
              />
            </div>
          </template>
          </UTable>
        </div>

        <!-- Pagination -->
        <div v-if="!userStore.isLoading && userStore.users.length > 0" class="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <div class="flex items-center gap-4">
            <div class="text-sm text-white/70">
              Affichage de {{ userStore.pagination.pageIndex * userStore.pagination.pageSize + 1 }} à
              {{ Math.min((userStore.pagination.pageIndex + 1) * userStore.pagination.pageSize, userStore.totalUsers) }}
              sur {{ userStore.totalUsers }} utilisateur{{ userStore.totalUsers > 1 ? 's' : '' }}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-white/70">Par page :</span>
              <USelect
                v-model="userStore.pagination.pageSize"
                :items="[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                ]"
                option-attribute="label"
                value-attribute="value"
                class="w-20"
                @update:model-value="userStore.pagination.pageIndex = 0"
              />
            </div>
          </div>
          <UPagination
            v-model:page="userStore.currentPage"
            :total="userStore.totalUsers"
            :items-per-page="userStore.pagination.pageSize"
            show-first
            show-last
          />
        </div>

        <div v-else-if="userStore.isLoading" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-white/60" />
          <p class="text-white/60 mt-4">Chargement des utilisateurs...</p>
        </div>

        <div v-else class="text-center py-8">
          <p class="text-white/60">Aucun utilisateur trouvé</p>
        </div>
      </UCard>
    </div>

    <!-- Modal de détails utilisateur -->
    <UModal v-model:open="userStore.isUserModalOpen" :ui="{ wrapper: 'max-w-2xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user-circle" class="w-5 h-5" />
            <span class="font-medium">Détails de l'utilisateur</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="userStore.closeUserModal"
          />
        </div>
      </template>

      <template #body>
        <div v-if="userStore.selectedUser" class="space-y-6">
          <!-- Avatar et informations principales -->
          <div class="flex items-center gap-4">
            <CertifiedAvatar
              :src="userStore.getAvatarUrl(userStore.selectedUser)"
              :alt="userStore.getDisplayName(userStore.selectedUser)"
              :text="userStore.getAvatarText(userStore.selectedUser)"
              size="xl"
              :is-certified="userStore.selectedUser.isCertified === true"
              :badge-level="userStore.selectedUser.badgeCount ?? 0"
            />
            <div>
              <h3 class="text-lg font-semibold">{{ userStore.getDisplayName(userStore.selectedUser) }}</h3>
              <p class="text-sm text-white/60">{{ userStore.selectedUser.email }}</p>
              <p class="text-xs text-white/40">ID: {{ userStore.selectedUser.id }}</p>
            </div>
          </div>

          <!-- Formulaire d'informations -->
          <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium">Informations personnelles</span>
                <UButton
                  v-if="canModifyRoles && !userStore.isEditingProfile"
                  @click="userStore.startEditingProfile"
                  color="primary"
                  variant="outline"
                  size="xs"
                >
                  <UIcon name="i-heroicons-pencil" class="mr-1" />
                  Modifier
                </UButton>
              </div>
            </template>

            <div v-if="!userStore.isEditingProfile" class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Prénom</label>
                <UInput
                  :value="userStore.selectedUser?.firstName || 'Non renseigné'"
                  disabled
                  icon="i-heroicons-user"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Nom</label>
                <UInput
                  :value="userStore.selectedUser?.lastName || 'Non renseigné'"
                  disabled
                  icon="i-heroicons-user"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Email</label>
                <UInput
                  :value="userStore.selectedUser?.email"
                  disabled
                  icon="i-heroicons-envelope"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Téléphone</label>
                <UInput
                  :value="userStore.selectedUser?.phoneNumber || 'Non renseigné'"
                  disabled
                  icon="i-heroicons-phone"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Rôle actuel</label>
                <UInput
                  :value="getRoleLabel(userStore.selectedUser?.role || '')"
                  disabled
                  icon="i-heroicons-shield-check"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Badge certifié</label>
                <UInput
                  :value="userStore.selectedUser?.isCertified ? 'Oui' : 'Non'"
                  disabled
                  icon="i-heroicons-check-badge"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Badge « Respect des anciens »</label>
                <UInput
                  :value="userStore.selectedUser?.respectAnciensBadgeGranted ? 'Oui' : 'Non'"
                  disabled
                  icon="i-heroicons-sparkles"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Solde Pūpū</label>
                <UInput
                  :value="`${Math.round(userStore.selectedUser?.walletBalance || 0)} 🐚`"
                  disabled
                  icon="i-heroicons-currency-dollar"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Solde Jiji</label>
                <div class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <JijiIcon size="sm" />
                  <span class="font-medium">{{ Math.round(userStore.selectedUser?.jijiBalance || 0) }}</span>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Formations publiées</label>
                <UInput
                  :value="String(userStore.selectedUser?.formateurPoints ?? 0)"
                  disabled
                  icon="i-heroicons-academic-cap"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Points soutien</label>
                <UInput
                  :value="String(userStore.selectedUser?.soutienPoints ?? 0)"
                  disabled
                  icon="i-heroicons-heart"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-white/70 mb-2">Avatar (URL)</label>
                <UInput
                  :value="userStore.selectedUser?.avatarImage || 'Non renseigné'"
                  disabled
                  icon="i-heroicons-photo"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Créé le</label>
                <UInput
                  :value="userStore.selectedUser ? userStore.formatDate(userStore.selectedUser.createdAt) : ''"
                  disabled
                  icon="i-heroicons-calendar"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Modifié le</label>
                <UInput
                  :value="userStore.selectedUser ? userStore.formatDate(userStore.selectedUser.updatedAt) : ''"
                  disabled
                  icon="i-heroicons-clock"
                />
              </div>
            </div>

            <div v-else class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormGroup label="Prénom" name="firstName">
                  <UInput
                    v-model="userStore.profileFormData.firstName"
                    placeholder="Entrez le prénom"
                    icon="i-heroicons-user"
                  />
                </UFormGroup>

                <UFormGroup label="Nom" name="lastName">
                  <UInput
                    v-model="userStore.profileFormData.lastName"
                    placeholder="Entrez le nom"
                    icon="i-heroicons-user"
                  />
                </UFormGroup>

                <UFormGroup label="Téléphone" name="phoneNumber">
                  <UInput
                    v-model="userStore.profileFormData.phoneNumber"
                    type="tel"
                    placeholder="+689 87 12 34 56"
                    icon="i-heroicons-phone"
                  />
                </UFormGroup>

                <UFormGroup label="URL de l'avatar" name="avatarImage" class="sm:col-span-2">
                  <UInput
                    v-model="userStore.profileFormData.avatarImage"
                    placeholder="https://example.com/avatar.jpg"
                    icon="i-heroicons-photo"
                  />
                  <template #description>
                    Entrez l'URL complète de l'image d'avatar
                  </template>
                </UFormGroup>

                <UFormGroup label="Badge certifié" name="isCertified" class="sm:col-span-2">
                  <UCheckbox
                    v-model="userStore.profileFormData.isCertified"
                    label="Attribuer le badge certifié à cet utilisateur"
                    icon="i-heroicons-check-badge"
                  />
                  <template #description>
                    Le badge certifié apparaîtra à côté de l'avatar dans le marketplace et les annonces
                  </template>
                </UFormGroup>

                <UFormGroup label="Respect des anciens" name="respectAnciensBadgeGranted" class="sm:col-span-2">
                  <UCheckbox
                    v-model="userStore.profileFormData.respectAnciensBadgeGranted"
                    label="Attribuer le badge spécial « Le respect des anciens » (75+ ans, discrétion admin)"
                    icon="i-heroicons-sparkles"
                  />
                  <template #description>
                    Crédite le badge sur la page Badges du membre. Décochez ne retire pas un badge déjà obtenu.
                  </template>
                </UFormGroup>
              </div>

              <div class="flex items-center gap-3 pt-4 border-t border-white/10">
                <UButton
                  @click="handleSaveProfile"
                  color="primary"
                  :loading="userStore.isSavingProfile"
                  :disabled="userStore.isSavingProfile"
                >
                  Enregistrer
                </UButton>
                <UButton
                  @click="userStore.cancelEditingProfile"
                  color="neutral"
                  variant="outline"
                  :disabled="userStore.isSavingProfile"
                >
                  Annuler
                </UButton>
              </div>
            </div>
          </UCard>

          <!-- Informations de parrainage -->
          <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-user-plus" class="w-5 h-5" />
                  <span class="font-medium">Parrainage</span>
                </div>
                <UButton
                  v-if="userStore.selectedUser"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-arrow-path"
                  :loading="isLoadingReferral"
                  @click="fetchReferralData(userStore.selectedUser.id)"
                >
                  Actualiser
                </UButton>
              </div>
            </template>

            <div v-if="isLoadingReferral" class="text-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mx-auto text-white/60" />
              <p class="text-white/60 mt-2 text-sm">Chargement des données de parrainage...</p>
            </div>

            <div v-else-if="referralData" class="space-y-4">
              <!-- Code de parrainage -->
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">Code de parrainage</label>
                <UInput
                  :value="referralData.referralCode || 'Non généré'"
                  disabled
                  icon="i-heroicons-gift"
                  class="font-mono"
                />
              </div>

              <!-- Statistiques -->
              <div v-if="referralData.stats">
                <label class="block text-sm font-medium text-white/70 mb-3">Statistiques</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div class="bg-white/5 rounded-lg p-3 text-center">
                    <div class="text-xl font-bold text-primary-400">{{ referralData.stats.total }}</div>
                    <div class="text-xs text-white/60 mt-1">Total filleuls</div>
                  </div>
                  <div class="bg-white/5 rounded-lg p-3 text-center">
                    <div class="text-xl font-bold text-gray-400">{{ referralData.stats.inscrits }}</div>
                    <div class="text-xs text-white/60 mt-1">Inscrits</div>
                  </div>
                  <div class="bg-white/5 rounded-lg p-3 text-center">
                    <div class="text-xl font-bold text-blue-400">{{ referralData.stats.membres }}</div>
                    <div class="text-xs text-white/60 mt-1">Membres</div>
                  </div>
                  <div class="bg-white/5 rounded-lg p-3 text-center">
                    <div class="text-xl font-bold text-green-400">{{ referralData.stats.validees }}</div>
                    <div class="text-xs text-white/60 mt-1">Validées</div>
                  </div>
                </div>
                <div class="mt-3 bg-primary-500/10 rounded-lg p-3 text-center border border-primary-500/20 space-y-2">
                  <div>
                    <div class="text-lg font-bold text-primary-300">
                      {{ referralData.stats.rewardsEarned }} 🐚
                    </div>
                    <div class="text-xs text-white/60 mt-1">Pūpū (parrainage)</div>
                  </div>
                  <div>
                    <div class="flex items-center justify-center gap-1 text-lg font-bold text-amber-300">
                      <JijiIcon size="sm" />
                      <span>{{ referralData.stats.jijiRewardsEarned ?? 0 }}</span>
                    </div>
                    <div class="text-xs text-white/60 mt-1">Jetons de jeux (parrainage)</div>
                  </div>
                </div>
              </div>

              <!-- Liste des filleuls -->
              <div v-if="referralData.referrals && referralData.referrals.length > 0">
                <label class="block text-sm font-medium text-white/70 mb-2">Filleuls ({{ referralData.referrals.length }})</label>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                  <div
                    v-for="referral in referralData.referrals"
                    :key="referral.id"
                    class="flex items-center justify-between bg-white/5 rounded-lg p-2 text-sm"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-white/90 truncate">
                        {{ referral.referred.firstName && referral.referred.lastName
                          ? `${referral.referred.firstName} ${referral.referred.lastName}`
                          : referral.referred.email }}
                      </div>
                      <div class="text-xs text-white/60 truncate">{{ referral.referred.email }}</div>
                    </div>
                    <UBadge
                      :color="referral.status === 'validee' ? 'green' : referral.status === 'membre' ? 'blue' : 'gray'"
                      variant="soft"
                      size="xs"
                    >
                      {{ referral.status === 'validee' ? 'Validée' : referral.status === 'membre' ? 'Membre' : 'Inscrit' }}
                    </UBadge>
                  </div>
                </div>
              </div>

              <div v-else-if="referralData.stats && referralData.stats.total === 0" class="text-center py-4 text-white/60 text-sm">
                Aucun filleul
              </div>
            </div>

            <div v-else class="text-center py-4 text-white/60 text-sm">
              Impossible de charger les données de parrainage
            </div>
          </UCard>

          <!-- Formations publiées (badges Academy — création) : admin / superadmin -->
          <UCard v-if="canGiveFormateurPoints" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-academic-cap" class="w-5 h-5" />
                <span class="font-medium">Formations publiées (Academy — création)</span>
              </div>
            </template>
            <div class="p-4 space-y-4">
              <p class="text-sm text-white/60">
                Augmente le compteur de formations publiées pour la série « Academy — Création de formations » (paliers 1, 3, 5, 10). Total actuel :
                <strong class="text-white/90">{{ userStore.selectedUser?.formateurPoints ?? 0 }}</strong>
              </p>
              <UFormGroup label="Nombre à ajouter" name="formateurDelta">
                <UInput
                  v-model.number="pointsFormateurDelta"
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  placeholder="1"
                />
                <template #description>Entier entre 1 et 500 (cumul sur le compteur)</template>
              </UFormGroup>
              <UButton
                color="primary"
                variant="soft"
                block
                icon="i-heroicons-plus-circle"
                :loading="isAddingFormateurPoints"
                :disabled="isAddingFormateurPoints"
                @click="handleAddFormateurPoints"
              >
                Ajouter des formations publiées
              </UButton>
            </div>
          </UCard>

          <!-- Points soutien : admin / superadmin / modérateur -->
          <UCard v-if="canGiveSoutienPoints" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-heart" class="w-5 h-5" />
                <span class="font-medium">Points soutien</span>
              </div>
            </template>
            <div class="p-4 space-y-4">
              <p class="text-sm text-white/60">
                Ajoute des points pour la série « Soutien » (palier 1, 5, 10, 20). Total actuel :
                <strong class="text-white/90">{{ userStore.selectedUser?.soutienPoints ?? 0 }}</strong>
              </p>
              <UFormGroup label="Points à ajouter" name="soutienDelta">
                <UInput
                  v-model.number="pointsSoutienDelta"
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  placeholder="1"
                />
                <template #description>Entier entre 1 et 500 (cumul sur le solde)</template>
              </UFormGroup>
              <UButton
                color="emerald"
                variant="soft"
                block
                icon="i-heroicons-plus-circle"
                :loading="isAddingSoutienPoints"
                :disabled="isAddingSoutienPoints"
                @click="handleAddSoutienPoints"
              >
                Ajouter les points soutien
              </UButton>
            </div>
          </UCard>

          <!-- Attribution de Pūpū (si admin/superadmin) -->
          <UCard v-if="canModifyRoles" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-currency-dollar" class="w-5 h-5" />
                <span class="font-medium">Attribuer des Pūpū</span>
              </div>
            </template>
            <div class="p-4 space-y-4">
              <UFormGroup label="Montant (Pūpū)" name="creditAmount">
                <UInput
                  v-model.number="creditForm.amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  icon="i-heroicons-currency-dollar"
                />
                <template #description>
                  Montant en Pūpū à attribuer à cet utilisateur
                </template>
              </UFormGroup>

              <UFormGroup label="Description" name="creditDescription">
                <UTextarea
                  v-model="creditForm.description"
                  placeholder="Ex: Compensation pour participation à un événement"
                  rows="3"
                />
                <template #description>
                  Description de la transaction (sera préfixée par "[Nuna'a Heritage]")
                </template>
              </UFormGroup>

              <div class="flex items-center gap-3 pt-2">
                <UButton
                  @click="handleCreditUser"
                  color="primary"
                  :loading="isCreditingUser"
                  :disabled="isCreditingUser || !creditForm.amount || creditForm.amount <= 0 || !creditForm.description"
                  block
                >
                  <UIcon name="i-heroicons-plus-circle" class="mr-1" />
                  Créditer en Pūpū
                </UButton>
              </div>
            </div>
          </UCard>

          <!-- Attribution de Jiji (si admin/superadmin) -->
          <UCard v-if="canModifyRoles" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <template #header>
              <div class="flex items-center gap-2">
                <JijiIcon size="sm" />
                <span class="font-medium">Attribuer des Jiji</span>
              </div>
            </template>
            <div class="p-4 space-y-4">
              <UFormGroup label="Montant (Jiji)" name="creditJijiAmount">
                <UInput
                  v-model.number="creditJijiForm.amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                />
                <template #description>
                  Montant en Jiji (jetons de jeux) à attribuer à cet utilisateur
                </template>
              </UFormGroup>

              <UFormGroup label="Description" name="creditJijiDescription">
                <UTextarea
                  v-model="creditJijiForm.description"
                  placeholder="Ex: Bonus pour participation à un événement"
                  rows="3"
                />
                <template #description>
                  Description de la transaction (sera préfixée par "[Nuna'a Heritage]")
                </template>
              </UFormGroup>

              <div class="flex items-center gap-3 pt-2">
                <UButton
                  @click="handleCreditJijiUser"
                  color="neutral"
                  variant="soft"
                  :loading="isCreditingJiji"
                  :disabled="isCreditingJiji || !creditJijiForm.amount || creditJijiForm.amount <= 0 || !creditJijiForm.description"
                  block
                >
                  <UIcon name="i-heroicons-plus-circle" class="mr-1" />
                  Créditer en Jiji
                </UButton>
              </div>
            </div>
          </UCard>

          <!-- Modification du rôle (si admin/superadmin) -->
          <UCard v-if="canModifyRoles" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <template #header>
              <span class="font-medium">Modifier le rôle</span>
            </template>
            <div class="p-4">
              <div class="mb-2">
                <label class="block text-sm font-medium text-white/70 mb-2">Nouveau rôle</label>
                <USelect
                  v-model="selectedRole"
                  :items="roleOptions"
                  option-attribute="label"
                  value-attribute="value"
                />
              </div>
            </div>
          </UCard>

          <!-- Archivage (admin / superadmin) -->
          <UCard
            v-if="canModifyRoles && userStore.selectedUser?.archivedAt"
            class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0"
          >
            <div class="p-4">
              <UAlert
                color="neutral"
                variant="soft"
                icon="i-heroicons-archive-box"
                title="Compte archivé"
                :description="`Archivé le ${userStore.formatDate(userStore.selectedUser.archivedAt)}. Connexion désactivée, données conservées.`"
              />
            </div>
          </UCard>
          <UCard v-else-if="canModifyRoles && canArchiveSelectedUser" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
            <div class="p-4">
              <UButton
                color="warning"
                variant="soft"
                block
                icon="i-heroicons-archive-box-arrow-down"
                @click="userStore.confirmDelete"
              >
                Archiver l'utilisateur
              </UButton>
            </div>
          </UCard>
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation d’archivage -->
    <UModal v-model:open="userStore.isDeleteConfirmOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-archive-box-arrow-down" class="w-5 h-5 text-amber-400" />
          <span class="font-medium">Confirmer l’archivage</span>
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-heroicons-information-circle"
            title="Archivage du compte"
            description="Le compte sera désactivé (plus de connexion), les jetons de session seront révoqués. Les données (historique, transactions, etc.) restent en base."
          />
          <template v-if="userStore.selectedUser">
            <p class="text-white/90">
              Archiver l'utilisateur
              <strong class="text-white">{{ userStore.selectedUser.email }}</strong> ?
            </p>
          </template>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="() => {
              userStore.isDeleteConfirmOpen = false
              if (!userStore.isUserModalOpen) {
                userStore.selectedUser = null
              }
            }"
            :disabled="userStore.isDeleting"
          >
            Annuler
          </UButton>
          <UButton
            color="warning"
            @click="handleDeleteUser"
            :loading="userStore.isDeleting"
            :disabled="userStore.isDeleting"
          >
            Archiver
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
