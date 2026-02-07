<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Gestion du blog',
})

import { useBlogStore } from '~/stores/useBlogStore'
import type { EditorToolbarItem } from '#ui/types'
import type { BlogPost } from '~/stores/useBlogStore'

const blogStore = useBlogStore()
const toast = useToast()

// Configuration des colonnes pour UTable
const columns = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    enableSorting: true,
  },
  {
    id: 'title',
    accessorKey: 'title',
    header: 'Titre',
    enableSorting: true,
  },
  {
    id: 'authorEmail',
    accessorKey: 'authorEmail',
    header: 'Auteur',
    enableSorting: false,
  },
  {
    id: 'createdAtFormatted',
    accessorKey: 'createdAtFormatted',
    header: 'Créé le',
    enableSorting: true,
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
  },
]

// Calcul de la hauteur disponible pour le tableau
const tableHeight = ref('600px')

const calculateTableHeight = () => {
  if (import.meta.client) {
    const viewportHeight = window.innerHeight
    // Hauteurs fixes à soustraire (ajustées pour optimiser l'espace vertical)
    const layoutTopBar = 64
    const pagePadding = 32 // p-4 = 16px * 2 (réduit)
    const pageHeader = 0 // Header avec titre et bouton (réduit)
    const cardHeader = 70 // Header de la UCard avec filtres (réduit)
    const pagination = 60 // Barre de pagination (réduit)
    const margins = 24 // Marges entre les éléments (réduit)
    
    const availableHeight = viewportHeight - layoutTopBar - pagePadding - pageHeader - cardHeader - pagination - margins
    
    // Limiter à 680px maximum pour un écran 1920x1080
    const maxHeight = 680
    const calculatedHeight = Math.min(maxHeight, availableHeight)
    
    tableHeight.value = `${Math.max(300, calculatedHeight)}px`
  }
}

// Wrapper pour fetchPosts avec gestion des toasts
const handleFetchPosts = async () => {
  await blogStore.fetchPosts()
  if (blogStore.error && blogStore.blogPosts.length === 0) {
    toast.add({
      title: 'Erreur',
      description: blogStore.error,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour savePost avec gestion des toasts
const handleSavePost = async () => {
  const result = await blogStore.savePost()
  if (result.success) {
    toast.add({
      title: blogStore.isEditMode ? 'Article mis à jour' : 'Article créé',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour deletePost avec gestion des toasts
const handleDeletePost = async () => {
  const result = await blogStore.deletePost()
  if (result.success) {
    toast.add({
      title: 'Article supprimé',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

// Wrapper pour confirmDelete qui sélectionne d'abord le post
const handleConfirmDelete = (post: BlogPost) => {
  blogStore.selectedPost = post
  blogStore.confirmDelete()
}

const items: EditorToolbarItem[][] = [
[
{ kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } }
  ],[
    {
      icon: 'i-lucide-heading',
      tooltip: { text: 'Headings' },
      content: {
        align: 'start'
      },
      items: [
      { kind: 'paragraph', icon: 'i-lucide-text', label: 'Paragraph' },
        {
          kind: 'heading',
          level: 2,
          icon: 'i-lucide-heading-2',
          label: 'Heading 2'
        },
        {
          kind: 'heading',
          level: 3,
          icon: 'i-lucide-heading-3',
          label: 'Heading 3'
        },
        {
          kind: 'heading',
          level: 4,
          icon: 'i-lucide-heading-4',
          label: 'Heading 4'
        }
      ]
    }
  ],
  [
    {
      kind: 'mark',
      mark: 'bold',
      icon: 'i-lucide-bold',
      tooltip: { text: 'Bold' }
    },
    {
      kind: 'mark',
      mark: 'italic',
      icon: 'i-lucide-italic',
      tooltip: { text: 'Italic' }
    },
    {
      icon: 'i-lucide-underline',
      tooltip: { text: 'formating' },
      content: { align: 'start' },
      items: [
       {
        kind: 'mark',
        mark: 'underline',
        icon: 'i-lucide-underline',
        tooltip: { text: 'Underline' }
        },
        {
        kind: 'mark',
        mark: 'strike',
        icon: 'i-lucide-strikethrough',
        tooltip: { text: 'Strikethrough' }
        },
        {
        kind: 'mark',
        mark: 'code',
        icon: 'i-lucide-code',
        tooltip: { text: 'Code' }
        }
      ]
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
        { kind: 'textAlign', align: 'justify', icon: 'i-lucide-align-justify', label: 'Justify' }
      ]
    }
  ],
    [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
    { kind: 'image', icon: 'i-lucide-image', tooltip: { text: 'Image' } },
    { kind: 'clearFormatting', icon: 'i-lucide-eraser', tooltip: { text: 'Clear formatting' } }
  ],
  [
   
    
    {
      icon: 'i-lucide-list',
      tooltip: { text: 'Lists' },
      content: { align: 'start' },
      items: [
        { kind: 'bulletList', icon: 'i-lucide-list', label: 'Bullet List' },
        { kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Ordered List' },
      ]
    },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Blockquote' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code Block' } },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: 'Horizontal Rule' } }
  ],
];

// const items: EditorToolbarItem[][] = [
//   // Historique
//   [
//     { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
//     { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } }
//   ],

//   // Blocs (paragraph + headings + listes + blocks)
//   [
//     {
//       icon: 'i-lucide-type',
//       tooltip: { text: 'Blocks' },
//       content: { align: 'start' },
//       items: [
//         { kind: 'paragraph', icon: 'i-lucide-text', label: 'Paragraph' },

//         { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1' },
//         { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
//         { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' },
//         { kind: 'heading', level: 4, icon: 'i-lucide-heading-4', label: 'Heading 4' }
//       ]
//     },
//     {
//       icon: 'i-lucide-list',
//       tooltip: { text: 'Lists' },
//       content: { align: 'start' },
//       items: [
//         { kind: 'bulletList', icon: 'i-lucide-list', label: 'Bullet List' },
//         { kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Ordered List' },
//         { kind: 'taskList', icon: 'i-lucide-list-checks', label: 'Task List' }
//       ]
//     },
//     { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Blockquote' } },
//     { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code Block' } },
//     { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: 'Horizontal Rule' } }
//   ],

//   // Inline formatting
//   [
//     { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
//     { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
//     { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
//     { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strike' } },
//     { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Inline code' } }
//   ],

//   // Insert / actions
//   [
//     { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
//     { kind: 'image', icon: 'i-lucide-image', tooltip: { text: 'Image' } },
//     { kind: 'clearFormatting', icon: 'i-lucide-eraser', tooltip: { text: 'Clear formatting' } }
//   ],

//   // Alignement (nécessite l’extension TextAlign)
//   [
//     {
//       icon: 'i-lucide-align-justify',
//       tooltip: { text: 'Text Align' },
//       content: { align: 'end' },
//       items: [
//         { kind: 'textAlign', align: 'left', icon: 'i-lucide-align-left', label: 'Left' },
//         { kind: 'textAlign', align: 'center', icon: 'i-lucide-align-center', label: 'Center' },
//         { kind: 'textAlign', align: 'right', icon: 'i-lucide-align-right', label: 'Right' },
//         { kind: 'textAlign', align: 'justify', icon: 'i-lucide-align-justify', label: 'Justify' }
//       ]
//     }
//   ],

//   // Triggers (insèrent juste / @ : pour ouvrir les menus si tu as les menus branchés)
//   [
//     { kind: 'suggestion', icon: 'i-lucide-slash', tooltip: { text: 'Command (/)' } },
//     { kind: 'mention', icon: 'i-lucide-at-sign', tooltip: { text: 'Mention (@)' } },
//     { kind: 'emoji', icon: 'i-lucide-smile', tooltip: { text: 'Emoji (:)' } }
//   ]
// ] satisfies EditorToolbarItem[][]

onMounted(() => {
  handleFetchPosts()
  calculateTableHeight()
  if (import.meta.client) {
    window.addEventListener('resize', calculateTableHeight)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', calculateTableHeight)
  }
})

// Helper pour créer l'URL de prévisualisation
const getImagePreviewUrl = (file: File) => {
  if (import.meta.client && window.URL) {
    return window.URL.createObjectURL(file)
  }
  return ''
}
</script>

<template>
  <div>
    <div class="space-y-6">
     

      <!-- Tableau des articles -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
                <UButton
                    color="primary"
                    variant="soft"
                    icon="i-heroicons-arrow-path"
                    @click="handleFetchPosts"
                    :loading="blogStore.isLoading"
                >
                   
                </UButton>
              <span class="font-medium">Liste des articles</span>
            </div>
            <div class="flex items-center gap-2">
                
                
            </div>
            <div class="flex items-center gap-2">
              <UInput
                v-model="blogStore.globalFilter"
                placeholder="Rechercher par titre, contenu..."
                icon="i-heroicons-magnifying-glass"
                clearable
                class="w-64"
              />
             
              <UButton
                    color="primary"
                    icon="i-heroicons-plus"
                    @click="blogStore.openAddModal"
                >
                    Nouvel article
            </UButton>
            </div>
          </div>
        </template>

        <div class="overflow-auto" :style="{ maxHeight: tableHeight }">
          <UTable
            v-if="!blogStore.isLoading && blogStore.blogPosts.length > 0"
            v-model:sorting="blogStore.sorting"
            :data="blogStore.data"
            :columns="columns"
            :loading="blogStore.isLoading"
            manual-pagination
            manual-sorting
            sticky
          >
            <template #actions-cell="{ row }">
              <div class="flex items-center gap-2">
                <UButton
                  label="Éditer"
                  icon="i-heroicons-pencil"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  @click="blogStore.openEditModal(row.original)"
                />
                <UButton
                  label="Supprimer"
                  icon="i-heroicons-trash"
                  color="error"
                  variant="subtle"
                  size="sm"
                  @click="handleConfirmDelete(row.original)"
                />
              </div>
            </template>
          </UTable>
        </div>

        <!-- Pagination -->
        <div v-if="!blogStore.isLoading && blogStore.blogPosts.length > 0" class="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <div class="flex items-center gap-4">
            <div class="text-sm text-white/70">
              Affichage de {{ blogStore.pagination.pageIndex * blogStore.pagination.pageSize + 1 }} à
              {{ Math.min((blogStore.pagination.pageIndex + 1) * blogStore.pagination.pageSize, blogStore.totalPosts) }}
              sur {{ blogStore.totalPosts }} article{{ blogStore.totalPosts > 1 ? 's' : '' }}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-white/70">Par page :</span>
              <USelect
                v-model="blogStore.pagination.pageSize"
                :items="[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                ]"
                option-attribute="label"
                value-attribute="value"
                class="w-20"
                @update:model-value="blogStore.pagination.pageIndex = 0"
              />
            </div>
          </div>
          <UPagination
            v-model:page="blogStore.currentPage"
            :total="blogStore.totalPosts"
            :items-per-page="blogStore.pagination.pageSize"
            show-first
            show-last
          />
        </div>

        <div v-else-if="blogStore.isLoading" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-white/60" />
          <p class="text-white/60 mt-4">Chargement des articles...</p>
        </div>

        <div v-else class="text-center py-8">
          <p class="text-white/60">Aucun article trouvé</p>
        </div>
      </UCard>
    </div>

    <!-- Modal pour créer/éditer un article -->
    <UModal v-model:open="blogStore.isPostModalOpen" :ui="{ wrapper: 'max-w-3xl' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon :name="blogStore.isEditMode ? 'i-heroicons-pencil' : 'i-heroicons-plus'" class="w-5 h-5" />
            <span class="font-medium">{{ blogStore.isEditMode ? 'Éditer l\'article' : 'Nouvel article' }}</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="blogStore.closePostModal"
          />
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UFormGroup label="Titre" name="title" required>
            <UInput
              v-model="blogStore.form.title"
              placeholder="Titre de l'article"
              icon="i-heroicons-document-text"
              size="xl"
              class="w-full mb-5"
            />
          </UFormGroup>

          <UFormGroup label="Contenu" name="content" required>
            <UEditor 
              v-slot="{ editor }" 
              v-model="blogStore.form.content" 
              content-type="markdown"
              placeholder="Contenu de l'article..." 
              :ui="{
                root: 'border border-white/10 rounded-lg overflow-hidden',
                content: 'min-h-[300px] p-4 focus:outline-none'
              }"
            >
              <UEditorToolbar 
                :editor="editor" 
                :items="items" 
                layout="fixed"
                :ui="{
                  root: 'border-b border-white/10 bg-gray-900/50 p-2'
                }"
              />
            </UEditor>
          </UFormGroup>

          <!-- Images existantes -->
          <UFormGroup v-if="blogStore.form.existingImages && blogStore.form.existingImages.length > 0" label="Images actuelles">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div
                v-for="(image, index) in blogStore.form.existingImages"
                :key="image"
                class="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/20 group"
              >
                <img
                  :src="`http://localhost:3001${image}`"
                  alt="Image"
                  class="h-full w-full object-cover"
                />
                <button
                  type="button"
                  class="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                  @click="blogStore.form.existingImages?.splice(index, 1)"
                >
                  <UIcon name="i-heroicons-trash" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </UFormGroup>

          <!-- Ajouter des images -->
          <UFormGroup label="Images (ratio 4/3)" description="Ajoutez jusqu'à 10 images">
            <div v-if="(blogStore.form.images?.length || 0) + (blogStore.form.existingImages?.length || 0) < 10" class="space-y-4">
              <BlogImageCropper
                :max-images="10"
                :current-images-count="(blogStore.form.images?.length || 0) + (blogStore.form.existingImages?.length || 0)"
                @cropped="(file) => {
                  if (!blogStore.form.images) blogStore.form.images = []
                  blogStore.form.images.push(file)
                }"
              />
            </div>
            <div v-else class="rounded-lg border border-white/20 p-4 text-center text-sm text-white/60">
              Maximum de 10 images atteint
            </div>
            
            <!-- Prévisualisation des nouvelles images -->
            <div v-if="blogStore.form.images && blogStore.form.images.length > 0" class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div
                v-for="(file, index) in blogStore.form.images"
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
                  @click="blogStore.form.images?.splice(index, 1)"
                >
                  <UIcon name="i-heroicons-trash" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </UFormGroup>

          <!-- Vidéo -->
          <UFormGroup label="URL Vidéo (optionnel)" description="URL YouTube, Vimeo, etc.">
            <UInput
              v-model="blogStore.form.videoUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              icon="i-heroicons-video-camera"
              class="w-full"
            />
            <p class="mt-2 text-xs text-white/60">
              Note: Si une vidéo est fournie, elle sera affichée en priorité sur les images
            </p>
          </UFormGroup>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="blogStore.closePostModal"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            @click="handleSavePost"
            :loading="blogStore.isDeleting"
          >
            {{ blogStore.isEditMode ? 'Enregistrer' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="blogStore.isDeleteConfirmOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
          <span class="font-medium">Confirmer la suppression</span>
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            title="Action irréversible"
            description="Cette action est irréversible. L'article sera définitivement supprimé."
          />
          <template v-if="blogStore.selectedPost">
            <p class="text-white/90">
              Êtes-vous sûr de vouloir supprimer l'article
              <strong class="text-white">"{{ blogStore.selectedPost.title }}"</strong> ?
            </p>
          </template>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="blogStore.isDeleteConfirmOpen = false"
            :disabled="blogStore.isDeleting"
          >
            Annuler
          </UButton>
          <UButton
            color="error"
            @click="handleDeletePost"
            :loading="blogStore.isDeleting"
            :disabled="blogStore.isDeleting"
          >
            Supprimer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
