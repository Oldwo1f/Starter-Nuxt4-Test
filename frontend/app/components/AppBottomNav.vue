<script setup lang="ts">
const route = useRoute()

const bottomNavItems = [
  {
    label: 'Blog',
    icon: 'i-heroicons-document-text',
    to: '/blog',
  },
  {
    label: 'Troc',
    icon: 'i-heroicons-shopping-bag',
    to: '/marketplace',
  },
  {
    label: 'Academy',
    icon: 'i-heroicons-academic-cap',
    to: '/academy',
  },
  {
    label: 'Jeux',
    icon: 'i-heroicons-play',
    to: '/games',
  },
]

const isActive = (path: string) => {
  if (path === '/marketplace') {
    return route.path.startsWith('/marketplace')
  }
  if (path === '/blog') {
    return route.path.startsWith('/blog')
  }
  if (path === '/academy') {
    return route.path.startsWith('/academy')
  }
  if (path === '/games') {
    return route.path.startsWith('/games')
  }
  return route.path === path
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-white/10 md:hidden z-50 safe-area-inset-bottom"
  >
    <div class="flex items-center justify-around h-16 px-1">
      <NuxtLink
        v-for="item in bottomNavItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-all',
          isActive(item.to)
            ? 'text-primary-400 bg-primary-500/10'
            : 'text-white/70 active:bg-white/5',
        ]"
      >
        <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span class="text-[10px] leading-tight text-center px-1 truncate max-w-full">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
