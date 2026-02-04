<script setup lang="ts">
import { useWalletStore } from '~/stores/useWalletStore'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const walletStore = useWalletStore()
const router = useRouter()

// Form
const form = ref({
  toUserEmail: '',
  amount: 0,
  description: '',
})

const isSubmitting = ref(false)

// Fetch balance
onMounted(async () => {
  await walletStore.fetchBalance()
})

// Submit
const handleSubmit = async () => {
  if (!form.value.toUserEmail || !form.value.amount || form.value.amount <= 0) {
    alert('Veuillez remplir tous les champs obligatoires')
    return
  }

  if (form.value.amount > walletStore.balance) {
    alert('Solde insuffisant')
    return
  }

  if (!confirm(`Transférer ${form.value.amount} coquillages à ${form.value.toUserEmail} ?`)) {
    return
  }

  isSubmitting.value = true
  try {
    const result = await walletStore.transfer(
      form.value.toUserEmail,
      form.value.amount,
      form.value.description
    )

    if (result.success) {
      router.push('/wallet')
    } else {
      alert(result.error || 'Erreur lors du transfert')
    }
  } catch (error: any) {
    alert(error.message || 'Erreur lors du transfert')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
    <div class="mb-6">
      <UButton to="/wallet" variant="ghost" icon="i-heroicons-arrow-left">
        Retour
      </UButton>
      <h1 class="mt-4 text-3xl font-bold">Transférer des coquillages</h1>
      <p class="mt-2 text-white/60">Envoyez des coquillages à un autre membre</p>
    </div>

    <!-- Balance info -->
    <UCard class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-white/60">Solde disponible</div>
          <div class="text-2xl font-bold text-primary-500">
            🐚 {{ walletStore.balance.toFixed(2) }}
          </div>
        </div>
      </div>
    </UCard>

    <!-- Transfer form -->
    <UCard>
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Recipient email -->
        <div>
          <label class="mb-2 block text-sm font-medium">Email du destinataire *</label>
          <UInput
            v-model="form.toUserEmail"
            type="email"
            placeholder="user@example.com"
            size="lg"
            required
          />
        </div>

        <!-- Amount -->
        <div>
          <label class="mb-2 block text-sm font-medium">Montant (coquillages) *</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🐚</span>
            <UInput
              v-model.number="form.amount"
              type="number"
              placeholder="0"
              size="lg"
              class="pl-12"
              min="0.01"
              step="0.01"
              :max="walletStore.balance"
              required
            />
          </div>
          <p class="mt-1 text-xs text-white/60">
            {{ form.amount ? `≈ ${(form.amount * 100).toFixed(0)} XPF` : '' }}
            <span v-if="form.amount > walletStore.balance" class="text-red-500">
              (Solde insuffisant)
            </span>
          </p>
        </div>

        <!-- Description -->
        <div>
          <label class="mb-2 block text-sm font-medium">Description (optionnel)</label>
          <UInput
            v-model="form.description"
            placeholder="Ex: Paiement pour services"
            size="lg"
          />
        </div>

        <!-- Submit -->
        <div class="flex gap-4">
          <UButton
            type="submit"
            color="primary"
            size="xl"
            block
            :loading="isSubmitting"
            :disabled="form.amount > walletStore.balance"
            icon="i-heroicons-arrow-path"
          >
            Transférer
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
