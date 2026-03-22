<script setup lang="ts">
definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.pages.testimonial',
})

import { useAuthStore } from '~/stores/useAuthStore'
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'
import { usePartnerStore } from '~/stores/usePartnerStore'

const MIN_SEC = 45
const MAX_SEC = 90

const authStore = useAuthStore()
const marketplaceStore = useMarketplaceStore()
const partnerStore = usePartnerStore()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const { getImageUrl } = useApi()
const toast = useToast()
const { t } = useI18n()

interface PendingDto {
  id: number
  videoUrl: string
  subject: string
  partnerId: number | null
  listingId: number | null
  durationSeconds: number
  createdAt: string
}

interface LastReviewedDto {
  id: number
  status: string
  reviewedAt: string | null
  rejectionReason: string | null
  pupuGranted: boolean
  pupuAmount: number
}

const loadingStatus = ref(true)
const pending = ref<PendingDto | null>(null)
const lastReviewed = ref<LastReviewedDto | null>(null)

const stream = ref<MediaStream | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordedChunks = ref<Blob[]>([])
const recordedBlob = ref<Blob | null>(null)
const previewUrl = ref<string | null>(null)
const phase = ref<'idle' | 'recording' | 'preview'>('idle')
const elapsedSec = ref(0)
const finalDurationSec = ref(0)
let recordTimer: ReturnType<typeof setInterval> | null = null
let recordStartMs = 0

const subject = ref<'association' | 'troc' | 'partner'>('association')
const partnerId = ref<number | null>(null)
const listingId = ref<number | null>(null)
const myListings = ref<{ id: number; title: string }[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const liveVideoEl = ref<HTMLVideoElement | null>(null)
/** MIME de sortie (sans codecs) pour l’upload — évite text/plain avec FormData */
const recordedOutputMime = ref('video/webm')

function baseVideoMimeFromRecorder(full: string | undefined): string {
  if (!full) return 'video/webm'
  const base = full.split(';')[0].trim().toLowerCase()
  return base.startsWith('video/') ? base : 'video/webm'
}

function pickRecorderMime(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return undefined
}

const subjectItems = computed(() => [
  { label: t('account.testimonial.subjectAssociation'), value: 'association' },
  { label: t('account.testimonial.subjectTroc'), value: 'troc' },
  { label: t('account.testimonial.subjectPartner'), value: 'partner' },
])

const partnerItems = computed(() =>
  partnerStore.partners.map((p) => ({ label: p.name, value: p.id })),
)

const listingItems = computed(() =>
  myListings.value.map((l) => ({ label: l.title, value: l.id })),
)

const durationOk = computed(
  () => finalDurationSec.value >= MIN_SEC && finalDurationSec.value <= MAX_SEC,
)

const canSubmit = computed(() => {
  if (pending.value || !recordedBlob.value || !durationOk.value || uploading.value) return false
  if (subject.value === 'partner') return partnerId.value !== null
  if (subject.value === 'troc') return listingId.value !== null
  return true
})

watch(subject, (s) => {
  if (s !== 'partner') partnerId.value = null
  if (s !== 'troc') listingId.value = null
})

function stopTimer() {
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
}

function stopStream() {
  stream.value?.getTracks().forEach((tr) => tr.stop())
  stream.value = null
}

async function loadMe() {
  loadingStatus.value = true
  try {
    const res = await $fetch<{ pending: PendingDto | null; lastReviewed: LastReviewedDto | null }>(
      `${API_BASE_URL}/testimonials/me`,
      {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      },
    )
    pending.value = res.pending
    lastReviewed.value = res.lastReviewed
  } catch {
    toast.add({
      title: t('account.testimonial.toastLoadErrorTitle'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    loadingStatus.value = false
  }
}

async function ensureCamera() {
  if (stream.value) return
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true,
    })
  } catch {
    toast.add({
      title: t('account.testimonial.cameraDeniedTitle'),
      description: t('account.testimonial.cameraDeniedDesc'),
      color: 'error',
      icon: 'i-heroicons-video-camera-slash',
    })
    throw new Error('camera')
  }
}

async function startRecording() {
  if (typeof MediaRecorder === 'undefined') {
    toast.add({
      title: t('account.testimonial.noRecorderTitle'),
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    })
    return
  }
  try {
    await ensureCamera()
  } catch {
    return
  }

  recordedChunks.value = []
  const mime = pickRecorderMime()
  const mr = new MediaRecorder(stream.value!, mime ? { mimeType: mime } : undefined)
  mr.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.value.push(e.data)
  }
  mr.onstop = () => {
    const type = mime || 'video/webm'
    recordedOutputMime.value = baseVideoMimeFromRecorder(type)
    const blob = new Blob(recordedChunks.value, { type: recordedOutputMime.value })
    recordedBlob.value = blob
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(blob)
    const sec = Math.min(
      MAX_SEC,
      Math.max(0, Math.round((Date.now() - recordStartMs) / 1000)),
    )
    finalDurationSec.value = sec
    phase.value = 'preview'
    stopTimer()
    stopStream()
    mediaRecorder.value = null
  }

  mediaRecorder.value = mr
  mr.start(250)
  phase.value = 'recording'
  elapsedSec.value = 0
  recordStartMs = Date.now()
  await nextTick()
  if (liveVideoEl.value && stream.value) {
    liveVideoEl.value.srcObject = stream.value
  }
  stopTimer()
  recordTimer = setInterval(() => {
    elapsedSec.value = Math.min(MAX_SEC, Math.round((Date.now() - recordStartMs) / 1000))
    if (elapsedSec.value >= MAX_SEC) {
      stopRecording()
    }
  }, 200)
}

function stopRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
}

function discardRecording() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  recordedBlob.value = null
  recordedOutputMime.value = 'video/webm'
  finalDurationSec.value = 0
  elapsedSec.value = 0
  phase.value = 'idle'
  stopStream()
}

function extForOutputMime(m: string): string {
  if (m.includes('mp4')) return 'mp4'
  if (m.includes('webm')) return 'webm'
  if (m.includes('quicktime')) return 'mov'
  if (m.includes('ogg')) return 'ogv'
  return 'webm'
}

function submitUpload() {
  if (!recordedBlob.value || !canSubmit.value) return
  const blob = recordedBlob.value
  const mime = recordedOutputMime.value || baseVideoMimeFromRecorder(blob.type)
  const ext = extForOutputMime(mime)
  const file = new File([blob], `testimonial.${ext}`, {
    type: mime,
    lastModified: Date.now(),
  })
  const fd = new FormData()
  fd.append('video', file)
  fd.append('subject', subject.value)
  fd.append('durationSeconds', String(finalDurationSec.value))
  if (subject.value === 'partner' && partnerId.value !== null) {
    fd.append('partnerId', String(partnerId.value))
  }
  if (subject.value === 'troc' && listingId.value !== null) {
    fd.append('listingId', String(listingId.value))
  }

  uploading.value = true
  uploadProgress.value = 0

  const xhr = new XMLHttpRequest()
  xhr.open('POST', `${API_BASE_URL}/testimonials`)
  xhr.setRequestHeader('Authorization', `Bearer ${authStore.accessToken}`)

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      uploadProgress.value = Math.round((e.loaded / e.total) * 100)
    }
  })

  xhr.addEventListener('load', () => {
    uploading.value = false
    if (xhr.status >= 200 && xhr.status < 300) {
      toast.add({
        title: t('account.testimonial.toastSentTitle'),
        description: t('account.testimonial.toastSentDesc'),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
      discardRecording()
      loadMe()
    } else {
      let msg = t('account.testimonial.toastSendErrorDesc')
      try {
        const j = JSON.parse(xhr.responseText)
        if (j.message) {
          msg = Array.isArray(j.message) ? j.message.join(', ') : j.message
        }
      } catch {
        /* ignore */
      }
      toast.add({
        title: t('account.testimonial.toastSendErrorTitle'),
        description: msg,
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    }
  })

  xhr.addEventListener('error', () => {
    uploading.value = false
    toast.add({
      title: t('account.testimonial.toastSendErrorTitle'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  })

  xhr.send(fd)
}

onMounted(async () => {
  await loadMe()
  await partnerStore.fetchPartners()
  const res = await marketplaceStore.fetchMyListings(1, 200)
  if (res.success && res.data?.data) {
    myListings.value = res.data.data.map((l: { id: number; title: string }) => ({
      id: l.id,
      title: l.title,
    }))
  }
})

onUnmounted(() => {
  stopTimer()
  stopStream()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">{{ t('account.testimonial.title') }}</h1>
      <p class="text-white/60">{{ t('account.testimonial.subtitle') }}</p>
    </div>

    <UAlert
      color="primary"
      variant="subtle"
      :title="t('account.testimonial.rulesTitle')"
      class="whitespace-pre-line"
    >
      <ul class="list-disc pl-5 mt-2 space-y-1 text-sm text-white/80">
        <li>{{ t('account.testimonial.ruleDuration', { min: MIN_SEC, max: MAX_SEC }) }}</li>
        <li>{{ t('account.testimonial.ruleSubjects') }}</li>
        <li>{{ t('account.testimonial.ruleAppHint') }}</li>
        <li>{{ t('account.testimonial.ruleValidationDelay') }}</li>
        <li>{{ t('account.testimonial.rulePupu') }}</li>
        <li>{{ t('account.testimonial.ruleOnePending') }}</li>
        <li>{{ t('account.testimonial.ruleMonthlyPupu') }}</li>
      </ul>
    </UAlert>

    <div v-if="loadingStatus" class="flex justify-center py-12">
      <span class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>

    <template v-else>
      <UCard v-if="pending" class="bg-amber-500/10 border border-amber-500/30">
        <template #header>
          <span class="font-semibold text-amber-200">{{ t('account.testimonial.pendingTitle') }}</span>
        </template>
        <p class="text-sm text-white/70 mb-3">{{ t('account.testimonial.pendingDesc') }}</p>
        <video
          v-if="pending.videoUrl"
          class="w-full max-h-64 rounded-lg bg-black"
          controls
          playsinline
          :src="getImageUrl(pending.videoUrl)"
        />
      </UCard>

      <UCard
        v-if="!pending && lastReviewed?.status === 'rejected'"
        class="bg-red-500/10 border border-red-500/25"
      >
        <template #header>
          <span class="font-semibold text-red-200">{{ t('account.testimonial.rejectedTitle') }}</span>
        </template>
        <p v-if="lastReviewed.rejectionReason" class="text-sm text-white/80 mb-2">
          {{ lastReviewed.rejectionReason }}
        </p>
        <p class="text-sm text-white/60">{{ t('account.testimonial.rejectedHint') }}</p>
      </UCard>

      <UCard
        v-if="!pending && lastReviewed?.status === 'approved'"
        class="bg-emerald-500/10 border border-emerald-500/25"
      >
        <template #header>
          <span class="font-semibold text-emerald-200">{{ t('account.testimonial.approvedTitle') }}</span>
        </template>
        <p v-if="lastReviewed.pupuGranted" class="text-sm text-white/80">
          {{ t('account.testimonial.approvedPupu', { n: lastReviewed.pupuAmount }) }}
        </p>
        <p v-else class="text-sm text-white/80">
          {{ t('account.testimonial.approvedNoPupu') }}
        </p>
      </UCard>

      <UCard v-if="!pending">
        <template #header>
          <span class="font-medium">{{ t('account.testimonial.recordTitle') }}</span>
        </template>

        <div class="space-y-4">
          <div v-if="phase === 'idle'" class="flex flex-wrap gap-2">
            <UButton color="primary" icon="i-heroicons-video-camera" @click="startRecording">
              {{ t('account.testimonial.startRecord') }}
            </UButton>
          </div>

          <div v-if="phase === 'recording'" class="space-y-3">
            <p class="text-lg font-mono text-primary-400">
              {{ elapsedSec }}s / {{ MAX_SEC }}s
            </p>
            <video
              ref="liveVideoEl"
              autoplay
              muted
              playsinline
              class="w-full max-h-72 rounded-lg bg-black"
            />
            <UButton color="error" variant="soft" @click="stopRecording">
              {{ t('account.testimonial.stopRecord') }}
            </UButton>
          </div>

          <div v-if="phase === 'preview'" class="space-y-3">
            <video
              v-if="previewUrl"
              class="w-full max-h-72 rounded-lg bg-black"
              controls
              playsinline
              :src="previewUrl"
            />
            <p class="text-sm" :class="durationOk ? 'text-emerald-400' : 'text-amber-400'">
              {{ t('account.testimonial.durationLabel', { sec: finalDurationSec, min: MIN_SEC, max: MAX_SEC }) }}
            </p>
            <div class="flex flex-wrap gap-2">
              <UButton variant="outline" @click="discardRecording">
                {{ t('account.testimonial.rerecord') }}
              </UButton>
            </div>
          </div>

          <div class="space-y-3 pt-2 border-t border-white/10">
            <UFormField :label="t('account.testimonial.fieldSubject')">
              <USelect
                v-model="subject"
                :items="subjectItems"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="subject === 'partner'"
              :label="t('account.testimonial.fieldPartner')"
            >
              <USelect
                v-model="partnerId"
                :items="partnerItems"
                :placeholder="t('account.testimonial.partnerPlaceholder')"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="subject === 'troc'"
              :label="t('account.testimonial.fieldListing')"
            >
              <USelect
                v-model="listingId"
                :items="listingItems"
                :placeholder="t('account.testimonial.listingPlaceholder')"
                class="w-full"
              />
              <p v-if="listingItems.length === 0" class="text-xs text-amber-400 mt-1">
                {{ t('account.testimonial.noListings') }}
              </p>
            </UFormField>
          </div>

          <UButton
            color="primary"
            :disabled="!canSubmit"
            :loading="uploading"
            icon="i-heroicons-cloud-arrow-up"
            @click="submitUpload"
          >
            {{ t('account.testimonial.submit') }}
          </UButton>
          <div
            v-if="uploading"
            class="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
          >
            <div
              class="h-full bg-primary-500 transition-all duration-300"
              :style="{ width: `${uploadProgress}%` }"
            />
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
