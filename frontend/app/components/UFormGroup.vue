<script setup lang="ts">
// Wrapper pour UFormField pour maintenir la compatibilité avec UFormGroup
// Dans Nuxt UI v4, UFormGroup n'existe pas, on utilise UFormField à la place

interface Props {
  label?: string
  name?: string
  required?: boolean
  description?: string
  hint?: string
  error?: boolean | string
  class?: string
}

const props = defineProps<Props>()
const slots = defineSlots()
</script>

<template>
  <UFormField
    :label="label"
    :name="name"
    :required="required"
    :description="description"
    :hint="hint"
    :error="error"
    :class="class"
  >
    <template v-if="slots.default" #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
    <template v-if="slots.label" #label="slotProps">
      <slot name="label" v-bind="slotProps" />
    </template>
    <template v-if="slots.hint" #hint="slotProps">
      <slot name="hint" v-bind="slotProps" />
    </template>
    <template v-if="slots.description" #description="slotProps">
      <slot name="description" v-bind="slotProps" />
    </template>
    <template v-if="slots.error" #error="slotProps">
      <slot name="error" v-bind="slotProps" />
    </template>
    <template v-if="slots.help" #help="slotProps">
      <slot name="help" v-bind="slotProps" />
    </template>
  </UFormField>
</template>
