import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export interface BlogPost {
  id: number
  title: string
  content: string
  images?: string[]
  videoUrl?: string | null
  authorId: number
  author?: {
    id: number
    email: string
  }
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse {
  data: BlogPost[]
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

export interface BlogForm {
  title: string
  content: string
  images?: File[]
  existingImages?: string[]
  videoUrl?: string
}

export const useBlogStore = defineStore('blog', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // États des articles
  const blogPosts = ref<BlogPost[]>([])
  const totalPosts = ref(0)
  const isLoading = ref(false)
  const error = ref('')
  const selectedPost = ref<BlogPost | null>(null)
  const isFetching = ref(false)

  // États pour les modals
  const isPostModalOpen = ref(false)
  const isDeleteConfirmOpen = ref(false)
  const isDeleting = ref(false)
  const isEditMode = ref(false)

  // États pour les filtres
  const globalFilter = ref('')
  const authorIdFilter = ref('')

  // États pour le tri et la pagination
  const sorting = ref<SortingState[]>([])
  const pagination = ref({
    pageIndex: 0,
    pageSize: 10,
  })

  // Ref pour la page actuelle (1-based pour UPagination)
  const currentPage = ref(1)

  // Form pour créer/éditer un article
  const form = ref<BlogForm>({
    title: '',
    content: '',
  })

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
  watch([globalFilter, authorIdFilter], () => {
    if (!isFetching.value) {
      pagination.value.pageIndex = 0
      fetchPosts()
    }
  })

  watch([sorting], () => {
    if (!isFetching.value) {
      fetchPosts()
    }
  }, { deep: true })

  watch([() => pagination.value.pageIndex, () => pagination.value.pageSize], ([newPageIndex, newPageSize], [oldPageIndex, oldPageSize]) => {
    if ((newPageIndex !== oldPageIndex || newPageSize !== oldPageSize) && !isFetching.value) {
      fetchPosts()
    }
  })

  const fetchPosts = async () => {
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
      if (authorIdFilter.value) {
        const authorId = parseInt(authorIdFilter.value)
        if (!isNaN(authorId)) {
          params.authorId = authorId
        }
      }

      if (sorting.value.length > 0 && sorting.value[0]) {
        const sort = sorting.value[0]
        const sortBy = sort.id === 'createdAtFormatted' ? 'createdAt' : sort.id
        params.sortBy = sortBy
        params.sortOrder = sort.desc ? 'DESC' : 'ASC'
      }

      const response = await $fetch<PaginatedResponse>(`${API_BASE_URL}/blog`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        query: params,
      })

      blogPosts.value = response.data
      totalPosts.value = response.total

      if (pagination.value.pageIndex !== response.page - 1) {
        pagination.value.pageIndex = response.page - 1
      }
      if (pagination.value.pageSize !== response.pageSize) {
        pagination.value.pageSize = response.pageSize
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des articles'
      error.value = errorMessage
    } finally {
      isLoading.value = false
      isFetching.value = false
    }
  }

  const openAddModal = () => {
    isEditMode.value = false
    form.value = {
      title: '',
      content: '',
      images: [],
      existingImages: [],
      videoUrl: '',
    }
    isPostModalOpen.value = true
  }

  const openEditModal = (post: BlogPost) => {
    isEditMode.value = true
    selectedPost.value = post
    form.value = {
      title: post.title,
      content: post.content,
      images: [],
      existingImages: post.images || [],
      videoUrl: post.videoUrl || '',
    }
    isPostModalOpen.value = true
  }

  const closePostModal = () => {
    isPostModalOpen.value = false
    selectedPost.value = null
    form.value = {
      title: '',
      content: '',
      images: [],
      existingImages: [],
      videoUrl: '',
    }
  }

  const savePost = async () => {
    if (!form.value.title.trim() || !form.value.content.trim()) {
      return {
        success: false,
        error: 'Le titre et le contenu sont requis',
      }
    }

    try {
      const formData = new FormData()
      formData.append('title', form.value.title)
      formData.append('content', form.value.content)
      
      if (form.value.videoUrl) {
        formData.append('videoUrl', form.value.videoUrl)
      }

      // Ajouter les images existantes si en mode édition (comme JSON stringifié)
      if (isEditMode.value && form.value.existingImages && form.value.existingImages.length > 0) {
        formData.append('images', JSON.stringify(form.value.existingImages))
      }

      // Ajouter les nouvelles images
      if (form.value.images && form.value.images.length > 0) {
        form.value.images.forEach((file) => {
          formData.append('images', file)
        })
      }

      if (isEditMode.value && selectedPost.value) {
        // Mettre à jour
        await $fetch(`${API_BASE_URL}/blog/${selectedPost.value.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: formData,
        })
        closePostModal()
        await fetchPosts()
        return {
          success: true,
          message: 'L\'article a été modifié avec succès.',
        }
      } else {
        // Créer
        await $fetch(`${API_BASE_URL}/blog`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: formData,
        })
        closePostModal()
        await fetchPosts()
        return {
          success: true,
          message: 'L\'article a été créé avec succès.',
        }
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la sauvegarde'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const confirmDelete = () => {
    if (selectedPost.value) {
      isDeleteConfirmOpen.value = true
    }
  }

  const deletePost = async () => {
    if (!selectedPost.value) {
      return {
        success: false,
        error: 'Aucun article sélectionné',
      }
    }

    isDeleting.value = true
    error.value = ''
    const postTitle = selectedPost.value.title

    try {
      await $fetch(`${API_BASE_URL}/blog/${selectedPost.value.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      isDeleteConfirmOpen.value = false
      closePostModal()
      await fetchPosts()

      return {
        success: true,
        message: `L'article "${postTitle}" a été supprimé avec succès.`,
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression de l\'article'
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
    authorIdFilter.value = ''
    sorting.value = []
    pagination.value = {
      pageIndex: 0,
      pageSize: 10,
    }
    currentPage.value = 1
    fetchPosts()
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

  // Préparer les données pour UTable
  interface TableRow extends BlogPost {
    createdAtFormatted: string
    authorEmail: string
  }

  const data = computed<TableRow[]>(() => {
    return blogPosts.value.map((post) => ({
      ...post,
      createdAtFormatted: formatDate(post.createdAt),
      authorEmail: post.author?.email || 'Inconnu',
    }))
  })

  return {
    // États
    blogPosts: readonly(blogPosts),
    totalPosts: readonly(totalPosts),
    isLoading: readonly(isLoading),
    error: readonly(error),
    selectedPost,
    isFetching: readonly(isFetching),
    isPostModalOpen,
    isDeleteConfirmOpen,
    isDeleting: readonly(isDeleting),
    isEditMode: readonly(isEditMode),
    globalFilter,
    authorIdFilter,
    sorting,
    pagination,
    currentPage,
    form,
    data,

    // Actions
    fetchPosts,
    openAddModal,
    openEditModal,
    closePostModal,
    savePost,
    confirmDelete,
    deletePost,
    resetFilters,
    formatDate,
  }
})
