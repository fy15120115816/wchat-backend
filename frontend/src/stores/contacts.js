import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockContacts } from '@/data/mock'

export const useContactsStore = defineStore('contacts', () => {
  // 将对象转换为排序后的数组
  const groups = ref(Object.entries(mockContacts).map(([letter, list]) => ({
    letter,
    list: [...list]
  })).sort((a, b) => a.letter.localeCompare(b.letter)))

  const getContactById = (id) => {
    for (const group of groups.value) {
      const contact = group.list.find(c => c.id === Number(id))
      if (contact) return contact
    }
    return null
  }

  return {
    groups,
    getContactById
  }
})
