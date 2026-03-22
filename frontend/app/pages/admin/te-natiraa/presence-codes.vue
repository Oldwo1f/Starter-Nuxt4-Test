<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'admin',
  meta: { title: 'Te Natira\'a — QR présence' },
})

interface TeNatiraaEventRow {
  id: number
  name: string
  eventDate: string
}

interface PresenceCode {
  id: number
  token: string
  label: string | null
  eventId: number | null
  isActive: boolean
  createdAt: string
  event?: TeNatiraaEventRow | null
}

const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const frontendUrl = (config.public.frontendUrl || 'http://localhost:3000').replace(/\/$/, '')
const authStore = useAuthStore()
const toast = useToast()

const codes = ref<PresenceCode[]>([])
const events = ref<TeNatiraaEventRow[]>([])
const loading = ref(false)
const newLabel = ref('')
const newEventId = ref<number | null>(null)
const qrDataUrls = ref<Record<number, string>>({})

const eventSelectItems = computed(() => [
  { label: '— Aucun —', value: null as number | null },
  ...events.value.map((e) => ({
    label: `${e.name} (${new Date(e.eventDate).toLocaleDateString('fr-FR')})`,
    value: e.id,
  })),
])

function presencePageUrl(token: string) {
  return `${frontendUrl}/te-natiraa/presence?t=${encodeURIComponent(token)}`
}

async function refreshQr(code: PresenceCode) {
  if (!import.meta.client) return
  const QRCode = (await import('qrcode')).default
  qrDataUrls.value[code.id] = await QRCode.toDataURL(presencePageUrl(code.token), {
    margin: 2,
    width: 240,
  })
}

async function loadEvents() {
  if (!authStore.accessToken) return
  try {
    events.value = await $fetch<TeNatiraaEventRow[]>(`${API_BASE_URL}/te-natiraa/events`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
  } catch {
    events.value = []
  }
}

async function loadCodes() {
  if (!authStore.accessToken) return
  loading.value = true
  try {
    codes.value = await $fetch<PresenceCode[]>(`${API_BASE_URL}/te-natiraa/presence-codes`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    })
    for (const c of codes.value) {
      await refreshQr(c)
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Erreur',
      description: e.data?.message || e.message || 'Chargement impossible',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

async function createCode() {
  if (!authStore.accessToken) return
  const body: { label?: string; eventId?: number } = {}
  if (newLabel.value.trim()) body.label = newLabel.value.trim()
  if (newEventId.value != null && newEventId.value !== undefined) {
    body.eventId = newEventId.value
  }
  try {
    const created = await $fetch<PresenceCode>(`${API_BASE_URL}/te-natiraa/presence-codes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      body,
    })
    codes.value = [created, ...codes.value]
    await refreshQr(created)
    newLabel.value = ''
    newEventId.value = null
    toast.add({ title: 'QR présence créé', color: 'success' })
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Erreur',
      description: e.data?.message || e.message || 'Création impossible',
      color: 'error',
    })
  }
}

async function toggleActive(c: PresenceCode) {
  if (!authStore.accessToken) return
  try {
    await $fetch(`${API_BASE_URL}/te-natiraa/presence-codes/${c.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      body: { isActive: !c.isActive },
    })
    c.isActive = !c.isActive
    toast.add({ title: c.isActive ? 'Code activé' : 'Code désactivé', color: 'success' })
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Erreur',
      description: e.data?.message || e.message,
      color: 'error',
    })
  }
}

function copyUrl(c: PresenceCode) {
  if (!import.meta.client) return
  void navigator.clipboard.writeText(presencePageUrl(c.token))
  toast.add({ title: 'Lien copié', color: 'success' })
}

onMounted(() => {
  void loadEvents()
  void loadCodes()
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-white">QR présence Te Natira'a</h2>
        <p class="text-white/70 text-sm mt-1">
          Chaque QR donne 1 point par participant (une fois par personne et par code). Les visiteurs se connectent
          pour valider.
        </p>
      </div>
      <NuxtLink to="/admin/te-natiraa">
        <UButton variant="outline" icon="i-heroicons-arrow-left">Retour inscriptions</UButton>
      </NuxtLink>
    </div>

    <UCard class="bg-white/5 border-white/10">
      <template #header>
        <span class="font-semibold text-white">Nouveau code</span>
      </template>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div class="flex-1 w-full">
          <label class="mb-2 block text-sm font-medium text-white/80">Libellé (optionnel)</label>
          <UInput v-model="newLabel" placeholder="Ex. Tente accueil" class="w-full" />
        </div>
        <div class="flex-1 w-full">
          <label class="mb-2 block text-sm font-medium text-white/80">Événement (optionnel)</label>
          <USelect
            v-model="newEventId"
            :items="eventSelectItems"
            placeholder="— Aucun —"
            class="w-full"
          />
        </div>
        <UButton color="primary" icon="i-heroicons-plus" :loading="loading" @click="createCode">
          Générer un QR
        </UButton>
      </div>
    </UCard>

    <div v-if="loading && codes.length === 0" class="text-white/60">Chargement…</div>

    <div v-else class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <UCard
        v-for="c in codes"
        :key="c.id"
        class="bg-white/5 border-white/10 overflow-hidden"
        :ui="{ body: { padding: 'p-4 sm:p-5' } }"
      >
        <div class="flex flex-col items-center gap-3">
          <img
            v-if="qrDataUrls[c.id]"
            :src="qrDataUrls[c.id]"
            alt=""
            class="rounded-lg bg-white p-2 max-w-[240px] w-full"
          />
          <div v-else class="h-[240px] w-[240px] flex items-center justify-center text-white/40 text-sm">
            QR…
          </div>
          <p class="text-white font-medium text-center">{{ c.label || `Code #${c.id}` }}</p>
          <p v-if="c.event" class="text-white/50 text-xs text-center">{{ c.event.name }}</p>
          <UBadge :color="c.isActive ? 'success' : 'neutral'" variant="subtle">
            {{ c.isActive ? 'Actif' : 'Désactivé' }}
          </UBadge>
          <div class="flex flex-wrap gap-2 justify-center w-full">
            <UButton size="sm" variant="soft" icon="i-heroicons-clipboard-document" @click="copyUrl(c)">
              Copier le lien
            </UButton>
            <UButton size="sm" variant="outline" @click="toggleActive(c)">
              {{ c.isActive ? 'Désactiver' : 'Activer' }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
