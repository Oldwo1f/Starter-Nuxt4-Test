<script setup lang="ts">
import type { EditorToolbarItem } from '#ui/types'
import { useAuthStore } from '~/stores/useAuthStore'

const { apiBaseUrl } = useApi()
const authStore = useAuthStore()
const toast = useToast()

const emit = defineEmits<{
  success: []
}>()

const rulesApproved = ref(false)
const form = ref({
  title: '',
  content: '',
  videoUrl: '',
})
const images = ref<File[]>([])
const isSubmitting = ref(false)

const editorToolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } },
  ],
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: 'Headings' },
      content: { align: 'start' },
      items: [
        { kind: 'paragraph', icon: 'i-lucide-text', label: 'Paragraph' },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' },
        { kind: 'heading', level: 4, icon: 'i-lucide-heading-4', label: 'Heading 4' },
      ],
    },
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    {
      icon: 'i-lucide-underline',
      tooltip: { text: 'Formatting' },
      content: { align: 'start' },
      items: [
        { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
        { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strikethrough' } },
        { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } },
      ],
    },
  ],
  [
    {
      icon: 'i-lucide-align-justify',
      tooltip: { text: 'Text Align' },
      content: { align: 'end' },
      items: [
        { kind: 'textAlign', align: 'left', icon: 'i-lucide-align-left', label: 'Left' },
        { kind: 'textAlign', align: 'center', icon: 'i-lucide-align-center', label: 'Center' },
        { kind: 'textAlign', align: 'right', icon: 'i-lucide-align-right', label: 'Right' },
        { kind: 'textAlign', align: 'justify', icon: 'i-lucide-align-justify', label: 'Justify' },
      ],
    },
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
    { kind: 'image', icon: 'i-lucide-image', tooltip: { text: 'Image' } },
    { kind: 'clearFormatting', icon: 'i-lucide-eraser', tooltip: { text: 'Clear formatting' } },
  ],
  [
    {
      icon: 'i-lucide-list',
      tooltip: { text: 'Lists' },
      content: { align: 'start' },
      items: [
        { kind: 'bulletList', icon: 'i-lucide-list', label: 'Bullet List' },
        { kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Ordered List' },
      ],
    },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Blockquote' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code Block' } },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: 'Horizontal Rule' } },
  ],
]

const getImagePreviewUrl = (file: File) => {
  if (import.meta.client && window.URL) {
    return window.URL.createObjectURL(file)
  }
  return ''
}

const resetForm = () => {
  form.value = { title: '', content: '', videoUrl: '' }
  images.value = []
}

const submit = async (status: 'draft' | 'pending') => {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    toast.add({
      title: 'Erreur',
      description: 'Le titre et le contenu sont requis',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  isSubmitting.value = true
  try {
    const formData = new FormData()
    formData.append('title', form.value.title)
    formData.append('content', form.value.content)
    formData.append('status', status)
    if (form.value.videoUrl) {
      formData.append('videoUrl', form.value.videoUrl)
    }
    images.value.forEach((file) => {
      formData.append('images', file)
    })

    await $fetch<{ id: number }>(`${apiBaseUrl}/blog`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: formData,
    })

    toast.add({
      title: status === 'draft' ? 'Brouillon enregistré' : 'Article soumis pour modération',
      description:
        status === 'draft'
          ? 'Votre article a été enregistré en brouillon. Vous pourrez le soumettre plus tard.'
          : 'Votre article sera publié après validation par un modérateur.',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    resetForm()
    emit('success')
  } catch (err: any) {
    toast.add({
      title: 'Erreur',
      description: err.data?.message || err.message || 'Erreur lors de l\'enregistrement',
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    isSubmitting.value = false
  }
}

defineExpose({ resetForm })
</script>

<template>
  <div class="space-y-6">
    <!-- Règles de publication -->
    <UAlert
      v-if="!rulesApproved"
      color="warning"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="Règles de publication"
      description=""
      :ui="{ root: 'rounded-lg' }"
    >
      <template #description>
        <ul class="list-disc space-y-1 pl-4 text-sm">
          <li>Aucun contenu raciste, haineux ou discriminatoire.</li>
          <li>Aucun contenu à caractère politique ou religieux.</li>
          <li>On publie des faits, pas des opinions personnelles.</li>
          <li>Pas de publicité déguisée.</li>
        </ul>
        <UButton
          color="primary"
          class="mt-4"
          icon="i-heroicons-check"
          @click="rulesApproved = true"
        >
          J'ai compris
        </UButton>
      </template>
    </UAlert>

    <div
      class="space-y-6 transition-opacity"
      :class="{ 'pointer-events-none select-none opacity-50': !rulesApproved }"
    >
      <UFormGroup label="Titre" name="title" required>
      <UInput
        v-model="form.title"
        placeholder="Titre de l'article"
        icon="i-heroicons-document-text"
        size="xl"
        class="w-full"
      />
    </UFormGroup>

    <UFormGroup label="Contenu" name="content" required>
      <UEditor
        v-slot="{ editor }"
        v-model="form.content"
        content-type="markdown"
        placeholder="Contenu de l'article..."
        :ui="{
          root: 'border border-white/20 rounded-lg overflow-hidden',
          content: 'min-h-[250px] p-4 focus:outline-none border-t border-white/10',
        }"
      >
        <UEditorToolbar
          :editor="editor"
          :items="editorToolbarItems"
          layout="fixed"
          :ui="{
            root: 'border-b border-white/10 bg-gray-900/50 p-2',
          }"
        />
      </UEditor>
    </UFormGroup>

    <UFormGroup label="Images (optionnel)" description="Jusqu'à 10 images, ratio 4/3 recommandé">
      <div v-if="images.length < 10" class="space-y-4">
        <BlogImageCropper
          :max-images="10"
          :current-images-count="images.length"
          @cropped="(file) => images.push(file)"
        />
      </div>
      <div
        v-else
        class="rounded-lg border border-white/20 p-4 text-center text-sm text-white/60"
      >
        Maximum de 10 images atteint
      </div>
      <div v-if="images.length > 0" class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div
          v-for="(file, index) in images"
          :key="index"
          class="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/20 group"
        >
          <img
            :src="getImagePreviewUrl(file)"
            alt="Preview"
            class="h-full w-full object-cover"
          />
          <button
            type="button"
            class="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
            @click="images.splice(index, 1)"
          >
            <UIcon name="i-heroicons-trash" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </UFormGroup>

    <UFormGroup label="URL Vidéo (optionnel)" description="YouTube, Vimeo, etc.">
      <UInput
        v-model="form.videoUrl"
        placeholder="https://www.youtube.com/watch?v=..."
        icon="i-heroicons-video-camera"
      />
    </UFormGroup>

    <div class="flex flex-wrap gap-4 pt-4">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-heroicons-document"
        :loading="isSubmitting"
        :disabled="!rulesApproved"
        @click="submit('draft')"
      >
        Enregistrer en brouillon
      </UButton>
      <UButton
        color="primary"
        icon="i-heroicons-paper-airplane"
        :loading="isSubmitting"
        :disabled="!rulesApproved"
        @click="submit('pending')"
      >
        Soumettre pour modération
      </UButton>
    </div>
    </div>
  </div>
</template>
