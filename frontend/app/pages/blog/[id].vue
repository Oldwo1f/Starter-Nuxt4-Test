<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { apiBaseUrl, getImageUrl: getImageUrlHelper } = useApi()

const post = ref<any>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const postId = computed(() => parseInt(route.params.id as string, 10))

const rawPost = ref<any>(null)
const latestPosts = ref<any[]>([])

// Helper pour obtenir l'URL de l'image
const getImageUrl = (imagePath: string) => {
  return getImageUrlHelper(imagePath)
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

// Fetch latest posts (3 derniers, excluant l'article actuel)
const fetchLatestPosts = async () => {
  try {
    const response = await $fetch<{
      data: any[]
      total: number
    }>(`${apiBaseUrl}/blog`, {
      query: {
        page: 1,
        pageSize: 4, // Récupérer 4 pour avoir 3 après exclusion
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    })
    // Exclure l'article actuel et prendre les 3 premiers
    latestPosts.value = response.data
      .filter((p) => p.id !== postId.value)
      .slice(0, 3)
  } catch (error) {
    console.error('Error fetching latest posts:', error)
  }
}

// Fetch blog post
const fetchPost = async () => {
  isLoading.value = true
  error.value = null
  try {
    const data = await $fetch<any>(`${apiBaseUrl}/blog/${postId.value}`)
    rawPost.value = data
    
    post.value = {
      id: data.id,
      title: data.title,
      description: data.content.substring(0, 200) + (data.content.length > 200 ? '...' : ''),
      date: new Date(data.createdAt).toISOString(),
      authors: data.author
        ? [
            {
              name: data.author.email,
              avatar: {
                src: '',
                alt: data.author.email,
              },
            },
          ]
        : [],
      content: data.content,
    }
    
    // Charger les derniers articles après avoir chargé l'article actuel
    await fetchLatestPosts()
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Erreur lors du chargement de l\'article'
    console.error('Error fetching blog post:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPost()
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="error" class="py-12 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-4 h-12 w-12 text-red-500" />
      <p class="text-red-500">{{ error }}</p>
      <UButton to="/blog" class="mt-4" icon="i-heroicons-arrow-left">
        Retour au blog
      </UButton>
    </div>

    <div v-else-if="post && rawPost">
      <!-- Vidéo (priorité sur les images) -->
      <div v-if="rawPost.videoUrl" class="mb-8">
        <div class="relative aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            v-if="getVideoEmbedUrl(rawPost.videoUrl)"
            :src="getVideoEmbedUrl(rawPost.videoUrl)"
            class="h-full w-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
          <div v-else class="flex h-full items-center justify-center bg-white/10">
            <a :href="rawPost.videoUrl" target="_blank" class="text-primary-500 hover:underline">
              Voir la vidéo
            </a>
          </div>
        </div>
      </div>

      <!-- Images (si pas de vidéo) -->
      <div v-else-if="rawPost.images && rawPost.images.length > 0" class="mb-8">
        <!-- Une seule image : affichage simple -->
        <div v-if="rawPost.images.length === 1" class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
          <img
            :src="getImageUrl(rawPost.images[0])"
            :alt="post.title"
            class="h-full w-full object-cover"
          />
        </div>

        <!-- Plusieurs images : carousel -->
        <UCarousel
          v-else
          v-slot="{ item }"
          :items="rawPost.images"
          arrows
          dots
          class="w-full"
          :ui="{
            item: 'basis-full',
            container: 'ms-0'
          }"
        >
          <div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            <img
              :src="getImageUrl(item)"
              :alt="post.title"
              class="h-full w-full object-cover"
            />
          </div>
        </UCarousel>
      </div>

      <UBlogPost v-bind="post">
        <template #content>
          <div class="prose prose-invert max-w-none">
            <div class="whitespace-pre-wrap">{{ post.content }}</div>
          </div>
        </template>
      </UBlogPost>

      <div class="mt-8 flex justify-center">
        <UButton to="/blog" variant="outline" icon="i-heroicons-arrow-left">
          Retour au blog
        </UButton>
      </div>

      <!-- Section 3 derniers articles -->
      <div v-if="latestPosts.length > 0" class="mt-16">
        <h2 class="mb-6 text-2xl font-bold">Derniers articles</h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <UCard
            v-for="latestPost in latestPosts"
            :key="latestPost.id"
            class="cursor-pointer transition-transform hover:scale-105"
            @click="navigateTo(`/blog/${latestPost.id}`)"
          >
            <template #header>
              <!-- Vidéo (priorité sur les images) -->
              <div v-if="latestPost.videoUrl" class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                <iframe
                  v-if="getVideoEmbedUrl(latestPost.videoUrl)"
                  :src="getVideoEmbedUrl(latestPost.videoUrl)"
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
              <div v-else-if="latestPost.images && latestPost.images.length > 0" class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                <img
                  :src="getImageUrl(latestPost.images[0])"
                  :alt="latestPost.title"
                  class="h-full w-full object-cover"
                />
              </div>
              <!-- Placeholder si ni vidéo ni image -->
              <div v-else class="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-white/10 flex items-center justify-center">
                <UIcon name="i-heroicons-document-text" class="h-12 w-12 text-white/40" />
              </div>
            </template>
            <div class="space-y-2">
              <h3 class="font-semibold line-clamp-2">{{ latestPost.title }}</h3>
              <p class="line-clamp-2 text-sm text-white/70">
                {{ latestPost.content.substring(0, 100) }}{{ latestPost.content.length > 100 ? '...' : '' }}
              </p>
              <div class="flex items-center gap-2 text-xs text-white/60">
                <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
                <span>{{ new Date(latestPost.createdAt).toLocaleDateString('fr-FR') }}</span>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
