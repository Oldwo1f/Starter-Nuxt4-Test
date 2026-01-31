<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

// Redirect to login if not authenticated
onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
  } else {
    // Fetch full profile on mount
    authStore.fetchProfile()
  }
})

const user = computed(() => authStore.user)

// Form state
const isEditing = ref(false)
const formData = ref({
  firstName: '',
  lastName: '',
  avatarImage: '',
})

// Initialize form data from user
watch(user, (newUser) => {
  if (newUser) {
    formData.value = {
      firstName: newUser.firstName || '',
      lastName: newUser.lastName || '',
      avatarImage: newUser.avatarImage || '',
    }
  }
}, { immediate: true })

const isSaving = ref(false)

const startEditing = () => {
  if (user.value) {
    formData.value = {
      firstName: user.value.firstName || '',
      lastName: user.value.lastName || '',
      avatarImage: user.value.avatarImage || '',
    }
    isEditing.value = true
  }
}

const cancelEditing = () => {
  if (user.value) {
    formData.value = {
      firstName: user.value.firstName || '',
      lastName: user.value.lastName || '',
      avatarImage: user.value.avatarImage || '',
    }
  }
  isEditing.value = false
}

const saveProfile = async () => {
  isSaving.value = true
  try {
    const result = await authStore.updateProfile({
      firstName: formData.value.firstName || undefined,
      lastName: formData.value.lastName || undefined,
      // avatarImage n'est plus géré ici car il est géré par AvatarUpload
    })

    if (result.success) {
      toast.add({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été mises à jour avec succès.',
        color: 'green',
      })
      isEditing.value = false
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Une erreur est survenue lors de la mise à jour.',
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Une erreur est survenue lors de la mise à jour.',
      color: 'red',
    })
  } finally {
    isSaving.value = false
  }
}

const getDisplayName = computed(() => {
  if (!user.value) return 'Utilisateur'
  if (user.value.firstName && user.value.lastName) {
    return `${user.value.firstName} ${user.value.lastName}`
  }
  if (user.value.firstName) {
    return user.value.firstName
  }
  if (user.value.lastName) {
    return user.value.lastName
  }
  return user.value.email
})

const getAvatarText = computed(() => {
  if (!user.value) return 'U'
  if (user.value.firstName) {
    return user.value.firstName.charAt(0).toUpperCase()
  }
  if (user.value.lastName) {
    return user.value.lastName.charAt(0).toUpperCase()
  }
  return user.value.email?.charAt(0).toUpperCase() || 'U'
})

const handleAvatarUploaded = async (avatarUrl: string) => {
  // Rafraîchir le profil pour obtenir les dernières données
  await authStore.fetchProfile()
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10">
    <div class="space-y-6">
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight">Mon Profil</h1>
        <p class="text-white/70">Gérez vos informations personnelles</p>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user-circle" />
              <span class="font-medium">Informations personnelles</span>
            </div>
            <UButton
              v-if="!isEditing"
              @click="startEditing"
              color="primary"
              variant="outline"
              size="sm"
            >
              <UIcon name="i-heroicons-pencil" class="mr-2" />
              Modifier
            </UButton>
          </div>
        </template>

        <div v-if="user" class="space-y-6">
          <div class="flex items-center gap-4">
            <UAvatar
              v-if="user.avatarImage"
              :src="`http://localhost:3001${user.avatarImage}`"
              :alt="getDisplayName"
              size="xl"
              class="ring-2 ring-primary-500/20"
            />
            <UAvatar
              v-else
              :alt="getDisplayName"
              :text="getAvatarText"
              size="xl"
              class="ring-2 ring-primary-500/20"
            />
            <div>
              <h3 class="text-lg font-semibold">{{ getDisplayName }}</h3>
              <p class="text-sm text-white/60">{{ user.email }}</p>
            </div>
          </div>

          <div v-if="!isEditing" class="grid gap-4 sm:grid-cols-2">
            <UFormGroup label="Prénom" name="firstName">
              <UInput
                :value="user.firstName || 'Non renseigné'"
                disabled
                icon="i-heroicons-user"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Nom" name="lastName">
              <UInput
                :value="user.lastName || 'Non renseigné'"
                disabled
                icon="i-heroicons-user"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Email" name="email">
              <UInput
                :value="user.email"
                disabled
                icon="i-heroicons-envelope"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Rôle" name="role">
              <UInput
                :value="user.role"
                disabled
                icon="i-heroicons-shield-check"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Avatar" name="avatarImage">
              <div class="flex items-center gap-4">
                <UAvatar
                  v-if="user.avatarImage"
                  :src="`http://localhost:3001${user.avatarImage}`"
                  :alt="getDisplayName"
                  size="lg"
                  class="ring-2 ring-primary-500/20"
                />
                <UAvatar
                  v-else
                  :alt="getDisplayName"
                  :text="getAvatarText"
                  size="lg"
                  class="ring-2 ring-primary-500/20"
                />
                <p class="text-sm text-white/60">
                  {{ user.avatarImage ? 'Avatar personnalisé' : 'Aucun avatar' }}
                </p>
              </div>
            </UFormGroup>
          </div>

          <div v-else class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormGroup label="Prénom" name="firstName">
                <UInput
                  v-model="formData.firstName"
                  placeholder="Entrez votre prénom"
                  icon="i-heroicons-user"
                  size="lg"
                />
              </UFormGroup>

              <UFormGroup label="Nom" name="lastName">
                <UInput
                  v-model="formData.lastName"
                  placeholder="Entrez votre nom"
                  icon="i-heroicons-user"
                  size="lg"
                />
              </UFormGroup>

              <UFormGroup label="Avatar" name="avatarImage" class="sm:col-span-2">
                <AvatarUpload
                  :current-avatar="user?.avatarImage ? `http://localhost:3001${user.avatarImage}` : null"
                  :user-id="user?.id"
                  @uploaded="handleAvatarUploaded"
                />
              </UFormGroup>
            </div>

            <div class="flex items-center gap-3 pt-4 border-t border-white/10">
              <UButton
                @click="saveProfile"
                color="primary"
                :loading="isSaving"
                :disabled="isSaving"
              >
                Enregistrer
              </UButton>
              <UButton
                @click="cancelEditing"
                color="gray"
                variant="outline"
                :disabled="isSaving"
              >
                Annuler
              </UButton>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <p class="text-white/60">Chargement des informations...</p>
        </div>
      </UCard>
    </div>
  </div>
</template>
