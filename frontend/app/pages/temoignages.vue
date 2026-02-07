<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

// Helper pour obtenir l'URL d'embed YouTube
const getVideoEmbedUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  
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
  
  return undefined
}

// Témoignages de nos membres (placeholder - à remplacer par des vraies données)
const testimonials = [
  {
    id: 1,
    name: 'Marie Teva',
    role: 'Membre de la communauté',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Découvrez le parcours inspirant de Marie au sein de Nuna\'a Heritage.',
  },
  {
    id: 2,
    name: 'Jean-Pierre Tama',
    role: 'Artisan partenaire',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Jean-Pierre partage son expérience en tant qu\'artisan partenaire.',
  },
  {
    id: 3,
    name: 'Sophie Manu',
    role: 'Entrepreneuse',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Sophie témoigne de son parcours entrepreneurial avec Nuna\'a Heritage.',
  },
  {
    id: 4,
    name: 'Tama Nui',
    role: 'Éducateur',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Tama partage son engagement dans la transmission du savoir.',
  },
  {
    id: 5,
    name: 'Hina Rava',
    role: 'Artiste',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Hina témoigne de son parcours artistique au sein de la communauté.',
  },
  {
    id: 6,
    name: 'Maui Tane',
    role: 'Entrepreneur',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Maui partage son expérience entrepreneuriale avec Nuna\'a Heritage.',
  },
  {
    id: 7,
    name: 'Vaihere Teva',
    role: 'Membre actif',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Vaihere témoigne de son engagement dans la communauté.',
  },
  {
    id: 8,
    name: 'Tahiri Manu',
    role: 'Partenaire',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Tahiri partage son expérience en tant que partenaire de Nuna\'a Heritage.',
  },
  {
    id: 9,
    name: 'Raimana Tama',
    role: 'Membre fondateur',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Raimana témoigne de son parcours depuis les débuts de Nuna\'a Heritage.',
  },
]
</script>

<template>
  <div class="min-h-screen bg-black/50 py-16 sm:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- En-tête -->
      <div class="mb-12 text-center">
        <h1 class="mb-4 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
          Témoignages de nos membres
        </h1>
        <p class="mx-auto max-w-3xl text-lg text-white/70 sm:text-xl">
          Découvrez les expériences, les parcours et les histoires inspirantes de notre communauté Nuna'a Heritage
        </p>
      </div>

      <!-- Grille de témoignages -->
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="testimonial in testimonials"
          :key="testimonial.id"
          class="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/20"
        >
          <template #header>
            <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                :src="getVideoEmbedUrl(testimonial.videoUrl)"
                class="h-full w-full"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              />
            </div>
          </template>

          <div class="space-y-3">
            <div>
              <h3 class="text-xl font-semibold text-white transition-colors group-hover:text-primary-400">
                {{ testimonial.name }}
              </h3>
              <p class="text-sm text-primary-400">
                {{ testimonial.role }}
              </p>
            </div>
            <p class="text-sm text-white/80">
              {{ testimonial.description }}
            </p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
