<script setup lang="ts">
import type { Goodie } from '~/stores/useGoodiesStore'
import { useGoodiesStore } from '~/stores/useGoodiesStore'
import { useAuthStore } from '~/stores/useAuthStore'

interface Props {
  goodie: Goodie
}

const props = defineProps<Props>()

const goodiesStore = useGoodiesStore()
const authStore = useAuthStore()

const API_BASE_URL = 'http://localhost:3001'

const canAccess = computed(() => goodiesStore.canAccessGoodie(props.goodie))

// Obtenir l'URL de l'image
const getImageUrl = (): string | null => {
  if (!props.goodie.imageUrl) return null
  if (props.goodie.imageUrl.startsWith('http://') || props.goodie.imageUrl.startsWith('https://')) {
    return props.goodie.imageUrl
  }
  return `${API_BASE_URL}${props.goodie.imageUrl}`
}

const handleClick = () => {
  // Si le goodie est privé et l'utilisateur n'a pas accès, ne rien faire
  if (!canAccess.value) {
    return
  }

  // Si le goodie a un lien, l'ouvrir
  if (props.goodie.link) {
    window.open(props.goodie.link, '_blank')
  }
}

// Vérifier si le lien doit être visible
const shouldShowLink = computed(() => {
  // Afficher le lien seulement si le goodie est public OU si l'utilisateur a accès
  return props.goodie.link && (props.goodie.isPublic || canAccess.value)
})
</script>

<template>
  <UCard class="relative cursor-pointer transition-transform hover:scale-105" @click="handleClick">
    <!-- Lock overlay for restricted goodies -->
    <div
      v-if="!canAccess"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm"
    >
      <div class="text-center">
        <UIcon name="i-heroicons-lock-closed" class="mx-auto mb-2 h-12 w-12 text-white/80" />
        <p class="text-sm font-medium text-white">Réservé aux membres</p>
        <UButton
          to="/login"
          size="sm"
          color="primary"
          class="mt-3"
          icon="i-heroicons-lock-open"
          @click.stop
        >
          Se connecter
        </UButton>
      </div>
    </div>

    <template #header>
      <div class="relative aspect-square w-full overflow-hidden rounded-lg bg-white/5">
        <img
          v-if="getImageUrl()"
          :src="getImageUrl()!"
          :alt="goodie.name"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full items-center justify-center">
          <UIcon
            name="i-heroicons-gift"
            class="h-16 w-16 text-white/40"
          />
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div class="flex items-start justify-between gap-2">
        <h3 class="flex-1 font-semibold line-clamp-2">{{ goodie.name }}</h3>
        <UBadge :color="goodie.isPublic ? 'green' : 'orange'" variant="subtle" size="xs">
          {{ goodie.isPublic ? 'Public' : 'Privé' }}
        </UBadge>
      </div>

      <p v-if="goodie.description" class="line-clamp-2 text-sm text-white/70">
        {{ goodie.description }}
      </p>

      <div v-if="goodie.offeredByName" class="flex items-center gap-2 text-xs text-white/60">
        <UIcon name="i-heroicons-user" class="h-4 w-4" />
        <span>Offert par {{ goodie.offeredByName }}</span>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-xs text-white/60">
          <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
          <span>{{ new Date(goodie.createdAt).toLocaleDateString('fr-FR') }}</span>
        </div>

        <!-- Bouton visible uniquement si le goodie est public ou si l'utilisateur a accès -->
        <UButton
          v-if="shouldShowLink"
          size="sm"
          color="primary"
          variant="outline"
          icon="i-heroicons-arrow-top-right-on-square"
          @click.stop="handleClick"
        >
          Voir
        </UButton>
        
        <!-- Bouton grisé avec cadenas si le goodie est privé et l'utilisateur n'a pas accès -->
        <UButton
          v-else-if="goodie.link && !goodie.isPublic && !canAccess"
          disabled
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-heroicons-lock-closed"
          class="opacity-50 cursor-not-allowed"
        >
          Voir
        </UButton>
      </div>
    </div>
  </UCard>
</template>
