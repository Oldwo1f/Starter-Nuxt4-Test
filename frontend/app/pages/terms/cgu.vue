<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const lastUpdateDate = computed(() => new Date().toLocaleDateString('fr-FR'))
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">Conditions Générales d'Utilisation</h1>
      <p class="text-white/60">Dernière mise à jour : {{ lastUpdateDate }}</p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-4">1. Acceptation des conditions</h2>
          <p class="text-white/80">
            En accédant et en utilisant le site Nuna'a Heritage, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation.
            Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre site.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">2. Description du service</h2>
          <p class="text-white/80">
            Nuna'a Heritage est une plateforme communautaire offrant :
          </p>
          <ul class="list-disc list-inside text-white/80 space-y-2 ml-4">
            <li>Une marketplace de troc (Nuna'a Troc)</li>
            <li>Un blog communautaire</li>
            <li>Des ressources téléchargeables (goodies)</li>
            <li>Des informations sur nos partenaires</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">3. Compte utilisateur</h2>
          <p class="text-white/80">
            Pour utiliser certaines fonctionnalités, vous devez créer un compte. Vous êtes responsable de :
          </p>
          <ul class="list-disc list-inside text-white/80 space-y-2 ml-4">
            <li>Maintenir la confidentialité de vos identifiants</li>
            <li>Toutes les activités sous votre compte</li>
            <li>Fournir des informations exactes et à jour</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">4. Utilisation du service</h2>
          <p class="text-white/80">
            Vous vous engagez à utiliser le service de manière légale et conforme aux présentes conditions.
            Il est interdit d'utiliser le service pour :
          </p>
          <ul class="list-disc list-inside text-white/80 space-y-2 ml-4">
            <li>Violer des lois ou réglementations</li>
            <li>Porter atteinte aux droits d'autrui</li>
            <li>Transmettre des contenus illicites ou nuisibles</li>
            <li>Tenter d'accéder de manière non autorisée au système</li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">5. Propriété intellectuelle</h2>
          <p class="text-white/80">
            Tous les contenus du site (textes, images, logos, etc.) sont protégés par les droits de propriété intellectuelle.
            Vous ne pouvez pas reproduire, modifier ou distribuer ces contenus sans autorisation.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">6. Limitation de responsabilité</h2>
          <p class="text-white/80">
            Nuna'a Heritage ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation
            ou de l'impossibilité d'utiliser le service.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">7. Modification des conditions</h2>
          <p class="text-white/80">
            Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet
            dès leur publication sur le site.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">8. Contact</h2>
          <p class="text-white/80">
            Pour toute question concernant ces conditions, veuillez nous contacter via les moyens de contact
            disponibles sur le site.
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>
