<template>
  <div class="tab-bar">
    <router-link
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="tab-item"
      :class="{ active: isActive(tab.path) }"
    >
      <span class="tab-icon">
        <ChatIcon v-if="tab.key === 'chats'" :size="32" />
        <ContactIcon v-else-if="tab.key === 'contacts'" :size="32" />
        <MomentIcon v-else-if="tab.key === 'moments'" :size="32" />
        <SettingsIcon v-else-if="tab.key === 'settings'" :size="32" />
      </span>
      <span class="tab-label">{{ tab.label }}</span>
      <span v-if="getUnread(tab.path) > 0" class="tab-badge">
        {{ getUnread(tab.path) > 99 ? '99+' : getUnread(tab.path) }}
      </span>
    </router-link>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import ChatIcon from './icons/ChatIcon.vue'
import ContactIcon from './icons/ContactIcon.vue'
import MomentIcon from './icons/MomentIcon.vue'
import SettingsIcon from './icons/SettingsIcon.vue'
import { useChatsStore } from '@/stores/chats'
import { useAiCharactersStore } from '@/stores/aiCharacters'

const route = useRoute()
const chatsStore = useChatsStore()
const aiCharactersStore = useAiCharactersStore()
const currentPath = computed(() => route.path)

const tabs = [
  { path: '/chats', label: '聊天', key: 'chats' },
  { path: '/contacts', label: '通讯录', key: 'contacts' },
  { path: '/moments', label: '朋友圈', key: 'moments' },
  { path: '/settings', label: '设置', key: 'settings' },
]

const isActive = (path) => {
  return route.path === path || route.path.startsWith(path + '/')
}

// 触发更新的信号
const updateSignal = ref(Date.now())

// 监听路由变化和定时更新
watch(() => route.path, () => {
  updateSignal.value = Date.now()
})

// 定时更新（每3秒）
setInterval(() => {
  updateSignal.value = Date.now()
}, 3000)

// 计算所有未读消息数量
const totalUnread = computed(() => {
  // 使用updateSignal触发更新
  const _ = updateSignal.value
  
  let count = 0
  // 统计单角色聊天未读
  for (const char of aiCharactersStore.characters) {
    const key = `ai-chat-ai-ai-${char.id}`
    try {
      const raw = localStorage.getItem(key)
      const msgs = raw ? (JSON.parse(raw) || []) : []
      // 与ChatsView.vue相同的过滤逻辑
      count += msgs.filter(m => m.type === 'other' && !m.isRead).length
    } catch {
      // 忽略错误
    }
  }
  // 统计群聊未读
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('group-chat-')) {
      try {
        const raw = localStorage.getItem(key)
        const msgs = raw ? (JSON.parse(raw) || []) : []
        count += msgs.filter(m => (m.type === 'other' || m.role === 'assistant') && !m.isRead).length
      } catch {
        // 忽略错误
      }
    }
  }
  return count
})

const getUnread = (path) => {
  if (path === '/chats') return totalUnread.value
  return 0
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  height: 72px;
  background-color: var(--tab-bg);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  position: relative;
  transition: color 0.2s;
}

.tab-item.active {
  color: var(--wechat-green);
}

.tab-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: grayscale(0) brightness(1) contrast(1);
}

.tab-item .tab-icon img {
  opacity: 0.65;
}

.tab-item.active .tab-icon img {
  opacity: 1;
}

.tab-label {
  font-size: 14px;
  line-height: 1;
}

.tab-badge {
  position: absolute;
  top: 6px;
  right: 50%;
  transform: translateX(16px);
  min-width: 20px;
  height: 20px;
  background-color: #F56C6C;
  color: white;
  font-size: 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}
</style>
