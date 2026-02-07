<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const lastUpdateDate = computed(() => new Date().toLocaleDateString('fr-FR'))
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">Politique de confidentialité</h1>
      <p class="text-white/60">
        Dernière mise à jour : {{ lastUpdateDate }}
      </p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-4">1. Données collectées</h2>
          <p class="text-white/80">
            Nous collectons uniquement les données nécessaires au fonctionnement du service (ex. informations de compte,
            contenu que vous publiez, et données techniques de navigation).
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">2. Finalités</h2>
          <p class="text-white/80">
            Les données sont utilisées pour fournir et sécuriser le service, gérer les comptes, et améliorer l'expérience
            utilisateur.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">3. Partage</h2>
          <p class="text-white/80">
            Nous ne vendons pas vos données. Elles peuvent être partagées avec des prestataires techniques strictement
            nécessaires (hébergement, outils de sécurité), selon leurs obligations de confidentialité.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">4. Conservation</h2>
          <p class="text-white/80">
            Les données sont conservées le temps nécessaire aux finalités décrites, puis supprimées ou anonymisées.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">5. Vos droits</h2>
          <p class="text-white/80">
            Vous pouvez demander l'accès, la rectification, ou la suppression de vos données, ainsi que la limitation
            de certains traitements.
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>

