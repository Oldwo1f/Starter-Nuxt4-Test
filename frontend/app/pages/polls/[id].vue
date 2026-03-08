<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { usePollStore } from '~/stores/usePollStore'
import { useAuthStore } from '~/stores/useAuthStore'

const route = useRoute()
const router = useRouter()
const pollStore = usePollStore()
const authStore = useAuthStore()
const toast = useToast()

const pollId = computed(() => parseInt(route.params.id as string, 10))
const hasResponded = ref(false)
const isLoadingResults = ref(false)

// Charger le sondage et vérifier si l'utilisateur a répondu
onMounted(async () => {
  try {
    await pollStore.fetchPoll(pollId.value)

    // Vérifier si l'utilisateur a déjà répondu
    if (authStore.isAuthenticated) {
      hasResponded.value = await pollStore.hasUserResponded(pollId.value)
      // Si l'utilisateur a répondu, charger les résultats
      if (hasResponded.value) {
        try {
          await pollStore.getResults(pollId.value)
        } catch (err: any) {
          console.error('Error loading results:', err)
        }
      }
    }
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Erreur lors du chargement du sondage',
      color: 'red',
    })
  }
})

// Handler pour soumettre une réponse
const handleSubmit = async (response: any) => {
  // Vérifier si l'utilisateur est connecté
  if (!authStore.isAuthenticated) {
    // Rediriger vers la page de connexion avec le retour vers cette page
    const returnUrl = `/polls/${pollId.value}`
    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
    toast.add({
      title: 'Connexion requise',
      description: 'Vous devez être connecté pour voter',
      color: 'yellow',
    })
    return
  }

  // Vérifier si le sondage nécessite un accès membre
  if (pollStore.currentPoll?.accessLevel === 'member') {
    const userRole = authStore.user?.role?.toLowerCase() || ''
    const memberRoles = ['member', 'premium', 'vip', 'admin', 'superadmin', 'moderator']
    if (!memberRoles.includes(userRole)) {
      toast.add({
        title: 'Accès restreint',
        description: 'Ce sondage est réservé aux membres',
        color: 'red',
      })
      return
    }
  }

  try {
    await pollStore.submitResponse(pollId.value, response)
    hasResponded.value = true
    // Les résultats sont déjà chargés par submitResponse
    toast.add({
      title: 'Réponse enregistrée',
      description: 'Votre réponse a été enregistrée avec succès',
      color: 'success',
    })
  } catch (err: any) {
    const errorMessage = err.data?.message || err.message || 'Erreur lors de l\'enregistrement de la réponse'
    
    // Si l'erreur indique qu'une connexion est requise, rediriger
    if (errorMessage.includes('restricted to members') || errorMessage.includes('Unauthorized')) {
      const returnUrl = `/polls/${pollId.value}`
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      toast.add({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour voter',
        color: 'yellow',
      })
      return
    }
    
    toast.add({
      title: 'Erreur',
      description: errorMessage,
      color: 'red',
    })
  }
}

// Vérifier l'accès membre
const canAccess = computed(() => {
  if (!pollStore.currentPoll) return false
  if (pollStore.currentPoll.accessLevel === 'public') return true
  if (pollStore.currentPoll.accessLevel === 'member') {
    return authStore.isAuthenticated && ['member', 'premium', 'vip', 'admin', 'superadmin', 'moderator'].includes(authStore.user?.role?.toLowerCase() || '')
  }
  return false
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <UButton
      to="/polls"
      variant="ghost"
      icon="i-heroicons-arrow-left"
      class="mb-6"
    >
      Retour aux sondages
    </UButton>

    <div v-if="pollStore.isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="pollStore.error" class="py-12 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-4 h-12 w-12 text-red-500" />
      <p class="text-red-500">{{ pollStore.error }}</p>
    </div>

    <div v-else-if="!pollStore.currentPoll" class="py-12 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-4 h-12 w-12 text-white/40" />
      <p class="text-white/60">Sondage non trouvé</p>
    </div>

    <div v-else-if="!canAccess" class="py-12 text-center">
      <UIcon name="i-heroicons-lock-closed" class="mx-auto mb-4 h-12 w-12 text-white/40" />
      <p class="mb-4 text-white/60">Ce sondage est réservé aux membres</p>
      <UButton to="/register" color="primary">
        Devenir membre
      </UButton>
    </div>

    <div v-else class="space-y-6">
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <!-- Formulaire de réponse -->
        <PollForm
          v-if="!hasResponded"
          :poll="pollStore.currentPoll"
          @submit="handleSubmit"
        />

        <!-- Résultats -->
        <div v-else>
          <div class="mb-4 rounded-lg bg-primary-500/10 border border-primary-500/30 p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 text-primary-400" />
              <p class="text-sm font-medium text-primary-300">Vous avez déjà répondu à ce sondage</p>
            </div>
          </div>
          <div class="border-t border-white/10 pt-6">
            <PollResults
              v-if="pollStore.currentPollResults"
              :results="pollStore.currentPollResults"
            />
            <div v-else class="flex justify-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-primary-500" />
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
