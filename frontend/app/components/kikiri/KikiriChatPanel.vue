<script setup lang="ts">
import type { KikiriChatMessage } from '~/composables/useKikiriSocket'

defineProps<{
  messages: KikiriChatMessage[]
}>()

const model = defineModel<string>('input', { default: '' })
const emit = defineEmits<{ send: [] }>()
</script>

<template>
  <div class="rounded-xl bg-white/5 border border-white/10 flex flex-col h-[400px]">
    <h3 class="text-lg font-semibold text-white p-4 border-b border-white/10">
      Chat
    </h3>
    <div class="flex-1 overflow-y-auto p-4 space-y-2">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="text-sm"
      >
        <span class="text-white/50">
          {{ msg.user?.firstName || msg.user?.email || 'Anon' }}:
        </span>
        <span class="text-white/80">{{ msg.content }}</span>
      </div>
    </div>
    <form class="p-4 border-t border-white/10 flex gap-2" @submit.prevent="emit('send')">
      <UInput
        v-model="model"
        placeholder="Message..."
        class="flex-1"
        size="sm"
      />
      <UButton type="submit" size="sm" color="primary">
        Envoyer
      </UButton>
    </form>
  </div>
</template>
