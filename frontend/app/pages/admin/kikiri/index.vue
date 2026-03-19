<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'admin',
  title: 'Gestion du Kikiri',
})

const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const authStore = useAuthStore()
const toast = useToast()

onMounted(() => {
  fetchConfig()
  fetchSessions()
})

interface KikiriConfigData {
  id: number
  mode: 'manual' | 'cruise'
  manualEnabled: boolean
  openHour: number
  openMinute: number
  closeHour: number
  closeMinute: number
  bettingDurationSeconds?: number
  postResolutionDelaySeconds?: number
}

interface KikiriSessionData {
  id: number
  openedAt: string
  closedAt: string | null
  bankNet: number
  drawCount: number
  draws: { id: number; dice1: number | null; dice2: number | null; dice3: number | null; status: string; resolvedAt: string | null }[]
}

const kikiriConfig = ref<KikiriConfigData | null>(null)
const sessions = ref<KikiriSessionData[]>([])
const isLoadingConfig = ref(false)
const isLoadingSessions = ref(false)
const isSaving = ref(false)

const fetchConfig = async () => {
  if (!authStore.accessToken) return
  isLoadingConfig.value = true
  try {
    const data = await $fetch<KikiriConfigData>(`${API_BASE_URL}/kikiri/admin/config`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
    kikiriConfig.value = {
      ...data,
      bettingDurationSeconds: data.bettingDurationSeconds ?? 300,
      postResolutionDelaySeconds: data.postResolutionDelaySeconds ?? 18,
    }
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
    sessions.value = await $fetch<KikiriSessionData[]>(`${API_BASE_URL}/kikiri/admin/sessions`, {
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
  if (!authStore.accessToken || !kikiriConfig.value) return
  isSaving.value = true
  try {
    await $fetch(`${API_BASE_URL}/kikiri/admin/config`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: {
        mode: kikiriConfig.value.mode,
        manualEnabled: kikiriConfig.value.manualEnabled,
        openHour: kikiriConfig.value.openHour,
        openMinute: kikiriConfig.value.openMinute,
        closeHour: kikiriConfig.value.closeHour,
        closeMinute: kikiriConfig.value.closeMinute,
        bettingDurationSeconds: kikiriConfig.value.bettingDurationSeconds ?? 300,
        postResolutionDelaySeconds: kikiriConfig.value.postResolutionDelaySeconds ?? 18,
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

const formatTime = (h: number, m: number) => {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }))
const minuteOptions = Array.from({ length: 60 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }))
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-white">Gestion du Kikiri</h2>

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

      <div v-else-if="kikiriConfig" class="space-y-6">
        <UFormGroup label="Mode" name="mode">
          <USelect
            v-model="kikiriConfig.mode"
            :items="[
              { value: 'manual', label: 'Manuel - Activer/désactiver manuellement' },
              { value: 'cruise', label: 'Croisière - Horaires automatiques' },
            ]"
            option-attribute="label"
            value-attribute="value"
            size="xl"
          />
        </UFormGroup>

        <div v-if="kikiriConfig.mode === 'manual'" class="space-y-2">
          <UFormGroup label="État du jeu" name="manualEnabled">
            <USwitch
              v-model="kikiriConfig.manualEnabled"
              label="Jeu ouvert"
              description="Activer pour ouvrir la table aux joueurs, désactiver pour la fermer"
            />
          </UFormGroup>
        </div>

        <div v-if="kikiriConfig.mode === 'cruise'" class="grid grid-cols-2 gap-4">
          <UFormGroup label="Ouverture" name="openTime">
            <div class="flex gap-2">
              <USelect
                v-model="kikiriConfig.openHour"
                :items="hourOptions"
                size="lg"
                class="flex-1"
              />
              <span class="self-center text-white/60">h</span>
              <USelect
                v-model="kikiriConfig.openMinute"
                :items="minuteOptions"
                size="lg"
                class="flex-1"
              />
            </div>
          </UFormGroup>
          <UFormGroup label="Fermeture" name="closeTime">
            <div class="flex gap-2">
              <USelect
                v-model="kikiriConfig.closeHour"
                :items="hourOptions"
                size="lg"
                class="flex-1"
              />
              <span class="self-center text-white/60">h</span>
              <USelect
                v-model="kikiriConfig.closeMinute"
                :items="minuteOptions"
                size="lg"
                class="flex-1"
              />
            </div>
          </UFormGroup>
        </div>

        <UFormGroup
          label="Durée de la partie (secondes)"
          name="bettingDurationSeconds"
          description="Temps de paris par tirage. Ex: 300 = 5 minutes"
        >
          <UInput
            v-model.number="kikiriConfig.bettingDurationSeconds"
            type="number"
            :min="60"
            :max="3600"
            size="xl"
            placeholder="300"
          />
        </UFormGroup>

        <UFormGroup
          label="Délai entre deux parties (secondes)"
          name="postResolutionDelaySeconds"
          description="Temps d'attente après résolution avant le prochain tirage. Doit laisser le temps aux animations de distribution des gains. Min 10s, max 60s. Défaut: 18s"
        >
          <UInput
            v-model.number="kikiriConfig.postResolutionDelaySeconds"
            type="number"
            :min="10"
            :max="60"
            size="xl"
            placeholder="18"
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
                {{ session.drawCount }} tirage(s)
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
          <div v-if="session.draws?.length" class="mt-3 flex flex-wrap gap-2">
            <div
              v-for="draw in session.draws"
              :key="draw.id"
              class="rounded bg-white/5 px-2 py-1 text-xs font-mono text-white/80"
            >
              #{{ draw.id }}
              <template v-if="draw.dice1 != null">
                [{{ draw.dice1 }},{{ draw.dice2 }},{{ draw.dice3 }}]
              </template>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
