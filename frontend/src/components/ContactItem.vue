<template>
  <div class="contact-item">
    <img :src="contact.avatar" :alt="contact.name" class="avatar" />
    <span class="contact-name">{{ contact.remark || contact.name }}</span>
    <span v-if="contact.isAI" class="ai-tag">AI</span>
    <span v-if="contact.isGroup" class="ai-tag">群聊</span>
  </div>
</template>

<script setup>
defineProps({
  contact: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.contact-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background-color: var(--bg-white);
  cursor: pointer;
  gap: 12px;
}

.contact-item:active {
  background-color: var(--bg-hover);
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.contact-name {
  flex: 1;
  font-size: var(--font-size-md);
  color: var(--text-primary);
}

.ai-tag {
  font-size: var(--font-size-xs);
  color: var(--wechat-green);
  background-color: rgba(7, 193, 96, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
