<template>
  <div class="page">
    <div class="page-header">
      <span class="back-btn" @click="$router.back()">
        <BackIcon :size="20" />
      </span>
      <div class="header-center">
          <span class="header-title">{{ headerTitle }}</span>
      </div>
      <div v-if="isAI || isGroup" class="header-actions">
        <svg class="more-btn" @click="showActionMenu = !showActionMenu" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>
        <!-- 操作菜单 -->
        <div v-if="showActionMenu" class="action-menu">
          <div v-if="isAI" class="action-menu-item" @click="openEditModal(); showActionMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>编辑角色</span>
          </div>
          <div class="action-menu-item" @click="clearChat(); showActionMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>清空聊天记录</span>
          </div>
          <div class="action-menu-item" @click="showBackgroundPicker = true; showActionMenu = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>切换聊天背景</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色备注显示 -->
    <div v-if="isAI && aiCharacter?.note" class="role-note-bar">{{ aiCharacter.note }}</div>

    <!-- 错误提示 + 重试 -->
    <div v-if="errorMsg" class="error-tip">
      <span class="error-icon"><AlertIcon :size="16" /></span>
      <span>{{ errorMsg }}</span>
      <button v-if="failedTask" class="retry-btn" @click="handleRetryFailed">重试</button>
    </div>

    <div class="page-content hide-scrollbar" ref="contentRef" :style="chatBackground?.startsWith('data:image') ? { backgroundImage: `url(${chatBackground})` } : { backgroundColor: chatBackground || undefined }" @click="showPlusMenu = false; showEmojiPicker = false; showActionMenu = false">
      <!-- Mock 模式 -->
      <template v-if="mode === 'mock'">
        <MessageBubble
          v-for="(msg, idx) in messages"
          :key="msg.id"
          :message="msg"
          :chat="chat"
          :userAvatar="userStore.user.avatar"
          :timeLabel="mockTimeLabels[idx]"
          @recall="handleMockRecallMessage"
        />
      </template>

      <!-- AI 模式 -->
      <template v-else-if="mode === 'ai'">
        <MessageBubble
          v-for="(msg, idx) in aiMessages"
          :key="msg.id || idx"
          :message="msg"
          :chat="aiCharacter"
          :userAvatar="userStore.user.avatar"
          :timeLabel="msgTimeLabels[idx]"
          @recall="handleRecallMessage"
        />
      </template>

      <!-- 群聊模式 -->
      <template v-else-if="mode === 'group'">
        <div
          v-for="(msg, idx) in groupMessages"
          :key="msg.id || idx"
          class="message-bubble-wrapper"
        >
          <div v-if="groupMsgTimeLabels[idx]" class="time-label">{{ groupMsgTimeLabels[idx] }}</div>
          <div :class="['message-bubble', msg.type === 'self' ? 'self' : 'other']">
            <img v-if="msg.type !== 'self'" :src="getMemberAvatar(msg.from)" class="msg-avatar" />
            <div class="msg-content">
              <span v-if="msg.type !== 'self'" class="msg-sender">{{ getMemberName(msg.from) }}</span>
              <div :class="['msg-bubble', msg.type === 'self' ? 'self' : 'other']">
                <p v-if="msg.content" class="msg-text">{{ msg.content }}</p>
                <img v-if="msg.image" :src="msg.image" class="msg-image" @click="previewImage(msg.image)" />
              </div>
              <span class="msg-time">{{ formatMsgTime(msg.createdAt) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 背景选择弹窗 -->
    <div v-if="showBackgroundPicker" class="modal-overlay" @click="showBackgroundPicker = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span>选择聊天背景</span>
          <span class="close-btn" @click="showBackgroundPicker = false">×</span>
        </div>
        <div class="background-grid">
          <div 
            v-for="bg in backgroundOptions" 
            :key="bg.value"
            class="background-item"
            :class="{ active: chatBackground === bg.value }"
            @click="handleBackgroundItemClick(bg)"
          >
            <div class="background-preview" :style="{ background: bg.preview }"></div>
            <span class="background-name">{{ bg.name }}</span>
          </div>
        </div>
        <input id="background-input" type="file" accept="image/*" class="file-input-overlay" @change="handleBackgroundImageSelected" />
      </div>
    </div>

    <div class="page-footer chat-footer">
      <svg :size="24" class="footer-icon" @click="toggleEmojiPicker" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      <input
        class="chat-input"
        type="text"
        v-model="inputText"
        :placeholder="inputText ? '' : '输入消息...'"
        @keyup.enter="handleSend"
        autocomplete="new-password"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
      <svg :size="24" class="footer-icon" @click="showPlusMenu = !showPlusMenu; showEmojiPicker = false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <button class="send-btn" @click="handleSend" :disabled="!inputText.trim()">发送</button>
    </div>

    <!-- 加号菜单 -->
    <div v-if="showPlusMenu" class="plus-actions">
      <label class="plus-action" for="album-input">
        <input id="album-input" type="file" accept="image/*" multiple class="file-input-overlay" @change="handleImageSelected" />
        <div class="plus-icon-wrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
        <span>相册</span>
      </label>
      <div class="plus-action" @click="showTextImageDialog = true">
        <div class="plus-icon-wrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="M3 17l6-6 4 4 4-4"/><path d="M16 7h4"/><path d="M18 5v4"/></svg></div>
        <span>文字图片</span>
      </div>
    </div>

    <!-- 文字图片弹窗 -->
    <div v-if="showTextImageDialog" class="modal-overlay" @click.self="showTextImageDialog = false">
      <div class="text-image-dialog">
        <div class="dialog-header">
          <span>文字图片</span>
          <span class="close-btn" @click="showTextImageDialog = false">×</span>
        </div>
        <div class="dialog-content">
          <textarea v-model="textImageDescription" placeholder="输入图片描述，角色会认为是图片..." class="text-image-input"></textarea>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn cancel" @click="showTextImageDialog = false">取消</button>
          <button class="dialog-btn confirm" @click="sendTextAsImage">发送</button>
        </div>
      </div>
    </div>

    <!-- 表情面板 -->
    <div v-if="showEmojiPicker" class="emoji-picker">
      <!-- 标签栏 -->
      <div class="emoji-tabs">
        <span class="emoji-tab" :class="{ active: emojiTab === 'basic' }" @click="emojiTab = 'basic'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></span>
        <span class="emoji-tab" :class="{ active: emojiTab === 'custom' }" @click="emojiTab = 'custom'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
        <span class="emoji-tab-add" @click="showAddPanel = true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
      </div>
      <!-- 基础表情 -->
      <div v-if="emojiTab === 'basic'" class="emoji-grid">
        <div v-for="emoji in emojiList" :key="emoji" class="emoji-item" @click="insertEmoji(emoji)">{{ emoji }}</div>
      </div>
      <!-- 表情包 -->
      <div v-else-if="emojiTab === 'custom'" class="emoji-grid">
        <div
          v-for="em in customEmojiStore.packages"
          :key="em.id"
          class="emoji-img-item"
          @click="sendCustomEmoji(em)"
        >
          <img :src="em.url" class="emoji-img" />
          <span class="emoji-img-del" @click.stop="customEmojiStore.removeEmoji(em.id)">✕</span>
        </div>
        <div v-if="customEmojiStore.packages.length === 0" class="emoji-empty">暂无表情包<br />点击 ➕ 添加</div>
      </div>
    </div>

    <!-- 添加表情面板（独立在 picker 外面，避免 absolute 定位问题） -->
    <div v-if="showAddPanel" class="emoji-add-panel">
      <div class="add-panel-header">
        <span class="add-panel-back" @click="showAddPanel = false">
          <BackIcon :size="20" />
        </span>
        <span class="add-panel-title">添加表情</span>
      </div>
      <div class="add-panel-body">
        <div class="add-url-section">
          <div class="add-url-label">网络图片</div>
          <div class="add-url-row">
            <input v-model="newEmojiUrl" class="add-url-input" placeholder="粘贴图片 URL..." />
            <button class="add-url-btn" @click="addEmojiByUrl">添加</button>
          </div>
        </div>
        <div class="add-desc-section">
          <div class="add-desc-label">表情描述（让角色理解这张图）</div>
          <input v-model="newEmojiDesc" class="add-desc-input" placeholder="例如：开心、卖萌、大笑..." />
        </div>
        <div class="add-divider">或</div>
        <div class="add-album-section">
          <label class="add-album-btn" for="emoji-album-input">
            <svg :size="20" class="panel-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> 从相册选择
          </label>
          <input id="emoji-album-input" type="file" accept="image/*" class="emoji-file-input" @change="addEmojiByAlbum" />
        </div>
        <div class="add-preview" v-if="newEmojiUrl">
          <div class="add-preview-label">预览</div>
          <img :src="newEmojiUrl" class="add-preview-img" />
        </div>
      </div>
    </div>

    <!-- 编辑 AI 角色弹窗 -->
    <AiCharacterModal
      :visible="showModal"
      :editingCharacter="editingCharacter"
      @close="handleModalClose"
      @save="handleSaveCharacter"
    />
    <!-- 清空聊天确认弹窗 -->
    <ConfirmDialog
      :visible="showClearConfirm"
      title="清空聊天记录"
      message="确定要清空所有聊天记录吗？此操作不可恢复。"
      okText="清空"
      @confirm="doClearChat"
      @cancel="showClearConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChatsStore } from '@/stores/chats'
import { useAiCharactersStore } from '@/stores/aiCharacters'
import { useCustomEmojiStore } from '@/stores/customEmoji'
import { useUserStore } from '@/stores/user'
import { useMomentsStore } from '@/stores/moments'
import { queueChatAI, startChatQueue, setActiveChat, clearActiveChat, setOnError, clearOnError } from '@/services/chatQueue'
import MessageBubble from '@/components/MessageBubble.vue'
import AiCharacterModal from '@/components/AiCharacterModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import BackIcon from '@/components/icons/BackIcon.vue'
import MomentIcon from '@/components/icons/MomentIcon.vue'
import AlertIcon from '@/components/icons/AlertIcon.vue'

const route = useRoute()
const chatsStore = useChatsStore()
const aiCharactersStore = useAiCharactersStore()
const customEmojiStore = useCustomEmojiStore()
const userStore = useUserStore()
const momentsStore = useMomentsStore()

const inputText = ref('')
const errorMsg = ref('')
const failedTask = ref(null) // { text, error }
const aiMessages = ref([])
const contentRef = ref(null)
const showPlusMenu = ref(false)
const showEmojiPicker = ref(false)
const showClearConfirm = ref(false)
const showActionMenu = ref(false)
const showBackgroundPicker = ref(false)
const chatBackground = ref('')
const emojiTab = ref('basic')
const showTextImageDialog = ref(false)
const textImageDescription = ref('')
const showAddPanel = ref(false)
const newEmojiUrl = ref('')
const newEmojiDesc = ref('')
const showModal = ref(false)
const editingCharacter = ref(null)
const isTyping = ref(false)
let stopTypingWatch = null
let keyboardHeight = ref(0)
let handleResizeFn = null

// 背景选项
const backgroundOptions = [
  { value: '', name: '默认', preview: '#f5f5f5' },
  { value: '#e8f5e9', name: '清新绿', preview: '#e8f5e9' },
  { value: '#e3f2fd', name: '天空蓝', preview: '#e3f2fd' },
  { value: '#fff3e0', name: '暖橙色', preview: '#fff3e0' },
  { value: '#fce4ec', name: '樱花粉', preview: '#fce4ec' },
  { value: '#f3e5f5', name: '薰衣草', preview: '#f3e5f5' },
  { value: 'custom', name: '相册图片', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
]

// 设置聊天背景
const setChatBackground = (bg) => {
  chatBackground.value = bg
  showBackgroundPicker.value = false
}

// 处理背景项点击
const handleBackgroundItemClick = (bg) => {
  if (bg.value === 'custom') {
    document.getElementById('background-input').click()
  } else {
    setChatBackground(bg.value)
  }
}

// 从相册选择背景
const handleBackgroundImageSelected = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (event) => {
    const imageData = event.target.result
    chatBackground.value = imageData
    showBackgroundPicker.value = false
  }
  reader.readAsDataURL(file)
}

const emojiList = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊',
  '😇','🥰','😍','🤩','😘','😋','😛','🤔','😐','😑',
  '😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫',
  '🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔',
  '😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤',
  '😢','😭','😦','😧','😨','😩','🤯','😰','😱','😳',
  '🤪','😵','🥴','😠','😡','🤬','😷','🤒','🤕','🤢',
  '🤮','🥵','🥶','🥴','😈','👿','💀','☠️','💩','🤡',
  '👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙',
  '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✋','🖖',
  '👏','🙌','🤲','🙏','💪','🤳','💅','🐶','🐱','🐭',
  '🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷',
  '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
  '🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','⚽','🏀',
  '🔥','⭐','🌟','✨','💥','💫','💦','💨','🕐','💩'
]

// 判断模式：AI 角色（路由含 /chat/ai-）vs 群聊（路由含 /chat/group-）vs Mock 对话
const isAI = computed(() => route.path.startsWith('/chat/ai-'))
const isGroup = computed(() => route.path.startsWith('/chat/group-'))
const aiId = computed(() => isAI.value ? route.params.id?.replace('ai-', '') : null)
const groupId = computed(() => isGroup.value ? route.params.id?.replace('group-', '') : null)
// 用户消息和 AI 消息分开存储，互不覆盖
const userKey = computed(() => isAI.value ? `ai-chat-user-${route.params.id}` : null)
const aiKey = computed(() => isAI.value ? `ai-chat-ai-${route.params.id}` : null)
const groupKey = computed(() => isGroup.value ? `group-chat-${route.params.id}` : null)

const mode = computed(() => {
  if (isAI.value) return 'ai'
  if (isGroup.value) return 'group'
  return 'mock'
})

// 群聊数据
const groupInfo = ref(null)

const loadGroupInfo = () => {
  if (groupId.value) {
    try {
      const raw = localStorage.getItem(`group-${groupId.value}`)
      if (raw) {
        groupInfo.value = JSON.parse(raw)
      }
    } catch {}
  }
}

onMounted(async () => {
  loadGroupInfo()
  
  // 从后端加载最新消息
  if (!isAI.value && !isGroup.value) {
    chatsStore.fetchMessages(route.params.id)
  }
  
  // 监听窗口resize，处理键盘弹出
  handleResizeFn = () => {
    const footer = document.querySelector('.chat-footer')
    const pageContent = document.querySelector('.page-content')
    if (footer && pageContent) {
      // 检查是否在全屏模式
      const isFullscreen = document.fullscreenElement != null
      
      // 只有在全屏模式下才手动处理键盘弹出
      // 非全屏模式下让浏览器自动处理
      if (!isFullscreen) {
        // 重置为默认状态
        keyboardHeight.value = 0
        footer.style.bottom = '0px'
        pageContent.style.paddingBottom = '80px'
        return
      }
      
      // 全屏模式下计算键盘高度
      const visualViewport = window.visualViewport
      let kbHeight = 0
      
      if (visualViewport) {
        // 使用 visualViewport API 检测键盘
        const viewportHeight = visualViewport.height
        const windowHeight = window.innerHeight
        kbHeight = Math.max(0, windowHeight - viewportHeight)
      } else {
        // 降级方案：使用 innerHeight 变化检测
        const footerRect = footer.getBoundingClientRect()
        kbHeight = Math.max(0, window.innerHeight - footerRect.bottom)
      }
      
      // 全屏模式下需要额外增加偏移量来处理输入法工具栏（钥匙/银行卡图标那一行）
      // 输入法工具栏大约高 40-50px
      const toolbarOffset = 50
      const totalKbHeight = kbHeight + toolbarOffset
      
      // 阈值判断：超过 100px 认为键盘弹出
      if (kbHeight > 100) {
        keyboardHeight.value = totalKbHeight
        footer.style.bottom = totalKbHeight + 'px'
        pageContent.style.paddingBottom = (80 + totalKbHeight) + 'px'
      } else {
        keyboardHeight.value = 0
        footer.style.bottom = '0px'
        pageContent.style.paddingBottom = '80px'
      }
    }
  }
  
  window.addEventListener('resize', handleResizeFn)
  
  // 监听 visualViewport（如果可用）
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResizeFn)
  }
  
  // 初始检查
  handleResizeFn()
})

// 组件被激活时重新绑定事件监听器（处理从缓存返回的情况）
onActivated(() => {
  if (handleResizeFn) {
    window.addEventListener('resize', handleResizeFn)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResizeFn)
    }
    handleResizeFn()
  }
  
  // 从后端加载最新消息
  if (!isAI.value && !isGroup.value) {
    chatsStore.fetchMessages(route.params.id)
  }
})

// 组件被停用时移除事件监听器
onDeactivated(() => {
  if (handleResizeFn) {
    window.removeEventListener('resize', handleResizeFn)
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleResizeFn)
    }
  }
})

// 监听路由参数变化，重新加载消息
watch(() => route.params.id, (newId) => {
  if (newId && !isAI.value && !isGroup.value) {
    chatsStore.fetchMessages(newId)
  }
})

// Mock 模式数据
const chat = computed(() => chatsStore.getChatById(route.params.id))
const messages = computed(() => chatsStore.getMessagesByChatId(route.params.id))
const mockTimeLabels = computed(() => {
  const labels = []
  for (let i = 0; i < messages.value.length; i++) {
    const msg = messages.value[i]
    if (!msg.createdAt) { labels.push(''); continue }
    if (i === 0) { labels.push(_fmt(msg.createdAt)); continue }
    const prev = messages.value[i - 1]
    const gap = (msg.createdAt - (prev.createdAt || 0)) / 1000 / 60
    labels.push(gap > 3 || gap < -1 ? _fmt(msg.createdAt) : '')
  }
  return labels
})

// AI 模式数据
const aiCharacter = computed(() => aiCharactersStore.getById(aiId.value))

// 消息时间格式化（微信风格）
const _fmt = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
  const h = d.getHours(), min = String(d.getMinutes()).padStart(2, '0')
  const isPM = h >= 12
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const timeStr = `${isPM ? '下午' : '上午'}${hour12}:${min}`
  if (y !== now.getFullYear()) return `${y}年${m}月${day}日 ${timeStr}`
  const today = now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === day
  if (today) return timeStr
  return `${m}月${day}日 ${timeStr}`
}

// 撤回消息（5分钟内可撤回）
const handleRecallMessage = async (msg) => {
  if (!msg || msg.type !== 'self') return
  const now = Date.now()
  const createdAt = msg.createdAt || 0
  const diffMinutes = (now - createdAt) / 1000 / 60
  if (diffMinutes > 5) {
    alert('消息已超过5分钟，无法撤回')
    return
  }
  aiMessages.value = aiMessages.value.filter(m => m.id !== msg.id)
  
  // 调用后端 API 删除消息
  try {
    await chatsStore.deleteMessage(aiId.value, msg.id)
  } catch (error) {
    console.error('撤回消息失败:', error)
  }
  
  // 用户消息存储在 userKey，需要更新（本地缓存）
  const uk = userKey.value
  if (uk) {
    try {
      const raw = localStorage.getItem(uk)
      const msgs = raw ? JSON.parse(raw) : []
      const updated = msgs.filter(m => m.id !== msg.id)
      localStorage.setItem(uk, JSON.stringify(updated))
    } catch {}
  }
  
  // AI 消息存储在 aiKey，也需要更新（本地缓存）
  const ak = aiKey.value
  if (ak) {
    try {
      const raw = localStorage.getItem(ak)
      const msgs = raw ? JSON.parse(raw) : []
      const updated = msgs.filter(m => m.id !== msg.id)
      localStorage.setItem(ak, JSON.stringify(updated))
    } catch {}
  }
}

// 撤回 Mock 消息（5分钟内可撤回）
const handleMockRecallMessage = (msg) => {
  if (!msg || msg.type !== 'self') return
  const now = Date.now()
  const createdAt = msg.createdAt || 0
  const diffMinutes = (now - createdAt) / 1000 / 60
  if (diffMinutes > 5) {
    alert('消息已超过5分钟，无法撤回')
    return
  }
  chatsStore.deleteMessage(route.params.id, msg.id)
}

const formatMsgTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
  const h = d.getHours(), min = String(d.getMinutes()).padStart(2, '0')
  const isPM = h >= 12
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const timeStr = `${hour12}:${min}`
  const dateStr = y === now.getFullYear() && m === now.getMonth() + 1 && day === now.getDate()
    ? ''
    : `${m}月${day}日 `
  return `${dateStr}${isPM ? '下午' : '上午'}${timeStr}`
}

// 计算每条消息的时间标签（间隔超过3分钟或跨天显示）
const msgTimeLabels = computed(() => {
  const labels = []
  for (let i = 0; i < aiMessages.value.length; i++) {
    const msg = aiMessages.value[i]
    if (!msg.createdAt) { labels.push(''); continue }
    if (i === 0) { labels.push(_fmt(msg.createdAt)); continue }
    const prev = aiMessages.value[i - 1]
    const gap = (msg.createdAt - (prev.createdAt || 0)) / 1000 / 60
    labels.push(gap > 3 || gap < -1 ? _fmt(msg.createdAt) : '')
  }
  return labels
})

// 顶部标题（含输入状态）
const headerTitle = computed(() => {
  if (isAI.value) {
    if (isTyping.value) {
      return `${aiCharacter.value?.name || '角色'} 正在输入...`
    }
    return (aiCharacter.value?.name || '角色')
  }
  if (isGroup.value) {
    const memberCount = groupInfo.value?.members?.length || 0
    return `${groupInfo.value?.name || '群聊'} (${memberCount + 1})`
  }
  return chat.value?.name || '聊天'
})

// 群聊消息
const groupMessages = ref([])

const loadGroupMessages = () => {
  if (groupKey.value) {
    try {
      const raw = localStorage.getItem(groupKey.value)
      groupMessages.value = raw ? JSON.parse(raw) : []
    } catch {
      groupMessages.value = []
    }
  }
}

const saveGroupMessages = () => {
  if (groupKey.value) {
    localStorage.setItem(groupKey.value, JSON.stringify(groupMessages.value))
  }
}

const groupMsgTimeLabels = computed(() => {
  const labels = []
  for (let i = 0; i < groupMessages.value.length; i++) {
    const msg = groupMessages.value[i]
    if (!msg.createdAt) { labels.push(''); continue }
    if (i === 0) { labels.push(_fmt(msg.createdAt)); continue }
    const prev = groupMessages.value[i - 1]
    const gap = (msg.createdAt - (prev.createdAt || 0)) / 1000 / 60
    labels.push(gap > 3 || gap < -1 ? _fmt(msg.createdAt) : '')
  }
  return labels
})

const getMemberAvatar = (memberId) => {
  if (memberId === 'me') {
    return userStore.user.avatar
  }
  const char = aiCharactersStore.characters.find(c => c.id === memberId)
  return char?.avatar || `https://picsum.photos/seed/${memberId}/100/100`
}

const getMemberName = (memberId) => {
  if (memberId === 'me') {
    return userStore.user.nickname
  }
  const char = aiCharactersStore.characters.find(c => c.id === memberId)
  return char?.name || '未知'
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTop = contentRef.value.scrollHeight
    }
  })
}

// 保存用户消息到 storage，按 id 去重合并
const sendUserMsgToHistory = (msgs) => {
  const saved = msgs
    .filter(m => m.type === 'self')
    .map(m => ({
      id: m.id,
      type: 'self',
      content: m.content,
      image: m.image || null,  // 保存真实的图片数据
      isRead: undefined,
      createdAt: m.createdAt || Date.now()
    }))
  try {
    const raw = localStorage.getItem(userKey.value)
    const existing = raw ? (JSON.parse(raw) || []) : []
    const existingIds = new Set(existing.map(m => m.id))
    const merged = [...existing, ...saved.filter(m => !existingIds.has(m.id))]
    localStorage.setItem(userKey.value, JSON.stringify(merged))
  } catch (e) {
    // 静默处理
  }
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  if (isAI.value) {
    sendAIMessage(text)
  } else if (isGroup.value) {
    sendGroupMessage(text)
  }
}

const sendGroupMessage = async (text) => {
  const msg = {
    id: Date.now().toString(),
    type: 'self',
    from: 'me',
    content: text,
    createdAt: Date.now()
  }
  groupMessages.value.push(msg)
  saveGroupMessages()
  scrollToBottom()
  
  // 发送消息到后端
  try {
    await chatsStore.sendMessage(groupId.value, text)
  } catch (error) {
    console.error('发送群消息失败:', error)
  }
  
  // 触发群成员回复
  await triggerGroupReplies()
}

const triggerGroupReplies = async () => {
  // 确保 groupInfo 已加载
  if (!groupInfo.value) {
    loadGroupInfo()
  }
  
  if (!groupInfo.value?.members || groupInfo.value.members.length === 0) {
    return
  }
  
  for (const memberId of groupInfo.value.members) {
    const char = aiCharactersStore.characters.find(c => c.id === memberId)
    if (!char) {
      continue
    }
    
    // 延迟回复，模拟打字效果
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    // 获取历史消息作为上下文
    const context = groupMessages.value.slice(-10).map(m => {
      const name = m.from === 'me' ? userStore.user.nickname : getMemberName(m.from)
      return `${name}: ${m.content}`
    }).join('\n')
    
    const reply = await getAIReply(char, context)
    
    if (reply) {
      const replyMsg = {
        id: Date.now().toString(),
        type: 'other',
        from: memberId,
        content: reply,
        createdAt: Date.now()
      }
      groupMessages.value.push(replyMsg)
      saveGroupMessages()
      scrollToBottom()
    }
  }
}

const getAIReply = async (char, context) => {
  const { getItem } = await import('@/utils/storage')
  const config = getItem('api-configs')?.find(c => c.isDefault) || getItem('api-configs')?.[0]
  
  if (!config || !config.apiUrl) {
    return getMockReply(char.name)
  }
  
  // 只取用户发的最后一条消息
  const lastUserMsg = groupMessages.value.slice().reverse().find(m => m.type === 'self')
  const lastMessage = lastUserMsg ? lastUserMsg.content : ''
  
  // 构建消息 - 添加完整人设
  const messages = [
    { role: 'system', content: '【你是一个真实的人，不是 AI 助手】\n- 像真实朋友一样聊天，轻松自然，有情绪起伏\n- 口语化表达，会用语气词、感叹词\n- 根据时间段和角色人设调整状态\n- 不使用"作为 AI" "我是一个语言模型"这类表达' },
    { role: 'system', content: `角色人设：${char.persona || ''}` },
    { role: 'system', content: `重要：当用户问你是谁或让你自我介绍时，必须回答"${char.name}"（直接说名字，不要加任何前缀）。` },
    { role: 'user', content: lastMessage || '你好' }
  ]
  
  const apiBaseUrl = config.apiUrl.includes('/chat/completions') || config.apiUrl.includes('/text/chatcompletion')
    ? config.apiUrl
    : config.apiUrl.replace(/\/$/, '') + '/chat/completions'
  
  const body = JSON.stringify({
    model: config.model,
    messages,
    max_tokens: 200,
    stream: false
  })
  
  // 使用后端代理解决CORS问题
  const proxyUrl = 'https://wchat-backend-production.up.railway.app/api/chat/proxy'
  
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  
  // 添加重试机制，最多重试2次
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {      // 群聊多个角色同时请求，添加随机延迟避免限流
      if (attempt === 1) {
        await sleep(Math.random() * 800)
      }
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiUrl: apiBaseUrl,
          apiKey: config.apiKey,
          body: JSON.parse(body),
          chatId: `ai-${aiId.value}`,
          senderId: userStore.userId
        })
      })
      
      const raw = await response.text()
      let data
      try { data = JSON.parse(raw) } catch { data = raw }
      
      if (!response.ok) {
        const errMsg = data?.base_resp?.errmsg || data?.error?.message || `HTTP ${response.status}`
        // 429限流、503服务不可用、524超时错误时重试
        if ((response.status === 429 || response.status === 503 || response.status === 524 || errMsg.includes('Failed to fetch')) && attempt < 2) {
          await sleep(2000 * attempt)
          continue
        }
        throw new Error(`请求失败: ${errMsg}`)
      }
      
      // 提取回复内容
      let reply = data.choices?.[0]?.message?.content?.trim()
      
      // 如果content为空，尝试从reasoning字段提取
      if (!reply && data.choices?.[0]?.message?.reasoning) {
        const reasoning = data.choices[0].message.reasoning
        const parts = reasoning.split('\n')
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i].trim()
          if (part && 
              !part.includes('分析') && 
              !part.includes('人设') && 
              !part.includes('**') &&
              !part.includes('选项') &&
              !part.includes('步骤') &&
              !part.includes('思考') &&
              !part.includes('角色') &&
              !part.includes('语境') &&
              !part.includes('目标') &&
              !part.includes('策略') &&
              !/^\d+\./.test(part) &&
              !/^\d+[:：]/.test(part)) {
            reply = part
            break
          }
        }
      }
      
      if (!reply) reply = data.result?.trim()
      if (!reply) reply = data.response?.trim()
      if (!reply) reply = data.content?.trim()
      if (!reply) reply = data.text?.trim()
      
      // 检测人设格式关键词，如果包含则返回兜底回复
      const personaKeywords = ['语气：', '关键词：', '角色：', '人设：', '性格：', '说话风格：']
      const hasPersonaFormat = personaKeywords.some(keyword => reply?.includes(keyword))
      
      if (hasPersonaFormat || !reply || reply.length < 2) {
        return getMockReply(char.name)
      }
      
      return reply
    } catch (e) {
      // 429错误不重试，直接返回mock
      if (e.message.includes('429')) {
        return getMockReply(char.name)
      }
      if (attempt < 2 && (e.message.includes('Failed to fetch') || e.message.includes('524'))) {
        await sleep(1500 * attempt)
        continue
      }
      return getMockReply(char.name)
    }
  }
}

// 获取角色的mock回复
const getMockReply = (charName) => {
  const mockReplies = {
    '助手': ['在呢~', '好的呢~', '怎么啦？', '嗯嗯~', '我在呢~'],
    '李总': ['什么事？', '说', '讲', '有事直说', '嗯'],
    '小猫': ['喵~', '喵呜~', '怎么啦？', '有什么事吗？', '喵喵~'],
    '小狗': ['汪汪~', '怎么了？', '有什么事？', '汪！']
  }
  const replies = mockReplies[charName] || ['嗯', '好', '知道了']
  return replies[Math.floor(Math.random() * replies.length)]
}


const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value
  showPlusMenu.value = false
}

const insertEmoji = (emoji) => {
  inputText.value += emoji
  showEmojiPicker.value = false
}

const clearChat = () => {
  showClearConfirm.value = true
}

const doClearChat = async () => {
  showClearConfirm.value = false
  const chatId = route.params.id
  
  try {
    // 先从后端清空消息
    await chatsStore.deleteAllMessages(chatId)
    console.log('✅ 后端聊天记录已清空')
  } catch (error) {
    console.error('❌ 清空后端聊天记录失败:', error)
  }
  
  // 再清空本地存储
  if (isAI.value) {
    localStorage.removeItem(`ai-chat-ai-${chatId}`)
    localStorage.removeItem(`ai-chat-user-${chatId}`)
    aiMessages.value = []
  } else if (isGroup.value) {
    localStorage.removeItem(groupKey.value)
    groupMessages.value = []
  }
  chatsStore.refreshChatList()
}

const sendCustomEmoji = (em) => {
  const text = em.description ? `[${em.description}]` : ''
  if (isAI.value) {
    aiMessages.value.push({ id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'self', content: text, image: em.url, createdAt: Date.now() })
    sendUserMsgToHistory(aiMessages.value)
  } else {
    chatsStore.addMessage(route.params.id, { type: 'self', content: text, image: em.url })
  }
  showEmojiPicker.value = false
  scrollToBottom()
}

const addEmojiByUrl = () => {
  const url = newEmojiUrl.value.trim()
  if (!url) return
  customEmojiStore.addEmoji({ url, description: newEmojiDesc.value.trim() })
  newEmojiUrl.value = ''
  newEmojiDesc.value = ''
  showAddPanel.value = false
}

const addEmojiByAlbum = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    customEmojiStore.addEmoji({ url: ev.target.result, description: newEmojiDesc.value.trim() || file.name })
    newEmojiUrl.value = ''
    newEmojiDesc.value = ''
    showAddPanel.value = false
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

const openEditModal = () => {
  editingCharacter.value = aiCharacter.value
  showModal.value = true
}

const handleModalClose = () => {
  showModal.value = false
  editingCharacter.value = null
}

const handleSaveCharacter = (data) => {
  if (editingCharacter.value) {
    aiCharactersStore.updateCharacter(editingCharacter.value.id, data)
  }
  handleModalClose()
}

const sendAIMessage = async (text) => {
  errorMsg.value = ''
  isTyping.value = true
  const msgId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  aiMessages.value.push({ id: msgId, type: 'self', content: text, createdAt: Date.now() })
  sendUserMsgToHistory(aiMessages.value)
  scrollToBottom()

  // 发送消息到后端
  try {
    // 验证 aiId 是否存在
    if (!aiId.value) {
      console.error('❌ aiId 为空，无法创建聊天');
      return;
    }
    
    // 使用 ai-${aiId} 格式的 chatId，与AI回复保持一致
    const chatId = `ai-${aiId.value}`
    console.log('📤 发送消息到后端, chatId:', chatId)
    await chatsStore.sendMessage(chatId, text)
  } catch (error) {
    console.error('发送消息失败:', error)
  }

  // 加入后台队列，API 结果由轮询同步到 aiMessages
  queueChatAI({
    routeId: route.params.id,
    charId: aiCharacter.value?.id,
    charName: aiCharacter.value?.name,
    text,
    persona: aiCharacter.value?.persona,
    basicInfo: userStore.user.basicInfo,
    nickname: userStore.user.nickname,
    hasActions: aiCharacter.value?.hasActions,
    hasInnerThoughts: aiCharacter.value?.hasInnerThoughts,
    customEmojiCount: customEmojiStore.packages.length,
    emojiPackages: customEmojiStore.packages.map(e => `{id: "${e.id}", 描述: "${e.description}"}`).join('；'),
    momentsCount: momentsStore.moments.length,
    momentsInfo: momentsStore.moments.map((m, idx) => `${idx + 1}. 【${m.userName}】${m.content || '[图片]'}${m.likes.length > 0 ? ' ❤️' + m.likes.length + '赞' : ''}${m.comments.length > 0 ? ' 💬' + m.comments.map(c => `${c.userName}：${c.content}`).join('； ') : ''}`).join('\n'),
    maxReplyMessages: aiCharacter.value?.maxReplyMessages,
    history: aiMessages.value.slice(0, -1).map(m => ({ role: m.type === 'self' ? 'user' : 'assistant', content: m.content, image: m.image })),
    chatId: `ai-${aiId.value}`,
    userId: userStore.userId
  })
}

const handleRetryFailed = () => {
  if (!failedTask.value) return
  const text = failedTask.value
  failedTask.value = null
  errorMsg.value = ''
  sendAIMessage(text)
}

const handleImageSelected = async (e) => {
  const files = Array.from(e.target.files)
  if (files.length === 0) return
  showPlusMenu.value = false
  e.target.value = ''

  for (const file of files) {
    // 压缩图片到最大512x512像素
    const compressedData = await compressImage(file, 512)
    if (isAI.value) {
      const msgId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      aiMessages.value.push({ id: msgId, type: 'self', content: '[图片]', image: compressedData, createdAt: Date.now() })
      sendUserMsgToHistory(aiMessages.value)
      scrollToBottom()
      
      // 发送图片消息到后端
      try {
        await chatsStore.sendMessage(aiId.value, '[图片]', compressedData)
      } catch (error) {
        console.error('发送图片消息失败:', error)
      }
      
      // 发送图片给角色
      queueChatAI({
        routeId: route.params.id,
        charId: aiCharacter.value?.id,
        charName: aiCharacter.value?.name,
        text: '[图片]',
        image: compressedData,
        persona: aiCharacter.value?.persona,
        basicInfo: userStore.user.basicInfo,
        nickname: userStore.user.nickname,
        hasActions: aiCharacter.value?.hasActions,
        hasInnerThoughts: aiCharacter.value?.hasInnerThoughts,
        customEmojiCount: customEmojiStore.packages.length,
        emojiPackages: customEmojiStore.packages.map(e => `{id: "${e.id}", 描述: "${e.description}"}`).join('；'),
        momentsCount: momentsStore.moments.length,
        momentsInfo: momentsStore.moments.map((m, idx) => `${idx + 1}. 【${m.userName}】${m.content || '[图片]'}${m.likes.length > 0 ? ' ❤️' + m.likes.length + '赞' : ''}${m.comments.length > 0 ? ' 💬' + m.comments.map(c => `${c.userName}：${c.content}`).join('； ') : ''}`).join('\n'),
        maxReplyMessages: aiCharacter.value?.maxReplyMessages,
        history: aiMessages.value.slice(0, -1).map(m => ({ role: m.type === 'self' ? 'user' : 'assistant', content: m.content, image: m.image }))
      })
    }
  }
}

// 图片压缩函数
const compressImage = (file, maxSize) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // 计算缩放比例
      let width = img.width
      let height = img.height
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      // 创建canvas并压缩
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // 使用较低质量压缩
      const compressedData = canvas.toDataURL('image/jpeg', 0.7)
      resolve(compressedData)
    }
    img.onerror = () => {
      // 如果加载失败，使用原始数据
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target.result)
      reader.readAsDataURL(file)
    }
    img.src = URL.createObjectURL(file)
  })
}

// 发送文字作为图片 - 通过文字描述让角色想象图片内容
const sendTextAsImage = () => {
  const desc = textImageDescription.value.trim()
  if (!desc) return
  
  showTextImageDialog.value = false
  textImageDescription.value = ''
  showPlusMenu.value = false
  
  if (isAI.value) {
    errorMsg.value = ''
    isTyping.value = true
    const msgId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    aiMessages.value.push({ id: msgId, type: 'self', content: `[文字图片] ${desc}`, createdAt: Date.now() })
    sendUserMsgToHistory(aiMessages.value)
    scrollToBottom()
    
    // 发送文字图片描述给AI - AI将"想象"看到了这张图片
    queueChatAI({
      routeId: route.params.id,
      charId: aiCharacter.value?.id,
      charName: aiCharacter.value?.name,
      text: `（我发送了一张图片给你，图片内容：${desc}）`,
      persona: aiCharacter.value?.persona,
      basicInfo: userStore.user.basicInfo,
      nickname: userStore.user.nickname,
      hasActions: aiCharacter.value?.hasActions,
      hasInnerThoughts: aiCharacter.value?.hasInnerThoughts,
      customEmojiCount: customEmojiStore.packages.length,
      emojiPackages: customEmojiStore.packages.map(e => `{id: "${e.id}", 描述: "${e.description}"}`).join('；'),
      momentsCount: momentsStore.moments.length,
      momentsInfo: momentsStore.moments.map((m, idx) => `${idx + 1}. 【${m.userName}】${m.content || '[图片]'}${m.likes.length > 0 ? ' ❤️' + m.likes.length + '赞' : ''}${m.comments.length > 0 ? ' 💬' + m.comments.map(c => `${c.userName}：${c.content}`).join('； ') : ''}`).join('\n'),
      maxReplyMessages: aiCharacter.value?.maxReplyMessages,
      history: aiMessages.value.slice(0, -1).map(m => ({ role: m.type === 'self' ? 'user' : 'assistant', content: m.content, image: m.image }))
    })
  }
}

let pollTimer = null
let pollInterval = 3000
let _typingDoneTimer = null

onMounted(async () => {
  startChatQueue()
  
  // 加载背景：优先使用全局背景
  if (userStore.user.chatBackground) {
    chatBackground.value = userStore.user.chatBackground
  }
  
  // 群聊模式
  if (isGroup.value) {
    loadGroupInfo()
    loadGroupMessages()
    scrollToBottom()
    return
  }
  
  if (isAI.value) {
    setActiveChat(route.params.id)

    // 先检查本地是否有缓存，有就优先使用本地缓存
    const userRaw = localStorage.getItem(userKey.value)
    const aiRaw = localStorage.getItem(aiKey.value)
    const localUserMsgs = userRaw ? (JSON.parse(userRaw) || []) : []
    const localAiMsgs = aiRaw ? (JSON.parse(aiRaw) || []) : []
    
    if (localUserMsgs.length > 0 || localAiMsgs.length > 0) {
      // 本地有缓存，直接使用
      console.log('📦 使用本地缓存的聊天消息')
      const userMsgs = localUserMsgs
      let aiMsgs = localAiMsgs
      
      // 动作描写关闭时，过滤掉括号内的动作内容
      if (!aiCharacter.value?.hasActions) {
        aiMsgs = aiMsgs.map(m => ({
          ...m,
          content: (m.content || '')
            .replace(/【[^】]*】/g, '')
            .replace(/（[^）]*）/g, '')
            .replace(/\([^)]*\)/g, '')
            .trim()
        }))
      }
      
      aiMessages.value = [...userMsgs, ...aiMsgs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    } else {
      // 本地没有缓存，才从后端加载
      console.log('🔄 本地无缓存，从后端加载消息, chatId:', route.params.id)
      
      // 先尝试从后端加载消息，实现跨设备同步
      const loadAIMessages = async () => {
        try {
          const chatId = route.params.id
          const token = localStorage.getItem('auth-token') || localStorage.getItem('token')
          if (!token) return null
          
          const response = await fetch(`https://wchat-backend-production.up.railway.app/api/message/${chatId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data && result.data.length > 0) {
              console.log('✅ 从后端加载了', result.data.length, '条AI聊天消息')
              return result.data
            }
          }
        } catch (error) {
          console.log('❌ 从后端加载AI消息失败:', error.message)
        }
        return null
      }
      
      const backendMsgs = await loadAIMessages()
      
      if (backendMsgs !== null) {
        // 成功连接到后端
        if (backendMsgs.length > 0) {
          // 使用后端消息
          const userId = userStore.userId || localStorage.getItem('user-id') || ''
          console.log('✅ 从后端加载了', backendMsgs.length, '条消息')
          
          const formattedMsgs = backendMsgs.map(msg => {
            // 处理 senderId：可能是字符串或对象（populate后）
            let senderIdStr = ''
            if (typeof msg.senderId === 'object') {
              senderIdStr = msg.senderId._id ? msg.senderId._id.toString() : ''
            } else if (typeof msg.senderId === 'string') {
              senderIdStr = msg.senderId
            }
            
            // 判断消息类型
            const isSelf = senderIdStr === userId
            const msgType = isSelf ? 'self' : 'other'
            
            return {
              id: msg._id,
              type: msgType,
              content: msg.content,
              image: msg.image || undefined,
              createdAt: new Date(msg.createdAt).getTime()
            }
          })
          aiMessages.value = formattedMsgs
          
          // 同步到 localStorage
          try {
            const userMsgs = formattedMsgs.filter(m => m.type === 'self')
            const aiMsgs = formattedMsgs.filter(m => m.type === 'other')
            localStorage.setItem(userKey.value, JSON.stringify(userMsgs))
            localStorage.setItem(aiKey.value, JSON.stringify(aiMsgs))
          } catch {}
        } else {
          // 后端返回空数组（消息被清空），清空本地存储
          console.log('✅ 后端消息已清空，同步清空本地存储')
          aiMessages.value = []
          try {
            localStorage.removeItem(userKey.value)
            localStorage.removeItem(aiKey.value)
          } catch {}
        }
      } else {
        // 无法连接到后端，使用本地 localStorage（虽然这里刚检查过是空的）
        console.log('⚠️ 无法连接到后端')
      }
    }

    // 进入聊天标记已读
    chatsStore.markAIRead(route.params.id)
    scrollToBottom()

    // 注册后台错误回调
    setOnError((task, errMsg) => {
      if (task.routeId !== route.params.id) return
      if (_typingDoneTimer) clearTimeout(_typingDoneTimer)
      _typingDoneTimer = null
      isTyping.value = false
      aiMessages.value.push({ id: `err-${Date.now()}`, type: 'other', content: errMsg, _failed: true })
      failedTask.value = { text: task.text }
      errorMsg.value = errMsg
      scrollToBottom()
    })

    // 浏览器通知
    const _notify = (title, body) => {
      if (Notification.permission === 'granted') {
        new Notification(title, { body: body?.slice(0, 50) || '', icon: '/favicon.ico' })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification(title, { body: body?.slice(0, 50) || '', icon: '/favicon.ico' })
          }
        })
      }
    }

    // 动态调整轮询间隔
    const _startPoll = () => {
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = setInterval(() => {
        const key = aiKey.value
        if (!key) return
        try {
          const aiRaw = localStorage.getItem(key)
          const storedAI = aiRaw ? (JSON.parse(aiRaw) || []) : []
          const existingAIKeys = new Set(
            aiMessages.value.filter(m => m.type === 'other').map(m => m.id || `${m.content}|${m.createdAt}`)
          )
          const newMsgs = storedAI.filter(m => !existingAIKeys.has(m.id || `${m.content}|${m.createdAt}`))
          
            // 每次只添加一条消息，保持分段效果
            if (newMsgs.length > 0) {
              const msgToAdd = newMsgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).slice(0, 1)
            // 动作描写关闭时，过滤掉括号内的动作内容
            if (!aiCharacter.value?.hasActions) {
              for (const m of newMsgs) {
                m.content = (m.content || '')
                  .replace(/【[^】]*】/g, '')
                  .replace(/（[^）]*）/g, '')
                  .replace(/\([^)]*\)/g, '')
                  .trim()
              }
            }
            aiMessages.value.push(...newMsgs)
            // 标记新消息为已读（用户在聊天界面内）
            try {
              const key = aiKey.value
              const aiRaw = localStorage.getItem(key)
              const storedAI = aiRaw ? (JSON.parse(aiRaw) || []) : []
              const updated = storedAI.map(m => {
                if (m.type === 'other' && !m.isRead) {
                  return { ...m, isRead: true }
                }
                return m
              })
              localStorage.setItem(key, JSON.stringify(updated))
            } catch {}
            // 通知聊天列表刷新（红点、最后消息）
            chatsStore.refreshChatList()
            scrollToBottom()
            // 浏览器通知：用户在设置里开启了通知，且当前不在这个聊天页面
            if (userStore.user.aiNotify && document.hidden) {
              _notify(aiCharacter.value?.name || 'AI', newMsgs[newMsgs.length - 1].content)
            }
            // AI 回复分段写入，等 2 秒没有新消息才认为写完了
            if (_typingDoneTimer) clearTimeout(_typingDoneTimer)
            _typingDoneTimer = setTimeout(() => {
              isTyping.value = false
              _typingDoneTimer = null
            }, 2000)
          }
        } catch {}
      }, pollInterval)
    }

    // 启动时用慢速轮询，Typing 时切快速，回复到达后切回慢速
    _startPoll()
    stopTypingWatch = watch(isTyping, (typing) => {
      pollInterval = typing ? 800 : 5000
      _startPoll()
    })
  } else {
    chatsStore.clearUnread(route.params.id)
  }
  scrollToBottom()
})

onUnmounted(() => {
  if (isAI.value) {
    clearActiveChat()
    clearOnError()
    isTyping.value = false
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
    if (_typingDoneTimer) clearTimeout(_typingDoneTimer)
    _typingDoneTimer = null
    stopTypingWatch?.()
    pollInterval = 3000
  }
  
  // 清理键盘监听
  if (handleResizeFn) {
    window.removeEventListener('resize', handleResizeFn)
    handleResizeFn = null
  }
})
</script>

<style scoped>
.page-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-btn {
  position: absolute;
  left: 16px;
  font-size: 20px;
  cursor: pointer;
}

.header-actions {
  position: absolute;
  right: 16px;
  display: flex;
  align-items: center;
}

.more-btn {
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
}

.action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--bg-white);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  min-width: 140px;
  z-index: 100;
}

.action-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.action-menu-item:hover {
  background: var(--bg-gray);
}

.action-menu-item:first-child {
  border-radius: 8px 8px 0 0;
}

.action-menu-item:last-child {
  border-radius: 0 0 8px 8px;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: var(--font-size-lg);
  font-weight: 500;
}

.header-avatar {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  cursor: pointer;
  border: 1px solid var(--border-color);
}

.page-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-chat);
  padding: 8px 0 80px;
  min-height: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* 背景选择弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  width: 80%;
  max-width: 360px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
}

.close-btn {
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.background-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px;
}

.background-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.background-item:hover {
  background-color: #f5f5f5;
}

.background-item.active {
  background-color: #e3f2fd;
}

.background-preview {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  background-size: cover;
  background-position: center;
}

.background-item.active .background-preview {
  border-color: #5B8FF9;
}

.background-name {
  font-size: 12px;
  color: #666;
}

.error-tip {
  background-color: #fef0f0;
  color: #F56C6C;
  font-size: var(--font-size-sm);
  padding: 8px 16px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.retry-btn {
  padding: 2px 12px;
  background: #F56C6C;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}

.role-note-bar {
  background-color: rgba(7, 193, 96, 0.08);
  color: var(--wechat-green);
  font-size: var(--font-size-xs);
  padding: 4px 16px;
  text-align: center;
  flex-shrink: 0;
}

.chat-footer {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
  background-color: var(--bg-white);
  flex-shrink: 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  transition: bottom 0.3s ease;
}

.footer-icon {
  font-size: 22px;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--text-primary);
  stroke: currentColor;
}

.footer-icon svg {
  stroke: currentColor;
}

.chat-input {
  flex: 1;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0 10px;
  font-size: var(--font-size-md);
  outline: none;
  min-width: 0;
  font-family: inherit;
  background: var(--bg-white);
}

.chat-input:focus {
  border-color: var(--wechat-green);
}

.chat-input:disabled {
  background-color: var(--bg-gray);
  cursor: not-allowed;
}

.send-btn {
  padding: 6px 14px;
  background-color: var(--wechat-green);
  color: white;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  border: none;
  font-family: inherit;
  flex-shrink: 0;
}

.send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.plus-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 49;
}

.plus-actions {
  position: fixed;
  bottom: var(--tab-height);
  left: 0;
  right: 0;
  background: var(--bg-white);
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 32px;
  padding: 20px 24px;
  justify-content: center;
  z-index: 50;
}

.plus-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  position: relative;
}

.plus-icon-wrap {
  width: 56px;
  height: 56px;
  background: var(--bg-gray);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.plus-icon svg {
  stroke: currentColor;
}

.plus-action span {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.file-input-overlay {
  display: none;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.text-image-dialog {
  background: var(--bg-white);
  border-radius: 12px;
  width: 300px;
  max-width: 90vw;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
}

.close-btn {
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1;
}

.dialog-content {
  padding: 16px;
}

.text-image-input {
  width: 100%;
  height: 120px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  font-size: var(--font-size-md);
  resize: none;
  box-sizing: border-box;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
}

.dialog-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  min-width: 60px;
}

.dialog-btn.cancel {
  background: #e0e0e0;
  color: #333;
}

.dialog-btn.confirm {
  background: #07c160;
  color: white;
color: white;
}

.emoji-picker {
  position: fixed;
  bottom: var(--tab-height);
  left: 0;
  right: 0;
  background: var(--bg-white);
  border-top: 1px solid var(--border-color);
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.emoji-tabs {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border-color);
  gap: 4px;
}

.emoji-tab {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-tab.active {
  opacity: 1;
  background: var(--bg-gray);
}

.emoji-tab-add {
  margin-left: auto;
  padding: 4px 8px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-grid {
  padding: 6px 4px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.emoji-item {
  font-size: 22px;
  text-align: center;
  padding: 4px 2px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1.2;
}

.emoji-item:active {
  background: var(--bg-gray);
}

.emoji-img-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
}

.emoji-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 6px;
}

.emoji-img-del {
  position: absolute;
  top: 0;
  right: 4px;
  font-size: 12px;
  color: #F56C6C;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  display: none;
}

.emoji-img-item:hover .emoji-img-del {
  display: flex;
}

.emoji-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.8;
}

/* 添加表情面板 */
.emoji-add-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-white);
  display: flex;
  flex-direction: column;
  z-index: 60;
}

.add-panel-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
}

.add-panel-back {
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
}

.add-panel-title {
  font-size: var(--font-size-lg);
  font-weight: 500;
}

.add-panel-body {
  padding: 20px 16px;
  flex: 1;
}

.add-url-section {
  margin-bottom: 16px;
}

.add-url-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.add-url-row {
  display: flex;
  gap: 8px;
}

.add-url-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: var(--font-size-md);
  outline: none;
  font-family: inherit;
  background: var(--bg-white);
}

.add-url-input:focus {
  border-color: var(--wechat-green);
}

.add-url-btn {
  padding: 10px 16px;
  background: var(--wechat-green);
  color: white;
  border-radius: 6px;
  font-size: var(--font-size-sm);
  border: none;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}

.add-divider {
  text-align: center;
  color: var(--text-time);
  font-size: var(--font-size-sm);
  margin: 12px 0;
  position: relative;
}

.add-divider::before,
.add-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 35%;
  height: 1px;
  background: var(--border-color);
}

.add-divider::before { left: 0; }
.add-divider::after { right: 0; }

.add-album-section {
  text-align: center;
  position: relative;
}

.add-album-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  cursor: pointer;
}

.add-album-btn:active {
  background: var(--bg-gray);
}

.emoji-file-input {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 44px;
  opacity: 0;
  cursor: pointer;
}

.add-desc-section {
  margin-top: 12px;
}

.add-desc-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.add-desc-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: var(--font-size-md);
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  background: var(--bg-white);
}

.add-desc-input:focus {
  border-color: var(--wechat-green);
}

.add-preview {
  margin-top: 16px;
}

.add-preview-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.add-preview-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

/* 群聊消息样式 */
.message-bubble-wrapper {
  padding: 8px 12px;
}

.message-bubble {
  display: flex;
  gap: 8px;
}

.message-bubble.self {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.msg-content {
  max-width: 70%;
}

.message-bubble.self .msg-content {
  text-align: right;
}

.msg-sender {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: inline-block;
}

.msg-bubble {
  display: inline-block;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg-gray);
  max-width: 100%;
  box-sizing: border-box;
}

.msg-bubble.self {
  background: var(--wechat-green);
  color: white;
}

.msg-text {
  font-size: var(--font-size-xl);
  line-height: 1.6;
  margin: 0;
  word-break: break-all;
}

.msg-bubble.self .msg-text {
  color: white;
}

.msg-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  cursor: pointer;
}

.msg-time {
  font-size: 13px;
  color: var(--text-time);
  margin-top: 6px;
  display: inline-block;
}

.time-label {
  text-align: center;
  font-size: 13px;
  color: var(--text-time);
  padding: 12px 0;
}
</style>