import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockChats, mockMessages } from '@/data/mock'

// 后端 API 配置
const BASE_URL = 'https://wchat-backend-production.up.railway.app/api'

function getToken() {
  return localStorage.getItem('auth-token')
}

async function apiRequest(url, options = {}) {
  const token = getToken()
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...options
  }
  const response = await fetch(`${BASE_URL}${url}`, defaultOptions)
  return response.json()
}

function lsSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch { }
}

// 初始化时清理旧数据，只执行一次
const CLEANUP_KEY = '__ai-unread-clean-v3'
function _migrateCleanup() {
  try {
    if (localStorage.getItem(CLEANUP_KEY) !== null) return
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      // 清理旧格式的 key，新格式 ai-chat-user-ai- 和 ai-chat-ai-ai- 不受影响
      if (key && (
        key.startsWith('ai-chat-') &&
        !key.startsWith('ai-chat-user-ai-') &&
        !key.startsWith('ai-chat-ai-ai-')
      )) {
        localStorage.removeItem(key)
      }
    }
    localStorage.setItem(CLEANUP_KEY, '1')
  } catch { }
}
_migrateCleanup()

export const useChatsStore = defineStore('chats', () => {
  // 初始化时从 localStorage 读取消息，如果没有则使用 mock 数据
  const _loadMessages = () => {
    const stored = localStorage.getItem('mock-messages')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return { ...mockMessages }
      }
    }
    return { ...mockMessages }
  }

  const chats = ref([...mockChats])
  const messages = ref(_loadMessages())
  // 每次 +1 通知 ChatsView 重新渲染（读取最新 localStorage）
  const chatsListRefresh = ref(Date.now())

  const refreshChatList = () => {
    chatsListRefresh.value = Date.now()
  }

  const getChatById = (id) => {
    return chats.value.find(chat => chat.id === Number(id))
  }

  const getMessagesByChatId = (id) => {
    return messages.value[Number(id)] || []
  }

  const clearUnread = (id) => {
    const chat = chats.value.find(c => c.id === Number(id))
    if (chat) chat.unread = 0
  }

  // 标记某 AI 聊天已读，并更新该聊天的最后一条消息内容
  const markAIRead = (routeId) => {
    const key = `ai-chat-ai-${routeId}`
    // routeId 格式为 "ai-{id}"，需要提取出数字 id
    const charId = Number(routeId.replace('ai-', ''))
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const msgs = JSON.parse(raw)
      if (!Array.isArray(msgs)) return
      let changed = false
      const updated = msgs.map(m => {
        if (m.type === 'other' && !m.isRead) {
          changed = true
          return { ...m, isRead: true }
        }
        return m
      })
      if (changed) {
        localStorage.setItem(key, JSON.stringify(updated))
      }
      // 清除 chats.value 中对应聊天的 unread 标记
      const chat = chats.value.find(c => c.id === charId)
      if (chat) {
        chat.unread = 0
      }
      // 始终刷新，确保 ChatsView 重新渲染
      refreshChatList()
    } catch { }
  }

  // ======== 后端 API 方法 ========

  // 获取聊天列表（从后端）
  const fetchChats = async () => {
    try {
      const result = await apiRequest('/chat')
      if (result.success) {
        chats.value = result.data
        refreshChatList()
      }
    } catch (error) {
      console.error('获取聊天列表失败:', error)
    }
  }

  // 获取消息列表（优先从本地缓存，避免重复请求）
  const fetchMessages = async (chatId, forceRefresh = false) => {
    // 如果本地已有消息且没有强制刷新，直接返回
    if (!forceRefresh && messages.value[chatId] && messages.value[chatId].length > 0) {
      return
    }

    try {
      const result = await apiRequest(`/message/${chatId}`)
      if (result.success) {
        // 转换后端数据格式
        messages.value[chatId] = result.data.map(msg => ({
          id: msg._id,
          type: msg.senderId === getUserId() ? 'self' : 'other',
          content: msg.content,
          time: formatTime(msg.createdAt),
          image: msg.image || undefined,
          isRead: msg.isRead
        }))
      }
    } catch (error) {
      console.error('获取消息失败:', error)
    }
  }

  // 发送消息（到后端）
  const sendMessage = async (chatId, content, image = '') => {
    try {
      const result = await apiRequest('/message', {
        method: 'POST',
        body: JSON.stringify({ chatId, content, image })
      })
      if (result.success) {
        const msg = result.data
        if (!messages.value[chatId]) {
          messages.value[chatId] = []
        }
        messages.value[chatId].push({
          id: msg._id,
          type: 'self',
          content: msg.content,
          time: formatTime(msg.createdAt),
          image: msg.image || undefined,
          isRead: true
        })
        // 更新聊天列表
        const chat = chats.value.find(c => c._id === chatId)
        if (chat) {
          chat.lastMessage = content
          chat.updatedAt = new Date()
        }
        refreshChatList()
        return result
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  }

  // 删除消息（从后端）
  const deleteMessage = async (chatId, msgId) => {
    try {
      const result = await apiRequest(`/message/${msgId}`, {
        method: 'DELETE'
      })
      if (result.success) {
        if (messages.value[chatId]) {
          messages.value[chatId] = messages.value[chatId].filter(m => m.id !== msgId)
        }
        // 同时保存到 localStorage
        const key = `ai-chat-ai-${chatId}`
        try {
          localStorage.setItem(key, JSON.stringify(messages.value[chatId] || []))
        } catch { }
      }
      return result
    } catch (error) {
      throw error
    }
  }

  // 清空聊天记录（从后端）
  const deleteAllMessages = async (chatId) => {
    try {
      const result = await apiRequest(`/message/chat/${chatId}`, {
        method: 'DELETE'
      })
      if (result.success) {
        // 清空本地存储
        if (messages.value[chatId]) {
          messages.value[chatId] = []
        }
        // 清空 localStorage
        const userKey = `ai-chat-user-${chatId}`
        const aiKey = `ai-chat-ai-${chatId}`
        try {
          localStorage.removeItem(userKey)
          localStorage.removeItem(aiKey)
        } catch { }
      }
      return result
    } catch (error) {
      throw error
    }
  }

  // 创建聊天（到后端）
  const createChat = async (participants, type = 'private') => {
    try {
      const result = await apiRequest('/chat', {
        method: 'POST',
        body: JSON.stringify({ participants, type })
      })
      if (result.success) {
        await fetchChats()
        return result
      }
    } catch (error) {
      console.error('创建聊天失败:', error)
      throw error
    }
  }

  // 辅助方法
  const getUserId = () => {
    return localStorage.getItem('user-id') || ''
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // ======== 原有方法（保留兼容） ========

  const addMessage = (chatId, msg) => {
    const chatIdNum = Number(chatId)
    if (!messages.value[chatIdNum]) {
      messages.value[chatIdNum] = []
    }
    messages.value[chatIdNum].push({
      id: Date.now(),
      ...msg
    })
  }

  const deleteMessageLocal = (chatId, msgId) => {
    const chatIdNum = Number(chatId)
    if (!messages.value[chatIdNum]) return
    messages.value[chatIdNum] = messages.value[chatIdNum].filter(m => m.id !== msgId)
    // 同时保存到 localStorage
    const key = `ai-chat-ai-${chatId}`
    try {
      localStorage.setItem(key, JSON.stringify(messages.value[chatIdNum]))
    } catch { }
  }

  return {
    chats,
    messages,
    chatsListRefresh,
    refreshChatList,
    getChatById,
    getMessagesByChatId,
    clearUnread,
    markAIRead,
    addMessage,
    deleteMessageLocal,
    // 后端 API 方法
    fetchChats,
    fetchMessages,
    sendMessage,
    deleteMessage,
    deleteAllMessages,
    createChat
  }
})

