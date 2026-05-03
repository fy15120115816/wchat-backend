<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-sheet">
      <div class="modal-header">
        <span @click="$emit('close')">取消</span>
        <span class="modal-title">个人信息</span>
        <span @click="handleSave">保存</span>
      </div>
      <div class="modal-body">
        <div class="form-item">
          <div class="form-label">昵称</div>
          <input class="form-input" v-model="form.nickname" placeholder="输入昵称" />
        </div>
        <div class="form-item">
          <div class="form-label">头像</div>
          <div class="avatar-row">
            <img :src="form.avatar" class="avatar-preview" @click="showAvatarDialog = true" />
            <div class="avatar-presets">
              <div
                v-for="preset in presets"
                :key="preset"
                class="preset-item"
                :class="{ selected: form.avatar === preset }"
                @click="form.avatar = preset"
              >
                <img :src="preset" />
              </div>
            </div>
          </div>
        </div>

        <!-- 头像选择对话框 -->
        <div v-if="showAvatarDialog" class="avatar-modal-overlay" @click.self="showAvatarDialog = false">
          <div class="confirm-dialog">
            <div class="dialog-content">是否从相册选择头像？</div>
            <div class="dialog-buttons">
              <button class="dialog-btn cancel" @click="showAvatarDialog = false">取消</button>
              <label class="dialog-btn confirm">
                <input type="file" accept="image/*" @change="handleAvatarChange" hidden />
                选择
              </label>
            </div>
          </div>
        </div>
        <div class="form-item">
          <div class="form-label">个人简介</div>
          <textarea class="form-textarea" v-model="form.basicInfo" placeholder="介绍自己，AI 会根据这些信息更好地理解你"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  user: Object
})

const emit = defineEmits(['close', 'save'])

const presets = [
  'https://picsum.photos/seed/me/100/100',
  'https://picsum.photos/seed/user2/100/100',
  'https://picsum.photos/seed/user3/100/100',
  'https://picsum.photos/seed/user4/100/100',
  'https://picsum.photos/seed/user5/100/100',
  'https://picsum.photos/seed/user6/100/100',
  'https://picsum.photos/seed/user7/100/100',
  'https://picsum.photos/seed/user8/100/100',
  'https://picsum.photos/seed/user9/100/100'
]

const form = ref({ nickname: '', avatar: '', basicInfo: '' })
const showAvatarDialog = ref(false)

watch(() => props.user, (newUser) => {
  form.value = { nickname: '', avatar: '', basicInfo: '', ...newUser }
}, { immediate: true })

const handleSave = () => {
  if (!form.value.nickname.trim()) return
  emit('save', { ...form.value })
}

const handleAvatarChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      form.value.avatar = ev.target.result
      showAvatarDialog.value = false
    }
    reader.readAsDataURL(file)
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.modal-sheet {
  width: 100%;
  background: var(--bg-white);
  border-radius: 12px 12px 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--bg-gray);
  font-size: var(--font-size-md);
}

.modal-title {
  font-weight: 500;
  color: var(--text-primary);
}

.modal-header span:first-child,
.modal-header span:last-child {
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-header span:last-child {
  color: var(--wechat-green);
  font-weight: 500;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.form-item {
  margin-bottom: 20px;
}

.form-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid var(--bg-gray);
  outline: none;
  font-size: var(--font-size-md);
  font-family: inherit;
  background: transparent;
  box-sizing: border-box;
}

.avatar-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.avatar-preview {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.preset-item {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  box-sizing: border-box;
}

.preset-item.selected {
  border-color: var(--wechat-green);
}

.preset-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-preview {
  cursor: pointer;
}

.avatar-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog {
  background: var(--bg-white);
  border-radius: 12px;
  width: 280px;
  padding: 20px;
  text-align: center;
}

.dialog-content {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin-bottom: 20px;
}

.dialog-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-btn {
  padding: 8px 24px;
  border-radius: 6px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  border: none;
}

.dialog-btn.cancel {
  background: #e0e0e0;
  color: #333;
}

.dialog-btn.confirm {
  background: var(--wechat-green);
  color: white;
}

.form-textarea {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid var(--bg-gray);
  outline: none;
  font-size: var(--font-size-md);
  font-family: inherit;
  background: transparent;
  box-sizing: border-box;
  resize: none;
  height: 60px;
}
</style>
