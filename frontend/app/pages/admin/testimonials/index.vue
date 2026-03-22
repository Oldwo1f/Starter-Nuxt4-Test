<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Témoignages vidéo',
})

import { useAuthStore } from '~/stores/useAuthStore'

interface AdminRow {
  id: number
  videoUrl: string
  subject: string
  durationSeconds: number
  createdAt: string
  partnerId: number | null
  partnerName: string | null
  listingId: number | null
  listingTitle: string | null
  user: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
  } | null
}

const authStore = useAuthStore()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const { getImageUrl } = useApi()
const toast = useToast()
const { t } = useI18n()

const items = ref<AdminRow[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const loading = ref(false)
const actionId = ref<number | null>(null)
const rejectOpen = ref(false)
const rejectTargetId = ref<number | null>(null)
const rejectReason = ref('')

const subjectLabel = (s: string) => {
  if (s === 'association') return t('adminTestimonials.subjectAssociation')
  if (s === 'troc') return t('adminTestimonials.subjectTroc')
  if (s === 'partner') return t('adminTestimonials.subjectPartner')
  return s
}

async function load() {
  if (!authStore.accessToken) return
  loading.value = true
  try {
    const res = await $fetch<{
      data: AdminRow[]
      total: number
      page: number
      limit: number
    }>(`${API_BASE_URL}/testimonials/admin/pending`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
      query: { page: page.value, limit: limit.value },
    })
    items.value = res.data
    total.value = res.total
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    toast.add({
      title: t('adminTestimonials.toastErrorTitle'),
      description: e.data?.message || e.message || '',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

async function approve(id: number) {
  if (!authStore.accessToken) return
  actionId.value = id
  try {
    const res = await $fetch<{ pupuGranted: boolean; pupuAmount: number }>(
      `${API_BASE_URL}/testimonials/admin/${id}/approve`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      },
    )
    toast.add({
      title: t('adminTestimonials.toastApprovedTitle'),
      description: res.pupuGranted
        ? t('adminTestimonials.toastApprovedPupu', { n: res.pupuAmount })
        : t('adminTestimonials.toastApprovedNoPupu'),
      color: 'success',
    })
    await load()
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    toast.add({
      title: t('adminTestimonials.toastErrorTitle'),
      description: e.data?.message || e.message || '',
      color: 'error',
    })
  } finally {
    actionId.value = null
  }
}

function openReject(id: number) {
  rejectTargetId.value = id
  rejectReason.value = ''
  rejectOpen.value = true
}

async function confirmReject() {
  const id = rejectTargetId.value
  if (id == null || !authStore.accessToken) return
  actionId.value = id
  try {
    await $fetch(`${API_BASE_URL}/testimonials/admin/${id}/reject`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: { reason: rejectReason.value.trim() || undefined },
    })
    toast.add({
      title: t('adminTestimonials.toastRejectedTitle'),
      color: 'success',
    })
    rejectOpen.value = false
    await load()
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    toast.add({
      title: t('adminTestimonials.toastErrorTitle'),
      description: e.data?.message || e.message || '',
      color: 'error',
    })
  } finally {
    actionId.value = null
  }
}

function userName(u: AdminRow['user']) {
  if (!u) return '—'
  if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`
  return u.email
}

onMounted(() => load())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">{{ t('adminTestimonials.title') }}</h1>
      <p class="text-white/60 mt-1">{{ t('adminTestimonials.subtitle') }}</p>
    </div>

    <div v-if="loading && items.length === 0" class="text-white/50 py-12 text-center">
      {{ t('adminTestimonials.loading') }}
    </div>

    <div v-else-if="items.length === 0" class="text-white/50 py-12 text-center">
      {{ t('adminTestimonials.empty') }}
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <UCard
        v-for="row in items"
        :key="row.id"
        class="bg-white/5 border-white/10 overflow-hidden"
        :ui="{ body: { padding: 'p-4 sm:p-5' } }"
      >
        <video
          class="w-full max-h-56 rounded-lg bg-black mb-4"
          controls
          playsinline
          :src="getImageUrl(row.videoUrl)"
        />
        <div class="space-y-2 text-sm">
          <p>
            <span class="text-white/50">{{ t('adminTestimonials.user') }}</span>
            {{ userName(row.user) }} · {{ row.user?.email }}
          </p>
          <p>
            <span class="text-white/50">{{ t('adminTestimonials.subject') }}</span>
            {{ subjectLabel(row.subject) }}
          </p>
          <p v-if="row.subject === 'partner' && row.partnerName">
            <span class="text-white/50">{{ t('adminTestimonials.partner') }}</span>
            {{ row.partnerName }}
          </p>
          <p v-if="row.subject === 'troc' && row.listingTitle">
            <span class="text-white/50">{{ t('adminTestimonials.listing') }}</span>
            {{ row.listingTitle }} (#{{ row.listingId }})
          </p>
          <p>
            <span class="text-white/50">{{ t('adminTestimonials.duration') }}</span>
            {{ row.durationSeconds }}s
          </p>
        </div>
        <div class="flex flex-wrap gap-2 mt-4">
          <UButton
            color="success"
            size="sm"
            :loading="actionId === row.id"
            @click="approve(row.id)"
          >
            {{ t('adminTestimonials.approve') }}
          </UButton>
          <UButton
            color="error"
            variant="outline"
            size="sm"
            :disabled="actionId === row.id"
            @click="openReject(row.id)"
          >
            {{ t('adminTestimonials.reject') }}
          </UButton>
        </div>
      </UCard>
    </div>

    <div v-if="total > limit" class="flex justify-center gap-2">
      <UButton
        variant="outline"
        size="sm"
        :disabled="page <= 1 || loading"
        @click="page--; load()"
      >
        {{ t('adminTestimonials.prev') }}
      </UButton>
      <span class="self-center text-sm text-white/60">{{ page }} / {{ Math.ceil(total / limit) || 1 }}</span>
      <UButton
        variant="outline"
        size="sm"
        :disabled="page * limit >= total || loading"
        @click="page++; load()"
      >
        {{ t('adminTestimonials.next') }}
      </UButton>
    </div>

    <UModal v-model:open="rejectOpen" :ui="{ wrapper: 'max-w-md' }">
      <template #header>
        <span class="font-semibold">{{ t('adminTestimonials.rejectModalTitle') }}</span>
      </template>
      <template #body>
        <div class="p-6 space-y-3">
          <p class="text-sm text-white/70">{{ t('adminTestimonials.rejectModalHint') }}</p>
          <UTextarea v-model="rejectReason" :rows="3" class="w-full" />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 p-4 pt-0">
          <UButton variant="ghost" @click="rejectOpen = false">
            {{ t('adminTestimonials.cancel') }}
          </UButton>
          <UButton color="error" :loading="actionId != null" @click="confirmReject">
            {{ t('adminTestimonials.confirmReject') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
