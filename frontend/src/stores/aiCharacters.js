import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItem, setItem, generateId } from '@/utils/storage'

const STORAGE_KEY = 'ai-characters'
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

export const useAiCharactersStore = defineStore('aiCharacters', () => {
  const characters = ref(getItem(STORAGE_KEY) || [])

  const save = () => {
    setItem(STORAGE_KEY, characters.value)
  }

  // ======== 后端 API 方法 ========

  // 从后端加载角色列表
  const fetchCharacters = async () => {
    try {
      const result = await apiRequest('/character')
      if (result.success) {
        characters.value = result.data.map(c => ({
          ...c,
          id: c._id
        }))
        save()
      }
    } catch (error) {
      console.error('获取角色列表失败:', error)
    }
  }

  // 创建角色（到后端）
  const createCharacter = async (character) => {
    try {
      const newChar = {
        ...character,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      const result = await apiRequest('/character', {
        method: 'POST',
        body: JSON.stringify(newChar)
      })
      if (result.success) {
        characters.value.push(newChar)
        save()
        return newChar
      }
      throw new Error('创建角色失败')
    } catch (error) {
      console.error('创建角色失败:', error)
      throw error
    }
  }

  // 更新角色（到后端）
  const updateCharacter = async (id, updates) => {
    try {
      const result = await apiRequest(`/character/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
      if (result.success) {
        const idx = characters.value.findIndex(c => c.id === id)
        if (idx !== -1) {
          characters.value[idx] = {
            ...characters.value[idx],
            ...updates,
            updatedAt: Date.now()
          }
          save()
        }
        return
      }
      throw new Error('更新角色失败')
    } catch (error) {
      console.error('更新角色失败:', error)
      throw error
    }
  }

  // 删除角色（到后端）
  const deleteCharacter = async (id) => {
    try {
      const result = await apiRequest(`/character/${id}`, {
        method: 'DELETE'
      })
      if (result.success) {
        const idx = characters.value.findIndex(c => c.id === id)
        if (idx !== -1) {
          characters.value.splice(idx, 1)
          save()
        }
        // 删除该角色的聊天记录
        localStorage.removeItem(`ai-chat-user-ai-${id}`)
        localStorage.removeItem(`ai-chat-ai-ai-${id}`)
        return
      }
    } catch (error) {
      console.error('删除角色失败:', error)
    }
    // 回退到本地存储
    const idx = characters.value.findIndex(c => c.id === id)
    if (idx === -1) return
    characters.value.splice(idx, 1)
    save()
    localStorage.removeItem(`ai-chat-user-ai-${id}`)
    localStorage.removeItem(`ai-chat-ai-ai-${id}`)
  }

  // ======== 原有方法（保留兼容） ========

  const addCharacter = async (character) => {
    return await createCharacter(character)
  }

  const addCharacterLocal = (character) => {
    const newChar = {
      ...character,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    characters.value.push(newChar)
    save()
    return newChar
  }

  const updateCharacterLocal = (id, updates) => {
    const idx = characters.value.findIndex(c => c.id === id)
    if (idx === -1) return
    characters.value[idx] = {
      ...characters.value[idx],
      ...updates,
      updatedAt: Date.now()
    }
    save()
  }

  const togglePin = (id) => {
    const idx = characters.value.findIndex(c => c.id === id)
    if (idx === -1) return
    characters.value[idx] = {
      ...characters.value[idx],
      pinned: !characters.value[idx].pinned,
      updatedAt: Date.now()
    }
    save()
  }

  const getById = (id) => {
    return characters.value.find(c => c.id === id)
  }

  return {
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    getById,
    togglePin,
    // 后端 API 方法
    fetchCharacters,
    createCharacter
  }
})
