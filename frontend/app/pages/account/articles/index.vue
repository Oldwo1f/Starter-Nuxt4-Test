<script setup lang="ts">
definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.pages.articles',
})

import { useAuthStore } from '~/stores/useAuthStore'

const { apiBaseUrl, getImageUrl } = useApi()
const authStore = useAuthStore()
const { canCreateBlogPost } = useMemberCheck()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { formatDate: formatDateLocale } = useLocaleDate()

const posts = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const isLoading = ref(true)
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const editPostId = ref<number | null>(null)

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: t('account.articles.statusDraft'),
    pending: t('account.articles.statusPending'),
    active: t('account.articles.statusActive'),
    archived: t('account.articles.statusArchived'),
  }
  return map[status] || status
}

const statusColors: Record<string, string> = {
  draft: 'warning',
  pending: 'primary',
  active: 'success',
  archived: 'neutral',
}

const fetchPosts = async () => {
  if (!authStore.accessToken) return
  isLoading.value = true
  try {
    const response = await $fetch<{
      data: any[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>(`${apiBaseUrl}/blog/my`, {
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      query: {
        page: page.value,
        pageSize: pageSize.value,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    })
    posts.value = response.data
    total.value = response.total
  } catch (err: any) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: err.data?.message || err.message || t('account.articles.loadError'),
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
    posts.value = []
  } finally {
    isLoading.value = false
  }
}

const formatDate = (date: string) =>
  formatDateLocale(date, { day: 'numeric', month: 'short', year: 'numeric' })

watch(page, () => fetchPosts())

const onCreateSuccess = () => {
  isCreateModalOpen.value = false
  fetchPosts()
}

const openEditModal = (post: { id: number }) => {
  editPostId.value = post.id
  isEditModalOpen.value = true
}

const onEditSuccess = () => {
  isEditModalOpen.value = false
  editPostId.value = null
  fetchPosts()
}

const onEditError = () => {
  isEditModalOpen.value = false
  editPostId.value = null
}

onMounted(() => {
  fetchPosts()
  if (route.query.create === '1' || route.query.open === 'create') {
    isCreateModalOpen.value = true
    router.replace({ path: '/account/articles', query: {} })
  } else if (route.query.edit) {
    const id = Number(route.query.edit)
    if (!isNaN(id)) {
      editPostId.value = id
      isEditModalOpen.value = true
      router.replace({ path: '/account/articles', query: {} })
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ t('account.articles.title') }}</h1>
        <p class="mt-1 text-white/60">
          {{ t('account.articles.subtitle') }}
        </p>
      </div>
      <UButton
        v-if="canCreateBlogPost"
        color="primary"
        icon="i-heroicons-plus"
        @click="isCreateModalOpen = true"
      >
        {{ t('account.articles.create') }}
      </UButton>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <div v-if="isLoading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
      </div>

      <div v-else-if="posts.length === 0" class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-document-text" class="mx-auto mb-4 h-12 w-12" />
        <p class="mb-4">{{ t('account.articles.empty') }}</p>
        <UButton
          v-if="canCreateBlogPost"
          color="primary"
          icon="i-heroicons-plus"
          @click="isCreateModalOpen = true"
        >
          {{ t('account.articles.create') }}
        </UButton>
        <UButton
          v-else
          to="/account/cotisation"
          color="primary"
          variant="outline"
          icon="i-heroicons-lock-closed"
        >
          {{ t('account.articles.memberToPost') }}
        </UButton>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="post in posts"
          :key="post.id"
          class="flex flex-col gap-4 rounded-lg border border-white/10 p-4 transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex min-w-0 flex-1 gap-4">
            <div class="h-20 w-28 shrink-0 overflow-hidden rounded-lg">
              <img
                v-if="post.images && post.images.length > 0"
                :src="getImageUrl(post.images[0])"
                :alt="post.title"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full items-center justify-center bg-white/10"
              >
                <UIcon name="i-heroicons-document-text" class="h-8 w-8 text-white/40" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold line-clamp-2">{{ post.title }}</h3>
              <div class="mt-1 flex items-center gap-2 text-sm text-white/60">
                <UBadge
                  :color="statusColors[post.status] || 'neutral'"
                  variant="soft"
                  size="xs"
                >
                  {{ statusLabel(post.status) }}
                </UBadge>
                <span>{{ formatDate(post.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div class="flex shrink-0 gap-2">
            <UButton
              v-if="post.status === 'draft' || post.status === 'pending'"
              variant="outline"
              size="sm"
              icon="i-heroicons-pencil"
              @click="openEditModal(post)"
            >
              {{ t('account.articles.edit') }}
            </UButton>
            <UButton
              v-if="post.status === 'active'"
              :to="`/blog/${post.id}`"
              variant="outline"
              size="sm"
              icon="i-heroicons-eye"
            >
              {{ t('account.articles.view') }}
            </UButton>
          </div>
        </div>

        <div v-if="total > pageSize" class="mt-4 flex justify-center">
          <UPagination
            v-model="page"
            :total="total"
            :items-per-page="pageSize"
            :max="7"
          />
        </div>
      </div>
    </UCard>

    <!-- Modal Créer un article -->
    <UModal v-model:open="isCreateModalOpen" :ui="{ wrapper: 'max-w-3xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-plus" class="w-5 h-5" />
            <span class="font-medium">{{ t('account.articles.modalCreateTitle') }}</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="isCreateModalOpen = false"
          />
        </div>
      </template>

      <template #body>
        <ClientOnly>
          <BlogArticleCreateForm :key="isCreateModalOpen ? 'create-open' : 'create-closed'" @success="onCreateSuccess" />
          <template #fallback>
            <div class="flex justify-center py-12">
              <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
            </div>
          </template>
        </ClientOnly>
      </template>
    </UModal>

    <!-- Modal Modifier un article -->
    <UModal v-model:open="isEditModalOpen" :ui="{ wrapper: 'max-w-3xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-pencil" class="w-5 h-5" />
            <span class="font-medium">{{ t('account.articles.modalEditTitle') }}</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="isEditModalOpen = false"
          />
        </div>
      </template>

      <template #body>
        <ClientOnly>
          <BlogArticleEditForm
            v-if="editPostId"
            :post-id="editPostId"
            @success="onEditSuccess"
            @error="onEditError"
          />
          <template #fallback>
            <div class="flex justify-center py-12">
              <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
            </div>
          </template>
        </ClientOnly>
      </template>
    </UModal>
  </div>
</template>
