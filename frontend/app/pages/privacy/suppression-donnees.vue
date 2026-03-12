<script setup lang="ts">
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">
        Suppression de vos données
      </h1>
      <p class="text-white/60">
        Comment demander la suppression de vos données personnelles sur Nuna Heritage
      </p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-4">
            Compte créé avec Facebook
          </h2>
          <p class="text-white/80">
            Si vous vous êtes inscrit(e) avec Facebook, vous pouvez demander la suppression de vos données de deux façons :
          </p>
          <ol class="list-decimal list-inside space-y-2 text-white/80">
            <li>
              Allez sur <strong>Paramètres Facebook</strong> → <strong>Paramètres et confidentialité</strong> → <strong>Paramètres</strong> → <strong>Applications et sites web</strong>
            </li>
            <li>
              Trouvez <strong>Nuna Heritage</strong> dans la liste de vos applications
            </li>
            <li>
              Cliquez sur <strong>Supprimer</strong> ou <strong>Envoyer une demande</strong> pour demander la suppression de vos données
            </li>
          </ol>
          <p class="text-white/80">
            Votre demande sera traitée automatiquement et toutes les données associées à votre compte Facebook sur Nuna Heritage seront supprimées de nos serveurs.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">
            Compte créé avec email
          </h2>
          <p class="text-white/80">
            Si vous vous êtes inscrit(e) avec une adresse email et un mot de passe, vous pouvez :
          </p>
          <ul class="list-disc list-inside space-y-2 text-white/80">
            <li>
              Nous contacter directement pour demander la suppression de votre compte et de vos données
            </li>
            <li>
              Consulter notre
              <NuxtLink to="/politique-de-confidentialite" class="text-primary-400 hover:underline">
                politique de confidentialité
              </NuxtLink>
              pour plus d'informations sur vos droits
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">
            Données supprimées
          </h2>
          <p class="text-white/80">
            Lors d'une suppression, nous supprimons toutes les données associées à votre compte : profil, annonces, transactions, messages, progressions de cours, et tout autre contenu lié à votre identité.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-4">
            Questions ?
          </h2>
          <p class="text-white/80">
            Pour toute question concernant la protection de vos données, consultez notre
            <NuxtLink to="/politique-de-confidentialite" class="text-primary-400 hover:underline">
              politique de confidentialité
            </NuxtLink>
            ou contactez-nous.
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>
