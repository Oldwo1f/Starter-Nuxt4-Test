import type { Poll, PollResults, PollStatus } from '~/stores/usePollStore'
import type { BlogPost } from '~/stores/useBlogStore'
import type { Listing } from '~/stores/useMarketplaceStore'
import { useAuthStore } from '~/stores/useAuthStore'

export interface NewsletterData {
  polls: Array<Poll & { results?: PollResults }>
  blogPosts: BlogPost[]
  listings: Listing[]
}

export const useNewsletter = () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()
  const { getImageUrl } = useApi()

  // Obtenir l'URL du frontend
  const getFrontendUrl = (): string => {
    if (import.meta.client) {
      return window.location.origin
    }
    // Fallback pour SSR
    return process.env.NUXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
  }

  // Récupérer les 2 derniers sondages
  const fetchLatestPolls = async (): Promise<Array<Poll & { results?: PollResults }>> => {
    try {
      const headers: Record<string, string> = {}
      if (authStore.isAuthenticated && authStore.accessToken) {
        headers.Authorization = `Bearer ${authStore.accessToken}`
      }

      const response = await $fetch<{
        data: Poll[]
        total: number
        page: number
        pageSize: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
      }>(`${API_BASE_URL}/polls`, {
        headers,
        query: {
          page: 1,
          pageSize: 2,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
      })

      const polls = response.data

      // Pour chaque sondage, récupérer les résultats s'il est terminé
      const pollsWithResults = await Promise.all(
        polls.map(async (poll) => {
          if (poll.status === 'ended') {
            try {
              const results = await $fetch<PollResults>(`${API_BASE_URL}/polls/${poll.id}/results`, {
                headers,
              })
              return { ...poll, results }
            } catch (err) {
              console.error(`Error fetching results for poll ${poll.id}:`, err)
              return poll
            }
          }
          return poll
        })
      )

      return pollsWithResults
    } catch (err: any) {
      console.error('Error fetching polls:', err)
      throw new Error(err.data?.message || err.message || 'Erreur lors du chargement des sondages')
    }
  }

  // Récupérer les 2 derniers articles du blog
  const fetchLatestBlogPosts = async (): Promise<BlogPost[]> => {
    try {
      const headers: Record<string, string> = {}
      if (authStore.isAuthenticated && authStore.accessToken) {
        headers.Authorization = `Bearer ${authStore.accessToken}`
      }

      const response = await $fetch<{
        data: BlogPost[]
        total: number
        page: number
        pageSize: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
      }>(`${API_BASE_URL}/blog`, {
        headers,
        query: {
          page: 1,
          pageSize: 2,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
      })

      return response.data
    } catch (err: any) {
      console.error('Error fetching blog posts:', err)
      throw new Error(err.data?.message || err.message || 'Erreur lors du chargement des articles')
    }
  }

  // Récupérer les 3 dernières annonces du marketplace
  const fetchLatestListings = async (): Promise<Listing[]> => {
    try {
      const response = await $fetch<{
        data: Listing[]
        total: number
        page: number
        pageSize: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
      }>(`${API_BASE_URL}/marketplace/listings`, {
        query: {
          page: 1,
          pageSize: 3,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
      })

      return response.data
    } catch (err: any) {
      console.error('Error fetching listings:', err)
      throw new Error(err.data?.message || err.message || 'Erreur lors du chargement des annonces')
    }
  }

  // Récupérer toutes les données de la newsletter
  const fetchNewsletterData = async (): Promise<NewsletterData> => {
    const [polls, blogPosts, listings] = await Promise.all([
      fetchLatestPolls(),
      fetchLatestBlogPosts(),
      fetchLatestListings(),
    ])

    return {
      polls,
      blogPosts,
      listings,
    }
  }

  // Générer le HTML de la newsletter
  const generateNewsletterHTML = (data: NewsletterData): string => {
    const frontendUrl = getFrontendUrl()
    const apiBaseUrl = API_BASE_URL

    // URL du logo (doit être accessible publiquement, idéalement dans le dossier public)
    const logoUrl = `${frontendUrl}/logo-nuna-heritage.png`

    // Fonction helper pour obtenir l'URL d'une image
    const getImageUrlHelper = (imagePath: string): string => {
      if (!imagePath) return ''
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath
      }
      return `${apiBaseUrl}${imagePath}`
    }

    // Fonction helper pour tronquer le texte
    const truncateText = (text: string, maxLength: number): string => {
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength).trim() + '...'
    }

    // Générer le HTML d'un sondage
    const generatePollHTML = (poll: Poll & { results?: PollResults }): string => {
      const pollUrl = `${frontendUrl}/polls/${poll.id}`
      const statusLabel = poll.status === 'ended' ? 'Terminé' : 'En cours'
      const statusColor = poll.status === 'ended' ? '#6B7280' : '#10B981'

      let pollContent = ''

      if (poll.status === 'ended' && poll.results) {
        // Afficher les résultats
        if (poll.type === 'qcm') {
          // Résultats pour QCM (avec pourcentages)
          pollContent = `
          <div style="margin-top: 15px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #9CA3AF;">
              ${poll.results.totalResponses} ${poll.results.totalResponses > 1 ? 'réponses' : 'réponse'}
            </p>
            ${poll.results.results
              .map(
                (result) => `
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-size: 14px; color: #F3F4F6;">${result.text}</span>
                  <span style="font-size: 14px; font-weight: 600; color: #F3F4F6;">
                    ${result.count || 0} (${result.percentage?.toFixed(1) || 0}%)
                  </span>
                </div>
                <div style="width: 100%; height: 8px; background-color: #374151; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; background-color: #3B82F6; width: ${result.percentage || 0}%; transition: width 0.3s;"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        } else {
          // Résultats pour ranking (avec moyenne de position)
          pollContent = `
          <div style="margin-top: 15px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #9CA3AF;">
              ${poll.results.totalResponses} ${poll.results.totalResponses > 1 ? 'réponses' : 'réponse'}
            </p>
            ${poll.results.results
              .slice(0, 5)
              .map(
                (result, index) => `
              <div style="margin-bottom: 12px; padding: 10px; background-color: #1F2937; border-radius: 6px; border: 1px solid #374151;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background-color: ${index === 0 ? '#FCD34D' : index === 1 ? '#9CA3AF' : index === 2 ? '#FB923C' : '#374151'}; color: ${index === 0 ? '#1F2937' : index === 1 ? '#1F2937' : index === 2 ? '#1F2937' : '#F3F4F6'}; border-radius: 50%; font-weight: 700; font-size: 14px;">
                    ${index + 1}
                  </div>
                  <div style="flex: 1;">
                    <span style="font-size: 14px; color: #F3F4F6; font-weight: 600;">${result.text}</span>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #9CA3AF;">
                      Moyenne: ${result.averagePosition?.toFixed(2) || 'N/A'} | ${result.responseCount || 0} vote${(result.responseCount || 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      } else {
        // Afficher les options avec bouton voter
        pollContent = `
          <div style="margin-top: 15px;">
            ${poll.options
              .map(
                (option) => `
              <div style="margin-bottom: 8px; padding: 10px; background-color: #1F2937; border-radius: 6px; border: 1px solid #374151;">
                <span style="font-size: 14px; color: #F3F4F6;">${option.text}</span>
              </div>
            `
              )
              .join('')}
            <a href="${pollUrl}" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              Voter
            </a>
          </div>
        `
      }

      return `
        <div style="margin-bottom: 30px; padding: 20px; background-color: #111827; border-radius: 8px; border: 1px solid #374151;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #F3F4F6;">${poll.title}</h3>
            <span style="padding: 4px 12px; background-color: ${statusColor}20; color: ${statusColor}; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ${statusLabel}
            </span>
          </div>
          ${poll.description ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #D1D5DB;">${poll.description}</p>` : ''}
          ${pollContent}
        </div>
      `
    }

    // Générer le HTML d'un article
    const generateBlogPostHTML = (post: BlogPost): string => {
      const postUrl = `${frontendUrl}/blog/${post.id}`
      const imageUrl = post.images && post.images.length > 0 ? getImageUrlHelper(post.images[0]) : null
      const description = truncateText(post.content.replace(/<[^>]*>/g, ''), 150)
      const date = new Date(post.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      return `
        <div style="margin-bottom: 30px; padding: 20px; background-color: #111827; border-radius: 8px; border: 1px solid #374151;">
          ${imageUrl ? `<img src="${imageUrl}" alt="${post.title}" style="width: 100%; max-width: 100%; height: auto; border-radius: 6px; margin-bottom: 15px;" />` : ''}
          <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #F3F4F6;">
            <a href="${postUrl}" style="color: #F3F4F6; text-decoration: none;">${post.title}</a>
          </h3>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #9CA3AF;">${date}</p>
          <p style="margin: 0 0 15px 0; font-size: 14px; color: #D1D5DB; line-height: 1.6;">${description}</p>
          <a href="${postUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Lire l'article
          </a>
        </div>
      `
    }

    // Générer le HTML d'une annonce
    const generateListingHTML = (listing: Listing): string => {
      const listingUrl = `${frontendUrl}/marketplace/${listing.id}`
      const imageUrl = listing.images && listing.images.length > 0 ? getImageUrlHelper(listing.images[0]) : null
      const description = truncateText(listing.description, 120)
      const priceText = `${listing.price} Pūpū${listing.priceUnit ? ` / ${listing.priceUnit}` : ''}`

      return `
        <div style="margin-bottom: 30px; padding: 20px; background-color: #111827; border-radius: 8px; border: 1px solid #374151;">
          ${imageUrl ? `<img src="${imageUrl}" alt="${listing.title}" style="width: 100%; max-width: 100%; height: auto; border-radius: 6px; margin-bottom: 15px;" />` : ''}
          <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #F3F4F6;">
            <a href="${listingUrl}" style="color: #F3F4F6; text-decoration: none;">${listing.title}</a>
          </h3>
          <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #3B82F6;">${priceText}</p>
          <p style="margin: 0 0 15px 0; font-size: 14px; color: #D1D5DB; line-height: 1.6;">${description}</p>
          <a href="${listingUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Voir l'annonce
          </a>
        </div>
      `
    }

    // Générer le HTML complet
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter Nuna Heritage</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #030712;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #111827; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; text-align: center; background-color: #1F2937; border-bottom: 2px solid #374151;">
              <img src="${logoUrl}" alt="Nuna Heritage" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #F3F4F6;">Nuna Heritage</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: #9CA3AF;">Newsletter</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              ${data.polls.length > 0 ? `
                <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 700; color: #F3F4F6; border-bottom: 2px solid #374151; padding-bottom: 10px;">
                  <a href="${frontendUrl}/polls" style="color: #F3F4F6; text-decoration: none;">Votre Avis</a>
                </h2>
                ${data.polls.map(generatePollHTML).join('')}
              ` : ''}
              
              ${data.blogPosts.length > 0 ? `
                <h2 style="margin: 40px 0 20px 0; font-size: 22px; font-weight: 700; color: #F3F4F6; border-bottom: 2px solid #374151; padding-bottom: 10px;">
                  <a href="${frontendUrl}/blog" style="color: #F3F4F6; text-decoration: none;">À la une</a>
                </h2>
                ${data.blogPosts.map(generateBlogPostHTML).join('')}
              ` : ''}
              
              ${data.listings.length > 0 ? `
                <h2 style="margin: 40px 0 20px 0; font-size: 22px; font-weight: 700; color: #F3F4F6; border-bottom: 2px solid #374151; padding-bottom: 10px;">
                  <a href="${frontendUrl}/marketplace" style="color: #F3F4F6; text-decoration: none;">Dernière annonce de troc</a>
                </h2>
                ${data.listings.map(generateListingHTML).join('')}
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #1F2937; border-top: 2px solid #374151;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #9CA3AF;">
                © ${new Date().getFullYear()} Nuna Heritage. Tous droits réservés.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                <a href="${frontendUrl}" style="color: #3B82F6; text-decoration: none;">Visiter le site</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    return html.trim()
  }

  return {
    fetchNewsletterData,
    generateNewsletterHTML,
    getFrontendUrl,
  }
}
