import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '~/stores/useAuthStore'

let socketInstance: Socket | null = null

export const useSocket = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'

  const connect = () => {
    if (!process.client) return null

    const token = authStore.accessToken
    if (!token) {
      disconnect()
      return null
    }

    if (socketInstance?.connected) {
      return socketInstance
    }

    socketInstance = io(apiBaseUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socketInstance.on('connect', () => {
      console.debug('[Socket] Connected')
    })

    socketInstance.on('disconnect', (reason) => {
      console.debug('[Socket] Disconnected:', reason)
    })

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
    })

    return socketInstance
  }

  const disconnect = () => {
    if (socketInstance) {
      socketInstance.disconnect()
      socketInstance = null
    }
  }

  const getSocket = (): Socket | null => {
    if (!process.client) return null
    if (socketInstance?.connected) return socketInstance
    if (authStore.isAuthenticated) {
      return connect()
    }
    return null
  }

  const emit = (event: string, ...args: any[]) => {
    const s = getSocket()
    if (s) {
      s.emit(event, ...args)
    }
  }

  const on = (event: string, callback: (...args: any[]) => void) => {
    const s = getSocket()
    if (s) {
      s.on(event, callback)
      return () => s.off(event, callback)
    }
    return () => {}
  }

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketInstance) {
      socketInstance.off(event, callback)
    }
  }

  return {
    connect,
    disconnect,
    getSocket,
    emit,
    on,
    off,
    isConnected: computed(() => socketInstance?.connected ?? false),
  }
}
