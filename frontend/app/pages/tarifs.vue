<script setup lang="ts">
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">Tarifs</h1>
      <p class="text-white/60">
        Informations tarifaires et fonctionnement de la monnaie virtuelle "Pūpū".
      </p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-4">Accès à la plateforme</h2>
          <p class="text-white/80">
            L'accès au site et la création de compte sont gratuits.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">Transactions</h2>
          <p class="text-white/80">
            Les échanges sur la marketplace s'effectuent via la monnaie virtuelle "Pūpū", qui n'a aucune valeur monétaire
            réelle et n'est pas convertible en argent.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">Évolutions</h2>
          <p class="text-white/80">
            Cette page peut être mise à jour si de nouvelles fonctionnalités ou modalités sont ajoutées.
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>

