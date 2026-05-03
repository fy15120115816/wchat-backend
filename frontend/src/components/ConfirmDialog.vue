<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click.self="$emit('cancel')">
      <div class="confirm-box">
        <div class="confirm-title">{{ title }}</div>
        <div class="confirm-message">{{ message }}</div>
        <div class="confirm-actions">
          <button class="confirm-btn cancel" @click="$emit('cancel')">{{ cancelText }}</button>
          <button class="confirm-btn ok" @click="$emit('confirm')">{{ okText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: Boolean,
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  okText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' }
})
defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.confirm-box {
  background: var(--bg-white);
  border-radius: 12px;
  width: 280px;
  overflow: hidden;
}

.confirm-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  padding: 20px 20px 8px;
}

.confirm-message {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  text-align: center;
  padding: 8px 20px 20px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  border-top: 1px solid var(--border-color);
}

.confirm-btn {
  flex: 1;
  padding: 14px 0;
  font-size: var(--font-size-md);
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
}

.confirm-btn.cancel {
  border-right: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.confirm-btn.ok {
  color: #07C160;
  font-weight: 600;
}
</style>
