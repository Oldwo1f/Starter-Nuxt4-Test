import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'

// Configure dayjs
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.locale('fr')

export default defineNuxtPlugin(() => {
  return {
    provide: {
      dayjs,
    },
  }
})
