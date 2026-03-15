<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Scanner QR - Te Natira\'a',
})

import { useAuthStore } from '~/stores/useAuthStore'
import { Html5Qrcode } from 'html5-qrcode'

const authStore = useAuthStore()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
const toast = useToast()
const router = useRouter()

onMounted(() => {
  const role = authStore.user?.role?.toLowerCase()
  if (role === 'moderator') {
    router.push('/admin/dashboard')
    toast.add({
      title: 'Accès refusé',
      description: 'Vous n\'avez pas les permissions nécessaires.',
      color: 'red',
    })
  }
})

const scannerContainer = ref<HTMLElement | null>(null)
const isScanning = ref(false)
const scanResult = ref<{
  type: 'valid' | 'invalid' | 'used'
  message: string
  adultCount?: number
  childCount?: number
} | null>(null)
const lastScannedCode = ref<string | null>(null)
const isProcessing = ref(false)

let html5QrCode: Html5Qrcode | null = null

const startScanner = async () => {
  if (!scannerContainer.value || isScanning.value) return

  try {
    html5QrCode = new Html5Qrcode('qr-reader')
    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      onScanSuccess,
      () => {},
    )
    isScanning.value = true
    scanResult.value = null
  } catch (err: any) {
    toast.add({
      title: 'Erreur caméra',
      description: err.message || 'Impossible d\'accéder à la caméra',
      color: 'red',
    })
  }
}

const onScanSuccess = async (decodedText: string) => {
  if (isProcessing.value) return
  if (lastScannedCode.value === decodedText) return

  lastScannedCode.value = decodedText
  isProcessing.value = true
  scanResult.value = null

  try {
    const response = await $fetch<{
      valid: boolean
      message: string
      adultCount?: number
      childCount?: number
    }>(`${API_BASE_URL}/te-natiraa/validate/${encodeURIComponent(decodedText)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })

    if (response.valid) {
      scanResult.value = {
        type: 'valid',
        message: response.message,
        adultCount: response.adultCount,
        childCount: response.childCount,
      }
      toast.add({
        title: 'Code validé',
        description: response.message,
        color: 'green',
      })
    } else if (response.message === 'Code déjà utilisé') {
      scanResult.value = {
        type: 'used',
        message: response.message,
        adultCount: response.adultCount,
        childCount: response.childCount,
      }
      toast.add({
        title: 'Code déjà utilisé',
        description: response.message,
        color: 'amber',
      })
    } else {
      scanResult.value = {
        type: 'invalid',
        message: response.message,
      }
      toast.add({
        title: 'Code invalide',
        description: response.message,
        color: 'red',
      })
    }
  } catch (err: any) {
    scanResult.value = {
      type: 'invalid',
      message: err.data?.message || err.message || 'Erreur lors de la validation',
    }
    toast.add({
      title: 'Erreur',
      description: scanResult.value.message,
      color: 'red',
    })
  } finally {
    isProcessing.value = false
    setTimeout(() => {
      lastScannedCode.value = null
    }, 2000)
  }
}

const stopScanner = async () => {
  if (html5QrCode && isScanning.value) {
    await html5QrCode.stop()
    html5QrCode.clear()
    html5QrCode = null
    isScanning.value = false
  }
}

onUnmounted(() => {
  stopScanner()
})
</script>

<template>
  <div class="space-y-6">
    <NuxtLink
      to="/admin/te-natiraa"
      class="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
    >
      <UIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
      Retour aux inscriptions
    </NuxtLink>

    <div class="space-y-4">
      <h2 class="text-2xl font-bold text-white">Scanner QR Code</h2>
      <p class="text-white/70">
        Scannez le QR code du billet pour valider l'entrée.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">Caméra</span>
            <UButton
              v-if="!isScanning"
              color="primary"
              size="sm"
              icon="i-heroicons-play"
              @click="startScanner"
            >
              Démarrer le scanner
            </UButton>
            <UButton
              v-else
              color="red"
              variant="outline"
              size="sm"
              icon="i-heroicons-stop"
              @click="stopScanner"
            >
              Arrêter
            </UButton>
          </div>
        </template>

        <div
          id="qr-reader"
          ref="scannerContainer"
          class="rounded-lg overflow-hidden bg-black min-h-[300px]"
        />
        <p v-if="!isScanning" class="mt-4 text-center text-sm text-white/60">
          Cliquez sur "Démarrer le scanner" pour activer la caméra
        </p>
      </UCard>

      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <span class="font-medium">Résultat</span>
        </template>

        <div v-if="!scanResult" class="py-12 text-center text-white/60">
          Aucun scan pour le moment
        </div>

        <div
          v-else
          class="rounded-lg p-6 text-center"
          :class="{
            'bg-green-500/20 border border-green-500/30': scanResult.type === 'valid',
            'bg-amber-500/20 border border-amber-500/30': scanResult.type === 'used',
            'bg-red-500/20 border border-red-500/30': scanResult.type === 'invalid',
          }"
        >
          <UIcon
            v-if="scanResult.type === 'valid'"
            name="i-heroicons-check-circle"
            class="mx-auto mb-4 h-16 w-16 text-green-400"
          />
          <UIcon
            v-else-if="scanResult.type === 'used'"
            name="i-heroicons-exclamation-triangle"
            class="mx-auto mb-4 h-16 w-16 text-amber-400"
          />
          <UIcon
            v-else
            name="i-heroicons-x-circle"
            class="mx-auto mb-4 h-16 w-16 text-red-400"
          />
          <p
            class="text-xl font-bold"
            :class="{
              'text-green-300': scanResult.type === 'valid',
              'text-amber-300': scanResult.type === 'used',
              'text-red-300': scanResult.type === 'invalid',
            }"
          >
            {{ scanResult.type === 'valid' ? 'Code validé' : scanResult.type === 'used' ? 'Code déjà utilisé' : 'Code invalide' }}
          </p>
          <p class="mt-2 text-white/80">
            {{ scanResult.message }}
          </p>
          <div
            v-if="scanResult.adultCount !== undefined && scanResult.childCount !== undefined"
            class="mt-4 text-sm text-white/70"
          >
            Adultes : {{ scanResult.adultCount }} | Enfants : {{ scanResult.childCount }}
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
