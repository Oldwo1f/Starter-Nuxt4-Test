<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useProfileValidation } from '~/composables/useProfileValidation'

const authStore = useAuthStore()
const { isProfileComplete } = useProfileValidation()
</script>

<template>
  <UAlert
    v-if="authStore.isAuthenticated && !isProfileComplete"
    color="error"
    variant="soft"
    icon="i-heroicons-exclamation-triangle"
    title="Votre Profil est incomplet"
    description="Vous ne pourrez pas créer d'annonce ni transférer des Pūpū 🐚"
    class="mb-6"
  >
    <template #actions>
      <UButton
        to="/account/profile"
        color="error"
        variant="solid"
        size="sm"
      >
        Compléter mon profil
      </UButton>
    </template>
  </UAlert>
</template>
