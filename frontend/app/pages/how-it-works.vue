<script setup lang="ts">
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight">Comment ça marche ?</h1>
      <p class="text-lg text-white/70">
        Découvrez comment utiliser la marketplace de troc Nuna'a Heritage
      </p>
    </div>

    <div class="space-y-8">
      <!-- Section Coquillages -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <span class="text-3xl">🐚</span>
            <h2 class="text-2xl font-bold">La monnaie Coquillage</h2>
          </div>
        </template>
        <div class="space-y-4">
          <p class="text-white/80">
            Le Coquillage est la monnaie virtuelle de notre marketplace. Elle permet d'échanger
            des biens et services sans utiliser d'argent réel.
          </p>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">1h</div>
              <div class="text-sm text-white/60">de travail</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">= 10 🐚</div>
            </div>
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">1000 XPF</div>
              <div class="text-sm text-white/60">(monnaie locale)</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">= 10 🐚</div>
            </div>
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">1 🐚</div>
              <div class="text-sm text-white/60">coquillage</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">= 100 XPF</div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section Processus -->
      <UCard>
        <template #header>
          <h2 class="text-2xl font-bold">Le processus d'échange</h2>
        </template>
        <div class="space-y-6">
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold">
              1
            </div>
            <div>
              <h3 class="mb-1 font-semibold">Inscrivez-vous</h3>
              <p class="text-white/70">
                Créez votre compte gratuitement et recevez votre portefeuille virtuel en Coquillages.
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold">
              2
            </div>
            <div>
              <h3 class="mb-1 font-semibold">Parcourez les annonces</h3>
              <p class="text-white/70">
                Explorez les biens et services disponibles dans votre île ou archipel.
                Utilisez les filtres pour trouver exactement ce que vous cherchez.
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold">
              3
            </div>
            <div>
              <h3 class="mb-1 font-semibold">Créez une annonce</h3>
              <p class="text-white/70">
                Proposez vos biens ou services. Ajoutez des photos, une description claire
                et fixez votre prix en Coquillages.
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold">
              4
            </div>
            <div>
              <h3 class="mb-1 font-semibold">Échangez</h3>
              <p class="text-white/70">
                Lorsqu'un membre est intéressé, l'échange se fait en un clic.
                Les Coquillages sont transférés automatiquement et instantanément.
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section Avantages -->
      <UCard>
        <template #header>
          <h2 class="text-2xl font-bold">Les avantages</h2>
        </template>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex gap-3">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 shrink-0 text-primary-500" />
            <div>
              <h3 class="font-semibold">Économie circulaire</h3>
              <p class="text-sm text-white/70">
                Favorisez la réutilisation et réduisez le gaspillage
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 shrink-0 text-primary-500" />
            <div>
              <h3 class="font-semibold">Communauté locale</h3>
              <p class="text-sm text-white/70">
                Échangez avec les membres de votre archipel
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 shrink-0 text-primary-500" />
            <div>
              <h3 class="font-semibold">Sans frais</h3>
              <p class="text-sm text-white/70">
                Aucun frais de plateforme pour l'instant
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <UIcon name="i-heroicons-check-circle" class="h-6 w-6 shrink-0 text-primary-500" />
            <div>
              <h3 class="font-semibold">Transactions instantanées</h3>
              <p class="text-sm text-white/70">
                Les transferts sont immédiats et sécurisés
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- CTA -->
      <div class="text-center">
        <UButton
          to="/marketplace"
          size="xl"
          color="primary"
          icon="i-heroicons-shopping-bag"
        >
          Découvrir la marketplace
        </UButton>
      </div>
    </div>
  </div>
</template>
