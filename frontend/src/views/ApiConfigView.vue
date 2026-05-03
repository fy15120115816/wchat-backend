<template>
  <div class="page">
    <div class="page-header">
      <span class="back-btn" @click="$router.back()">
        <BackIcon :size="20" />
      </span>
      API 配置
    </div>
    <div class="page-content hide-scrollbar">
      <div class="section-label">已保存的 API</div>
      <div
        v-for="config in apiConfigsStore.configs"
        :key="config.id"
        class="api-item"
        :class="{ active: config.isDefault }"
      >
        <div class="api-info" @click="handleSetDefault(config.id)">
          <div class="api-name">{{ config.name }}</div>
          <div class="api-model">{{ config.model }}</div>
        </div>
        <div class="api-actions">
          <div v-if="config.isDefault" class="default-tag">默认</div>
          <span class="edit-btn" @click.stop="$router.push(`/settings/api-config/edit/${config.id}`)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          </span>
        </div>
      </div>
      <div class="add-btn" @click="$router.push('/settings/api-config/edit/new')">
        <span class="add-icon">+</span>
        <span>添加新的 API</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useApiConfigsStore } from '@/stores/apiConfigs'
import BackIcon from '@/components/icons/BackIcon.vue'

const router = useRouter()
const apiConfigsStore = useApiConfigsStore()

// 设置默认API
const handleSetDefault = (id) => {
  apiConfigsStore.setDefault(id)
}
</script>

<style scoped>
.section-label {
  padding: 8px 16px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.api-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-white);
  cursor: pointer;
  gap: 10px;
  border: 2px solid transparent;
  border-radius: 8px;
  margin-bottom: 8px;
}

.api-item:active {
  background-color: var(--bg-hover);
}

.api-item.active {
  border-color: var(--wechat-green);
}

.api-info {
  flex: 1;
}

.api-name {
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--text-primary);
}

.api-model {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

.api-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.default-tag {
  font-size: 12px;
  color: var(--wechat-green);
  background-color: rgba(7, 193, 96, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.edit-btn {
  color: var(--text-secondary);
  padding: 6px;
  cursor: pointer;
}

.edit-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
  border-radius: 6px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin: 8px 0;
  color: var(--wechat-green);
  font-size: var(--font-size-md);
  cursor: pointer;
  background-color: var(--bg-white);
}

.add-icon {
  font-size: 18px;
}
</style>
