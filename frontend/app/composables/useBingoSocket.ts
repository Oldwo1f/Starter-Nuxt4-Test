import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'

export interface BingoRound {
  id: number
  phase: 'purchase' | 'drawing' | 'ended'
  purchaseEndsAt: string
  jackpot: number
  drawnBalls: number[]
  winnerId?: number | null
  createdAt?: string
  drawingStartedAt?: string | null
}

export interface BingoGrid {
  id: number
  roundId: number
  numbers: number[][]
  gridIndex: number
}

export interface BingoChatMessage {
  id: number
  userId: number
  content: string
  createdAt: string
  user?: {
    id: number
    firstName?: string | null
    lastName?: string | null
    email?: string
    avatarImage?: string | null
  } | null
}

export interface BingoOnlineUser {
  id: number
  firstName: string | null
  avatarImage: string | null
}

export interface BingoState {
  currentRound: BingoRound | null
  userGrids: BingoGrid[]
  chatMessages: BingoChatMessage[]
  balance: number
  onlineUsers?: BingoOnlineUser[]
}

let bingoSocketInstance: Socket | null = null

export const useBingoSocket = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const walletStore = useWalletStore()
  const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'

  const connect = () => {
    if (!import.meta.client) return null
    const token = authStore.accessToken
    if (!token) {
      disconnect()
      return null
    }
    const namespaceUrl = apiBaseUrl.replace(/\/$/, '') + '/bingo'
    if (bingoSocketInstance?.connected) {
      bingoSocketInstance.emit('bingo:requestState')
      return bingoSocketInstance
    }
    bingoSocketInstance = io(namespaceUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    bingoSocketInstance.on('connect', () => {
      console.debug('[Bingo Socket] Connected')
      bingoSocketInstance?.emit('bingo:requestState')
    })
    bingoSocketInstance.on('disconnect', (r) => console.debug('[Bingo Socket] Disconnected:', r))
    bingoSocketInstance.on('connect_error', (e) => console.warn('[Bingo Socket] Error:', e.message))
    return bingoSocketInstance
  }

  const disconnect = () => {
    if (bingoSocketInstance) {
      bingoSocketInstance.disconnect()
      bingoSocketInstance = null
    }
  }

  const getSocket = (): Socket | null => {
    if (!import.meta.client) return null
    if (bingoSocketInstance) return bingoSocketInstance
    if (authStore.isAuthenticated) return connect()
    return null
  }

  const buyGrid = (roundId: number, count: number) => {
    const s = getSocket()
    if (s) {
      s.emit('bingo:buyGrid', { roundId, count })
      if (import.meta.client) {
        setTimeout(() => requestState(), 800)
      }
    }
  }

  const requestState = () => {
    const s = getSocket()
    if (s) s.emit('bingo:requestState')
  }

  const sendChat = (content: string) => {
    const s = getSocket()
    if (s) s.emit('bingo:chat', { content })
  }

  const onState = (callback: (state: BingoState) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:state', callback)
      return () => s.off('bingo:state', callback)
    }
    return () => {}
  }

  const onRoundNew = (callback: (data: { round: BingoRound }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:round:new', callback)
      return () => s.off('bingo:round:new', callback)
    }
    return () => {}
  }

  const onRoundDrawing = (callback: (data: { round: BingoRound }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:round:drawing', callback)
      return () => s.off('bingo:round:drawing', callback)
    }
    return () => {}
  }

  const onBallDrawn = (callback: (data: { roundId: number; ball: number; drawnBalls: number[] }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:ball:drawn', callback)
      return () => s.off('bingo:ball:drawn', callback)
    }
    return () => {}
  }

  const onRoundEnded = (callback: (data: {
    round: {
      id: number
      winnerId: number | null
      winnerIds?: number[]
      winners?: { id: number; name: string }[]
      jackpot: number
    }
  }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:round:ended', callback)
      return () => s.off('bingo:round:ended', callback)
    }
    return () => {}
  }

  const onRoundCountdownStarted = (callback: (data: { roundId: number; purchaseEndsAt: string; jackpot: number }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:round:countdownStarted', callback)
      return () => s.off('bingo:round:countdownStarted', callback)
    }
    return () => {}
  }

  const onRoundJackpot = (callback: (data: { roundId: number; jackpot: number }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:round:jackpot', callback)
      return () => s.off('bingo:round:jackpot', callback)
    }
    return () => {}
  }

  const onGridPurchased = (callback: (data: { grids: BingoGrid[]; jackpot: number; balance: number }) => void) => {
    const s = getSocket()
    if (s) {
      const handler = (d: { grids: BingoGrid[]; jackpot: number; balance: number }) => {
        callback(d)
        walletStore.fetchBalance()
      }
      s.on('bingo:grid:purchased', handler)
      return () => s.off('bingo:grid:purchased', handler)
    }
    return () => {}
  }

  const onGridError = (callback: (data: { error: string }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:grid:error', callback)
      return () => s.off('bingo:grid:error', callback)
    }
    return () => {}
  }

  const onOnlineUsers = (callback: (data: { users: BingoOnlineUser[] }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:onlineUsers', callback)
      return () => s.off('bingo:onlineUsers', callback)
    }
    return () => {}
  }

  const onChatMessage = (callback: (message: BingoChatMessage) => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:chat:message', callback)
      return () => s.off('bingo:chat:message', callback)
    }
    return () => {}
  }

  const onTableClosed = (callback: () => void) => {
    const s = getSocket()
    if (s) {
      s.on('bingo:tableClosed', callback)
      return () => s.off('bingo:tableClosed', callback)
    }
    return () => {}
  }

  return {
    connect,
    disconnect,
    getSocket,
    buyGrid,
    requestState,
    sendChat,
    onState,
    onRoundNew,
    onRoundDrawing,
    onBallDrawn,
    onRoundEnded,
    onRoundCountdownStarted,
    onRoundJackpot,
    onGridPurchased,
    onGridError,
    onOnlineUsers,
    onChatMessage,
    onTableClosed,
    isConnected: computed(() => bingoSocketInstance?.connected ?? false),
  }
}
