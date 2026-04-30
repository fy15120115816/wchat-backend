<template>
  <div class="message-wrap" :class="message.type">
    <!-- 时间标签 -->
    <div v-if="timeLabel" class="time-label">{{ timeLabel }}</div>
    <!-- 消息行：头像 + 气泡 -->
    <div class="message-row">
      <img v-if="message.type === 'other' && message.sender" :src="senderAvatar" class="avatar avatar-sm" />
      <img v-else-if="message.type === 'other'" :src="otherAvatar" class="avatar avatar-sm" />
      <img v-else :src="userAvatar" class="avatar avatar-sm" />
      <!-- 图片消息：无气泡 -->
      <template v-if="message.image && message.image !== '__image__'">
        <div class="message-content image-content">
          <img :src="message.image" class="msg-image" />
          <span v-if="message.content" class="msg-image-text">{{ message.content }}</span>
        </div>
      </template>
      <!-- 文字消息：有气泡 -->
      <template v-else>
        <div class="message-content">
          <div 
            class="bubble" 
            :class="[message.type, { 'bubble-failed': message._failed }]" 
            @click="$emit('retry')"
            @touchstart.passive="handleTouchStart"
            @touchend="handleTouchEnd"
            @touchcancel="handleTouchEnd"
            @contextmenu.prevent="handleContextMenu"
          >
            <div v-if="message.image === '__image__'" class="msg-image-expired-text">[图片已过期]</div>
            <span v-else>{{ message.content }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- 撤回确认对话框 -->
    <ConfirmDialog
      :visible="showRecallConfirm"
      title="撤回消息"
      message="确定要撤回这条消息吗？"
      @confirm="handleConfirmRecall"
      @cancel="showRecallConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  chat: {
    type: Object,
    default: null
  },
  userAvatar: {
    type: String,
    default: 'https://picsum.photos/seed/me/100/100'
  },
  timeLabel: {
    type: String,
    default: ''
  }
})

const otherAvatar = computed(() => {
  if (props.chat?.avatar) return props.chat.avatar
  if (props.chat?.id) return `https://picsum.photos/seed/${props.chat.id}/100/100`
  return ''
})

const senderAvatar = computed(() => {
  return props.chat?.avatar || `https://picsum.photos/seed/${props.chat?.id || 'unknown'}/100/100`
})

const emit = defineEmits(['retry', 'recall'])

let pressTimer = null
const showRecallConfirm = ref(false)

const handleTouchStart = () => {
  if (props.message.type !== 'self') return
  pressTimer = setTimeout(() => {
    showRecallConfirm.value = true
  }, 600)
}

const handleTouchEnd = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

const handleContextMenu = () => {
  if (props.message.type !== 'self') return
  showRecallConfirm.value = true
}

const handleConfirmRecall = () => {
  showRecallConfirm.value = false
  emit('recall', props.message)
}
</script>

<style scoped>
.message-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 16px;
  gap: 2px;
}

.message-wrap.self {
  align-items: flex-end;
}

.message-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.message-wrap.self .message-row {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
  flex-shrink: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.bubble {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: var(--font-size-md);
  line-height: 1.5;
  word-break: break-word;
}

.bubble.other {
  background-color: var(--bubble-other-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.bubble.self {
  background-color: var(--bubble-self-bg);
  color: var(--text-primary);
}

.msg-image-expired-text {
  width: 120px;
  height: 80px;
  background: var(--bg-gray);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  border-radius: 8px;
}

.msg-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
}

.image-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.msg-image-text {
  font-size: var(--font-size-xs);
  color: var(--text-time);
  max-width: 200px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bubble-failed {
  color: #F56C6C !important;
  background-color: #fef0f0 !important;
}

.time-label {
  font-size: var(--font-size-xs);
  color: var(--text-time);
  text-align: center;
  width: 100%;
  margin-bottom: 4px;
}
</style>
