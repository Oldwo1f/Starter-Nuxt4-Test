<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Dashboard',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <p class="text-white/70">Bienvenue dans le panneau d'administration</p>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-users" />
            <span class="font-medium">Utilisateurs</span>
          </div>
        </template>
        <div class="text-3xl font-bold">-</div>
        <p class="text-sm text-white/60">Total utilisateurs</p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-document-text" />
            <span class="font-medium">Articles</span>
          </div>
        </template>
        <div class="text-3xl font-bold">-</div>
        <p class="text-sm text-white/60">Total articles</p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-chat-bubble-left-right" />
            <span class="font-medium">Commentaires</span>
          </div>
        </template>
        <div class="text-3xl font-bold">-</div>
        <p class="text-sm text-white/60">Total commentaires</p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-chart-bar" />
            <span class="font-medium">Statistiques</span>
          </div>
        </template>
        <div class="text-3xl font-bold">-</div>
        <p class="text-sm text-white/60">Vues aujourd'hui</p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-information-circle" />
          <span class="font-medium">Informations</span>
        </div>
      </template>
      <div class="space-y-4">
        <p class="text-white/70">
          Le dashboard est en cours de développement. Les statistiques et fonctionnalités seront ajoutées prochainement.
        </p>
        <div class="flex items-center gap-2 text-sm text-white/60">
          <UIcon name="i-heroicons-user-circle" class="w-5 h-5" />
          <span>Connecté en tant que : <strong>{{ authStore.user?.email }}</strong></span>
        </div>
        <div class="flex items-center gap-2 text-sm text-white/60">
          <UIcon name="i-heroicons-shield-check" class="w-5 h-5" />
          <span>Rôle : <strong class="capitalize">{{ authStore.user?.role }}</strong></span>
        </div>
      </div>
    </UCard>
  </div>
</template>
