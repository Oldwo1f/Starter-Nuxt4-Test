<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.pages.support',
})

type SupportCategory = 'technical' | 'commercial'

const authStore = useAuthStore()
const { apiBaseUrl } = useApi()
const toast = useToast()
const { t } = useI18n()

const category = ref<SupportCategory>('technical')
const message = ref('')
const isSubmitting = ref(false)

const categoryItems = computed(() => [
  { label: t('support.category.technical'), value: 'technical' as const },
  { label: t('support.category.commercial'), value: 'commercial' as const },
])

const canSubmit = computed(() => message.value.trim().length >= 10 && !isSubmitting.value)

async function submit() {
  const trimmed = message.value.trim()
  if (trimmed.length < 10) {
    toast.add({
      title: t('support.toast.errorTitle'),
      description: t('support.toast.messageTooShort'),
      color: 'red',
    })
    return
  }

  isSubmitting.value = true
  try {
    await $fetch(`${apiBaseUrl}/support`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: {
        category: category.value,
        message: trimmed,
      },
    })

    message.value = ''
    category.value = 'technical'
    toast.add({
      title: t('support.toast.sentTitle'),
      description: t('support.toast.sentDesc'),
      color: 'success',
    })
  } catch (error: any) {
    toast.add({
      title: t('support.toast.errorTitle'),
      description: error?.data?.message || error?.message || t('support.toast.errorDesc'),
      color: 'red',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight">{{ t('support.title') }}</h1>
      <p class="text-white/70">{{ t('support.subtitle') }}</p>
    </div>

    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-lifebuoy" />
          <span class="font-medium">{{ t('support.formTitle') }}</span>
        </div>
      </template>

      <div class="space-y-4">
        <UFormGroup :label="t('support.categoryLabel')" name="category" required>
          <USelect
            v-model="category"
            :items="categoryItems"
            :placeholder="t('support.categoryPlaceholder')"
            size="lg"
            class="w-full"
          />
        </UFormGroup>

        <UFormGroup :label="t('support.messageLabel')" name="message" required>
          <UTextarea
            v-model="message"
            :placeholder="t('support.messagePlaceholder')"
            :rows="8"
            size="lg"
            class="w-full"
          />
          <template #hint>
            <span class="text-xs text-white/50">{{ t('support.messageHint') }}</span>
          </template>
        </UFormGroup>

        <div class="flex items-center gap-3 pt-4 border-t border-white/10">
          <UButton
            color="primary"
            :loading="isSubmitting"
            :disabled="!canSubmit"
            icon="i-heroicons-paper-airplane"
            @click="submit"
          >
            {{ t('support.sendBtn') }}
          </UButton>
          <UButton
            color="gray"
            variant="outline"
            :disabled="isSubmitting"
            icon="i-heroicons-x-mark"
            @click="message = ''"
          >
            {{ t('support.clearBtn') }}
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

