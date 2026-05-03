<template>
  <div class="page">
    <div class="page-header">
      <span>通讯录</span>
      <span class="header-actions">
        <svg class="group-btn" @click="showGroupCreateModal = true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </span>
    </div>
    <div class="page-content hide-scrollbar">
      <ContactGroup
        v-for="group in contactsStore.groups"
        :key="group.letter"
        :letter="group.letter"
        :list="group.list"
      />
      <!-- 群聊列表 - 只有有群聊时才显示 -->
      <div v-if="groups.length > 0" class="contact-group">
        <div class="group-letter">
          <span>群聊</span>
        </div>
        <div
          v-for="group in groups"
          :key="group.id"
          class="ai-char-item group-item"
          @click="openEditGroupModal(group)"
        >
          <div class="group-avatar-box">
            <!-- 如果群聊有自定义头像，显示自定义头像；否则显示成员头像组合 -->
            <template v-if="group.avatar">
              <img :src="group.avatar" class="custom-group-avatar" />
            </template>
            <template v-else>
              <div class="avatar-stack-box">
                <template v-if="getAllGroupAvatars(group).length === 3">
                  <!-- 3个头像使用三角分布 -->
                  <img :src="getAllGroupAvatars(group)[0]" class="stack-avatar-box" />
                  <img :src="getAllGroupAvatars(group)[1]" class="stack-avatar-box" />
                  <img :src="getAllGroupAvatars(group)[2]" class="stack-avatar-box full-width" />
                </template>
                <template v-else>
                  <!-- 其他数量使用正常网格 -->
                  <img v-for="(member, idx) in getAllGroupAvatars(group)" :key="idx" :src="member" class="stack-avatar-box" />
                </template>
              </div>
            </template>
          </div>
          <div class="ai-info">
            <div class="ai-name">{{ group.name }}</div>
            <div class="ai-persona">{{ getGroupMemberNames(group) }}</div>
          </div>
        </div>
      </div>

      <!-- 我的好友分组 -->
      <div class="contact-group">
        <div class="group-letter">
          <span>我的好友</span>
          <span class="add-btn" @click="showModal = true">+</span>
        </div>
        <div
          v-for="char in aiCharactersStore.characters"
          :key="char.id"
          class="ai-char-item"
          @click="openEditModal(char)"
          @touchstart.passive="onTouchStart(char.id)"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <img :src="char.avatar || `https://picsum.photos/seed/${char.id}/100/100`" class="ai-avatar" />
          <div class="ai-info">
            <div class="ai-name">{{ char.name }}</div>
            <div class="ai-persona">{{ char.persona || '暂无描述' }}</div>
          </div>
        </div>
        <div v-if="aiCharactersStore.characters.length === 0" class="empty-tip">
          暂无 AI 角色，点击 + 创建
        </div>
      </div>
    </div>
    <AiCharacterModal
      :visible="showModal"
      :editingCharacter="editingCharacter"
      @close="handleModalClose"
      @save="handleSaveCharacter"
    />

    <!-- 删除确认栏 -->
    <div v-if="deletingId" class="delete-bar">
      <span class="delete-tip">确定删除「{{ deletingName }}」？</span>
      <button class="delete-confirm" @click="confirmDelete">删除</button>
      <button class="delete-cancel" @click="deletingId = null">取消</button>
    </div>
    <!-- 编辑群聊弹窗 -->
    <div v-if="showEditGroupModal" class="modal-overlay" @click.self="closeEditGroupModal">
      <div class="modal-sheet group-edit-modal">
        <div class="modal-header">
          <span @click="closeEditGroupModal">取消</span>
          <span class="modal-title">编辑群聊</span>
          <span @click="saveGroupEdit" class="save-btn">保存</span>
        </div>
        <div class="modal-body">
          <!-- 头像放在最上面，与编辑角色界面一致 -->
          <div class="avatar-section">
            <label class="avatar-preview-wrapper-large">
              <img :src="editingGroupAvatar || defaultGroupAvatar" class="avatar-img" />
              <input type="file" accept="image/*" @change="handleGroupAvatarChange" hidden />
              <div class="avatar-overlay">
                <span>📷</span>
              </div>
            </label>
            <span class="avatar-hint">点击头像从相册选择</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="form-item">
            <div class="form-label">群聊名称</div>
            <input class="form-input" v-model="editingGroupName" placeholder="输入群聊名称" />
          </div>
          <div class="form-item">
            <div class="form-label">群聊成员（点击踢出）</div>
            <div class="member-list">
              <div v-for="memberId in editingGroupMembers" :key="memberId" class="member-item" @click="showRemoveMemberConfirm(memberId)">
                <img :src="getCharAvatar(memberId)" class="member-avatar" />
                <span class="member-name">{{ getCharName(memberId) }}</span>
                <span class="remove-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </span>
              </div>
              <!-- 添加加号按钮 -->
              <div class="member-item add-member-btn" @click="openAddMemberModal">
                <span class="add-icon">+</span>
                <span class="add-text">添加</span>
              </div>
            </div>
          </div>
          <div class="form-item danger-zone">
            <div class="form-label">危险操作</div>
            <div class="danger-btn" @click="showDeleteGroupConfirm">解散群聊</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <div v-if="showConfirmModal" class="modal-overlay confirm-overlay" @click.self="closeConfirmModal">
      <div class="confirm-dialog">
        <div class="confirm-icon">⚠️</div>
        <div class="confirm-title">{{ confirmTitle }}</div>
        <div class="confirm-message">{{ confirmMessage }}</div>
        <div class="confirm-actions">
          <button class="btn btn-outline" @click="closeConfirmModal">取消</button>
          <button class="btn btn-danger" @click="executeConfirmAction">确定</button>
        </div>
      </div>
    </div>

    <!-- 创建群聊弹窗 -->
    <div v-if="showGroupCreateModal" class="modal-overlay" @click.self="showGroupCreateModal = false">
      <div class="modal-sheet group-create-modal">
        <div class="modal-header">
          <span @click="showGroupCreateModal = false">取消</span>
          <span class="modal-title">创建群聊</span>
          <span @click="handleCreateGroup" :class="{ disabled: selectedChars.length < 2 }">完成</span>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <div class="form-label">群聊名称</div>
            <input class="form-input" v-model="groupName" placeholder="输入群聊名称" />
          </div>
          <div class="form-item">
            <div class="form-label">选择角色（至少2人）</div>
            <div class="char-select-list">
              <div
                v-for="char in aiCharactersStore.characters"
                :key="char.id"
                class="char-select-item"
                :class="{ selected: selectedChars.includes(char.id) }"
                @click="toggleCharSelect(char.id)"
              >
                <img :src="char.avatar || `https://picsum.photos/seed/${char.id}/100/100`" class="char-avatar" />
                <span class="char-name">{{ char.name }}</span>
                <svg v-if="selectedChars.includes(char.id)" width="16" height="16" viewBox="0 0 24 24" fill="var(--wechat-green)" stroke="var(--wechat-green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加成员弹窗 -->
    <div v-if="showAddMemberModal" class="modal-overlay" @click.self="closeAddMemberModal">
      <div class="modal-sheet group-create-modal">
        <div class="modal-header">
          <span @click="closeAddMemberModal">取消</span>
          <span class="modal-title">添加成员</span>
          <span @click="confirmAddMembers" :class="{ disabled: selectedNewMembers.length === 0 }">完成</span>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <div class="char-select-list">
              <div
                v-for="char in availableChars"
                :key="char.id"
                class="char-select-item"
                :class="{ selected: selectedNewMembers.includes(char.id) }"
                @click="toggleNewMemberSelect(char.id)"
              >
                <img :src="char.avatar || `https://picsum.photos/seed/${char.id}/100/100`" class="char-avatar" />
                <span class="char-name">{{ char.name }}</span>
                <svg v-if="selectedNewMembers.includes(char.id)" width="18" height="18" viewBox="0 0 24 24" fill="var(--wechat-green)" stroke="var(--wechat-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useContactsStore } from '@/stores/contacts'
import { useAiCharactersStore } from '@/stores/aiCharacters'
import ContactGroup from '@/components/ContactGroup.vue'
import AiCharacterModal from '@/components/AiCharacterModal.vue'

const router = useRouter()
const contactsStore = useContactsStore()
const aiCharactersStore = useAiCharactersStore()

const showModal = ref(false)
const editingCharacter = ref(null)
const defaultAiAvatar = 'https://picsum.photos/seed/default-ai/100/100'
const deletingId = ref(null)
const deletingName = ref('')
let pressTimer = null

// 群聊创建相关
const showGroupCreateModal = ref(false)
// 编辑群聊相关
const showEditGroupModal = ref(false)
const editingGroup = ref(null)
const editingGroupName = ref('')
const editingGroupAvatar = ref('')
const editingGroupMembers = ref([])
const defaultGroupAvatar = 'https://picsum.photos/seed/group/100/100'
const avatarInput = ref(null)

const selectAvatar = () => {
  avatarInput.value?.click()
}

const handleAvatarChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      editingGroupAvatar.value = event.target.result
    }
    reader.readAsDataURL(file)
  }
}

const openEditGroupModal = (group) => {
  editingGroup.value = group
  editingGroupName.value = group.name || ''
  editingGroupAvatar.value = group.avatar || ''
  editingGroupMembers.value = [...(group.members || [])]
  showEditGroupModal.value = true
}

const closeEditGroupModal = () => {
  showEditGroupModal.value = false
  editingGroup.value = null
}

const getCharAvatar = (charId) => {
  const char = aiCharactersStore.characters.find(c => c.id === charId)
  return char?.avatar || `https://picsum.photos/seed/${charId}/100/100`
}

const getCharName = (charId) => {
  const char = aiCharactersStore.characters.find(c => c.id === charId)
  return char?.name || '未知'
}

// 确认对话框相关
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmAction = ref(null)

const showRemoveMemberConfirm = (memberId) => {
  confirmTitle.value = '踢出成员'
  confirmMessage.value = `确定要将「${getCharName(memberId)}」踢出群聊吗？`
  confirmAction.value = () => {
    const idx = editingGroupMembers.value.indexOf(memberId)
    if (idx > -1) {
      editingGroupMembers.value.splice(idx, 1)
    }
    closeConfirmModal()
  }
  showConfirmModal.value = true
}

const showDeleteGroupConfirm = () => {
  confirmTitle.value = '解散群聊'
  confirmMessage.value = `确定要解散群聊「${editingGroup.value.name}」吗？此操作不可恢复。`
  confirmAction.value = () => {
    localStorage.removeItem(`group-${editingGroup.value.id}`)
    localStorage.removeItem(`group-chat-${editingGroup.value.id}`)
    loadGroups()
    closeEditGroupModal()
    closeConfirmModal()
  }
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  confirmAction.value = null
}

const executeConfirmAction = () => {
  if (confirmAction.value) {
    confirmAction.value()
  }
}

const saveGroupEdit = () => {
  if (!editingGroup.value) return
  const updatedGroup = {
    ...editingGroup.value,
    name: editingGroupName.value,
    avatar: editingGroupAvatar.value,
    members: editingGroupMembers.value
  }
  localStorage.setItem(`group-${updatedGroup.id}`, JSON.stringify(updatedGroup))
  loadGroups()
  closeEditGroupModal()
}
const groupName = ref('')
const selectedChars = ref([])

// 群聊列表
const groups = ref([])

const loadGroups = () => {
  const groupList = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('group-')) {
      try {
        const raw = localStorage.getItem(key)
        const group = JSON.parse(raw)
        if (group && group.type === 'group') {
          groupList.push(group)
        }
      } catch {}
    }
  }
  groups.value = groupList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

const getGroupAvatars = (group) => {
  const avatars = []
  // 添加用户自己的头像作为第一个
  avatars.push('https://picsum.photos/seed/user/100/100')
  if (group.members && group.members.length > 0) {
    // 显示所有成员头像，不限制数量
    for (const memberId of group.members) {
      const char = aiCharactersStore.characters.find(c => c.id === memberId)
      if (char) {
        avatars.push(char.avatar || `https://picsum.photos/seed/${memberId}/100/100`)
      }
    }
  }
  return avatars
}

// 直接获取所有头像，不做任何限制
// 直接获取所有头像，不做任何限制
const getAllGroupAvatars = (group) => {
  const avatars = []
  // 添加用户自己的头像作为第一个
  avatars.push('https://picsum.photos/seed/user/100/100')
  // 添加所有群成员头像
  if (group.members && group.members.length > 0) {
    group.members.forEach(memberId => {
      const char = aiCharactersStore.characters.find(c => c.id === memberId)
      if (char) {
        avatars.push(char.avatar || `https://picsum.photos/seed/${memberId}/100/100`)
      }
    })
  }
  return avatars
}

const getGroupMemberCount = (group) => {
  // 返回群聊总人数（包含用户自己）
  const memberCount = group.members && group.members.length ? group.members.length : 0
  return memberCount + 1 // +1 是用户自己
}

const getGroupMemberNames = (group) => {
  if (!group.members || group.members.length === 0) return ''
  const names = group.members.slice(0, 3).map(id => {
    const char = aiCharactersStore.characters.find(c => c.id === id)
    return char?.name || '未知'
  })
  const remaining = group.members.length - 3
  return names.join('、') + (remaining > 0 ? ` 等${remaining + names.length}人` : '')
}

const goToGroupChat = (group) => {
  router.push(`/chat/group-${group.id}`)
}

onMounted(() => {
  loadGroups()
  aiCharactersStore.fetchCharacters()
})

const onTouchStart = (charId) => {
  pressTimer = setTimeout(() => {
    const char = aiCharactersStore.characters.find(c => c.id === charId)
    if (char) {
      deletingId.value = charId
      deletingName.value = char.name
    }
    pressTimer = null
  }, 600)
}

const onTouchEnd = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

const confirmDelete = () => {
  if (deletingId.value) {
    aiCharactersStore.deleteCharacter(deletingId.value)
    deletingId.value = null
  }
}

const openEditModal = (char) => {
  editingCharacter.value = char
  showModal.value = true
}

const handleModalClose = () => {
  showModal.value = false
  editingCharacter.value = null
}

const handleSaveCharacter = (data) => {
  if (editingCharacter.value) {
    aiCharactersStore.updateCharacter(editingCharacter.value.id, data)
  } else {
    aiCharactersStore.addCharacter(data)
  }
}

// 群聊相关方法
const toggleCharSelect = (charId) => {
  const idx = selectedChars.value.indexOf(charId)
  if (idx > -1) {
    selectedChars.value.splice(idx, 1)
  } else {
    selectedChars.value.push(charId)
  }
}

// 群聊长按菜单相关
const showGroupActionModal = ref(false)
const currentGroup = ref(null)
let groupLongPressTimer = null

const onGroupLongPressStart = (group, e) => {
  currentGroup.value = group
  groupLongPressTimer = setTimeout(() => {
    showGroupActionModal.value = true
    groupLongPressTimer = null
  }, 600)
}

const onGroupLongPressEnd = () => {
  if (groupLongPressTimer) {
    clearTimeout(groupLongPressTimer)
    groupLongPressTimer = null
  }
}

const closeGroupActionModal = () => {
  showGroupActionModal.value = false
  currentGroup.value = null
}

const handleDeleteGroup = () => {
  if (!currentGroup.value) return
  if (confirm(`确定要解散群聊「${currentGroup.value.name}」吗？`)) {
    // 删除群聊信息
    localStorage.removeItem(`group-${currentGroup.value.id}`)
    // 删除群聊消息
    localStorage.removeItem(`group-chat-${currentGroup.value.id}`)
    // 刷新群聊列表
    loadGroups()
    closeGroupActionModal()
  }
}

const handleGroupAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    editingGroupAvatar.value = ev.target.result
  }
  reader.readAsDataURL(file)
}

const handleSetGroupAvatar = () => {
  // 这里可以添加设置群聊头像的功能
  alert('设置群聊头像功能开发中...')
  closeGroupActionModal()
}

// 添加成员相关
const showAddMemberModal = ref(false)
const availableChars = ref([])
const selectedNewMembers = ref([])

const openAddMemberModal = () => {
  // 获取不在当前群聊中的角色
  availableChars.value = aiCharactersStore.characters.filter(
    char => !editingGroupMembers.value.includes(char.id)
  )
  selectedNewMembers.value = []
  showAddMemberModal.value = true
}

const closeAddMemberModal = () => {
  showAddMemberModal.value = false
  selectedNewMembers.value = []
}

const toggleNewMemberSelect = (charId) => {
  const index = selectedNewMembers.value.indexOf(charId)
  if (index > -1) {
    selectedNewMembers.value.splice(index, 1)
  } else {
    selectedNewMembers.value.push(charId)
  }
}

const confirmAddMembers = () => {
  editingGroupMembers.value = [...editingGroupMembers.value, ...selectedNewMembers.value]
  closeAddMemberModal()
}

const handleCreateGroup = () => {
  if (selectedChars.value.length < 2) {
    return
  }
  
  // 检查是否已存在相同成员的群聊
  const sortedMembers = [...selectedChars.value].sort().join(',')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('group-')) {
      try {
        const raw = localStorage.getItem(key)
        const existingGroup = JSON.parse(raw)
        if (existingGroup && existingGroup.type === 'group') {
          const existingSortedMembers = [...(existingGroup.members || [])].sort().join(',')
          if (existingSortedMembers === sortedMembers) {
            // 显示错误提示
            confirmTitle.value = '创建失败'
            confirmMessage.value = '已存在相同成员的群聊，不能重复创建'
            confirmAction.value = () => {
              closeConfirmModal()
            }
            showConfirmModal.value = true
            return
          }
        }
      } catch {}
    }
  }
  
  const group = {
    id: Date.now().toString(),
    name: groupName.value || '群聊',
    type: 'group',
    members: selectedChars.value,
    createdAt: Date.now()
  }
  // 保存群聊信息
  localStorage.setItem(`group-${group.id}`, JSON.stringify(group))
  
  // 直接关闭创建弹窗
  showGroupCreateModal.value = false
  groupName.value = ''
  selectedChars.value = []
  loadGroups()
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.header-actions {
  position: absolute;
  right: 16px;
  font-size: 20px;
  color: var(--text-secondary);
}

.group-btn {
  cursor: pointer;
  color: var(--wechat-green);
  margin-right: 8px;
}

.page-content {
  background-color: var(--bg-white);
}
.contact-group {
  margin-bottom: 8px;
}

.group-letter {
  padding: 10px 16px;
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  background-color: var(--bg-gray);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.add-btn {
  color: var(--wechat-green);
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
  font-weight: bold;
}

.ai-char-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-white);
  cursor: pointer;
  gap: 16px;
  border-bottom: 1px solid var(--border-color);
}

.ai-char-item:last-child {
  border-bottom: none;
}

.ai-char-item:active {
  background-color: var(--bg-hover);
}


.ai-avatar {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.ai-info {
  flex: 1;
  min-width: 0;
}

.ai-name {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.ai-persona {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px;
}

.empty-tip {
  padding: 16px;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background-color: var(--bg-white);
}

.delete-bar {
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
  z-index: 50;
}

.delete-tip {
  flex: 1;
  font-size: var(--font-size-md);
  color: var(--text-primary);
}

.delete-confirm {
  padding: 6px 14px;
  background: #F56C6C;
  color: white;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.delete-cancel {
  padding: 6px 14px;
  background: var(--bg-gray);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: var(--font-size-sm);
  border: none;
  cursor: pointer;
  font-family: inherit;
}

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

.modal-header span:last-child.disabled {
  color: var(--text-time);
  cursor: not-allowed;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.form-item {
  margin-bottom: 16px;
}

.form-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 8px;
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

.char-select-list {
  max-height: 300px;
  overflow-y: auto;
}

.char-select-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  gap: 12px;
  transition: background-color 0.2s;
}

.char-select-item:hover,
.char-select-item.selected {
  background-color: var(--bg-hover);
}

.char-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.char-name {
  flex: 1;
  font-size: var(--font-size-md);
  color: var(--text-primary);
}

/* 群聊头像方框样式 - 填满头像框 */
.group-avatar-box {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  background-color: #f0f0f0;
  border: 1px solid var(--border-color);
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}

/* 自定义群聊头像 */
.custom-group-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-stack-box {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1px;
}

/* 3个头像时第3个占满整行 */
.stack-avatar-box.full-width {
  grid-column: 1 / -1;
  grid-row: 2;
}

.stack-avatar-box {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 3个头像时第3个占满整行 */
.stack-avatar-box.full-width {
  grid-column: 1 / -1;
  grid-row: 2;
}

.group-item-wrapper {
  position: relative;
  overflow: hidden;
}

.group-swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding-right: 16px;
  z-index: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.group-swipe-actions.visible {
  opacity: 1;
  pointer-events: auto;
}

/* 群聊操作弹窗样式 */
.group-action-modal {
  width: 100%;
  background-color: var(--bg-white);
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.group-action-modal .modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
  font-weight: 600;
  font-size: var(--font-size-md);
  display: block;
}

.group-action-modal .modal-body {
  padding: 8px 0;
}

.group-action-list {
  padding: 10px 0;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-item:hover {
  background-color: var(--bg-hover);
}

.action-icon {
  font-size: 20px;
  margin-right: 12px;
}

.action-item.delete-action {
  color: #F56C6C;
}

.group-action-modal .modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
}

.group-action-modal .btn {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-md);
  font-family: inherit;
}

/* 美化编辑群聊弹窗 */
.group-edit-modal {
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
}

.group-edit-modal .modal-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: none;
}

.group-edit-modal .modal-header span:first-child,
.group-edit-modal .modal-header span:last-child {
  color: white;
  opacity: 0.9;
}

.group-edit-modal .modal-header span:first-child:hover,
.group-edit-modal .modal-header span:last-child:hover {
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
  margin-bottom: 20px;
}

.group-edit-modal .form-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
  margin-bottom: 10px;
}

.group-edit-modal .form-input {
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.group-edit-modal .form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.group-avatar-edit {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-preview-wrapper {
  position: relative;
  cursor: pointer;
  width: 50px;
  height: 50px;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
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
  border-radius: 8px;
  font-size: 20px;
}

.avatar-preview-wrapper:hover .avatar-overlay,
.avatar-preview-wrapper:active .avatar-overlay {
  opacity: 1;
}

.avatar-url-input {
  flex: 1;
}

/* 编辑群聊弹窗头像样式 */
.group-edit-modal .avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.group-edit-modal .avatar-preview-wrapper-large {
  position: relative;
  cursor: pointer;
  width: 72px;
  height: 72px;
}

.group-edit-modal .avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-color);
}

.group-edit-modal .avatar-preview-wrapper-large .avatar-overlay {
  border-radius: 50%;
}

.group-edit-modal .avatar-hint {
  font-size: var(--font-size-sm);
  color: var(--wechat-green);
}

.group-edit-modal .divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, #e0e0e0 50%, transparent 90%);
  margin: 16px 0;
}

/* 添加成员按钮样式 */
.add-member-btn {
  border: 2px dashed #ddd;
  background: transparent;
  color: #999;
  justify-content: center;
  gap: 4px;
}

.add-member-btn:hover {
  border-color: var(--wechat-green);
  color: var(--wechat-green);
  background: rgba(7, 193, 96, 0.05);
}

.add-icon {
  font-size: 20px;
  font-weight: bold;
}

.add-text {
  font-size: var(--font-size-sm);
}

/* 修复群聊创建完成后弹窗不关闭的问题 */
.group-create-modal {
  border-radius: 16px 16px 0 0;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-preview-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-url-input {
  flex: 1;
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e0e0e0;
}

.member-item:hover {
  background: linear-gradient(135deg, #ffeaea 0%, #ffd6d6 100%);
  border-color: #ffb3b3;
  transform: translateY(-1px);
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.member-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.remove-icon {
  width: 20px;
  height: 20px;
  color: #999;
  transition: color 0.2s;
}

.member-item:hover .remove-icon {
  color: #F56C6C;
}

.danger-zone {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px dashed #e0e0e0;
}

.danger-btn {
  padding: 14px;
  text-align: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3);
}

.danger-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 87, 108, 0.4);
}

.danger-btn:active {
  transform: translateY(0);
}

/* 确认对话框样式 */
.modal-overlay.confirm-overlay {
  align-items: center;
  justify-content: center;
}

.confirm-dialog {
  width: 85%;
  max-width: 340px;
  background: white;
  border-radius: 16px;
  padding: 28px 24px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  animation: dialogPop 0.2s ease-out;
}

@keyframes dialogPop {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.confirm-message {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-actions .btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-outline {
  background: #f5f5f5;
  color: #666;
}

.btn-outline:hover {
  background: #e8e8e8;
}

.btn-danger {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(245, 87, 108, 0.4);
}

/* 美化创建群聊弹窗 */
.group-create-modal {
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
}

.group-create-modal .modal-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border-bottom: none;
}

.group-create-modal .modal-header span:first-child,
.group-create-modal .modal-header span:last-child {
  color: white;
  opacity: 0.9;
}

.group-create-modal .modal-title {
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.btn-cancel {
  background-color: var(--bg-gray);
  color: var(--text-primary);
}

.modal-overlay.group-action-overlay {
  align-items: flex-end;
}

.delete-group-btn {
  padding: 8px 14px;
  color: white;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  white-space: nowrap;
  background: #F56C6C;
}

.group-item {
  background-color: var(--bg-white);
  position: relative;
  z-index: 1;
  transition: transform 0.2s ease;
}

.group-item.swiped {
  transform: translateX(-80px);
}

.group-item:active {
  background-color: var(--bg-hover);
}
</style>