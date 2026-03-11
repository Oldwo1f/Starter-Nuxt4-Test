<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useMessagesStore } from '~/stores/useMessagesStore'

const authStore = useAuthStore()
const messagesStore = useMessagesStore()

const ensureSocket = () => {
  if (authStore.isAuthenticated) {
    messagesStore.initSocket()
    messagesStore.fetchUnreadCount()
  }
}

onMounted(ensureSocket)

watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) ensureSocket()
  },
)
</script>

<template>
  <div class="hidden" aria-hidden="true" />
</template>
