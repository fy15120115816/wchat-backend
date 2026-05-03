<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-sheet">
      <div class="modal-header">
        <span @click="$emit('close')">取消</span>
        <span class="modal-title">发朋友圈</span>
        <span @click="handlePublish" :class="{ disabled: !content.trim() && images.length === 0 }">发布</span>
      </div>
      <div class="modal-body">
        <textarea
          v-model="content"
          class="content-input"
          placeholder="这一刻的想法..."
          rows="4"
        ></textarea>
        <div class="images-grid" v-if="images.length > 0">
          <div v-for="(img, i) in images" :key="i" class="img-wrap">
            <img :src="img" class="preview-img" />
            <span class="remove-btn" @click="removeImage(i)">×</span>
          </div>
        </div>
        <div class="add-image" @click="triggerFileInput" v-if="images.length < 9">
          <svg class="add-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            style="display:none"
            @change="handleFileChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['close', 'publish'])

const content = ref('')
const images = ref([])
const fileInputRef = ref(null)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e) => {
  const files = Array.from(e.target.files)
  files.forEach(file => {
    if (images.value.length >= 9) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      images.value.push(ev.target.result)
    }
    reader.readAsDataURL(file)
  })
  e.target.value = ''
}

const removeImage = (index) => {
  images.value.splice(index, 1)
}

const handlePublish = () => {
  if (!content.value.trim() && images.value.length === 0) return
  const contentText = content.value.trim()
  const imageList = [...images.value]
  emit('publish', { content: contentText, images: imageList })
  content.value = ''
  images.value = []
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
  max-height: 90vh;
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

.modal-header span:last-child.disabled {
  color: var(--text-time);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.content-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: var(--font-size-md);
  font-family: inherit;
  resize: none;
  line-height: 1.6;
  background: transparent;
  box-sizing: border-box;
}

.content-input::placeholder {
  color: var(--text-time);
}

.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.img-wrap {
  position: relative;
  width: 80px;
  height: 80px;
}

.preview-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: rgba(0,0,0,0.6);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
}

.add-image {
  width: 80px;
  height: 80px;
  background: var(--bg-gray);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-top: 12px;
  border: 1px dashed var(--border-color);
}

.add-icon {
  color: var(--text-secondary);
}
</style>
