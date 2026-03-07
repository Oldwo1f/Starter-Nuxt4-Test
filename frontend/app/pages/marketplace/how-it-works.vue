<script setup lang="ts">
definePageMeta({
  layout: 'marketplace',
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <ProfileIncompleteBanner />
    
    <div class="mb-8 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight">Comment ça marche ?</h1>
      <p class="text-lg text-white/70">
        Découvrez comment utiliser la marketplace de troc Nuna'a Heritage
      </p>
    </div>

    <div class="space-y-8">
     

      <!-- Section Règles -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <h2 class="text-2xl font-bold">Règles</h2>
        </template>
        <div class="space-y-6">
          <!-- Règle principale -->
          <div class="rounded-lg bg-primary-500/20 border border-primary-500/30 p-4">
            <div class="flex items-start gap-3">
              <UIcon name="i-heroicons-information-circle" class="h-6 w-6 shrink-0 text-primary-400 mt-0.5" />
              <div>
                <h3 class="mb-2 font-semibold text-white">Règle principale</h3>
                <p class="text-white/80">
                  <strong style="font-size:1.2em;">Les troqueurs font leur affaires entre eux !</strong> <br>La plateforme fournit uniquement:
                  <br>- une place de marché pour trouver et poster des annonces de troc 
                  <br>- ainsi q'un système de monnaie virtuelle appeler Pūpū 🐚 afin de faciliter les échanges.
                </p>
              </div>
            </div>
          </div>

          <!-- Liste des règles -->
          <div class="space-y-4">
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80 font-bold">
                Il n'y a pas de prix. Le Pūpū 🐚 ne sert qu'à exprimer une valeur approximative.
              </p>
            </div>
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80">
                On peut très bien troquer sans utiliser les Pūpū 🐚
              </p>
            </div>
           
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80">
                Les Pūpū 🐚 servent de monnaie virtuelle pour complémenter le troc.
              </p>
            </div>
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80">
                On peut payer un produit ou un service tout ou en partie avec des Pūpū 🐚.
              </p>
            </div>
            <div class="flex gap-3">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
              <p class="text-white/80">
                Les Pūpū 🐚 doivent circuler. C'est n'est pas fait pour épargner.
              </p>
            </div>
          </div>
        </div>
      </UCard>

       <!-- Section Pūpū -->
       <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <div class="flex items-center gap-3">
            <span class="text-3xl">🐚</span>
            <h2 class="text-2xl font-bold">La monnaie Pūpū</h2>
          </div>
        </template>
        <div class="space-y-4">
          <p class="text-white/80">
            Le Pūpū est la monnaie virtuelle de notre marketplace. Elle permet d'échanger
            des produits et services sans utiliser d'argent réel.
          </p>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">1 🐚</div>
              <div class="text-sm text-white/60">Pūpū</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">≈ 100 XPF</div>
            </div>
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">1000 XPF</div>
              <div class="text-sm text-white/60">(monnaie locale)</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">≈ 10 🐚</div>
            </div>
            <div class="rounded-lg bg-primary-500/20 p-4">
              <div class="mb-2 text-2xl font-bold">1h</div>
              <div class="text-sm text-white/60">de travail</div>
              <div class="mt-2 text-lg font-semibold text-primary-500">≈ 10-20 🐚</div>
            </div>
          </div>

          <!-- Comment obtenir des Pupu -->
          <div class="mt-8">
            <h3 class="mb-4 text-xl font-semibold">Comment obtenir des Pūpū 🐚 ?</h3>
            <ul class="space-y-3 text-white/80">
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-500">•</span>
                <span>Le meilleur moyen d'obtenir des Pūpū 🐚 est de troquer des produits ou des services contre des Pūpū 🐚.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-500">•</span>
                <span>50 Pūpū 🐚 sont offerts à l'inscription Te Ohi. (100 Pūpū 🐚 pour les membres Umete)</span>
              </li>
            </ul>
            <hr style="border-color: #374151; border-width: 1px; margin:20px 0;">
            <ul class="space-y-3 text-white/80">
              
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-500">•</span>
                <span>Nuna'a Heritage vous offre aussi la possibilité de gagner des Pūpū 🐚 supplémentaires :</span>
              </li>
            </ul>
            <ul class="ml-6 mt-3 space-y-2">
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>Parrainage :</strong> Recevez 50 Pūpū 🐚 pour chaque filleul.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>Vidéo Témoignage :</strong> Recevez 10 Pūpū 🐚 pour une vidéo témoignage entre 60 et 90 secondes.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>Jeux :</strong> Différents jeux seront organisés soit sur Facebook soit sur le site pour faire gagner des Pūpū 🐚. <br> <small> Le jeu en cours concerne le parrainage. Il prendra fin à la date du Te Natira'a. <br> ( Au total plus de 500 Pūpū 🐚 seront distribués pour ce jeu. )</small></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>La participation auTe Natira'a </strong>Vous fait automatiquement gagner 10 Pūpū 🐚</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1 text-primary-400">-</span>
                <span><strong>Te Natira'a :</strong> Lors du Te Natira'a, des jeux surprise seront aussi organisés.</span>
              </li>
            </ul>
          </div>
        </div>
      </UCard>

      <!-- Section Processus -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
        <template #header>
          <h2 class="text-2xl font-bold">Le processus d'échange</h2>
        </template>
        <div class="space-y-6">
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              1
            </div>
            <div>
              <h3 class="mb-1 font-semibold text-white">Parcourez ou poster une annonce</h3>
              <p class="text-white/70">
                Explorez les annonces disponibles ou créez votre propre annonce pour proposer vos produits ou services.
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              2
            </div>
            <div>
              <h3 class="mb-1 font-semibold text-white">Prenez contact avec le troqueur ou attendez qu'un troqueur vous contacte</h3>
              <p class="text-white/70">
                Initiez la conversation avec un troqueur qui vous intéresse, ou attendez qu'un membre intéressé par votre annonce vous contacte.
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              3
            </div>
            <div>
              <h3 class="mb-1 font-semibold text-white">Négociez votre échange directement (avec ou sans Pūpū)</h3>
              <p class="text-white/70">
                Discutez et négociez les termes de l'échange directement avec l'autre troqueur. Vous pouvez utiliser les Pūpū ou échanger sans monnaie virtuelle.
              </p>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">
              4
            </div>
            <div>
              <h3 class="mb-1 font-semibold text-white">Faites la transaction comme convenu avec l'autre troqueur</h3>
              <p class="text-white/70">
                Finalisez l'échange selon les termes convenus. Les Pūpū sont là pour aider si besoin, mais vous pouvez aussi échanger directement sans les utiliser.
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section Avantages -->
      <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
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
          Découvrir la place de Troc
        </UButton>
      </div>
    </div>
  </div>
</template>
