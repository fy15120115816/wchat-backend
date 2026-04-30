import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItem, setItem } from '@/utils/storage'

const STORAGE_KEY = 'user-profile'
const TOKEN_KEY = 'auth-token'
const BASE_URL = 'https://wchat-backend-production.up.railway.app/api'

const defaultUser = {
  nickname: '我的昵称',
  avatar: 'https://picsum.photos/seed/me/100/100',
  basicInfo: '',
  aiNotify: true,
  darkMode: false,
  chatBackground: '',
  autoPostMoments: true,
  enableMemory: true,
  summaryInterval: 50,
  summarySize: 100
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export const useUserStore = defineStore('user', () => {
  const user = ref({ ...defaultUser, ...getItem(STORAGE_KEY) || {} })
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const userId = ref('')

  const isLoggedIn = ref(!!token.value)

  const save = () => {
    setItem(STORAGE_KEY, user.value)
  }

  const updateUser = async (data) => {
    user.value = { ...user.value, ...data }
    save()
    
    // 同步到后端数据库
    try {
      const response = await fetch(`${BASE_URL}/auth/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
      })
      const result = await response.json()
      if (!result.success) {
        console.error('同步用户信息到后端失败:', result.message)
      }
    } catch (error) {
      console.error('同步用户信息到后端失败:', error)
    }
  }

  const setToken = (newToken) => {
    token.value = newToken
    localStorage.setItem(TOKEN_KEY, newToken)
    isLoggedIn.value = !!newToken
  }

  const setUserId = (newUserId) => {
    userId.value = newUserId
  }

  // 从后端加载用户信息
  const fetchUserFromBackend = async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/user`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })
      const result = await response.json()
      if (result.success && result.data) {
        user.value = { ...user.value, ...result.data }
        save()
      }
    } catch (error) {
      console.error('从后端加载用户信息失败:', error)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await response.json()

      if (data.success) {
        setToken(data.data.token)
        setUserId(data.data.user.id)
        updateUser({
          nickname: data.data.user.username,
          avatar: data.data.user.avatar || defaultUser.avatar,
          basicInfo: data.data.user.basicInfo || ''
        })
        return data
      } else {
        throw new Error(data.message || '登录失败')
      }
    } catch (error) {
      throw error
    }
  }

  const register = async (username, email, password) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      const data = await response.json()

      if (data.success) {
        return data
      } else {
        throw new Error(data.message || '注册失败')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    token.value = ''
    userId.value = ''
    isLoggedIn.value = false
    localStorage.removeItem(TOKEN_KEY)
  }

  return {
    user,
    token,
    userId,
    isLoggedIn,
    save,
    updateUser,
    setToken,
    setUserId,
    login,
    register,
    logout
  }
})
