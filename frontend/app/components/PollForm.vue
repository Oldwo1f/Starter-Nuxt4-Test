<script setup lang="ts">
import type { Poll, SubmitResponseForm } from '~/stores/usePollStore'

interface Props {
  poll: Poll
}

const props = defineProps<Props>()
const emit = defineEmits<{
  submit: [response: SubmitResponseForm]
}>()

const toast = useToast()

// Pour QCM
const selectedOptionId = ref<number | null>(null)

// Pour Ranking (drag & drop)
const rankedOptions = ref<Array<{ id: number; text: string; position: number }>>([])

// Initialiser les options pour le ranking
onMounted(() => {
  if (props.poll.type === 'ranking') {
    rankedOptions.value = props.poll.options.map((opt, index) => ({
      id: opt.id,
      text: opt.text,
      position: index + 1,
    }))
  }
})

// Drag & Drop handlers
const draggedItem = ref<number | null>(null)

const handleDragStart = (index: number) => {
  draggedItem.value = index
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const handleDrop = (targetIndex: number) => {
  if (draggedItem.value === null || draggedItem.value === targetIndex) {
    draggedItem.value = null
    return
  }

  const items = [...rankedOptions.value]
  const draggedItemData = items[draggedItem.value]
  items.splice(draggedItem.value, 1)
  items.splice(targetIndex, 0, draggedItemData)

  // Réassigner les positions
  rankedOptions.value = items.map((item, index) => ({
    ...item,
    position: index + 1,
  }))

  draggedItem.value = null
}

const handleDragEnd = () => {
  draggedItem.value = null
}

// Submit handler
const handleSubmit = () => {
  if (props.poll.type === 'qcm') {
    if (!selectedOptionId.value) {
      toast.add({
        title: 'Erreur',
        description: 'Veuillez sélectionner une réponse',
        color: 'red',
      })
      return
    }

    emit('submit', {
      optionId: selectedOptionId.value,
    })
  } else if (props.poll.type === 'ranking') {
    if (rankedOptions.value.length === 0) {
      toast.add({
        title: 'Erreur',
        description: 'Veuillez classer au moins un élément',
        color: 'red',
      })
      return
    }

    emit('submit', {
      ranking: rankedOptions.value.map((opt) => ({
        optionId: opt.id,
        position: opt.position,
      })),
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-white">{{ poll.title }}</h2>
      <p v-if="poll.description" class="mt-2 text-white/70">
        {{ poll.description }}
      </p>
    </div>

    <!-- QCM Form -->
    <div v-if="poll.type === 'qcm'" class="space-y-4">
      <div class="space-y-3">
        <label
          v-for="option in poll.options"
          :key="option.id"
          class="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 transition-all hover:border-primary-500/50 hover:bg-white/10"
          :class="{
            'border-primary-500/50 bg-primary-500/10': selectedOptionId === option.id,
          }"
        >
          <input
            v-model="selectedOptionId"
            type="radio"
            :value="option.id"
            name="poll-option"
            class="h-5 w-5 text-primary-500"
          />
          <span class="flex-1 text-white">{{ option.text }}</span>
        </label>
      </div>
    </div>

    <!-- Ranking Form (Drag & Drop) -->
    <div v-else-if="poll.type === 'ranking'" class="space-y-4">
      <p class="text-sm text-white/70">
        Cliquez et glissez les éléments pour les classer (du meilleur au moins bon)
      </p>
      <div class="space-y-2">
        <div
          v-for="(option, index) in rankedOptions"
          :key="option.id"
          draggable="true"
          class="flex cursor-move items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 transition-all hover:border-primary-500/50 hover:bg-white/10"
          :class="{
            'opacity-50': draggedItem === index,
          }"
          @dragstart="handleDragStart(index)"
          @dragover="handleDragOver"
          @drop="handleDrop(index)"
          @dragend="handleDragEnd"
        >
          <UIcon name="i-heroicons-bars-3" class="h-5 w-5 text-white/40" />
          <span class="flex-1 text-white">{{ option.text }}</span>
          <span class="rounded-full bg-primary-500/20 px-2 py-1 text-xs font-semibold text-primary-300">
            #{{ option.position }}
          </span>
        </div>
      </div>
    </div>

    <div class="pt-4">
      <UButton
        size="lg"
        color="primary"
        icon="i-heroicons-paper-airplane"
        class="w-full sm:w-auto"
        @click="handleSubmit"
      >
        Envoyer ma réponse
      </UButton>
    </div>
  </div>
</template>
