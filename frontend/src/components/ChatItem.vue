<template>
  <div class="chat-item" @click="handleClick" @touchstart.passive="handleTouchStart" @touchend="handleTouchEnd" @touchcancel="handleTouchEnd">
    <div class="chat-avatar">
      <img :src="chat.avatar" :alt="chat.name" class="avatar" />
      <span v-if="chat.unread > 0" class="unread-dot"></span>
    </div>
    <div class="chat-info">
      <div class="chat-top">
        <span class="chat-name">{{ chat.name }}</span>
        <span class="chat-time">{{ chat.time }}</span>
      </div>
      <div class="chat-bottom">
        <span class="chat-preview">{{ chat.lastMessage }}</span>
        <span v-if="chat.unread > 0" class="unread-badge">{{ chat.unread }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  chat: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['longpress'])

const router = useRouter()

let pressTimer = null

const handleTouchStart = () => {
  pressTimer = setTimeout(() => {
    emit('longpress')
  }, 600)
}

const handleTouchEnd = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

const handleClick = () => {
  router.push(`/chat/${props.chat.id}`)
}
</script>

<style scoped>
.chat-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background-color: var(--bg-white);
  cursor: pointer;
}

.chat-item:active {
  background-color: var(--bg-hover);
}

.chat-avatar {
  position: relative;
  flex-shrink: 0;
  margin-right: 12px;
}

.unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background-color: var(--wechat-green);
  border-radius: 50%;
}

.chat-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-name {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  font-weight: 500;
}

.chat-time {
  font-size: var(--font-size-xs);
  color: var(--text-time);
  flex-shrink: 0;
}

.chat-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-preview {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.unread-badge {
  background-color: var(--wechat-green);
  color: white;
  font-size: 10px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  flex-shrink: 0;
}
</style>
