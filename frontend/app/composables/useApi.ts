export const useApi = () => {
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'
  
  return {
    apiBaseUrl,
    getImageUrl: (imagePath: string) => {
      if (!imagePath) return ''
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath
      }
      return `${apiBaseUrl}${imagePath}`
    }
  }
}
