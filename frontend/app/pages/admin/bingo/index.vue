<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'admin',
  title: 'Gestion du Bingo',
})

const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
const toast = useToast()

onMounted(() => {
  fetchConfig()
  fetchSessions()
})

interface BingoConfigData {
  id: number
  mode: 'manual' | 'cruise'
  manualEnabled: boolean
  openHour: number
  openMinute: number
  closeHour: number
  closeMinute: number
  drawSpeed: 'fast' | 'medium' | 'slow'
  gridPrice: number
}

interface BingoSessionData {
  id: number
  openedAt: string
  closedAt: string | null
  bankNet: number
  roundCount: number
  rounds: { id: number; phase: string; jackpot: number; winnerId: number | null; createdAt: string }[]
}

const bingoConfig = ref<BingoConfigData | null>(null)
const sessions = ref<BingoSessionData[]>([])
const isLoadingConfig = ref(false)
const isLoadingSessions = ref(false)
const isSaving = ref(false)

const fetchConfig = async () => {
  if (!authStore.accessToken) return
  isLoadingConfig.value = true
  try {
    bingoConfig.value = await $fetch<BingoConfigData>(`${API_BASE_URL}/bingo/admin/config`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de charger la config',
      color: 'red',
    })
  } finally {
    isLoadingConfig.value = false
  }
}

const fetchSessions = async () => {
  if (!authStore.accessToken) return
  isLoadingSessions.value = true
  try {
    sessions.value = await $fetch<BingoSessionData[]>(`${API_BASE_URL}/bingo/admin/sessions`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible de charger les sessions',
      color: 'red',
    })
  } finally {
    isLoadingSessions.value = false
  }
}

const saveConfig = async () => {
  if (!authStore.accessToken || !bingoConfig.value) return
  isSaving.value = true
  try {
    await $fetch(`${API_BASE_URL}/bingo/admin/config`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: {
        mode: bingoConfig.value.mode,
        manualEnabled: bingoConfig.value.manualEnabled,
        openHour: bingoConfig.value.openHour,
        openMinute: bingoConfig.value.openMinute,
        closeHour: bingoConfig.value.closeHour,
        closeMinute: bingoConfig.value.closeMinute,
        drawSpeed: bingoConfig.value.drawSpeed,
        gridPrice: bingoConfig.value.gridPrice,
      },
    })
    toast.add({
      title: 'Succès',
      description: 'Configuration enregistrée',
      color: 'success',
    })
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Impossible d\'enregistrer',
      color: 'red',
    })
  } finally {
    isSaving.value = false
  }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const drawSpeedLabels: Record<string, string> = {
  fast: 'Rapide (3s entre boules)',
  medium: 'Moyenne (5s entre boules)',
  slow: 'Lente (8s entre boules)',
}

const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }))
const minuteOptions = Array.from({ length: 60 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }))
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-white">Gestion du Bingo</h2>

    <!-- Configuration -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Configuration</span>
          <UButton
            color="primary"
            icon="i-heroicons-arrow-path"
            variant="soft"
            :loading="isLoadingConfig"
            @click="fetchConfig"
          />
        </div>
      </template>

      <div v-if="isLoadingConfig" class="flex justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
      </div>

      <div v-else-if="bingoConfig" class="space-y-6">
        <UFormGroup label="Mode" name="mode">
          <USelect
            v-model="bingoConfig.mode"
            :items="[
              { value: 'manual', label: 'Manuel - Activer/désactiver manuellement' },
              { value: 'cruise', label: 'Croisière - Horaires automatiques' },
            ]"
            option-attribute="label"
            value-attribute="value"
            size="xl"
          />
        </UFormGroup>

        <div v-if="bingoConfig.mode === 'manual'" class="space-y-2">
          <UFormGroup label="État du jeu" name="manualEnabled">
            <USwitch
              v-model="bingoConfig.manualEnabled"
              label="Jeu ouvert"
              description="Activer pour ouvrir la table aux joueurs, désactiver pour la fermer"
            />
          </UFormGroup>
        </div>

        <div v-if="bingoConfig.mode === 'cruise'" class="grid grid-cols-2 gap-4">
          <UFormGroup label="Ouverture" name="openTime">
            <div class="flex gap-2">
              <USelect
                v-model="bingoConfig.openHour"
                :items="hourOptions"
                size="lg"
                class="flex-1"
              />
              <span class="self-center text-white/60">h</span>
              <USelect
                v-model="bingoConfig.openMinute"
                :items="minuteOptions"
                size="lg"
                class="flex-1"
              />
            </div>
          </UFormGroup>
          <UFormGroup label="Fermeture" name="closeTime">
            <div class="flex gap-2">
              <USelect
                v-model="bingoConfig.closeHour"
                :items="hourOptions"
                size="lg"
                class="flex-1"
              />
              <span class="self-center text-white/60">h</span>
              <USelect
                v-model="bingoConfig.closeMinute"
                :items="minuteOptions"
                size="lg"
                class="flex-1"
              />
            </div>
          </UFormGroup>
        </div>

        <UFormGroup
          label="Vitesse du tirage"
          name="drawSpeed"
          description="Temps entre chaque boule tirée"
        >
          <USelect
            v-model="bingoConfig.drawSpeed"
            :items="[
              { value: 'fast', label: drawSpeedLabels.fast },
              { value: 'medium', label: drawSpeedLabels.medium },
              { value: 'slow', label: drawSpeedLabels.slow },
            ]"
            option-attribute="label"
            value-attribute="value"
            size="xl"
          />
        </UFormGroup>

        <UFormGroup
          label="Prix d'une grille"
          name="gridPrice"
          description="Coût en jetons Jiji pour acheter une grille"
        >
          <UInput
            v-model.number="bingoConfig.gridPrice"
            type="number"
            min="1"
            size="xl"
          />
        </UFormGroup>

        <div class="flex justify-end">
          <UButton
            color="primary"
            :loading="isSaving"
            @click="saveConfig"
          >
            Enregistrer
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Sessions -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Sessions récentes</span>
          <UButton
            color="primary"
            icon="i-heroicons-arrow-path"
            variant="soft"
            :loading="isLoadingSessions"
            @click="fetchSessions"
          />
        </div>
      </template>

      <div v-if="isLoadingSessions" class="flex justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
      </div>

      <div v-else-if="sessions.length === 0" class="py-8 text-center text-white/60">
        Aucune session enregistrée
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="rounded-lg border border-white/10 bg-white/5 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="font-medium text-white">
                Session #{{ session.id }}
                <span class="ml-2 text-sm font-normal text-white/60">
                  {{ formatDate(session.openedAt) }}
                  <template v-if="session.closedAt">
                    → {{ formatDate(session.closedAt) }}
                  </template>
                  <template v-else>
                    (en cours)
                  </template>
                </span>
              </p>
              <p class="mt-1 text-sm text-white/70">
                {{ session.roundCount }} partie(s)
              </p>
            </div>
            <div
              class="rounded-lg px-3 py-1.5 text-lg font-semibold"
              :class="
                session.bankNet > 0
                  ? 'bg-green-500/20 text-green-300'
                  : session.bankNet < 0
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-white/10 text-white/80'
              "
            >
              {{ session.bankNet > 0 ? '+' : '' }}{{ session.bankNet }} 🐚
            </div>
          </div>
          <div v-if="session.rounds?.length" class="mt-3 flex flex-wrap gap-2">
            <div
              v-for="round in session.rounds"
              :key="round.id"
              class="rounded bg-white/5 px-2 py-1 text-xs font-mono text-white/80"
            >
              #{{ round.id }} {{ round.phase }} {{ round.jackpot }}P
              <template v-if="round.winnerId">
                (gagnant: {{ round.winnerId }})
              </template>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
