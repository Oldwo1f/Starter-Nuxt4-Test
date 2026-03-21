<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useProfileValidation } from '~/composables/useProfileValidation'

const authStore = useAuthStore()
const { isProfileComplete } = useProfileValidation()
const { t } = useI18n()
</script>

<template>
  <UAlert
    v-if="authStore.isAuthenticated && !isProfileComplete"
    color="error"
    variant="soft"
    icon="i-heroicons-exclamation-triangle"
    :title="t('profileIncomplete.title')"
    :description="t('profileIncomplete.description')"
    class="mb-6"
  >
    <template #actions>
      <UButton
        to="/account/profile"
        color="error"
        variant="solid"
        size="sm"
      >
        {{ t('profileIncomplete.cta') }}
      </UButton>
    </template>
  </UAlert>
</template>
