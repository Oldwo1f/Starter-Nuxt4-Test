<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { usePartnerStore } from '~/stores/usePartnerStore'

const partnerStore = usePartnerStore()
const { apiBaseUrl } = useApi()

// Charger les partenaires au montage
onMounted(async () => {
  await partnerStore.fetchPartners()
})

// Fonction pour obtenir l'URL complète d'une bannière
const getBannerUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  return `${apiBaseUrl}${url}`
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Nos Partenaires</h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        Découvrez nos partenaires qui nous accompagnent dans notre mission
      </p>
    </div>

    <div v-if="partnerStore.isLoading" class="py-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="mx-auto mb-4 h-12 w-12 animate-spin text-white/60" />
      <p class="text-white/60">Chargement des partenaires...</p>
    </div>

    <div v-else-if="partnerStore.partners.length > 0" class="space-y-8">
      <UCard
        v-for="partner in partnerStore.partners"
        :key="partner.id"
        class="overflow-hidden w-full"
      >
        <div class="flex flex-col gap-0">
          <!-- Bannière horizontale sur desktop, verticale sur mobile -->
          <div class="w-full">
            <!-- Bannière verticale pour mobile (priorité) -->
            <div
              v-if="partner.bannerVerticalUrl && getBannerUrl(partner.bannerVerticalUrl)"
              class="block md:hidden w-full"
            >
              <img
                :src="getBannerUrl(partner.bannerVerticalUrl)!"
                :alt="partner.name"
                class="w-full h-auto object-cover"
              />
            </div>
            <!-- Bannière horizontale pour mobile (fallback si pas de verticale) -->
            <div
              v-else-if="partner.bannerHorizontalUrl && getBannerUrl(partner.bannerHorizontalUrl)"
              class="block md:hidden w-full"
            >
              <img
                :src="getBannerUrl(partner.bannerHorizontalUrl)!"
                :alt="partner.name"
                class="w-full h-auto object-cover"
              />
            </div>
            <!-- Bannière horizontale pour desktop -->
            <div
              v-if="partner.bannerHorizontalUrl && getBannerUrl(partner.bannerHorizontalUrl)"
              class="hidden md:block w-full"
            >
              <img
                :src="getBannerUrl(partner.bannerHorizontalUrl)!"
                :alt="partner.name"
                class="w-full h-auto object-cover"
              />
            </div>
            <!-- Bannière verticale pour desktop (fallback si pas d'horizontale) -->
            <div
              v-else-if="partner.bannerVerticalUrl && getBannerUrl(partner.bannerVerticalUrl)"
              class="hidden md:block w-full"
            >
              <img
                :src="getBannerUrl(partner.bannerVerticalUrl)!"
                :alt="partner.name"
                class="w-full h-auto object-cover"
              />
            </div>
            <!-- Fallback si pas de bannière du tout -->
            <div
              v-else
              class="w-full h-64 md:h-96 flex items-center justify-center bg-gray-800/50"
            >
              <UIcon
                name="i-heroicons-building-office-2"
                class="h-16 w-16 text-white/40"
              />
            </div>
          </div>

          <!-- Contenu du partenaire -->
          <div class="p-6 md:p-8 flex flex-col justify-center items-center text-center">
            <h3 class="text-2xl md:text-3xl font-semibold mb-4">{{ partner.name }}</h3>
            <UButton
              v-if="partner.link"
              :to="partner.link"
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              icon="i-heroicons-arrow-top-right-on-square"
              size="lg"
            >
              Découvrir {{ partner.name }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="py-12 text-center text-white/60">
      <UIcon name="i-heroicons-building-office-2" class="mx-auto mb-4 h-12 w-12" />
      <p>Aucun partenaire pour le moment</p>
    </div>
  </div>
</template>
