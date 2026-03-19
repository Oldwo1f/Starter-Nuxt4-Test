import { useAuthStore } from '~/stores/useAuthStore'

export interface LeaderboardEntry {
  rank: number
  userId: number
  displayName: string
  avatarImage: string | null
  score: number
  dailyWins: number
  weeklyWins: number
  monthlyWins: number
}

export interface MyScore {
  rank: number
  score: number
  dailyWins: number
  weeklyWins: number
  monthlyWins: number
}

export interface LatestWinner {
  userId: number
  displayName: string
  avatarImage: string | null
  periodStart: string
}

export interface LatestWinners {
  day: LatestWinner | null
  week: LatestWinner | null
  month: LatestWinner | null
}

export interface GamesLeaderboardState {
  kikiriLeaderboard: LeaderboardEntry[]
  bingoLeaderboard: LeaderboardEntry[]
  myKikiriScore: MyScore | null
  myBingoScore: MyScore | null
  isLoading: boolean
  error: string | null
}

export const useGamesLeaderboard = () => {
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()
  const { getImageUrl } = useApi()

  const kikiriLeaderboard = ref<LeaderboardEntry[]>([])
  const bingoLeaderboard = ref<LeaderboardEntry[]>([])
  const kikiriWinners = ref<LatestWinners>({ day: null, week: null, month: null })
  const bingoWinners = ref<LatestWinners>({ day: null, week: null, month: null })
  const myKikiriScore = ref<MyScore | null>(null)
  const myBingoScore = ref<MyScore | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchLeaderboards = async () => {
    isLoading.value = true
    error.value = null
    try {
      const [kikiri, bingo, kikiriW, bingoW] = await Promise.all([
        $fetch<LeaderboardEntry[]>(`${apiBaseUrl}/games/leaderboard/kikiri`),
        $fetch<LeaderboardEntry[]>(`${apiBaseUrl}/games/leaderboard/bingo`),
        $fetch<LatestWinners>(`${apiBaseUrl}/games/winners/kikiri`),
        $fetch<LatestWinners>(`${apiBaseUrl}/games/winners/bingo`),
      ])
      kikiriLeaderboard.value = kikiri
      bingoLeaderboard.value = bingo
      kikiriWinners.value = kikiriW
      bingoWinners.value = bingoW
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'Erreur lors du chargement des classements'
      kikiriLeaderboard.value = []
      bingoLeaderboard.value = []
      kikiriWinners.value = { day: null, week: null, month: null }
      bingoWinners.value = { day: null, week: null, month: null }
    } finally {
      isLoading.value = false
    }
  }

  const fetchMyScores = async () => {
    if (!authStore.isAuthenticated || !authStore.accessToken) {
      myKikiriScore.value = null
      myBingoScore.value = null
      return
    }
    try {
      const data = await $fetch<{ kikiri: MyScore | null; bingo: MyScore | null }>(
        `${apiBaseUrl}/games/leaderboard/me`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        },
      )
      myKikiriScore.value = data.kikiri
      myBingoScore.value = data.bingo
    } catch {
      myKikiriScore.value = null
      myBingoScore.value = null
    }
  }

  const fetchAll = async () => {
    await fetchLeaderboards()
    await fetchMyScores()
  }

  return {
    kikiriLeaderboard,
    bingoLeaderboard,
    kikiriWinners,
    bingoWinners,
    myKikiriScore,
    myBingoScore,
    isLoading,
    error,
    getImageUrl,
    fetchAll,
    fetchLeaderboards,
    fetchMyScores,
  }
}
