<template>
  <div class="page">
    <div class="page-header">微信</div>
    <div class="page-content hide-scrollbar">
      <!-- AI 角色列表（置顶优先） -->
      <div
        v-for="char in sortedCharacters"
        :key="'ai-' + char.id"
        class="chat-item"
        :class="{ pinned: char.pinned }"
      >
        <!-- 滑动操作按钮 -->
        <div class="swipe-actions" :class="{ visible: swipedId === char.id }">
          <div class="swipe-btn pin-btn" @click.stop="handlePin(char)">
            {{ char.pinned ? '取消置顶' : '置顶' }}
          </div>
        </div>
        <!-- 聊天内容 -->
        <div
          class="chat-item-inner"
          :class="{ swiped: swipedId === char.id }"
          @click="goToChat(char)"
          @touchstart="onTouchStart(char.id, $event)"
          @touchmove="onTouchMove($event)"
          @touchend="onTouchEnd($event)"
          @touchcancel="onTouchEnd($event)"
        >
          <div class="chat-avatar">
            <img :src="char.avatar || `https://picsum.photos/seed/${char.id}/100/100`" class="avatar" />
            <span v-if="aiChatData[char.id]?.unread > 0" class="unread-badge">
              {{ aiChatData[char.id].unread > 99 ? '99+' : aiChatData[char.id].unread }}
            </span>
          </div>
          <div class="chat-info">
            <div class="chat-top">
              <span class="chat-name">{{ char.name }}</span>
              <span class="chat-time">{{ char.updatedAt ? formatTime(char.updatedAt) : '' }}</span>
            </div>
            <div class="chat-bottom">
              <span class="chat-preview">{{ aiChatData[char.id]?.lastMsg || '暂无消息' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 群聊列表 -->
      <div v-if="groups.length > 0" class="group-section">
        <div
          v-for="group in groups"
          :key="group.id"
          class="chat-item group-item"
          @click="goToGroupChat(group)"
        >
          <div class="chat-item-inner">
            <div class="chat-avatar group-avatar">
              <!-- 如果群聊有自定义头像，显示自定义头像；否则显示成员头像组合 -->
              <template v-if="group.avatar">
                <img :src="group.avatar" class="custom-group-avatar" />
              </template>
              <template v-else>
                <div class="avatar-stack-box" :class="{ 'triangle-layout': getGroupAvatars(group).length === 3 }">
                  <img v-for="(member, idx) in getGroupAvatars(group)" :key="idx" :src="member" class="stack-avatar-box" />
                </div>
              </template>
            </div>
            <div class="chat-info">
              <div class="chat-top">
                <span class="chat-name">{{ group.name }}</span>
                <span class="chat-time">{{ formatTime(group.createdAt) }}</span>
              </div>
              <div class="chat-bottom">
                <span class="chat-preview">{{ getGroupMemberNames(group) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="aiCharactersStore.characters.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-text">还没有 AI 角色</div>
        <div class="empty-hint">去通讯录「我的 AI 角色」创建</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAiCharactersStore } from '@/stores/aiCharacters'
import { useChatsStore } from '@/stores/chats'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const aiCharactersStore = useAiCharactersStore()
const chatsStore = useChatsStore()
const userStore = useUserStore()

const swipedId = ref(null)
const swiping = ref(false)
let swipeStartX = 0
let swipeStartY = 0
let swipingCharId = null

// 群聊列表
const groups = ref([])

// 每次返回 ChatsView 时，从 localStorage 重新读取 AI 聊天数据
const aiChatData = ref({})

// 跟踪每个角色的最新消息时间戳，remount 时比对是否有新消息
const _lastMsgTime = {}
// 跟踪已通知过的消息 ID，避免重复通知
const _notifiedIds = new Set()

const _loadAiChatData = () => {
  const map = {}
  for (const char of aiCharactersStore.characters) {
    // 用户消息保存的key
    const userKey = `ai-chat-user-ai-${char.id}`
    // AI消息保存的key
    const aiKey = `ai-chat-ai-ai-${char.id}`
    try {
      // 读取用户消息
      const userRaw = localStorage.getItem(userKey)
      const userMsgs = userRaw ? (JSON.parse(userRaw) || []) : []
      
      // 读取AI消息
      const aiRaw = localStorage.getItem(aiKey)
      const aiMsgs = aiRaw ? (JSON.parse(aiRaw) || []) : []
      
      // 合并所有消息
      const allMsgs = [...userMsgs, ...aiMsgs]
      // 按时间排序
      allMsgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      
      // 统计未读消息（仅AI消息）
      const unread = aiMsgs.filter(m => m.type === 'other' && !m.isRead).length
      
      // 获取最后一条消息
      const last = allMsgs[allMsgs.length - 1]
      let lastMsg = ''
      if (last) {
        if (last.image && last.image !== '__image__') lastMsg = '[图片]'
        else if (last.image === '__image__') lastMsg = '[图片]'
        else lastMsg = last.content ? last.content.slice(0, 30) : ''
        // 如果是用户发送的消息，添加前缀
        if (last.type === 'self') {
          lastMsg = `你：${lastMsg}`
        }
      }
      map[char.id] = { unread, lastMsg }
      _lastMsgTime[char.id] = last?.createdAt || 0
    } catch {
      map[char.id] = { unread: 0, lastMsg: '' }
    }
  }
  aiChatData.value = map
}

const _loadGroups = () => {
  const groupList = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('group-')) {
      try {
        const raw = localStorage.getItem(key)
        const group = JSON.parse(raw)
        if (group && group.type === 'group') {
          groupList.push(group)
        }
      } catch {}
    }
  }
  groups.value = groupList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

onMounted(() => {
  _loadAiChatData()
  _loadGroups()
  // 延迟 500ms 再加载一次，确保退出聊天时 markAIRead 完成后再读
  setTimeout(() => {
    _loadAiChatData()
    _loadGroups()
  }, 500)
})

// poll 检测到新消息并更新 chatsListRefresh 时，通知 ChatsView 重新检查
watch(() => chatsStore.chatsListRefresh, () => {
  _loadAiChatData()
  _loadGroups()
})

// 每秒检查一次 localStorage 是否有新消息（兜底机制）
let _pollInterval = null
// 记录每个聊天的消息数量
const _lastMsgCount = {}

onMounted(() => {
  _pollInterval = setInterval(() => {
    let needRefresh = false
    for (const char of aiCharactersStore.characters) {
      const key = `ai-chat-ai-ai-${char.id}`
      try {
        const raw = localStorage.getItem(key)
        const msgs = raw ? (JSON.parse(raw) || []) : []
        const last = msgs[msgs.length - 1]
        const latestTime = last?.createdAt || 0
        const msgCount = msgs.length
        
        // 检查时间戳或消息数量变化
        if (latestTime > (_lastMsgTime[char.id] || 0) || msgCount !== (_lastMsgCount[char.id] || 0)) {
          _lastMsgCount[char.id] = msgCount
          
          // 新消息到达，发通知（未读数 > 0 才通知）
          if (userStore.user.aiNotify && last?.type === 'other' && !_notifiedIds.has(last.id)) {
            _notifiedIds.add(last.id)
            if (document.hidden) {
              if (Notification.permission === 'granted') {
                new Notification(char.name, { body: last.content?.slice(0, 50) || '', icon: '/favicon.ico' })
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(perm => {
                  if (perm === 'granted') {
                    new Notification(char.name, { body: last.content?.slice(0, 50) || '', icon: '/favicon.ico' })
                  }
                })
              }
            }
          }
          needRefresh = true
        }
      } catch {}
    }
    if (needRefresh) {
      _loadAiChatData()
    }
  }, 1000)
})
onUnmounted(() => {
  if (_pollInterval) clearInterval(_pollInterval)
})

const sortedCharacters = computed(() => {
  return [...aiCharactersStore.characters].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (b.updatedAt || 0) - (a.updatedAt || 0)
  })
})

const goToChat = (char) => {
  if (swiping.value) return
  if (swipedId.value) {
    swipedId.value = null
    return
  }
  router.push(`/chat/ai-${char.id}`)
}

const goToGroupChat = (group) => {
  router.push(`/chat/group-${group.id}`)
}

const getGroupAvatars = (group) => {
  const avatars = []
  // 添加用户自己的头像作为第一个
  avatars.push('https://picsum.photos/seed/user/100/100')
  if (group.members && group.members.length > 0) {
    // 显示所有成员头像，不限制数量
    for (const memberId of group.members) {
      const char = aiCharactersStore.characters.find(c => c.id === memberId)
      if (char) {
        avatars.push(char.avatar || `https://picsum.photos/seed/${memberId}/100/100`)
      }
    }
  }
  return avatars
}

const getGroupMemberCount = (group) => {
  // 返回群聊总人数（包含用户自己）
  const memberCount = group.members && group.members.length ? group.members.length : 0
  return memberCount + 1 // +1 是用户自己
}

const getGroupMemberNames = (group) => {
  if (!group.members || group.members.length === 0) return ''
  const names = group.members.slice(0, 3).map(id => {
    const char = aiCharactersStore.characters.find(c => c.id === id)
    return char?.name || '未知'
  })
  const remaining = group.members.length - 3
  return names.join('、') + (remaining > 0 ? ` 等${remaining + names.length}人` : '')
}

const onTouchStart = (charId, e) => {
  swipeStartX = e.touches[0].clientX
  swipeStartY = e.touches[0].clientY
  swipingCharId = charId
  swiping.value = false
}

const onTouchMove = (e) => {
  const dx = swipeStartX - e.touches[0].clientX
  const dy = Math.abs(e.touches[0].clientY - swipeStartY)
  if (dx > 10 && dy < 30) swiping.value = true
  if (dx > 60) swiping.value = false
}

const onTouchEnd = (e) => {
  if (!e || !e.changedTouches || !e.changedTouches[0]) return
  const diff = swipeStartX - e.changedTouches[0].clientX
  if (diff > 60 && swipingCharId) {
    swipedId.value = swipingCharId
  } else if (diff <= 60) {
    swipedId.value = null
  }
  swipingCharId = null
  setTimeout(() => { swiping.value = false }, 50)
}

const handlePin = (char) => {
  aiCharactersStore.togglePin(char.id)
  swipedId.value = null
}

const formatTime = (ts) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.page-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-white);
  min-height: 0;
}

.group-section {
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  margin-top: 8px;
}

.group-avatar {
  margin-right: 12px;
  width: 44px;
  height: 44px;
  border-radius: 4px;
  background-color: #f0f0f0;
  border: 1px solid var(--border-color);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.avatar-stack-box {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1px;
}

.stack-avatar-box {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 三角分布布局 - 只有3个头像时使用 */
.avatar-stack-box.triangle-layout {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.avatar-stack-box.triangle-layout .stack-avatar-box:nth-child(3) {
  grid-column: 1 / -1;
  grid-row: 2;
}

.stack-avatar {
  width: calc(50% - 1px);
  height: calc(50% - 1px);
  border-radius: 2px;
  object-fit: cover;
  border: none;
}

.chat-item {
  position: relative;
  overflow: hidden;
}

.chat-item.pinned {
  background-color: #F5F5F5;
}

.chat-item + .chat-item .chat-item-inner {
  border-top: 1px solid var(--border-color);
}

.chat-item-inner {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-white);
  transition: transform 0.2s ease;
  position: relative;
  z-index: 1;
}

.chat-item.pinned .chat-item-inner {
  background-color: #F5F5F5;
}

.chat-item-inner.swiped {
  transform: translateX(-80px);
}

.chat-item-inner:active {
  background-color: var(--bg-hover);
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding-right: 16px;
  z-index: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.swipe-actions.visible {
  opacity: 1;
  pointer-events: auto;
}

.swipe-btn {
  padding: 8px 14px;
  color: white;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  white-space: nowrap;
}

.pin-btn {
  background: var(--wechat-green);
}

.chat-avatar {
  position: relative;
  flex-shrink: 0;
  margin-right: 16px;
}

.chat-avatar img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
}

.unread-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 22px;
  height: 22px;
  background-color: #F56C6C;
  border-radius: 11px;
  border: 2px solid var(--bg-white);
  box-sizing: border-box;
  color: white;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  white-space: nowrap;
}

.chat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-name {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  font-weight: 600;
}

.chat-time {
  font-size: var(--font-size-sm);
  color: var(--text-time);
  flex-shrink: 0;
  margin-left: 12px;
}

.chat-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-preview {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
