export default defineNuxtPlugin(() => {
  // Forcer le dark mode dès le chargement
  if (process.client) {
    // Forcer le dark mode sur l'élément HTML
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
    document.documentElement.style.colorScheme = 'dark'
    
    // Observer les changements pour maintenir le dark mode
    const observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.add('dark')
      }
      if (document.documentElement.getAttribute('data-theme') !== 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      }
      if (document.documentElement.style.colorScheme !== 'dark') {
        document.documentElement.style.colorScheme = 'dark'
      }
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
  }
})
