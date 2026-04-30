<template>
  <div class="app-container">
    <router-view :key="route.fullPath" />
    <TabBar v-if="!route.path.startsWith('/chat/')" />
    <!-- AI 消息通知弹窗 -->
    <transition name="notify-pop">
      <div v-if="showNotify" class="notify-popup" @click="onNotifyClick">
        <div class="notify-content">
          <div class="notify-name">{{ currentNotify.name }}</div>
          <div class="notify-msg">{{ currentNotify.content }}</div>
        </div>
      </div>
    </transition>
    <!-- 朋友圈评论/删除栏（fixed 在 App 层，避免 flex 干扰） -->
    <div v-if="momentsStore.overlay.show" class="moments-overlay" @click="momentsStore.closeOverlay()">
      <div class="moments-bar" @click.stop>
        <template v-if="momentsStore.overlay.type === 'comment'">
          <input
            ref="commentInputRef"
            v-model="momentsStore.overlay.text"
            class="moments-input"
            :placeholder="`评论 ${momentsStore.overlay.targetName}...`"
            @keyup.enter="momentsStore.submitOverlayComment()"
          />
          <button class="moments-send" @click="momentsStore.submitOverlayComment()">发送</button>
        </template>
        <template v-else>
          <span class="moments-tip">确定删除？</span>
          <button class="moments-send" @click="momentsStore.confirmOverlayDelete()">删除</button>
          <button class="moments-cancel" @click="momentsStore.closeOverlay()">取消</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import { useMomentsStore } from '@/stores/moments'
import { useUserStore } from '@/stores/user'
import { useAiCharactersStore } from '@/stores/aiCharacters'
import { sendProactiveMsg } from '@/services/chatQueue'

const route = useRoute()
const router = useRouter()
const momentsStore = useMomentsStore()
const userStore = useUserStore()
const aiCharactersStore = useAiCharactersStore()
const commentInputRef = ref(null)

// AI 消息通知弹窗
const showNotify = ref(false)
const currentNotify = ref({ name: '', content: '', charId: '' })
let _notifyTimeout = null

const _showNotifyPopup = (name, content, charId) => {
  currentNotify.value = { name, content, charId }
  showNotify.value = true
  if (_notifyTimeout) clearTimeout(_notifyTimeout)
  _notifyTimeout = setTimeout(() => {
    showNotify.value = false
  }, 4000)
}

const onNotifyClick = () => {
  if (_notifyTimeout) clearTimeout(_notifyTimeout)
  showNotify.value = false
  if (currentNotify.value.charId) {
    // 使用Vue Router跳转
    router.push(`/chat/ai-${currentNotify.value.charId}`).catch(err => {
      // 如果router跳转失败，使用window.location方式
      window.location.href = `/chat/ai-${currentNotify.value.charId}`
    })
  }
}

watch(() => userStore.user.darkMode, (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}, { immediate: true })

// 跟踪已通知过的 AI 消息 ID（App 级，避免重复通知）
const _notifiedIds = new Set()

// 全局 AI 消息通知：每 2 秒轮询 localStorage，永远在线
let _notifyInterval = null
let _lastKnownAIKeys = {}

// 主动发消息调度
const _PROACTIVE_KEY = 'proactive-last-time'
const _CYCLE_KEY = 'proactive-cycle-time'
let _proactiveInterval = null

const _stopProactiveLoop = () => {
  if (_proactiveInterval) {
    clearInterval(_proactiveInterval)
    _proactiveInterval = null
  }
}

const _checkProactive = () => {
  const hasActiveChar = aiCharactersStore.characters.some(c => c.autoProactiveMsg)
  if (!hasActiveChar) {
    _stopProactiveLoop()
    return
  }

  const cycleTime = parseInt(localStorage.getItem(_CYCLE_KEY) || '0', 10)
  if (Date.now() - cycleTime < 5000) return
  const hour = new Date().getHours()
  const candidates = aiCharactersStore.characters.filter(char => {
    if (!char.autoProactiveMsg) return false
    if (char.quietHoursEnabled) {
      const start = char.quietHoursStart ?? 0
      const end = char.quietHoursEnd ?? 8
      let inQuiet = false
      if (start < end) {
        inQuiet = hour >= start && hour < end
      } else {
        inQuiet = hour >= start || hour < end
      }
      if (inQuiet) return false
    }
    const interval = (char.autoMsgInterval ?? 1) * 60 * 60 * 1000
    const lastKey = `${_PROACTIVE_KEY}-${char.id}`
    const last = parseInt(localStorage.getItem(lastKey) || '0', 10)
    return Date.now() - last >= interval
  })
  if (candidates.length === 0) return
  const char = candidates[Math.floor(Math.random() * candidates.length)]
  const lastKey = `${_PROACTIVE_KEY}-${char.id}`
  localStorage.setItem(lastKey, String(Date.now()))
  localStorage.setItem(_CYCLE_KEY, String(Date.now()))
  sendProactiveMsg(char)
}

const _startProactiveLoop = () => {
  // 防止重复启动 interval
  if (_proactiveInterval) return
  // 启动时检查：如果 cycle 是最近 5 秒内设置的（HMR/页面刷新），清掉它
  const cycleTime = parseInt(localStorage.getItem(_CYCLE_KEY) || '0', 10)
  if (Date.now() - cycleTime < 60000) {
    localStorage.removeItem(_CYCLE_KEY)
  }
  _proactiveInterval = setInterval(_checkProactive, 5000)
}

// 路由变化时自动暂停/恢复主动消息（进入聊天详情时暂停）
let _pausedByRoute = false
watch(() => route.path, (path) => {
  if (path.startsWith('/chat/')) {
    if (_proactiveInterval) {
      clearInterval(_proactiveInterval)
      _proactiveInterval = null
      _pausedByRoute = true
    }
  } else if (_pausedByRoute) {
    _pausedByRoute = false
    _startProactiveLoop()
  }
})

const _notify = (title, body) => {
  // 检查是否是HTTP协议（非HTTPS）
  if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
    // HTTP协议下浏览器通知可能受限
    console.log('HTTP协议下通知功能可能受限，请使用HTTPS')
    return
  }
  
  if (Notification.permission === 'granted') {
    new Notification(title, { body: body?.slice(0, 50) || '' })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification(title, { body: body?.slice(0, 50) || '' })
      }
    })
  }
}

const _startNotifyLoop = () => {
  // 初始化：扫描所有 ai-chat-ai- 开头的 key
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('ai-chat-ai-')) {
      try {
        const msgs = JSON.parse(localStorage.getItem(key) || '[]')
        const last = msgs[msgs.length - 1]
        if (last) _lastKnownAIKeys[key] = last.id
      } catch {}
    }
  }

  _notifyInterval = setInterval(() => {
    // 通知功能未开启，不检查
    if (!userStore.user.aiNotify) return

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      // 支持单角色聊天和群聊消息
      if (!key?.startsWith('ai-chat-') && !key?.startsWith('group-chat-')) continue

      try {
        const msgs = JSON.parse(localStorage.getItem(key) || '[]')
        const last = msgs[msgs.length - 1]
        if (!last) continue
        // 检查是否是其他角色发送的消息（排除用户自己发送的）
        if (last.type !== 'other' && last.role !== 'assistant') continue
        if (_notifiedIds.has(last.id)) continue
        if (_lastKnownAIKeys[key] === last.id) continue

        // 新消息到达
        _notifiedIds.add(last.id)
        _lastKnownAIKeys[key] = last.id
        
        // 获取发送者名称
        let title = ''
        let charId = ''
        
        // 单角色聊天，从key中提取角色ID
        if (key.startsWith('ai-chat-') && !key.startsWith('group-chat-')) {
          // 从 key 中提取角色 ID，支持多种格式：
          // ai-chat-ai-ai-123 或 ai-chat-ai-123 或 ai-chat-user-ai-123
          const parts = key.split('-')
          // 从后往前找角色ID（支持数字和字符串格式）
          for (let i = parts.length - 1; i >= 0; i--) {
            // 角色ID可能是数字或字符串（如mojxz23ijo4gtp7o1z）
            // 排除 'ai', 'chat', 'user' 这些关键字
            if (parts[i] && !['ai', 'chat', 'user'].includes(parts[i])) {
              charId = parts[i]
              break
            }
          }
          
          // 即使找不到角色名称，也要保留 charId 用于跳转
          if (charId) {
            const char = aiCharactersStore.characters.find(c => String(c.id) === charId)
            if (char) {
              title = char.name
            }
          }
        }
        
        // 如果还是没找到名称且有charId，尝试用charId查找
        if (!title && charId) {
          const char = aiCharactersStore.characters.find(c => String(c.id) === charId)
          if (char) {
            title = char.name
          }
        }
        
        // 如果还是没找到名称，尝试从消息中获取
        if (!title && last.roleName) {
          title = last.roleName
        }
        
        // 群聊消息
        if (!title && key.startsWith('group-chat-')) {
          title = '群聊新消息'
        }
        
        // 最后的兜底
        if (!title) {
          title = '新消息'
        }
        
        // 浏览器通知（受用户设置控制，给手机发通知）
        if (document.hidden && userStore.user.aiNotify) {
          _notify(title, last.content)
        }
        
        // 界面内弹窗通知（用户不在聊天详情界面时显示，不受设置控制）
        if (!route.path.startsWith('/chat/') && last.content) {
          const content = last.image ? '[图片]' : (last.content || '')
          // 标题显示角色名称，内容显示消息内容
          _showNotifyPopup(title, content, charId)
        }
      } catch {}
    }
  }, 2000)
}

// Base64 URL 转 Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
};

// 注册 Service Worker 和推送订阅
const _registerPush = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker 注册成功');
      
      // 请求通知权限
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // 获取或创建推送订阅
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BNc4aF2w5qH9B6e8rT2yU7iO0pI3kL1mN9bM7vC2xZ8cV1bN5mK8jH7gF6dS4aD3sQ2wE1rT0yU9iO8pI7uY6tR5eW4qA3sD2fG1hJ6kL9zX8cV7bN4mK1jH0gF3dS6aD5fG8hJ9kL2xZ7cV4bN1mK3jH6gF2dS5aD8fG9hJ2kL5xZ8cV7bN4mK1jH3gF6dS2aD5fG8hJ'
          )
        });
        
        // 发送订阅到后端保存
        await fetch('https://wchat-backend-production.up.railway.app/api/user/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        });
        console.log('✅ 推送订阅已保存');
      }
    } catch (error) {
      console.error('❌ Service Worker 注册失败:', error);
    }
  }
};

onMounted(() => {
  _startNotifyLoop()
  _startProactiveLoop()
  momentsStore.startAIMomentsScheduler()
  if (userStore.user.aiNotify && Notification.permission === 'default') {
    Notification.requestPermission()
  }
  _registerPush()
})
onUnmounted(() => {
  if (_notifyInterval) clearInterval(_notifyInterval)
  if (_proactiveInterval) clearInterval(_proactiveInterval)
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.moments-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 49;
}

.moments-bar {
  position: fixed;
  bottom: var(--tab-height);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-white);
  border-top: 1px solid var(--border-color);
}

.moments-input {
  flex: 1;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0 10px;
  font-size: var(--font-size-md);
  font-family: inherit;
  outline: none;
  background: var(--bg-white);
}

.moments-input:focus {
  border-color: var(--wechat-green);
}

.moments-send {
  padding: 6px 14px;
  background: var(--wechat-green);
  color: white;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.moments-tip {
  flex: 1;
  font-size: var(--font-size-md);
  color: var(--text-primary);
}

.moments-cancel {
  padding: 6px 14px;
  background: var(--bg-gray);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: var(--font-size-sm);
  border: none;
  cursor: pointer;
  font-family: inherit;
}

/* AI 消息通知弹窗 */
.notify-popup {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 90%;
  cursor: pointer;
}

.notify-content {
  min-width: 0;
}

.notify-name {
  color: white;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.notify-msg {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 弹窗动画 */
.notify-pop-enter-active {
  animation: notify-slide-in 0.3s ease-out;
}

.notify-pop-leave-active {
  animation: notify-slide-out 0.3s ease-in;
}

@keyframes notify-slide-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes notify-slide-out {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}
</style>
