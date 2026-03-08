<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Newsletter',
})

import type { NewsletterData } from '~/composables/useNewsletter'

const { fetchNewsletterData, generateNewsletterHTML } = useNewsletter()
const toast = useToast()

const isLoading = ref(false)
const newsletterData = ref<NewsletterData | null>(null)
const newsletterHTML = ref('')
const showPreview = ref(false)

// Générer la newsletter
const generateNewsletter = async () => {
  isLoading.value = true
  try {
    const data = await fetchNewsletterData()
    newsletterData.value = data
    newsletterHTML.value = generateNewsletterHTML(data)
    showPreview.value = true
    
    toast.add({
      title: 'Succès',
      description: 'Newsletter générée avec succès',
      color: 'success',
    })
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.message || 'Erreur lors de la génération de la newsletter',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}

// Copier le HTML dans le presse-papiers
const copyHTML = async () => {
  try {
    await navigator.clipboard.writeText(newsletterHTML.value)
    toast.add({
      title: 'Succès',
      description: 'HTML copié dans le presse-papiers',
      color: 'success',
    })
  } catch (err) {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de copier dans le presse-papiers',
      color: 'red',
    })
  }
}

// Télécharger le HTML
const downloadHTML = () => {
  const blob = new Blob([newsletterHTML.value], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `newsletter-${new Date().toISOString().split('T')[0]}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  toast.add({
    title: 'Succès',
    description: 'Fichier HTML téléchargé',
    color: 'success',
  })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="space-y-2">
        <h2 class="text-2xl font-bold text-white">Générateur de Newsletter</h2>
        <p class="text-white/70">
          Générez une newsletter HTML compatible avec Brevo contenant les derniers sondages, articles et annonces.
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-sparkles"
        :loading="isLoading"
        @click="generateNewsletter"
      >
        Générer la newsletter
      </UButton>
    </div>

    <!-- Statistiques des données -->
    <UCard v-if="newsletterData" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-chart-bar" />
          <span class="font-medium">Contenu de la newsletter</span>
        </div>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="flex items-center gap-3 p-4 rounded-lg bg-white/5">
          <div class="p-2 rounded-lg bg-primary-500/20">
            <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ newsletterData.polls.length }}</p>
            <p class="text-sm text-white/60">Sondage{{ newsletterData.polls.length > 1 ? 's' : '' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-4 rounded-lg bg-white/5">
          <div class="p-2 rounded-lg bg-primary-500/20">
            <UIcon name="i-heroicons-document-text" class="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ newsletterData.blogPosts.length }}</p>
            <p class="text-sm text-white/60">Article{{ newsletterData.blogPosts.length > 1 ? 's' : '' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-4 rounded-lg bg-white/5">
          <div class="p-2 rounded-lg bg-primary-500/20">
            <UIcon name="i-heroicons-shopping-bag" class="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ newsletterData.listings.length }}</p>
            <p class="text-sm text-white/60">Annonce{{ newsletterData.listings.length > 1 ? 's' : '' }}</p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Aperçu de la newsletter -->
    <UCard v-if="showPreview && newsletterHTML" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-eye" />
            <span class="font-medium">Aperçu de la newsletter</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-clipboard-document"
              @click="copyHTML"
            >
              Copier le HTML
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-arrow-down-tray"
              @click="downloadHTML"
            >
              Télécharger
            </UButton>
          </div>
        </div>
      </template>
      <div class="space-y-4">
        <div class="border border-white/10 rounded-lg overflow-hidden bg-white">
          <iframe
            :srcdoc="newsletterHTML"
            class="w-full"
            style="min-height: 800px; border: none;"
            title="Aperçu de la newsletter"
          />
        </div>
      </div>
    </UCard>

    <!-- Message d'aide -->
    <UCard v-if="!showPreview" class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-information-circle" />
          <span class="font-medium">Instructions</span>
        </div>
      </template>
      <div class="space-y-4">
        <div class="space-y-2 text-white/70">
          <p>La newsletter inclura automatiquement :</p>
          <ul class="list-disc list-inside space-y-1 ml-4">
            <li>Les 2 derniers sondages (avec résultats si terminés, ou options de vote si en cours)</li>
            <li>Les 2 derniers articles du blog</li>
            <li>Les 3 dernières annonces du marketplace</li>
          </ul>
          <p class="mt-4">
            Une fois générée, vous pouvez copier le code HTML et le coller directement dans Brevo.
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
