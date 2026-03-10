import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/useAuthStore'
import { useMessageSound } from '~/composables/useMessageSound'

interface UserSummary {
  id: number
  email: string
  firstName?: string | null
  lastName?: string | null
  avatarImage?: string | null
  isCertified?: boolean
}

interface Message {
  id: number
  conversationId: number
  senderId: number
  content: string
  readAt: string | null
  createdAt: string
  sender?: UserSummary
}

interface Conversation {
  id: number
  participant1Id: number
  participant2Id: number
  participant1?: UserSummary
  participant2?: UserSummary
  listingId?: number | null
  listing?: { id: number; title: string } | null
  lastMessage?: Message | null
  unreadCount?: number
  createdAt: string
  updatedAt: string
}

interface MessagesState {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  isLoadingMessages: boolean
  error: string | null
}

export const useMessagesStore = defineStore('messages', () => {
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()
  const { connect, disconnect, on, getSocket } = useSocket()

  const conversations = ref<Conversation[]>([])
  const activeConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const isLoading = ref(false)
  const isLoadingMessages = ref(false)
  const error = ref<string | null>(null)

  const getOtherParticipant = (conv: Conversation): UserSummary | undefined => {
    if (!authStore.user) return undefined
    return conv.participant1Id === authStore.user.id ? conv.participant2 : conv.participant1
  }

  const fetchConversations = async () => {
    if (!authStore.accessToken) return
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch<Conversation[]>(`${apiBaseUrl}/messages/conversations`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      conversations.value = data
      return data
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du chargement des conversations'
      return []
    } finally {
      isLoading.value = false
    }
  }

  const fetchConversation = async (conversationId: number) => {
    if (!authStore.accessToken) return null
    try {
      const conv = await $fetch<Conversation>(
        `${apiBaseUrl}/messages/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        },
      )
      const existing = conversations.value.find((c) => c.id === conv.id)
      if (!existing) {
        conversations.value = [conv, ...conversations.value]
      }
      return conv
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Conversation introuvable'
      return null
    }
  }

  const getOrCreateConversation = async (otherUserId: number, listingId?: number) => {
    if (!authStore.accessToken) return null
    const body: { otherUserId: number; listingId?: number } = { otherUserId }
    if (listingId) body.listingId = listingId
    try {
      const conv = await $fetch<Conversation>(`${apiBaseUrl}/messages/conversations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body,
      })
      const existing = conversations.value.find((c) => c.id === conv.id)
      if (!existing) {
        conversations.value = [conv, ...conversations.value]
      }
      return conv
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la création de la conversation'
      return null
    }
  }

  const fetchMessages = async (conversationId: number, page = 1) => {
    if (!authStore.accessToken) return
    isLoadingMessages.value = true
    error.value = null
    try {
      const data = await $fetch<{ data: Message[]; total: number; page: number; pageSize: number; totalPages: number }>(
        `${apiBaseUrl}/messages/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          query: { page, pageSize: 50 },
        },
      )
      if (page === 1) {
        messages.value = data.data
      } else {
        messages.value = [...data.data, ...messages.value]
      }
      return data
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du chargement des messages'
      return
    } finally {
      isLoadingMessages.value = false
    }
  }

  const sendMessage = async (conversationId: number, content: string) => {
    if (!authStore.accessToken) return null
    const trimmed = content.trim()
    if (!trimmed) return null

    const socket = getSocket()
    if (socket) {
      return new Promise<Message | null>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(null)
        }, 10000)
        socket.emit('message:send', { conversationId, content: trimmed }, (response: any) => {
          clearTimeout(timeout)
          if (response?.message) {
            addMessageFromSocket(response.message)
            resolve(response.message)
          } else if (response?.error) {
            error.value = response.error
            resolve(null)
          } else {
            resolve(null)
          }
        })
      }).then(async (result) => {
        if (result) return result
        try {
          const message = await $fetch<Message>(
            `${apiBaseUrl}/messages/conversations/${conversationId}/messages`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${authStore.accessToken}` },
              body: { content: trimmed },
            },
          )
          addMessageFromSocket(message)
          messages.value = [...messages.value, message]
          return message
        } catch (err: any) {
          error.value = err.data?.message || err.message || 'Erreur lors de l\'envoi'
          return null
        }
      })
    }

    try {
      const message = await $fetch<Message>(
        `${apiBaseUrl}/messages/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: { content: trimmed },
        },
      )
      messages.value = [...messages.value, message]
      return message
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de l\'envoi du message'
      return null
    }
  }

  const setActiveConversation = (conv: Conversation | null) => {
    activeConversation.value = conv
    if (conv) {
      if ((conv.unreadCount ?? 0) > 0) {
        markConversationAsRead(conv.id)
      }
      fetchMessages(conv.id)
    } else {
      messages.value = []
    }
  }

  const addMessageFromSocket = (message: Message) => {
    const isFromOtherUser = message.senderId !== authStore.user?.id

    if (activeConversation.value?.id === message.conversationId) {
      if (!messages.value.some((m) => m.id === message.id)) {
        messages.value = [...messages.value, message]
      }
    }
    const conv = conversations.value.find((c) => c.id === message.conversationId)
    if (conv) {
      conv.lastMessage = message
      conv.updatedAt = message.createdAt
      if (isFromOtherUser) {
        conv.unreadCount = (conv.unreadCount ?? 0) + 1
      }
      conversations.value = [...conversations.value]
    }
    if (isFromOtherUser) {
      unreadCountTotal.value += 1
    }

    if (isFromOtherUser && import.meta.client) {
      useMessageSound().play()
    }
  }

  const totalUnreadCount = computed(() => {
    if (conversations.value.length > 0) {
      return conversations.value.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
    }
    return unreadCountTotal.value
  })

  const unreadCountTotal = ref(0)

  const fetchUnreadCount = async () => {
    if (!authStore.accessToken) return
    try {
      const { count } = await $fetch<{ count: number }>(`${apiBaseUrl}/messages/unread-count`, {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      })
      unreadCountTotal.value = count
    } catch {
      // Ignore
    }
  }

  const markConversationAsRead = async (conversationId: number) => {
    if (!authStore.accessToken) return
    const conv = conversations.value.find((c) => c.id === conversationId)
    const prevUnread = conv?.unreadCount ?? 0
    try {
      await $fetch(`${apiBaseUrl}/messages/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      })
      if (conv) {
        conv.unreadCount = 0
        conversations.value = [...conversations.value]
      }
      unreadCountTotal.value = Math.max(0, unreadCountTotal.value - prevUnread)
    } catch {
      // Ignore
    }
  }

  let unsubscribeMessageNew: (() => void) | null = null
  let isSocketInitialized = false

  const initSocket = () => {
    if (!process.client || !authStore.isAuthenticated) return
    if (isSocketInitialized) return
    isSocketInitialized = true
    connect()
    unsubscribeMessageNew = on('message:new', addMessageFromSocket)
  }

  const cleanup = () => {
    unsubscribeMessageNew?.()
    unsubscribeMessageNew = null
    isSocketInitialized = false
    disconnect()
  }

  return {
    conversations,
    activeConversation,
    messages,
    isLoading,
    isLoadingMessages,
    error,
    getOtherParticipant,
    fetchConversations,
    fetchConversation,
    getOrCreateConversation,
    fetchMessages,
    sendMessage,
    setActiveConversation,
    addMessageFromSocket,
    totalUnreadCount,
    fetchUnreadCount,
    markConversationAsRead,
    initSocket,
    cleanup,
  }
})
