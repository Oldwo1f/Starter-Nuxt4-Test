import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

const API_BASE_URL = 'http://localhost:3001'

export interface User {
  id: number
  email: string
  firstName?: string | null
  lastName?: string | null
  avatarImage?: string | null
  role: string
  emailVerified?: boolean
  isActive?: boolean
  lastLogin?: string | null
  walletBalance?: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse {
  data: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface SortingState {
  id: string
  desc: boolean
}

export interface ProfileFormData {
  firstName: string
  lastName: string
  avatarImage: string
}

export const useUserStore = defineStore('user', () => {
  const authStore = useAuthStore()

  // États des utilisateurs
  const users = ref<User[]>([])
  const totalUsers = ref(0)
  const isLoading = ref(false)
  const error = ref('')
  const selectedUser = ref<User | null>(null)
  const isFetching = ref(false)

  // États pour les modals
  const isUserModalOpen = ref(false)
  const isDeleteConfirmOpen = ref(false)
  const isDeleting = ref(false)
  const isEditingProfile = ref(false)
  const isSavingProfile = ref(false)

  // Formulaire de profil
  const profileFormData = ref<ProfileFormData>({
    firstName: '',
    lastName: '',
    avatarImage: '',
  })

  // États pour les filtres
  const globalFilter = ref('')
  const idFilter = ref('')
  const roleFilter = ref('all')
  const dateFilter = ref('')

  // États pour le tri et la pagination
  const sorting = ref<SortingState[]>([])
  const pagination = ref({
    pageIndex: 0,
    pageSize: 10,
  })

  // Ref pour la page actuelle (1-based pour UPagination)
  const currentPage = ref(1)

  // Synchroniser currentPage avec pagination.pageIndex
  watch(() => pagination.value.pageIndex, (newIndex) => {
    const newPage = newIndex + 1
    if (currentPage.value !== newPage) {
      currentPage.value = newPage
    }
  }, { immediate: true })

  // Synchroniser pagination.pageIndex avec currentPage (quand changé par UPagination)
  watch(currentPage, (newPage) => {
    const newIndex = newPage - 1
    if (pagination.value.pageIndex !== newIndex && !isFetching.value) {
      pagination.value.pageIndex = newIndex
    }
  })

  // Watchers pour déclencher le fetch lors des changements
  watch([globalFilter, idFilter, roleFilter, dateFilter], () => {
    if (pagination.value.pageIndex !== 0) {
      pagination.value.pageIndex = 0
    } else if (!isFetching.value) {
      fetchUsers()
    }
  })

  watch([sorting], () => {
    if (!isFetching.value) {
      fetchUsers()
    }
  }, { deep: true })

  watch([() => pagination.value.pageIndex, () => pagination.value.pageSize], ([newPageIndex, newPageSize], [oldPageIndex, oldPageSize]) => {
    if ((newPageIndex !== oldPageIndex || newPageSize !== oldPageSize) && !isFetching.value) {
      fetchUsers()
    }
  })

  const fetchUsers = async () => {
    if (isFetching.value) return
    isFetching.value = true
    isLoading.value = true
    error.value = ''
    try {
      const params: Record<string, string | number> = {
        page: pagination.value.pageIndex + 1,
        pageSize: pagination.value.pageSize,
      }

      if (globalFilter.value) {
        params.search = globalFilter.value
      }
      if (idFilter.value) {
        const id = parseInt(idFilter.value)
        if (!isNaN(id)) {
          params.id = id
        }
      }
      if (roleFilter.value && roleFilter.value !== 'all') {
        params.role = roleFilter.value
      }
      if (dateFilter.value) {
        params.createdAt = dateFilter.value
      }

      if (sorting.value.length > 0 && sorting.value[0]) {
        const sort = sorting.value[0]
        const sortBy = sort.id === 'createdAtFormatted' ? 'createdAt' : sort.id
        params.sortBy = sortBy
        params.sortOrder = sort.desc ? 'DESC' : 'ASC'
      }

      const response = await $fetch<PaginatedResponse>(`${API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        query: params,
      })

      users.value = response.data
      totalUsers.value = response.total

      if (pagination.value.pageIndex !== response.page - 1) {
        pagination.value.pageIndex = response.page - 1
      }
      if (pagination.value.pageSize !== response.pageSize) {
        pagination.value.pageSize = response.pageSize
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des utilisateurs'
      error.value = errorMessage
    } finally {
      isLoading.value = false
      isFetching.value = false
    }
  }

  const openUserDetails = (user: User) => {
    selectedUser.value = user
    profileFormData.value = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      avatarImage: user.avatarImage || '',
    }
    isEditingProfile.value = false
    isUserModalOpen.value = true
  }

  const closeUserModal = () => {
    isUserModalOpen.value = false
    selectedUser.value = null
    isEditingProfile.value = false
  }

  const startEditingProfile = () => {
    if (selectedUser.value) {
      profileFormData.value = {
        firstName: selectedUser.value.firstName || '',
        lastName: selectedUser.value.lastName || '',
        avatarImage: selectedUser.value.avatarImage || '',
      }
      isEditingProfile.value = true
    }
  }

  const cancelEditingProfile = () => {
    if (selectedUser.value) {
      profileFormData.value = {
        firstName: selectedUser.value.firstName || '',
        lastName: selectedUser.value.lastName || '',
        avatarImage: selectedUser.value.avatarImage || '',
      }
    }
    isEditingProfile.value = false
  }

  const saveProfile = async () => {
    if (!selectedUser.value) {
      return {
        success: false,
        error: 'Aucun utilisateur sélectionné',
      }
    }

    isSavingProfile.value = true
    try {
      const updatedUser = await $fetch<User>(`${API_BASE_URL}/users/${selectedUser.value.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          firstName: profileFormData.value.firstName || undefined,
          lastName: profileFormData.value.lastName || undefined,
          avatarImage: profileFormData.value.avatarImage || undefined,
        },
      })

      // Mettre à jour l'utilisateur dans la liste
      const userIndex = users.value.findIndex((u) => u.id === updatedUser.id)
      if (userIndex !== -1) {
        users.value[userIndex] = { ...users.value[userIndex], ...updatedUser }
      }
      selectedUser.value = { ...selectedUser.value, ...updatedUser }

      isEditingProfile.value = false
      return {
        success: true,
        message: 'Les informations de l\'utilisateur ont été mises à jour avec succès.',
        data: updatedUser,
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la mise à jour du profil'
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      isSavingProfile.value = false
    }
  }

  const updateUserRole = async (userId: number, newRole: string) => {
    try {
      await $fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          role: newRole,
        },
      })

      // Mettre à jour l'utilisateur dans la liste
      const userIndex = users.value.findIndex((u) => u.id === userId)
      if (userIndex !== -1 && users.value[userIndex]) {
        users.value[userIndex].role = newRole
      }
      if (selectedUser.value && selectedUser.value.id === userId) {
        selectedUser.value.role = newRole
      }

      return {
        success: true,
        message: 'Le rôle de l\'utilisateur a été modifié avec succès.',
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la mise à jour du rôle'
      error.value = errorMessage
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const confirmDelete = () => {
    if (selectedUser.value) {
      isDeleteConfirmOpen.value = true
    }
  }

  const deleteUser = async () => {
    if (!selectedUser.value) {
      return {
        success: false,
        error: 'Aucun utilisateur sélectionné',
      }
    }

    isDeleting.value = true
    error.value = ''
    const userEmail = selectedUser.value.email

    try {
      await $fetch(`${API_BASE_URL}/users/${selectedUser.value.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      isDeleteConfirmOpen.value = false
      closeUserModal()
      await fetchUsers()

      return {
        success: true,
        message: `L'utilisateur ${userEmail} a été supprimé avec succès.`,
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression de l\'utilisateur'
      error.value = errorMessage
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      isDeleting.value = false
    }
  }

  const resetFilters = () => {
    globalFilter.value = ''
    idFilter.value = ''
    roleFilter.value = 'all'
    dateFilter.value = ''
    sorting.value = []
    pagination.value = {
      pageIndex: 0,
      pageSize: 10,
    }
    currentPage.value = 1
    fetchUsers()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDisplayName = (user: User) => {
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

  const getAvatarText = (user: User) => {
    if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase()
    }
    if (user.lastName) {
      return user.lastName.charAt(0).toUpperCase()
    }
    return user.email?.charAt(0).toUpperCase() || 'U'
  }

  const getAvatarUrl = (user: User): string | undefined => {
    if (!user.avatarImage) return undefined
    return `http://localhost:3001${user.avatarImage}`
  }

  // Préparer les données pour UTable
  interface TableRow extends User {
    createdAtFormatted: string
  }

  const data = computed<TableRow[]>(() => {
    return users.value.map((user) => ({
      ...user,
      createdAtFormatted: formatDate(user.createdAt),
    }))
  })

  // Computed pour le rôle sélectionné (getter seulement, le setter sera géré par le composant)
  const selectedRole = computed(() => selectedUser.value?.role || '')

  return {
    // États
    users: readonly(users),
    totalUsers: readonly(totalUsers),
    isLoading: readonly(isLoading),
    error: readonly(error),
    selectedUser,
    isFetching: readonly(isFetching),
    isUserModalOpen,
    isDeleteConfirmOpen,
    isDeleting: readonly(isDeleting),
    isEditingProfile: readonly(isEditingProfile),
    isSavingProfile: readonly(isSavingProfile),
    profileFormData,
    globalFilter,
    idFilter,
    roleFilter,
    dateFilter,
    sorting,
    pagination,
    currentPage,
    data,
    selectedRole,

    // Actions
    fetchUsers,
    openUserDetails,
    closeUserModal,
    startEditingProfile,
    cancelEditingProfile,
    saveProfile,
    updateUserRole,
    confirmDelete,
    deleteUser,
    resetFilters,
    formatDate,
    getDisplayName,
    getAvatarText,
    getAvatarUrl,
  }
})
