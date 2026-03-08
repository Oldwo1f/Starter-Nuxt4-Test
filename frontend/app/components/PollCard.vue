<script setup lang="ts">
import type { Poll, SubmitResponseForm, PollResults } from '~/stores/usePollStore'
import { usePollStore } from '~/stores/usePollStore'
import { useAuthStore } from '~/stores/useAuthStore'

interface Props {
  poll: Poll
  showResponse?: boolean // Si true, affiche le formulaire de réponse dans la card
}

const props = withDefaults(defineProps<Props>(), {
  showResponse: false,
})

const pollStore = usePollStore()
const authStore = useAuthStore()
const toast = useToast()

// Pour QCM
const selectedOptionId = ref<number | null>(null)
const isSubmitting = ref(false)
const hasResponded = ref(false)
const pollResults = ref<PollResults | null>(null)
const hasCheckedStatus = ref(false)

// Vérifier si l'utilisateur a déjà répondu et charger les résultats (une seule fois)
onMounted(async () => {
  if (props.showResponse && authStore.isAuthenticated && !hasCheckedStatus.value) {
    hasCheckedStatus.value = true
    try {
      hasResponded.value = await pollStore.hasUserResponded(props.poll.id)
      if (hasResponded.value) {
        try {
          pollResults.value = await pollStore.getResults(props.poll.id)
        } catch (err: any) {
          console.error('Error loading results:', err)
        }
      }
    } catch (err: any) {
      console.error('Error checking poll status:', err)
      hasCheckedStatus.value = false // Réessayer en cas d'erreur
    }
  }
})

// Handler pour soumettre une réponse QCM
const handleSubmitQCM = async (e: Event) => {
  e.stopPropagation()
  
  if (!selectedOptionId.value) {
    toast.add({
      title: 'Erreur',
      description: 'Veuillez sélectionner une réponse',
      color: 'red',
    })
    return
  }

  // Vérifier si l'utilisateur est connecté
  if (!authStore.isAuthenticated) {
    const returnUrl = `/polls/${props.poll.id}`
    navigateTo(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
    toast.add({
      title: 'Connexion requise',
      description: 'Vous devez être connecté pour voter',
      color: 'yellow',
    })
    return
  }

  // Vérifier si le sondage nécessite un accès membre
  if (props.poll.accessLevel === 'member') {
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

  isSubmitting.value = true
  try {
    await pollStore.submitResponse(props.poll.id, {
      optionId: selectedOptionId.value,
    })
    hasResponded.value = true
    selectedOptionId.value = null // Réinitialiser la sélection
    
    // Charger les résultats après la soumission
    try {
      pollResults.value = await pollStore.getResults(props.poll.id)
    } catch (err: any) {
      console.error('Error loading results:', err)
    }
    
    toast.add({
      title: 'Réponse enregistrée',
      description: 'Votre réponse a été enregistrée avec succès',
      color: 'green',
    })
  } catch (err: any) {
    const errorMessage = err.data?.message || err.message || 'Erreur lors de l\'enregistrement de la réponse'
    
    // Si l'erreur indique qu'une connexion est requise, rediriger
    if (errorMessage.includes('restricted to members') || errorMessage.includes('Unauthorized')) {
      const returnUrl = `/polls/${props.poll.id}`
      navigateTo(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
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
    // Si l'erreur indique qu'on a déjà répondu, mettre à jour le statut
    if (errorMessage.includes('déjà répondu') || errorMessage.includes('already responded')) {
      hasResponded.value = true
      try {
        pollResults.value = await pollStore.getResults(props.poll.id)
      } catch (err2: any) {
        console.error('Error loading results:', err2)
      }
    }
  } finally {
    isSubmitting.value = false
  }
}

// Handler pour clic sur la card (navigation si pas de formulaire)
const handleCardClick = () => {
  if (!props.showResponse || props.poll.type !== 'qcm' || hasResponded.value) {
    navigateTo(`/polls/${props.poll.id}`)
  }
}
</script>

<template>
  <UCard
    class="group bg-gradient-to-br from-white/5 to-white/[0.02] border-0 transition-all hover:scale-[1.02] hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/20"
    :class="{
      'cursor-pointer': !showResponse || poll.type !== 'qcm' || hasResponded,
    }"
    @click="handleCardClick"
  >
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <h3 class="text-xl font-bold text-white transition-colors group-hover:text-primary-400">
          {{ poll.title }}
        </h3>
        <div class="flex flex-shrink-0 items-center gap-2">
          <span
            v-if="poll.type === 'qcm'"
            class="rounded-full bg-primary-500/20 px-2 py-1 text-xs font-semibold text-primary-300"
          >
            QCM
          </span>
          <span
            v-else
            class="rounded-full bg-primary-500/20 px-2 py-1 text-xs font-semibold text-primary-300"
          >
            Classement
          </span>
        </div>
      </div>
      
      <p v-if="poll.description" class="text-white/80">
        {{ poll.description }}
      </p>

      <!-- Formulaire QCM dans la card -->
      <div v-if="showResponse && poll.type === 'qcm' && !hasResponded" class="space-y-3" @click.stop>
        <div class="space-y-2">
          <label
            v-for="option in poll.options"
            :key="option.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition-all hover:border-primary-500/50 hover:bg-white/10"
            :class="{
              'border-primary-500/50 bg-primary-500/10': selectedOptionId === option.id,
            }"
          >
            <input
              v-model="selectedOptionId"
              type="radio"
              :value="option.id"
              :name="`poll-${poll.id}-option`"
              class="h-4 w-4 text-primary-500"
            />
            <span class="flex-1 text-white">{{ option.text }}</span>
          </label>
        </div>
        <UButton
          color="primary"
          icon="i-heroicons-paper-airplane"
          class="w-full"
          :loading="isSubmitting"
          :disabled="!selectedOptionId"
          @click="handleSubmitQCM"
        >
          Envoyer ma réponse
        </UButton>
      </div>

      <!-- Résultats QCM après réponse -->
      <div v-if="showResponse && poll.type === 'qcm' && hasResponded && pollResults" class="space-y-3" @click.stop>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-check-circle" class="h-5 w-5 text-primary-400" />
            <p class="text-sm font-medium text-primary-300">Résultats</p>
          </div>
          <p class="text-xs text-white/60">
            {{ pollResults.totalResponses }} {{ pollResults.totalResponses > 1 ? 'réponses' : 'réponse' }}
          </p>
        </div>
        <div class="space-y-2">
          <div
            v-for="result in pollResults.results.slice(0, 4)"
            :key="result.optionId"
            class="space-y-1"
          >
            <div class="flex items-center justify-between text-sm">
              <span class="text-white/90">{{ result.text }}</span>
              <span class="font-semibold text-white/80">
                {{ result.count }} ({{ result.percentage?.toFixed(1) }}%)
              </span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full bg-primary-500 transition-all duration-500"
                :style="{ width: `${result.percentage || 0}%` }"
              />
            </div>
          </div>
          <p v-if="pollResults.results.length > 4" class="text-xs text-white/60 text-center pt-1">
            + {{ pollResults.results.length - 4 }} autre{{ pollResults.results.length - 4 > 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <!-- Message si déjà répondu mais résultats non chargés -->
      <div v-else-if="showResponse && poll.type === 'qcm' && hasResponded && !pollResults" class="rounded-lg bg-primary-500/10 border border-primary-500/30 p-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="h-5 w-5 text-primary-400" />
          <p class="text-sm font-medium text-primary-300">Vous avez déjà répondu</p>
        </div>
      </div>

      <!-- Résultats classement après réponse -->
      <div v-if="showResponse && poll.type === 'ranking' && hasResponded && pollResults" class="space-y-3" @click.stop>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-check-circle" class="h-5 w-5 text-primary-400" />
            <p class="text-sm font-medium text-primary-300">Classement</p>
          </div>
          <p class="text-xs text-white/60">
            {{ pollResults.totalResponses }} {{ pollResults.totalResponses > 1 ? 'réponses' : 'réponse' }}
          </p>
        </div>
        <div class="space-y-2">
          <div
            v-for="(result, index) in pollResults.results.slice(0, 3)"
            :key="result.optionId"
            class="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2"
          >
            <div
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
              :class="{
                'bg-yellow-500/20 text-yellow-400': index === 0,
                'bg-gray-500/20 text-gray-400': index === 1,
                'bg-orange-500/20 text-orange-400': index === 2,
              }"
            >
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ result.text }}</p>
              <p class="text-xs text-white/60">
                Moyenne: {{ result.averagePosition?.toFixed(2) || 'N/A' }}
              </p>
            </div>
          </div>
          <p v-if="pollResults.results.length > 3" class="text-xs text-white/60 text-center pt-1">
            + {{ pollResults.results.length - 3 }} autre{{ pollResults.results.length - 3 > 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <!-- Options pour classement (juste affichage si pas encore répondu) -->
      <div v-else-if="poll.type === 'ranking' && poll.options.length > 0 && (!showResponse || !hasResponded)" class="space-y-2">
        <p class="text-sm font-medium text-white/70">Éléments à classer :</p>
        <div class="space-y-1">
          <div
            v-for="option in poll.options.slice(0, 3)"
            :key="option.id"
            class="flex items-center gap-2 rounded-lg bg-white/5 p-2 text-sm text-white/80"
          >
            <UIcon name="i-heroicons-bars-3" class="h-4 w-4 text-white/40" />
            <span>{{ option.text }}</span>
          </div>
          <p v-if="poll.options.length > 3" class="text-xs text-white/60 pl-6">
            + {{ poll.options.length - 3 }} autre{{ poll.options.length - 3 > 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-white/10 pt-4">
        <div class="flex items-center gap-4 text-sm text-white/60">
          <div class="flex items-center gap-2">
            <UIcon
              v-if="poll.accessLevel === 'member'"
              name="i-heroicons-lock-closed"
              class="h-4 w-4"
            />
            <span>{{ poll.accessLevel === 'member' ? 'Réservé aux membres' : 'Public' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
            <span>{{ new Date(poll.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
          </div>
        </div>
        <UIcon
          v-if="!showResponse || poll.type !== 'qcm' || hasResponded"
          name="i-heroicons-arrow-right"
          class="h-5 w-5 text-white/40 transition-all group-hover:translate-x-1 group-hover:text-primary-400"
        />
      </div>
    </div>
  </UCard>
</template>
