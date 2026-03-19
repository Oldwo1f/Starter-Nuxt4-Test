/** Sons des numéros de bingo (1-75) - un MP3 par numéro */
const bingoAudioModules = import.meta.glob<string>(
  '~/assets/bingo/bingo-audio/*.mp3',
  { eager: true, query: '?url', import: 'default' }
)

const ballUrls: Record<number, string> = {}
for (const [path, url] of Object.entries(bingoAudioModules)) {
  const match = path.match(/(\d+)\.mp3$/)
  if (match && typeof url === 'string') {
    ballUrls[Number(match[1])] = url
  }
}

const winSongModules = import.meta.glob<string>('~/assets/bingo/win_song.mp3', { eager: true, query: '?url', import: 'default' })
const winSongUrl = (Object.values(winSongModules)[0] as string) ?? ''

const bingoMusicModules = import.meta.glob<string>('~/assets/bingo/bingo_musique.mp3', { eager: true, query: '?url', import: 'default' })
const bingoMusicUrl = (Object.values(bingoMusicModules)[0] as string) ?? ''

let bingoMusicAudio: HTMLAudioElement | null = null

export const useBingoBallSound = () => {
  const playBall = (ball: number) => {
    if (!import.meta.client) return
    const url = ballUrls[ball]
    if (!url) return
    try {
      const audio = new Audio(url)
      audio.volume = 0.7
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      })
    } catch {
      // Ignore
    }
  }

  const playWinSong = () => {
    if (!import.meta.client || !winSongUrl) return
    try {
      const audio = new Audio(winSongUrl)
      audio.volume = 0.8
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      })
    } catch {
      // Ignore
    }
  }

  const playBingoMusic = (volume?: number) => {
    if (!import.meta.client || !bingoMusicUrl) return
    try {
      if (bingoMusicAudio) {
        bingoMusicAudio.currentTime = 0
        if (volume !== undefined) bingoMusicAudio.volume = volume
        bingoMusicAudio.play().catch(() => {})
        return
      }
      const audio = new Audio(bingoMusicUrl)
      audio.loop = true
      audio.volume = volume ?? 0.5
      bingoMusicAudio = audio
      audio.play().catch(() => {})
    } catch {
      // Ignore
    }
  }

  const setBingoMusicVolume = (volume: number) => {
    if (bingoMusicAudio) bingoMusicAudio.volume = volume
  }

  const stopBingoMusic = () => {
    if (bingoMusicAudio) {
      bingoMusicAudio.pause()
      bingoMusicAudio.currentTime = 0
    }
  }

  return { playBall, playWinSong, playBingoMusic, stopBingoMusic, setBingoMusicVolume }
}
