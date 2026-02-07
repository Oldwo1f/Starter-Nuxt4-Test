<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const lastUpdateDate = computed(() => new Date().toLocaleDateString('fr-FR'))
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">Conditions Générales de Vente</h1>
      <p class="text-white/60">Dernière mise à jour : {{ lastUpdateDate }}</p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-4">1. Objet</h2>
          <p class="text-white/80">
            Les présentes Conditions Générales de Vente régissent les transactions effectuées sur la marketplace
            Nuna'a Troc, plateforme de troc communautaire utilisant la monnaie virtuelle "Pūpū".
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">2. Fonctionnement de la marketplace</h2>
          <p class="text-white/80">
            Nuna'a Troc est une plateforme de mise en relation permettant aux utilisateurs d'échanger des biens
            et services via la monnaie virtuelle "Pūpū". La plateforme agit uniquement comme intermédiaire
            et n'est pas partie prenante aux transactions.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">3. Monnaie virtuelle "Pūpū"</h2>
          <p class="text-white/80">
            Les transactions sur Nuna'a Troc s'effectuent en "Pūpū", monnaie virtuelle interne à la plateforme.
            Les Pūpū n'ont aucune valeur monétaire réelle et ne peuvent être échangés contre de l'argent réel.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">4. Création d'annonces</h2>
          <p class="text-white/80">
            Les utilisateurs peuvent créer des annonces pour proposer des biens ou services. Ils s'engagent à :
          </p>
          <ul class="list-disc list-inside text-white/80 space-y-2 ml-4">
            <li>Fournir des informations exactes et complètes</li>
            <li>Respecter les lois et réglementations en vigueur</li>
            <li>Ne pas proposer de biens ou services interdits</li>
            <li>Maintenir leurs annonces à jour</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">5. Transactions</h2>
          <p class="text-white/80">
            Les transactions sont effectuées directement entre les utilisateurs. Nuna'a Heritage n'intervient pas
            dans la négociation, la livraison ou la résolution des litiges entre utilisateurs.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">6. Responsabilité</h2>
          <p class="text-white/80">
            Chaque utilisateur est responsable de ses propres transactions. Nuna'a Heritage ne peut être tenu responsable :
          </p>
          <ul class="list-disc list-inside text-white/80 space-y-2 ml-4">
            <li>De la qualité ou conformité des biens/services échangés</li>
            <li>Des litiges entre utilisateurs</li>
            <li>Des pertes ou dommages résultant des transactions</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">7. Remboursements</h2>
          <p class="text-white/80">
            Les transactions en Pūpū sont définitives. Aucun remboursement n'est possible sauf accord
            mutuel entre les parties concernées.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">8. Résolution des litiges</h2>
          <p class="text-white/80">
            En cas de litige, les utilisateurs sont encouragés à trouver une solution amiable. Nuna'a Heritage
            peut intervenir comme médiateur si nécessaire, mais n'a aucune obligation en la matière.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">9. Modification des conditions</h2>
          <p class="text-white/80">
            Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet
            dès leur publication sur le site.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">10. Contact</h2>
          <p class="text-white/80">
            Pour toute question concernant ces conditions de vente, veuillez nous contacter via les moyens de contact
            disponibles sur le site.
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>
