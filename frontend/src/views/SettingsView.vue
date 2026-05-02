<template>
  <div class="page">
    <div class="page-header">设置</div>
    <div class="page-content hide-scrollbar">
      <div class="settings-section">
        <div class="section-title">个人账户</div>
        <div class="settings-item profile-item" @click="showProfileModal = true">
          <img :src="userStore.user.avatar" class="profile-avatar" />
          <div class="profile-info">
            <div class="profile-nickname">{{ userStore.user.nickname }}</div>
            <div class="profile-hint">点击修改头像和昵称</div>
          </div>
          <span class="item-arrow">›</span>
        </div>
        
        <div class="settings-item last-item" @click="openBasicInfoModal">
          <span class="item-icon">
            <EditIcon :size="20" style="color: #5B8FF9" />
          </span>
          <span class="item-label">个人简介</span>
          <span class="item-desc">{{ userStore.user.basicInfo ? userStore.user.basicInfo.slice(0, 15) + (userStore.user.basicInfo.length > 15 ? '...' : '') : '点击填写' }}</span>
          <span class="item-arrow">›</span>
        </div>
      </div>
      <div class="settings-section">
        <div class="section-title">API 管理</div>
        <div class="settings-item last-item" @click="goToApiConfig">
          <span class="item-icon">
            <KeyIcon :size="20" style="color: #FF9500" />
          </span>
          <span class="item-label">API 配置</span>
          <span class="item-arrow">›</span>
        </div>
      </div>
      <div class="settings-section">
        <div class="section-title">其他</div>
        <div class="settings-item" @click="toggleNotify">
          <span class="item-icon">
            <BellIcon :size="20" style="color: #07C160" />
          </span>
          <span class="item-label">角色消息通知</span>
          <div class="toggle-switch" :class="{ on: userStore.user.aiNotify }">
            <div class="toggle-thumb" />
          </div>

        </div>
        <div class="settings-item" @click="toggleAutoPostMoments">
          <span class="item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #9C27B0">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </span>
          <span class="item-label">角色自动发朋友圈</span>
          <div class="toggle-switch" :class="{ on: userStore.user.autoPostMoments }">
            <div class="toggle-thumb" />
          </div>
        </div>
        <div class="settings-item" @click="toggleDarkMode">
          <span class="item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #FF9500"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </span>
          <span class="item-label">深色模式</span>
          <div class="toggle-switch" :class="{ on: userStore.user.darkMode }">
            <div class="toggle-thumb" />
          </div>
        </div>
        <div class="settings-item" @click="toggleFullscreen">
          <span class="item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #07C160">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </span>
          <span class="item-label">全屏模式</span>
          <div class="toggle-switch" :class="{ on: isFullscreen }">
            <div class="toggle-thumb" />
          </div>
        </div>
        <div class="settings-item" @click="showGlobalBackgroundPicker = true">
          <span class="item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #5B8FF9"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </span>
          <span class="item-label">全局聊天背景</span>
          <span class="item-arrow">›</span>
        </div>
      </div>

      <!-- 记忆配置区域 -->
      <div class="settings-section" v-if="userStore.user.enableMemory">
        <div class="section-title">记忆配置</div>
        <div class="settings-item" @click="openSummaryIntervalModal">
          <span class="item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #07C160">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </span>
          <span class="item-label">总结间隔</span>
          <span class="item-desc">{{ userStore.user.summaryInterval || 50 }} 条消息</span>
          <span class="item-arrow">›</span>
        </div>
        <div class="settings-item last-item" @click="openSummarySizeModal">
          <span class="item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #FF9500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          <span class="item-label">每次总结条数</span>
          <span class="item-desc">{{ userStore.user.summarySize || 100 }} 条</span>
          <span class="item-arrow">›</span>
        </div>
      </div>

      <!-- 退出登录 -->
      <div class="settings-section">
        <div class="settings-item logout-item" @click="openLogoutDialog">
          <span class="item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #FF4757">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span class="item-label">退出登录</span>
        </div>
      </div>
    </div>

    <!-- 头像昵称弹窗 -->
    <ProfileEditModal
      :visible="showProfileModal"
      :user="userStore.user"
      @close="showProfileModal = false"
      @save="handleProfileSave"
    />

    <!-- 简介弹窗 -->
    <div v-if="showBasicInfoModal" class="modal-overlay" @click.self="showBasicInfoModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <span @click="showBasicInfoModal = false">取消</span>
          <span class="modal-title">个人简介</span>
          <span @click="handleBasicInfoSave">保存</span>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <div class="form-label">简介内容（让角色了解你）</div>
            <textarea class="form-textarea" v-model="basicInfoDraft" placeholder="介绍一下你自己，比如：年龄、职业、性格、爱好等，帮助角色更好地与你互动"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- 全局背景选择弹窗 -->
    <div v-if="showGlobalBackgroundPicker" class="modal-overlay" @click="showGlobalBackgroundPicker = false">
      <div class="modal-content" @click.stop>
        <div class="background-modal-header">
          <span>选择全局聊天背景</span>
          <span class="close-btn" @click="showGlobalBackgroundPicker = false">×</span>
        </div>
        <!-- 当前背景预览 -->
        <div class="current-background-preview">
          <div class="preview-label">当前背景</div>
          <div class="preview-box">
            <img v-if="isImageBackground()" :src="userStore.user.chatBackground" class="preview-image" />
            <div v-else class="preview-color" :style="{ backgroundColor: userStore.user.chatBackground || '#f5f5f5' }"></div>
          </div>
        </div>
        <!-- 保存的图片区域 -->
        <div v-if="savedImages.length > 0" class="saved-images-section">
          <div class="section-title">保存的图片</div>
          <div class="saved-images-grid">
            <div 
              v-for="(img, index) in savedImages" 
              :key="index"
              class="saved-image-item"
              :class="{ active: userStore.user.chatBackground === img }"
              @click="setGlobalBackground(img)"
            >
              <img :src="img" class="saved-image-thumb" />
            </div>
          </div>
        </div>
        <div class="background-grid">
          <div 
            v-for="bg in backgroundOptions" 
            :key="bg.value"
            class="background-item"
            :class="{ active: userStore.user.chatBackground === bg.value }"
            @click="handleGlobalBackgroundClick(bg)"
          >
            <div class="background-preview" :style="{ background: bg.preview }"></div>
            <span class="background-name">{{ bg.name }}</span>
          </div>
        </div>
        <input id="global-background-input" type="file" accept="image/*" class="file-input-overlay" @change="handleGlobalBackgroundImageSelected" />
      </div>
    </div>

    <!-- 总结间隔设置弹窗 -->
    <div v-if="showSummaryIntervalModal" class="modal-overlay" @click.self="showSummaryIntervalModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <span @click="showSummaryIntervalModal = false">取消</span>
          <span class="modal-title">总结间隔</span>
          <span @click="handleSummaryIntervalSave">保存</span>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <div class="form-label">每多少条消息自动总结一次</div>
            <input class="form-input" type="number" v-model.number="summaryIntervalDraft" placeholder="50" min="5" max="200" />
            <div class="form-hint">建议 30-100 之间的数字，太小会频繁总结，太大可能超出 AI 上下文窗口</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 每次总结条数设置弹窗 -->
    <div v-if="showSummarySizeModal" class="modal-overlay" @click.self="showSummarySizeModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <span @click="showSummarySizeModal = false">取消</span>
          <span class="modal-title">每次总结条数</span>
          <span @click="handleSummarySizeSave">保存</span>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <div class="form-label">一次总结多少条消息的内容</div>
            <input class="form-input" type="number" v-model.number="summarySizeDraft" placeholder="100" min="10" max="500" />
            <div class="form-hint">建议 50-200 之间的数字，太少总结不完整，太多可能超出 AI 处理能力</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 查看记忆弹窗 -->
    <div v-if="showViewMemoryModal" class="modal-overlay" @click.self="showViewMemoryModal = false">
      <div class="modal-sheet memory-modal">
        <div class="modal-header">
          <span @click="showViewMemoryModal = false">取消</span>
          <span class="modal-title">AI 记忆</span>
          <span @click="clearAllMemory">清空</span>
        </div>
        <div class="modal-body memory-list">
          <div v-if="Object.keys(allMemories).length === 0" class="memory-empty">
            暂无记忆记录
          </div>
          <div v-for="(memory, charId) in allMemories" :key="charId" class="memory-item">
            <div class="memory-char-name">{{ getCharName(charId) }}</div>
            <div class="memory-content">{{ memory || '暂无记忆' }}</div>
            <button class="memory-delete-btn" @click="deleteMemory(charId)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 通知对话框 -->
  <ConfirmDialog
    :visible="showNotifyDialog"
    title="通知设置"
    :message="notifyDialogContent"
    @confirm="showNotifyDialog = false"
    @cancel="showNotifyDialog = false"
  />

  <!-- 退出登录对话框 -->
  <ConfirmDialog
    :visible="showLogoutDialog"
    title="退出登录"
    message="确定要退出登录吗？"
    ok-text="退出"
    cancel-text="取消"
    @confirm="handleLogout"
    @cancel="showLogoutDialog = false"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 转换 VAPID 公钥
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
import { useUserStore } from '@/stores/user'
import ProfileEditModal from '@/components/ProfileEditModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EditIcon from '@/components/icons/EditIcon.vue'
import KeyIcon from '@/components/icons/KeyIcon.vue'
import BellIcon from '@/components/icons/BellIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'

const userStore = useUserStore()

// 跳转到 API 配置页面
const goToApiConfig = () => {
  window.location.href = '#/settings/api-config'
}

const showProfileModal = ref(false)
const showBasicInfoModal = ref(false)
const basicInfoDraft = ref('')
const showGlobalBackgroundPicker = ref(false)

// 记忆功能相关变量
const showSummaryIntervalModal = ref(false)
const showSummarySizeModal = ref(false)
const showViewMemoryModal = ref(false)
const summaryIntervalDraft = ref(50)
const summarySizeDraft = ref(100)
const allMemories = ref({})

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

// 处理全局背景点击
const handleGlobalBackgroundClick = (bg) => {
  if (bg.value === 'custom') {
    document.getElementById('global-background-input').click()
  } else {
    userStore.updateUser({ chatBackground: bg.value })
    showGlobalBackgroundPicker.value = false
  }
}

// 获取当前背景预览
const getCurrentBackgroundPreview = () => {
  const bg = userStore.user.chatBackground
  if (!bg) {
    return '#f5f5f5'
  }
  if (bg.startsWith('data:image')) {
    return `url(${bg})`
  }
  return bg
}

// 判断是否为图片背景
const isImageBackground = () => {
  const bg = userStore.user.chatBackground
  return bg && bg.startsWith('data:image')
}

// 获取保存的图片列表
const savedImages = computed(() => {
  return userStore.user.backgroundImages || []
})

// 设置全局背景
const setGlobalBackground = (bg) => {
  userStore.updateUser({ chatBackground: bg })
  showGlobalBackgroundPicker.value = false
}

// 从相册选择全局背景
const handleGlobalBackgroundImageSelected = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (event) => {
    const imageData = event.target.result
    // 更新用户背景
    userStore.updateUser({ chatBackground: imageData })
    
    // 保存到图片列表（最多6张）
    const currentImages = userStore.user.backgroundImages || []
    if (!currentImages.includes(imageData)) {
      const newImages = [...currentImages, imageData].slice(-6) // 最多保留6张
      userStore.updateUser({ backgroundImages: newImages })
    }
    
    showGlobalBackgroundPicker.value = false
  }
  reader.readAsDataURL(file)
}

const handleProfileSave = (data) => {
  userStore.updateUser(data)
  showProfileModal.value = false
}

const openBasicInfoModal = () => {
  basicInfoDraft.value = userStore.user.basicInfo || ''
  showBasicInfoModal.value = true
}

const handleBasicInfoSave = () => {
  userStore.updateUser({ basicInfo: basicInfoDraft.value })
  showBasicInfoModal.value = false
}

const toggleNotify = async () => {
  const next = !userStore.user.aiNotify
  userStore.updateUser({ aiNotify: next })
  
  // 如果打开开关，立即请求通知权限
  if (next) {
    // 检查浏览器是否支持通知API
    if (!('Notification' in window)) {
      notifyDialogContent.value = '您的浏览器不支持桌面通知功能'
      showNotifyDialog.value = true
      return
    }
    
    // 如果权限已被拒绝，提示用户去设置开启
    if (Notification.permission === 'denied') {
      notifyDialogContent.value = '通知权限已被拒绝，请在浏览器设置中手动开启\n\n具体步骤：\n1. 点击浏览器右上角三点菜单\n2. 选择设置\n3. 搜索"通知"\n4. 找到本网站并允许通知'
      showNotifyDialog.value = true
      return
    }
    
    // 如果权限已授权，直接注册 Service Worker
    if (Notification.permission === 'granted') {
      
      // 检查是否支持 Service Worker
      if (!('serviceWorker' in navigator)) {
        console.log('⚠️ 浏览器不支持 Service Worker');
        notifyDialogContent.value = '通知权限已开启！\n\n注意：当前环境不支持后台推送（需要HTTPS或localhost）。\n打开应用时可以收到通知。';
        showNotifyDialog.value = true;
        return;
      }
      
      // 权限已授予，现在注册 Service Worker 并保存订阅
      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('✅ Service Worker 注册成功');
        } else {
          console.log('✅ Service Worker 已注册');
        }
        
        // 检查是否已有订阅
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              'BO8Hqu9fbcifxKlUqnI_oz_Q5b0Lw5mzdgu99_vxJvixgF6lnuR9c0b7PFqEzkmG33HQxcUXbHlhEuD5BKmDlVs'
            )
          });
          console.log('✅ 推送订阅成功');
        } else {
          console.log('✅ 推送订阅已存在');
        }
        
        // 将订阅信息发送到后端保存
        const token = localStorage.getItem('auth-token') || localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ 未找到认证 token，无法保存推送订阅');
          notifyDialogContent.value = '通知权限已开启，但无法保存订阅（未登录）';
          showNotifyDialog.value = true;
          return;
        }
        
        const response = await fetch('https://wchat-backend-production.up.railway.app/api/auth/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ subscription })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        notifyDialogContent.value = '通知权限已开启，订阅成功！\n\n当您离开聊天界面时，新消息会以桌面通知形式提醒您'
        console.log('✅ 推送订阅成功');
      } catch (error) {
        console.error('❌ 注册推送订阅失败:', error);
        notifyDialogContent.value = '通知权限已开启，但推送订阅失败: ' + error.message;
      }
      showNotifyDialog.value = true
      return
    }
    
    // 权限状态为 default，请求权限（这会弹出浏览器的权限对话框）
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      // 权限已授予，现在注册 Service Worker 并保存订阅
      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('✅ Service Worker 注册成功');
        } else {
          console.log('✅ Service Worker 已注册');
        }
        
        // 检查是否已有订阅
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              'BO8Hqu9fbcifxKlUqnI_oz_Q5b0Lw5mzdgu99_vxJvixgF6lnuR9c0b7PFqEzkmG33HQxcUXbHlhEuD5BKmDlVs'
            )
          });
          console.log('✅ 推送订阅成功');
        } else {
          console.log('✅ 推送订阅已存在');
        }
        
        // 将订阅信息发送到后端保存
        const token = localStorage.getItem('auth-token') || localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ 未找到认证 token，无法保存推送订阅');
          notifyDialogContent.value = '通知权限已开启，但无法保存订阅（未登录）';
          showNotifyDialog.value = true;
          return;
        }
        
        const response = await fetch('https://wchat-backend-production.up.railway.app/api/auth/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ subscription })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        notifyDialogContent.value = '通知权限已开启，订阅成功！\n\n当您离开聊天界面时，新消息会以桌面通知形式提醒您'
        console.log('✅ 推送订阅成功');
      } catch (error) {
        console.error('❌ 注册推送订阅失败:', error);
        notifyDialogContent.value = '通知权限已开启，但推送订阅失败: ' + error.message;
      }
    } else if (perm === 'denied') {
      notifyDialogContent.value = '通知权限已被拒绝\n\n如需开启通知，请在浏览器设置中手动开启'
    } else {
      notifyDialogContent.value = '通知权限请求已取消'
    }
    showNotifyDialog.value = true
  }
}

const toggleDarkMode = () => {
  const next = !userStore.user.darkMode
  userStore.updateUser({ darkMode: next })
}

// 全屏模式
const isFullscreen = ref(false)
const showNotifyDialog = ref(false)
const notifyDialogContent = ref('')

const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      isFullscreen.value = true
    } else {
      await document.exitFullscreen()
      isFullscreen.value = false
    }
  } catch (err) {
    console.error('全屏切换失败:', err)
  }
}

// 监听全屏状态变化
const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  isFullscreen.value = !!document.fullscreenElement
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

const toggleAutoPostMoments = () => {
  const next = !userStore.user.autoPostMoments
  userStore.updateUser({ autoPostMoments: next })
}

const toggleMemory = () => {
  
  const next = !userStore.user.enableMemory
  userStore.updateUser({ enableMemory: next })
}

// 打开总结间隔设置弹窗
const openSummaryIntervalModal = () => {
  summaryIntervalDraft.value = userStore.user.summaryInterval || 50
  showSummaryIntervalModal.value = true
}

// 保存总结间隔
const handleSummaryIntervalSave = () => {
  const val = Math.max(5, Math.min(200, summaryIntervalDraft.value || 50))
  userStore.updateUser({ summaryInterval: val })
  showSummaryIntervalModal.value = false
}

// 打开每次总结条数设置弹窗
const openSummarySizeModal = () => {
  summarySizeDraft.value = userStore.user.summarySize || 100
  showSummarySizeModal.value = true
}

// 保存每次总结条数
const handleSummarySizeSave = () => {
  const val = Math.max(10, Math.min(500, summarySizeDraft.value || 100))
  userStore.updateUser({ summarySize: val })
  showSummarySizeModal.value = false
}

// 打开查看记忆弹窗
const openViewMemoryModal = () => {
  // 加载所有角色的记忆
  const { getItem } = require('@/utils/storage')
  const SUMMARY_KEY = 'ai-chat-summary'
  allMemories.value = getItem(SUMMARY_KEY) || {}
  showViewMemoryModal.value = true
}

// 获取角色名称
const getCharName = (charId) => {
  const aiCharactersStore = require('@/stores/aiCharacters').useAiCharactersStore()
  const char = aiCharactersStore.characters.find(c => String(c.id) === String(charId))
  return char ? char.name : `角色 ${charId}`
}

// 删除单个记忆
const deleteMemory = (charId) => {
  if (confirm('确定要删除这个角色的记忆吗？')) {
    const { getItem, setItem } = require('@/utils/storage')
    const SUMMARY_KEY = 'ai-chat-summary'
    const all = getItem(SUMMARY_KEY) || {}
    delete all[charId]
    setItem(SUMMARY_KEY, all)
    allMemories.value = all
  }
}

// 清空所有记忆
const clearAllMemory = () => {
  if (confirm('确定要清空所有记忆吗？此操作不可恢复！')) {
    const { setItem } = require('@/utils/storage')
    const SUMMARY_KEY = 'ai-chat-summary'
    setItem(SUMMARY_KEY, {})
    allMemories.value = {}
  }
}

// 导出记忆
const exportMemory = () => {
  const { getItem } = require('@/utils/storage')
  const SUMMARY_KEY = 'ai-chat-summary'
  const memories = getItem(SUMMARY_KEY) || {}
  const dataStr = JSON.stringify(memories, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ai-memory-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// 导入记忆
const importMemory = () => {
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
        const { getItem, setItem } = require('@/utils/storage')
        const SUMMARY_KEY = 'ai-chat-summary'
        const current = getItem(SUMMARY_KEY) || {}
        const merged = { ...current, ...imported }
        setItem(SUMMARY_KEY, merged)
        alert('记忆导入成功！')
      } catch (err) {
        alert('导入失败：' + err.message)
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

const showLogoutDialog = ref(false)

// 显示退出登录弹窗
const openLogoutDialog = () => {
  showLogoutDialog.value = true
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('auth-token')
  localStorage.removeItem('token')
  window.location.href = '/'
}
</script>

<style scoped>
.page-content {
  background-color: var(--bg-gray);
}

.settings-section {
  margin-bottom: 16px;
}

.section-title {
  padding: 8px 16px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.settings-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-white);
  cursor: pointer;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
}

.settings-item:active {
  background-color: var(--bg-hover);
}

.settings-item.last-item {
  border-bottom: none;
}

.item-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-label {
  flex: 1;
  font-size: var(--font-size-md);
  color: var(--text-primary);
}

.item-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-arrow {
  font-size: 20px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.toggle-switch {
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background-color: #ccc;
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.toggle-switch.on {
  background-color: var(--wechat-green);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: white;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-switch.on .toggle-thumb {
  transform: translateX(18px);
}

.profile-item {
  padding: 14px 16px;
}

.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-nickname {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 4px;
}

.profile-hint {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* 简介弹窗 */
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
  height: 120px;
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

.background-modal-header {
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

.current-background-preview {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.preview-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.preview-box {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  overflow: hidden;
  background-color: #f5f5f5;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-color {
  width: 100%;
  height: 100%;
}

.saved-images-section {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.saved-images-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.saved-image-item {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
}

.saved-image-item.active {
  border-color: #5B8FF9;
}

.saved-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.file-input-overlay {
  display: none;
}

/* 记忆弹窗样式 */
.memory-modal .modal-body {
  max-height: 60vh;
}

.memory-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.memory-empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px 0;
}

.memory-item {
  background-color: var(--bg-gray);
  border-radius: 8px;
  padding: 12px;
}

.memory-char-name {
  font-size: var(--font-size-sm);
  color: var(--wechat-green);
  font-weight: 500;
  margin-bottom: 8px;
}

.memory-content {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
}

.memory-delete-btn {
  margin-top: 8px;
  padding: 4px 12px;
  font-size: var(--font-size-xs);
  color: #F56C6C;
  background-color: white;
  border: 1px solid #F56C6C;
  border-radius: 4px;
  cursor: pointer;
}

.memory-delete-btn:hover {
  background-color: #fef0f0;
}

.form-input {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid var(--bg-gray);
  outline: none;
  font-size: var(--font-size-md);
  background: transparent;
  box-sizing: border-box;
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 8px;
  line-height: 1.4;
}
</style>
