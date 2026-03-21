/**
 * Formate les dates selon la locale i18n active (fr-FR / fallback pour ty).
 */
export function useLocaleDate() {
  const { locale } = useI18n()

  const dateLocale = computed(() => {
    const l = locale.value
    if (l === 'fr') return 'fr-FR'
    if (l === 'ty') return 'fr-FR'
    return 'fr-FR'
  })

  function formatDate(
    input: string | Date,
    options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ) {
    const d = typeof input === 'string' ? new Date(input) : input
    return d.toLocaleDateString(dateLocale.value, options)
  }

  return { formatDate, dateLocale }
}
