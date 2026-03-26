<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Bannière',
})

import { useBannerStore } from '~/stores/useBannerStore'

const bannerStore = useBannerStore()
const toast = useToast()
const { getImageUrl } = useApi()

const getPreview = (file?: File, existing?: string | null): string | null => {
  if (file) return URL.createObjectURL(file)
  if (existing) return getImageUrl(existing)
  return null
}

const onDesktopChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  bannerStore.form.desktop = file
}

const onMobileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  bannerStore.form.mobile = file
}

const clearDesktop = () => {
  bannerStore.form.desktop = undefined
}

const clearMobile = () => {
  bannerStore.form.mobile = undefined
}

const handleSave = async () => {
  const result = await bannerStore.saveBanner()
  if (result.success) {
    toast.add({
      title: 'OK',
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

onMounted(() => {
  bannerStore.fetchBanner()
})
</script>

<template>
  <div class="space-y-6">
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-arrow-path"
              @click="bannerStore.fetchBanner"
              :loading="bannerStore.isLoading"
            />
            <span class="font-medium">Configuration de la bannière</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              color="primary"
              icon="i-heroicons-check"
              @click="handleSave"
              :loading="bannerStore.isSaving"
            >
              Enregistrer
            </UButton>
          </div>
        </div>
      </template>

      <div class="space-y-6">
        <UAlert
          v-if="bannerStore.error"
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          title="Erreur"
          :description="bannerStore.error"
        />

        <UFormGroup label="Activer l’affichage de la bannière" name="isActive">
          <UCheckbox v-model="bannerStore.form.isActive" label="Afficher la bannière sur le site" />
          <template #description>
            <span class="text-xs text-white/60">
              Les images peuvent être changées sans activer l’affichage (pratique pour préparer).
            </span>
          </template>
        </UFormGroup>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UCard class="bg-white/5 border-0">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-computer-desktop" class="w-5 h-5" />
                <span class="font-medium">Bannière desktop</span>
              </div>
            </template>

            <div class="space-y-3">
              <div v-if="getPreview(bannerStore.form.desktop, bannerStore.form.existingDesktop)" class="relative">
                <img
                  :src="getPreview(bannerStore.form.desktop, bannerStore.form.existingDesktop)!"
                  alt="Bannière desktop"
                  class="w-full h-auto rounded-lg border-0"
                />
                <UButton
                  color="error"
                  variant="solid"
                  icon="i-heroicons-x-mark"
                  size="xs"
                  class="absolute top-2 right-2"
                  @click="clearDesktop"
                />
              </div>
              <UInput type="file" accept="image/*" @change="onDesktopChange" />
              <p class="text-xs text-white/60">
                Recommandé: image large (desktop). Aucune contrainte de dimensions imposée côté serveur.
              </p>
            </div>
          </UCard>

          <UCard class="bg-white/5 border-0">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-device-phone-mobile" class="w-5 h-5" />
                <span class="font-medium">Bannière mobile</span>
              </div>
            </template>

            <div class="space-y-3">
              <div v-if="getPreview(bannerStore.form.mobile, bannerStore.form.existingMobile)" class="relative max-w-sm">
                <img
                  :src="getPreview(bannerStore.form.mobile, bannerStore.form.existingMobile)!"
                  alt="Bannière mobile"
                  class="w-full h-auto rounded-lg border-0"
                />
                <UButton
                  color="error"
                  variant="solid"
                  icon="i-heroicons-x-mark"
                  size="xs"
                  class="absolute top-2 right-2"
                  @click="clearMobile"
                />
              </div>
              <UInput type="file" accept="image/*" @change="onMobileChange" />
              <p class="text-xs text-white/60">
                Recommandé: image optimisée pour mobile. Aucune contrainte de dimensions imposée côté serveur.
              </p>
            </div>
          </UCard>
        </div>
      </div>
    </UCard>
  </div>
</template>

