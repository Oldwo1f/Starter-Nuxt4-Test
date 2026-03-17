import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'

export interface KikiriBetByUser {
  userId: number
  amount: number
  user: { id: number; firstName: string | null; avatarImage: string | null }
}

export interface KikiriDraw {
  id: number
  dice1?: number | null
  dice2?: number | null
  dice3?: number | null
  status: 'betting' | 'revealing' | 'resolved'
  bettingEndsAt: string
  resolvedAt?: string | null
  createdAt: string
  userNet?: number
  userBets?: Record<number, number>
  allBets?: Record<number, KikiriBetByUser[]>
}

export interface KikiriChatMessage {
  id: number
  userId: number
  content: string
  createdAt: string
  user?: {
    id: number
    firstName?: string | null
    lastName?: string | null
    email?: string
  } | null
}

export interface KikiriOnlineUser {
  id: number
  firstName: string | null
  avatarImage: string | null
}

export interface KikiriState {
  currentDraw: KikiriDraw | null
  drawHistory: KikiriDraw[]
  chatMessages: KikiriChatMessage[]
  balance: number
  onlineUsers?: KikiriOnlineUser[]
}

let kikiriSocketInstance: Socket | null = null

export const useKikiriSocket = () => {
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
    const namespaceUrl = apiBaseUrl.replace(/\/$/, '') + '/kikiri'
    if (kikiriSocketInstance?.connected) {
      kikiriSocketInstance.emit('kikiri:requestState')
      return kikiriSocketInstance
    }
    kikiriSocketInstance = io(namespaceUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    kikiriSocketInstance.on('connect', () => {
      console.debug('[Kikiri Socket] Connected')
      kikiriSocketInstance?.emit('kikiri:requestState')
    })
    kikiriSocketInstance.on('disconnect', (r) => console.debug('[Kikiri Socket] Disconnected:', r))
    kikiriSocketInstance.on('connect_error', (e) => console.warn('[Kikiri Socket] Error:', e.message))
    return kikiriSocketInstance
  }

  const disconnect = () => {
    if (kikiriSocketInstance) {
      kikiriSocketInstance.disconnect()
      kikiriSocketInstance = null
    }
  }

  const getSocket = (): Socket | null => {
    if (!import.meta.client) return null
    if (kikiriSocketInstance) return kikiriSocketInstance
    if (authStore.isAuthenticated) return connect()
    return null
  }

  const placeBet = (drawId: number, number: number, amount: number) => {
    const s = getSocket()
    if (s) s.emit('kikiri:bet', { drawId, number, amount })
  }

  const moveBet = (drawId: number, from: number, to: number) => {
    const s = getSocket()
    if (s) s.emit('kikiri:moveBet', { drawId, from, to })
  }

  const requestState = () => {
    const s = getSocket()
    if (s) s.emit('kikiri:requestState')
  }

  const requestAllBets = (drawId: number) => {
    const s = getSocket()
    if (s) s.emit('kikiri:requestAllBets', { drawId })
  }

  const sendChat = (content: string) => {
    const s = getSocket()
    if (s) s.emit('kikiri:chat', { content })
  }

  const onState = (callback: (state: KikiriState) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:state', callback)
      return () => s.off('kikiri:state', callback)
    }
    return () => {}
  }

  const onDrawEnding = (callback: (data: { drawId: number }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:draw:ending', callback)
      return () => s.off('kikiri:draw:ending', callback)
    }
    return () => {}
  }

  const onDrawNew = (callback: (data: { draw: KikiriDraw }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:draw:new', callback)
      return () => s.off('kikiri:draw:new', callback)
    }
    return () => {}
  }

  const onDrawReveal = (callback: (data: { draw: KikiriDraw }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:draw:reveal', callback)
      return () => s.off('kikiri:draw:reveal', callback)
    }
    return () => {}
  }

  const onDrawResolved = (callback: (data: { draw: KikiriDraw }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:draw:resolved', callback)
      return () => s.off('kikiri:draw:resolved', callback)
    }
    return () => {}
  }

  const onDrawMyResult = (callback: (data: { drawId: number; userNet: number; userBets?: Record<number, number> }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:draw:myResult', callback)
      return () => s.off('kikiri:draw:myResult', callback)
    }
    return () => {}
  }

  const onAllBets = (callback: (data: { drawId: number; allBets: Record<number, KikiriBetByUser[]> }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:allBets', callback)
      return () => s.off('kikiri:allBets', callback)
    }
    return () => {}
  }

  const onOnlineUsers = (callback: (data: { users: KikiriOnlineUser[] }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:onlineUsers', callback)
      return () => s.off('kikiri:onlineUsers', callback)
    }
    return () => {}
  }

  const onBetPlaced = (callback: (data: { bet: any; balance: number }) => void) => {
    const s = getSocket()
    if (s) {
      const handler = (d: { bet: any; balance: number }) => {
        callback(d)
        walletStore.fetchBalance()
      }
      s.on('kikiri:bet:placed', handler)
      return () => s.off('kikiri:bet:placed', handler)
    }
    return () => {}
  }

  const onBetError = (callback: (data: { error: string }) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:bet:error', callback)
      return () => s.off('kikiri:bet:error', callback)
    }
    return () => {}
  }

  const onChatMessage = (callback: (message: KikiriChatMessage) => void) => {
    const s = getSocket()
    if (s) {
      s.on('kikiri:chat:message', callback)
      return () => s.off('kikiri:chat:message', callback)
    }
    return () => {}
  }

  return {
    connect,
    disconnect,
    getSocket,
    placeBet,
    moveBet,
    requestState,
    requestAllBets,
    sendChat,
    onState,
    onAllBets,
    onOnlineUsers,
    onDrawNew,
    onDrawEnding,
    onDrawReveal,
    onDrawResolved,
    onDrawMyResult,
    onBetPlaced,
    onBetError,
    onChatMessage,
    isConnected: computed(() => kikiriSocketInstance?.connected ?? false),
  }
}
