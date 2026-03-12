<script setup lang="ts">
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">
        Demande de suppression des données
      </h1>
      <p class="text-white/60">
        Statut de votre demande de suppression des données liées à Facebook
      </p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-4">
            Demande traitée
          </h2>
          <p class="text-white/80">
            Votre demande de suppression des données a bien été reçue et traitée.
          </p>
          <p class="text-white/80">
            Toutes les données associées à votre compte Facebook sur Nuna Heritage ont été supprimées de nos serveurs, conformément à votre demande et aux exigences de Meta.
          </p>
          <p class="text-white/80">
            Si vous aviez un compte créé uniquement via Facebook, celui-ci a été entièrement supprimé. Si vous aviez lié Facebook à un compte existant (email/mot de passe), les données Facebook ont été retirées de votre profil.
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
