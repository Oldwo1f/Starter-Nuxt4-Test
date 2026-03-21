<script setup lang="ts">
import { useBillingStore, type BankTransferPack } from '~/stores/useBillingStore'
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.pages.paiement',
})

const billingStore = useBillingStore()
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const { formatDate: formatDateLocale } = useLocaleDate()

const pack = ref<BankTransferPack>('teOhi')

const packOptions = computed(() => [
  { label: t('account.paiement.packTeOhi'), value: 'teOhi' as const },
  { label: t('account.paiement.packUmete'), value: 'umete' as const },
])

const expectedAmount = computed(() => (pack.value === 'umete' ? 20000 : 5000))

const formatAccessDate = (isoOrNull?: string | null) => {
  if (!isoOrNull) return null
  const d = new Date(isoOrNull)
  if (Number.isNaN(d.getTime())) return null
  return formatDateLocale(d, { day: 'numeric', month: 'long', year: 'numeric' })
}

const refresh = async () => {
  await billingStore.fetchMyBankTransfer()
}

const generateReference = async () => {
  const res = await billingStore.createOrReuseIntent(pack.value)
  if (!res.success) {
    toast.add({
      title: t('pollUi.errorTitle'),
      description: res.error || t('account.paiement.toastGenError'),
      color: 'red',
    })
    return
  }
  toast.add({
    title: t('account.paiement.toastGenOkTitle'),
    description: t('account.paiement.toastGenOkDesc'),
    color: 'success',
  })
}

const copyReference = async () => {
  const refId = billingStore.payment?.referenceId
  if (!refId) return
  try {
    await navigator.clipboard.writeText(refId)
    toast.add({ title: t('account.paiement.toastCopyOkTitle'), description: t('account.paiement.toastCopyOkDesc'), color: 'success' })
  } catch {
    toast.add({ title: t('account.paiement.toastCopyErrTitle'), description: t('account.paiement.toastCopyErrDesc'), color: 'red' })
  }
}

const paidAccessUntil = computed(() => {
  const expiresAt = billingStore.userAccess?.paidAccessExpiresAt || authStore.user?.paidAccessExpiresAt || null
  return formatAccessDate(expiresAt)
})

onMounted(async () => {
  await refresh()
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">{{ t('account.paiement.title') }}</h1>
      <p class="text-white/60">
        {{ t('account.paiement.subtitle') }}
      </p>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('account.paiement.step1Title') }}</h2>
      </template>

      <div class="space-y-4">
        <UFormGroup :label="t('account.paiement.packLabel')" name="pack">
          <USelect v-model="pack" :items="packOptions" size="xl" class="w-full" />
        </UFormGroup>

        <div class="rounded-lg border border-white/10 bg-black/20 p-4">
          <div class="text-sm text-white/60">{{ t('account.paiement.amountToTransfer') }}</div>
          <div class="mt-1 text-2xl font-bold">{{ expectedAmount.toLocaleString('fr-FR') }} XPF</div>
          <div class="mt-2 text-sm text-white/60">
            {{ t('account.paiement.invoiceNote') }}
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton color="primary" :loading="billingStore.isLoading" @click="generateReference">
            {{ t('account.paiement.generateRef') }}
          </UButton>
          <UButton variant="outline" :loading="billingStore.isLoading" @click="refresh">
            {{ t('account.paiement.refreshStatus') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('account.paiement.step2Title') }}</h2>
      </template>

      <div v-if="!billingStore.payment" class="text-white/60">
        {{ t('account.paiement.noRef') }}
      </div>

      <div v-else class="space-y-4">
        <div class="rounded-lg border border-white/10 bg-black/30 p-4">
          <div class="text-sm text-white/60">{{ t('account.paiement.refFieldLabel') }}</div>
          <div class="mt-1 font-mono text-lg break-all">
            {{ billingStore.payment.referenceId }}
          </div>
          <div class="mt-3 flex flex-wrap gap-3">
            <UButton size="sm" color="primary" variant="outline" @click="copyReference">
              {{ t('account.paiement.copy') }}
            </UButton>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-sm text-white/60">{{ t('account.paiement.statusLabel') }}</div>
          <UBadge
            v-if="billingStore.payment.status === 'paid'"
            color="green"
            variant="subtle"
          >
            {{ t('account.paiement.statusPaid') }}
          </UBadge>
          <UBadge
            v-else-if="billingStore.payment.status === 'pending'"
            color="amber"
            variant="subtle"
          >
            {{ t('account.paiement.statusPending') }}
          </UBadge>
          <UBadge v-else color="gray" variant="subtle">{{ t('account.paiement.statusCanceled') }}</UBadge>
        </div>

        <div v-if="billingStore.payment.status === 'paid'" class="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div class="font-semibold">{{ t('account.paiement.confirmedTitle') }}</div>
          <div class="mt-1 text-sm text-white/70">
            <span v-if="paidAccessUntil">{{ t('account.paiement.confirmedUntil', { date: paidAccessUntil }) }}</span>
            <span v-else>{{ t('account.paiement.confirmedYear') }}</span>
          </div>
        </div>
      </div>
    </UCard>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('account.paiement.step3Title') }}</h2>
      </template>

      <div class="text-white/60">
        {{ t('account.paiement.invoiceLater') }}
      </div>

      <div class="mt-4">
        <UButton disabled variant="outline" icon="i-heroicons-document-arrow-down">
          {{ t('account.paiement.downloadInvoice') }}
        </UButton>
      </div>
    </UCard>

    <div v-if="billingStore.error" class="text-sm text-red-400">
      {{ billingStore.error }}
    </div>
  </div>
</template>

