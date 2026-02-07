<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const API_BASE_URL = 'http://localhost:3001'
const route = useRoute()

// Pagination
const page = ref(1)
const pageSize = ref(12)
const total = ref(0)
const totalPages = ref(0)

// Blog posts
const posts = ref<any[]>([])
const rawPosts = ref<any[]>([])
const isLoading = ref(false)

// Helper pour obtenir l'URL de l'image
const getImageUrl = (imagePath: string) => {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  return `http://localhost:3001${imagePath}`
}

// Helper pour extraire l'ID YouTube/Vimeo
const getVideoEmbedUrl = (url: string | null | undefined) => {
  if (!url) return null
  
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }
  
  return null
}

// Fetch blog posts
const fetchPosts = async () => {
  isLoading.value = true
  try {
    const response = await $fetch<{
      data: any[]
      total: number
      page: number
      pageSize: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }>(`${API_BASE_URL}/blog`, {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    })

    rawPosts.value = response.data

    posts.value = response.data.map((post) => ({
      id: post.id,
      title: post.title,
      description: post.content.substring(0, 150) + (post.content.length > 150 ? '...' : ''),
      date: new Date(post.createdAt).toISOString(),
      authors: post.author
        ? [
            {
              name: post.author.email,
              avatar: {
                src: '',
                alt: post.author.email,
              },
            },
          ]
        : [],
      to: `/blog/${post.id}`,
      // Ajouter l'image de couverture si disponible
      image: post.images && post.images.length > 0
        ? getImageUrl(post.images[0])
        : null,
      // Ajouter l'URL vidéo si disponible
      videoUrl: post.videoUrl || null,
    }))

    total.value = response.total
    totalPages.value = response.totalPages
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    posts.value = []
  } finally {
    isLoading.value = false
  }
}

// Watch page changes
watch(page, () => {
  fetchPosts()
})

// Initial fetch
onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        Découvrez nos articles, actualités et ressources sur la communauté Nuna'a Heritage
      </p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="posts.length > 0" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="post in posts"
        :key="post.id"
        class="cursor-pointer transition-transform hover:scale-105"
        @click="navigateTo(post.to)"
      >
        <template #header>
          <!-- Vidéo (priorité sur les images) -->
          <div v-if="post.videoUrl" class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            <iframe
              v-if="getVideoEmbedUrl(post.videoUrl)"
              :src="getVideoEmbedUrl(post.videoUrl)"
              class="h-full w-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            />
            <div v-else class="flex h-full items-center justify-center bg-white/10">
              <UIcon name="i-heroicons-video-camera" class="h-12 w-12 text-white/40" />
            </div>
          </div>
          <!-- Image si pas de vidéo -->
          <div v-else-if="post.image" class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            <img
              :src="post.image"
              :alt="post.title"
              class="h-full w-full object-cover"
            />
          </div>
          <!-- Placeholder si ni vidéo ni image -->
          <div v-else class="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-white/10 flex items-center justify-center">
            <UIcon name="i-heroicons-document-text" class="h-12 w-12 text-white/40" />
          </div>
        </template>
        <div class="space-y-2">
          <h3 class="font-semibold line-clamp-2">{{ post.title }}</h3>
          <p class="line-clamp-3 text-sm text-white/70">{{ post.description }}</p>
          <div v-if="post.authors && post.authors.length > 0" class="flex items-center gap-2 text-xs text-white/60">
            <UIcon name="i-heroicons-user" class="h-4 w-4" />
            <span>{{ post.authors[0].name }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-white/60">
            <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
            <span>{{ new Date(post.date).toLocaleDateString('fr-FR') }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="py-12 text-center text-white/60">
      <UIcon name="i-heroicons-document-text" class="mx-auto mb-4 h-12 w-12" />
      <p>Aucun article pour le moment</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-8 flex justify-center">
      <UPagination
        v-model="page"
        :page-count="pageSize"
        :total="total"
        :max="7"
        size="lg"
      />
    </div>
  </div>
</template>
