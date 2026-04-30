import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItem, setItem, generateId } from '@/utils/storage'

const STORAGE_KEY = 'custom-emoji'

export const useCustomEmojiStore = defineStore('customEmoji', () => {
  const packages = ref(getItem(STORAGE_KEY) || [])

  const save = () => {
    setItem(STORAGE_KEY, packages.value)
  }

  const addEmoji = (emoji) => {
    packages.value.push({
      id: generateId(),
      url: emoji.url,
      description: emoji.description || ''
    })
    save()
    return emoji
  }

  const removeEmoji = (id) => {
    const idx = packages.value.findIndex(e => e.id === id)
    if (idx === -1) return
    packages.value.splice(idx, 1)
    save()
  }

  return {
    packages,
    addEmoji,
    removeEmoji
  }
})
