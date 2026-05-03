<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-sheet group-edit-modal">
        <div class="modal-header">
          <span class="modal-cancel" @click="handleCancel">取消</span>
          <span class="modal-title">{{ editingCharacter ? '编辑角色' : '创建角色' }}</span>
          <span class="modal-save" @click="handleSave">保存</span>
        </div>
        <div class="modal-body">
          <div class="avatar-section">
            <label class="avatar-preview-wrapper">
              <img :src="form.avatar || defaultAvatar" class="avatar-img" />
              <input type="file" accept="image/*" @change="handleAvatarChange" hidden />
              <div class="avatar-overlay">
                <span>📷</span>
              </div>
            </label>
            <span class="avatar-hint">点击头像从相册选择</span>
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label">角色名称</div>
            <input class="form-input" v-model="form.name" placeholder="例如：温柔的小助手" />
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label">角色人设</div>
            <textarea class="form-textarea" v-model="form.persona" placeholder="描述角色的性格、说话风格、背景故事..."></textarea>
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label">角色备注</div>
            <input class="form-input" v-model="form.note" placeholder="例如：我的青梅竹马、知心姐姐..." />
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label-row">
              <span>动作描述</span>
              <span class="form-hint">开启后角色回复会显示动作描写，如「（微笑地看着你）」「（轻叹一声）」</span>
            </div>
            <div class="toggle-row">
              <span class="toggle-label">{{ form.hasActions ? '已开启' : '已关闭' }}</span>
              <div class="toggle-switch" :class="{ on: form.hasActions }" @click="form.hasActions = !form.hasActions">
                <div class="toggle-thumb"></div>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label-row">
              <span>心理描述</span>
              <span class="form-hint">开启后角色回复会穿插 emoji 表情，如 😀 🤔 😄</span>
            </div>
            <div class="toggle-row">
              <span class="toggle-label">{{ form.hasInnerThoughts ? '已开启' : '已关闭' }}</span>
              <div class="toggle-switch" :class="{ on: form.hasInnerThoughts }" @click="form.hasInnerThoughts = !form.hasInnerThoughts">
                <div class="toggle-thumb"></div>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label-row">
              <span>朋友圈自动回复</span>
              <span class="form-hint">发布朋友圈后自动点赞+评论</span>
            </div>
            <div class="toggle-row">
              <span class="toggle-label">{{ form.autoReact ? '已开启' : '已关闭' }}</span>
              <div class="toggle-switch" :class="{ on: form.autoReact }" @click="form.autoReact = !form.autoReact">
                <div class="toggle-thumb"></div>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label-row">
              <span>自动发朋友圈</span>
              <span class="form-hint">角色会根据性格自动发布朋友圈</span>
            </div>
            <div class="toggle-row">
              <span class="toggle-label">{{ form.autoPostMoments ? '已开启' : '已关闭' }}</span>
              <div class="toggle-switch" :class="{ on: form.autoPostMoments }" @click="form.autoPostMoments = !form.autoPostMoments">
                <div class="toggle-thumb"></div>
              </div>
            </div>
          </div>
          <div v-if="form.autoPostMoments" class="form-item">
            <div class="form-label">发朋友圈频率</div>
            <div class="frequency-options">
              <div
                v-for="opt in frequencyOptions"
                :key="opt.value"
                class="frequency-btn"
                :class="{ active: form.momentsFrequency === opt.value }"
                @click="form.momentsFrequency = opt.value"
              >
                {{ opt.label }}
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label-row">
              <span>主动发消息</span>
              <span class="form-hint">开启后角色会定期主动发消息给你</span>
            </div>
            <div class="toggle-row">
              <span class="toggle-label">{{ form.autoProactiveMsg ? '已开启' : '已关闭' }}</span>
              <div class="toggle-switch" :class="{ on: form.autoProactiveMsg }" @click="form.autoProactiveMsg = !form.autoProactiveMsg">
                <div class="toggle-thumb"></div>
              </div>
            </div>
          </div>
          <div v-if="form.autoProactiveMsg" class="form-item">
            <div class="form-label-row">
              <span>免打扰时段</span>
              <span class="form-hint">此时段角色不会主动发消息</span>
            </div>
            <div class="toggle-row">
              <span class="toggle-label">{{ form.quietHoursEnabled ? '已开启' : '已关闭' }}</span>
              <div class="toggle-switch" :class="{ on: form.quietHoursEnabled }" @click="form.quietHoursEnabled = !form.quietHoursEnabled">
                <div class="toggle-thumb"></div>
              </div>
            </div>
            <template v-if="form.quietHoursEnabled">
              <div class="quiet-hours-row">
                <select class="time-select" v-model="form.quietHoursStart">
                  <option v-for="h in 24" :key="h-1" :value="h-1">{{ _formatHour(h-1) }}</option>
                </select>
                <span class="time-sep">至</span>
                <select class="time-select" v-model="form.quietHoursEnd">
                  <option v-for="h in 24" :key="h-1" :value="h-1">{{ _formatHour(h-1) }}</option>
                </select>
              </div>
            </template>
            <div class="interval-row">
              <span class="interval-label">发送间隔</span>
              <div class="interval-input-wrap">
                <input type="number" class="interval-input" v-model.number="form.autoMsgInterval" min="1" max="3600" />
                <span class="interval-unit">小时</span>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label-row">
              <span>角色回复分段上限</span>
              <span class="form-hint">角色回复最多分几段发出</span>
            </div>
            <div class="interval-row">
              <span class="interval-label">分段条数</span>
              <div class="interval-input-wrap">
                <input type="number" class="interval-input" v-model.number="form.maxReplyMessages" min="1" max="20" />
                <span class="interval-unit">条</span>
              </div>
            </div>
          </div>
          
          <!-- 分隔线 -->
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label">性别</div>
            <div class="gender-options">
              <div
                v-for="opt in genderOptions"
                :key="opt.value"
                class="gender-btn"
                :class="{ active: form.gender === opt.value }"
                @click="form.gender = opt.value"
              >
                {{ opt.icon }} {{ opt.label }}
              </div>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="divider"></div>

          <div class="form-item">
            <div class="form-label-row">
              <span>查看记忆</span>
              <span class="form-hint">查看此角色的对话记忆</span>
            </div>
            <div class="memory-view-row">
              <span class="memory-text">{{ getCharMemory() || '暂无记忆' }}</span>
              <button class="memory-btn" @click="viewCharMemory">查看</button>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="divider"></div>

          <div class="form-item">
            <div class="form-label-row">
              <span>导入/导出记忆</span>
              <span class="form-hint">备份或恢复此角色的记忆</span>
            </div>
            <div class="memory-action-row">
              <button class="memory-action-btn export" @click="exportCharMemory">导出</button>
              <button class="memory-action-btn import" @click="importCharMemory">导入</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import MomentIcon from '@/components/icons/MomentIcon.vue'
import { getItem, setItem } from '@/utils/storage'

const props = defineProps({
  visible: Boolean,
  editingCharacter: Object
})

const emit = defineEmits(['close', 'save'])

const defaultAvatar = 'https://picsum.photos/seed/default-ai/100/100'

const genderOptions = [
  { value: 'female', label: '女', icon: '♀' },
  { value: 'male', label: '男', icon: '♂' },
  { value: 'unknown', label: '未知', icon: '🤖' }
]

const _formatHour = (h) => {
  if (h < 12) return `凌晨${h}点`
  if (h === 12) return '中午12点'
  if (h < 18) return `下午${h - 12}点`
  if (h === 18) return '傍晚6点'
  if (h === 22) return '晚上10点'
  if (h === 23) return '晚上11点'
  return `晚上${h - 12}点`
}

const form = ref({
  name: '',
  avatar: '',
  gender: 'unknown',
  persona: '',
  hasActions: false,
  hasInnerThoughts: false,
  note: '',
  autoReact: false,
  autoPostMoments: false,
  momentsFrequency: 'often',
  autoProactiveMsg: false,
  autoMsgInterval: 10,
  quietHoursEnabled: false,
  quietHoursStart: 0,
  quietHoursEnd: 8,
  maxReplyMessages: 3
})

const frequencyOptions = [
  { value: 'daily', label: '每天' },
  { value: 'often', label: '经常' },
  { value: 'occasional', label: '偶尔' }
]

// 获取角色记忆
const getCharMemory = () => {
  if (!props.editingCharacter) return ''
  const SUMMARY_KEY = 'ai-chat-summary'
  const all = getItem(SUMMARY_KEY) || {}
  return all[props.editingCharacter.id] || ''
}

// 查看角色记忆（弹窗显示）
const viewCharMemory = () => {
  const memory = getCharMemory()
  if (memory) {
    alert(`【${props.editingCharacter.name}】的记忆：\n\n${memory}`)
  } else {
    alert(`【${props.editingCharacter.name}】暂无记忆`)
  }
}

// 导出角色记忆
const exportCharMemory = () => {
  if (!props.editingCharacter) return
  const SUMMARY_KEY = 'ai-chat-summary'
  const all = getItem(SUMMARY_KEY) || {}
  const memory = all[props.editingCharacter.id] || ''
  const data = { [props.editingCharacter.id]: memory }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `memory-${props.editingCharacter.name}-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// 导入角色记忆
const importCharMemory = () => {
  if (!props.editingCharacter) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        if (typeof imported !== 'object' || imported === null) {
          alert('文件格式不正确')
          return
        }
        const SUMMARY_KEY = 'ai-chat-summary'
        const all = getItem(SUMMARY_KEY) || {}
        // 合并导入的记忆
        for (const key in imported) {
          all[key] = imported[key]
        }
        setItem(SUMMARY_KEY, all)
        alert('记忆导入成功！')
      } catch (err) {
        alert('导入失败：' + err.message)
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

watch(() => props.visible, (val) => {
  if (val) {
    if (props.editingCharacter) {
      form.value = { 
        ...props.editingCharacter,
        autoPostMoments: props.editingCharacter.autoPostMoments || false,
        momentsFrequency: props.editingCharacter.momentsFrequency || 'often'
      }
    } else {
      form.value = { name: '', avatar: '', gender: 'unknown', persona: '', hasActions: false, hasInnerThoughts: false, note: '', autoReact: false, autoPostMoments: false, momentsFrequency: 'often', autoProactiveMsg: false, autoMsgInterval: 10, quietHoursEnabled: false, quietHoursStart: 0, quietHoursEnd: 8, maxReplyMessages: 3 }
    }
  }
})

const handleAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    form.value.avatar = ev.target.result
  }
  reader.readAsDataURL(file)
}

const handleCancel = () => {
  emit('close')
}

const handleSave = () => {
  if (!form.value.name.trim()) {
    alert('请输入角色名称')
    return
  }
  emit('save', { ...form.value })
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.modal-sheet {
  width: 100%;
  background: var(--bg-white);
  border-radius: 12px 12px 0 0;
  max-height: 85vh;
  overflow-y: auto;
  box-sizing: border-box;
  position: relative;
}

/* 与编辑群聊弹窗风格一致 */
.group-edit-modal {
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
}

.group-edit-modal .modal-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: none;
  box-shadow: none;
}

.group-edit-modal .modal-cancel,
.group-edit-modal .modal-save {
  color: white;
  opacity: 0.9;
}

.group-edit-modal .modal-cancel:hover,
.group-edit-modal .modal-save:hover {
  opacity: 1;
}

.group-edit-modal .modal-title {
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.group-edit-modal .modal-body {
  padding: 20px;
}

.group-edit-modal .form-item {
  margin-bottom: 16px;
}

.group-edit-modal .form-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.group-edit-modal .form-input {
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
}

.group-edit-modal .form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, #e0e0e0 50%, transparent 90%);
  margin: 16px 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--bg-white);
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.modal-cancel {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 500;
}

.modal-save {
  font-size: var(--font-size-md);
  color: var(--wechat-green);
  cursor: pointer;
  font-weight: 500;
}

.modal-body {
  padding: 20px;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.avatar-preview-wrapper {
  position: relative;
  cursor: pointer;
  width: 72px;
  height: 72px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-color);
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
  font-size: 24px;
}

.avatar-preview-wrapper:hover .avatar-overlay,
.avatar-preview-wrapper:active .avatar-overlay {
  opacity: 1;
}

.avatar-hint {
  font-size: var(--font-size-sm);
  color: var(--wechat-green);
}

.avatar-upload {
  font-size: var(--font-size-sm);
  color: var(--wechat-green);
  cursor: pointer;
}

.form-item {
  margin-bottom: 16px;
}

.form-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.form-label-row > span:first-child {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--text-time);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.toggle-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  flex: 1;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--border-color);
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  overflow: hidden;
  flex-shrink: 0;
  box-sizing: border-box;
}

.toggle-switch.on {
  background: var(--wechat-green);
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  box-sizing: border-box;
}

.toggle-switch.on .toggle-thumb {
  left: 20px;
}

.form-input {
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

.form-input:focus {
  border-color: var(--wechat-green);
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: var(--font-size-md);
  outline: none;
  font-family: inherit;
  resize: none;
  height: 80px;
  box-sizing: border-box;
  background: var(--bg-white);
}

.form-textarea:focus {
  border-color: var(--wechat-green);
}

.form-input:focus {
  border-color: var(--wechat-green);
}

.gender-options {
  display: flex;
  gap: 12px;
}

.gender-btn {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  font-size: var(--font-size-md);
  cursor: pointer;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.gender-btn.active {
  border-color: var(--wechat-green);
  color: var(--wechat-green);
  background: rgba(7, 193, 96, 0.05);
}

.frequency-options {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.frequency-btn {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  font-size: var(--font-size-md);
  cursor: pointer;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.frequency-btn.active {
  border-color: var(--wechat-green);
  color: var(--wechat-green);
  background: rgba(7, 193, 96, 0.05);
}

.quiet-hours-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.time-sep {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.time-select {
  flex: 1;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 8px;
  font-size: var(--font-size-sm);
  background: var(--bg-white);
  color: var(--text-primary);
  outline: none;
  font-family: inherit;
}

.interval-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  gap: 8px;
}

.interval-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.interval-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.interval-input {
  width: 64px;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 8px;
  font-size: var(--font-size-md);
  text-align: center;
  outline: none;
  background: var(--bg-white);
  color: var(--text-primary);
  font-family: inherit;
  -moz-appearance: textfield;
}

.interval-input::-webkit-inner-spin-button,
.interval-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.interval-input:focus {
  border-color: var(--wechat-green);
}

.interval-unit {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* 记忆功能样式 */
.memory-view-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 8px;
}

.memory-text {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.memory-btn {
  padding: 6px 12px;
  font-size: var(--font-size-sm);
  color: var(--wechat-green);
  background: rgba(7, 193, 96, 0.1);
  border: 1px solid var(--wechat-green);
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.memory-btn:hover {
  background: rgba(7, 193, 96, 0.2);
}

.memory-action-row {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.memory-action-btn {
  flex: 1;
  padding: 8px 16px;
  font-size: var(--font-size-sm);
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
}

.memory-action-btn.export {
  color: var(--wechat-green);
  background: rgba(7, 193, 96, 0.1);
  border: 1px solid var(--wechat-green);
}

.memory-action-btn.export:hover {
  background: rgba(7, 193, 96, 0.2);
}

.memory-action-btn.import {
  color: #5B8FF9;
  background: rgba(91, 143, 249, 0.1);
  border: 1px solid #5B8FF9;
}

.memory-action-btn.import:hover {
  background: rgba(91, 143, 249, 0.2);
}
</style>
