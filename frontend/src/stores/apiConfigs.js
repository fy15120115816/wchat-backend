import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getItem, setItem, generateId } from '@/utils/storage'

const STORAGE_KEY = 'api-configs'
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

export const useApiConfigsStore = defineStore('apiConfigs', () => {
  const configs = ref(getItem(STORAGE_KEY) || [])

  const defaultConfig = computed(() => {
    return configs.value.find(c => c.isDefault) || configs.value[0] || null
  })

  const save = () => {
    setItem(STORAGE_KEY, configs.value)
  }

  const fetchConfigs = async () => {
    try {
      const result = await apiRequest('/config')
      if (result.success) {
        configs.value = result.data.map(c => ({
          ...c,
          id: c._id
        }))
        save()
      }
    } catch (error) {
      console.error('获取API配置失败:', error)
    }
  }

  const addConfig = async (config) => {
    const newConfig = {
      ...config,
      id: generateId(),
      isDefault: configs.value.length === 0,
      createdAt: Date.now()
    }

    try {
      const result = await apiRequest('/config', {
        method: 'POST',
        body: JSON.stringify(newConfig)
      })
      if (result.success) {
        configs.value.push({ ...result.data, id: result.data._id })
        save()
        return { ...result.data, id: result.data._id }
      }
      throw new Error('创建配置失败')
    } catch (error) {
      console.error('创建API配置失败:', error)
      throw error
    }
  }

  const updateConfig = async (id, updates) => {
    try {
      const result = await apiRequest(`/config/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
      if (result.success) {
        const idx = configs.value.findIndex(c => c.id === id)
        if (idx !== -1) {
          configs.value[idx] = { ...configs.value[idx], ...updates }
          save()
        }
        return
      }
      throw new Error('更新配置失败')
    } catch (error) {
      console.error('更新API配置失败:', error)
      throw error
    }
  }

  const deleteConfig = async (id) => {
    try {
      const result = await apiRequest(`/config/${id}`, {
        method: 'DELETE'
      })
      if (result.success) {
        const idx = configs.value.findIndex(c => c.id === id)
        if (idx !== -1) {
          const wasDefault = configs.value[idx].isDefault
          configs.value.splice(idx, 1)
          if (wasDefault && configs.value.length > 0) {
            configs.value[0].isDefault = true
            await updateConfig(configs.value[0].id, { isDefault: true })
          }
          save()
        }
        return
      }
      throw new Error('删除配置失败')
    } catch (error) {
      console.error('删除API配置失败:', error)
      throw error
    }
  }

  const setDefault = async (id) => {
    configs.value.forEach(c => {
      c.isDefault = c.id === id
    })
    save()
    try {
      await apiRequest(`/config/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true })
      })
    } catch (error) {
      console.error('设置默认配置失败:', error)
    }
  }

  const getById = (id) => {
    return configs.value.find(c => c.id === id)
  }

  return {
    configs,
    defaultConfig,
    fetchConfigs,
    addConfig,
    updateConfig,
    deleteConfig,
    setDefault,
    getById
  }
})
