<template>
  <div class="page">
    <div class="page-header">
      <span class="back-btn" @click="$router.back()">
        <BackIcon :size="20" />
      </span>
      朋友圈
      <span class="publish-btn" @click="showPublish = true">
        <svg :size="24" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </span>
    </div>
    <div class="page-content hide-scrollbar" 
         @touchstart="handleTouchStart"
         @touchmove="handleTouchMove"
         @touchend="handleTouchEnd">
      <div class="moments-banner" :style="{ height: bannerHeight + 'px' }">
        <div class="banner-bg" @click="changeBackground" :style="{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : '', transform: bannerTransform }"></div>
        <div class="banner-user">
          <img :src="userStore.user.avatar" alt="我" class="banner-avatar" />
          <span class="banner-name">{{ userStore.user.nickname }}</span>
        </div>
      </div>
      <MomentCard
        v-for="m in momentsStore.moments"
        :key="m.id"
        :moment="m"
        @toggle-like="momentsStore.toggleLike(m.id)"
        @comment="momentsStore.openComment(m.id)"
        @delete="momentsStore.deleteMoment(m.id)"
        @delete-comment="(payload, momentId) => momentsStore.deleteComment(momentId, payload.index)"
      />
      <div v-if="momentsStore.moments.length === 0" class="empty-state">
        <div class="empty-icon">
          <EditIcon :size="48" />
        </div>
        <div class="empty-text">还没有人发朋友圈</div>
        <div class="empty-hint">点击右上角 <svg class="hint-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> 发布第一条</div>
    </div>
    </div>

    <div v-if="apiError" class="api-error">{{ apiError }}</div>

    <MomentsPublishModal
      :visible="showPublish"
      @close="showPublish = false"
      @publish="handlePublish"
    />

    <ConfirmDialog
      :visible="showConfirm"
      title="修改背景"
      message="是否要修改朋友圈背景图片？"
      @confirm="handleConfirmChange"
      @cancel="handleCancelChange"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMomentsStore } from '@/stores/moments'
import { useUserStore } from '@/stores/user'
import { useAiCharactersStore } from '@/stores/aiCharacters'
import MomentCard from '@/components/MomentCard.vue'
import MomentsPublishModal from '@/components/MomentsPublishModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import BackIcon from '@/components/icons/BackIcon.vue'
import MomentIcon from '@/components/icons/MomentIcon.vue'
import EditIcon from '@/components/icons/EditIcon.vue'
import AlertIcon from '@/components/icons/AlertIcon.vue'

const momentsStore = useMomentsStore()
const userStore = useUserStore()
const aiCharactersStore = useAiCharactersStore()
const showPublish = ref(false)
const apiError = ref('')
const backgroundImage = ref('')
const showConfirm = ref(false)

// 背景拉伸效果
const bannerTransform = ref('')
const bannerHeight = ref(180)
const touchStartY = ref(0)
const isPulling = ref(false)

// 加载保存的背景图片
const loadBackground = () => {
  const saved = localStorage.getItem('moments-background')
  if (saved) {
    backgroundImage.value = saved
  }
}

// 更换背景图片
const changeBackground = () => {
  showConfirm.value = true
}

// 确认更换背景
const handleConfirmChange = () => {
  showConfirm.value = false
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imgSrc = event.target.result
        backgroundImage.value = imgSrc
        localStorage.setItem('moments-background', imgSrc)
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

// 取消更换背景
const handleCancelChange = () => {
  showConfirm.value = false
}

// 触摸事件处理
const handleTouchStart = (e) => {
  const content = document.querySelector('.page-content')
  if (content && content.scrollTop === 0) {
    touchStartY.value = e.touches[0].clientY
    isPulling.value = true
  }
}

const handleTouchMove = (e) => {
  if (!isPulling.value) return
  
  const content = document.querySelector('.page-content')
  if (content && content.scrollTop > 0) {
    isPulling.value = false
    return
  }
  
  const touchY = e.touches[0].clientY
  const pullDistance = touchY - touchStartY.value
  
  if (pullDistance > 0) {
    // 限制拉伸距离，最多拉伸50px
    const maxPull = 50
    const pullAmount = Math.min(pullDistance * 0.5, maxPull)
    // 应用拉伸效果，只拉伸背景图片
    bannerTransform.value = `scaleY(${1 + pullAmount / 180})`
    // 同时增加banner高度，推动下面的内容
    bannerHeight.value = 180 + pullAmount
    e.preventDefault()
  }
}

const handleTouchEnd = () => {
  if (isPulling.value) {
    // 弹回动画
    bannerTransform.value = ''
    bannerHeight.value = 180
  }
  isPulling.value = false
}

const handlePublish = ({ content, images }) => {
  apiError.value = ''
  const post = momentsStore.addMoment(content, images)

  const autoReactChars = aiCharactersStore.characters.filter(c => c.autoReact)
  if (autoReactChars.length === 0) {
    apiError.value = '<span class=\'error-icon\'><AlertIcon :size=\'16\' /></span> 没有开启「朋友圈自动回复」的 AI 角色，请先去通讯录设置'
    setTimeout(() => { apiError.value = '' }, 3000)
    return
  }

  for (const char of autoReactChars) {
    momentsStore.queueReaction({
      momentId: post.id,
      charId: char.id,
      charName: char.name,
      persona: char.persona || '一个友善的朋友',
      charNote: char.note || '',
      userNickname: userStore.user.nickname,
      content: content || '[图片]'
    })
  }
  momentsStore.startReactionQueue()
}

// 页面加载时：对已有朋友圈中未评论的，加入后台队列
onMounted(() => {
  loadBackground()
  momentsStore.startReactionQueue()
  const autoReactChars = aiCharactersStore.characters.filter(c => c.autoReact)
  for (const char of autoReactChars) {
    for (const moment of momentsStore.moments) {
      // 只回复用户发的朋友圈（userId === 'me'）
      if (moment.userId !== 'me') continue
      const reacted = moment.comments.some(c => c.userId === `ai-${char.id}`)
      if (reacted) continue
      momentsStore.queueReaction({
        momentId: moment.id,
        charId: char.id,
        charName: char.name,
        persona: char.persona || '一个友善的朋友',
        charNote: char.note || '',
        userNickname: moment.userName,
        content: moment.content || '[图片]'
      })
    }
  }
})
</script>

<style scoped>
.page-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn {
  position: absolute;
  left: 16px;
  font-size: 20px;
  cursor: pointer;
}

.publish-btn {
  position: absolute;
  right: 16px;
  font-size: 20px;
  cursor: pointer;
}

.page-content {
  background-color: var(--bg-gray);
}

.moments-banner {
  position: relative;
  margin-bottom: 8px;
  overflow: hidden;
  transition: height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.banner-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  background-position: center;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: top;
}

.banner-user {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.banner-avatar {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  border: 2px solid white;
  object-fit: cover;
}

.banner-name {
  color: white;
  font-size: var(--font-size-md);
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  background: var(--bg-white);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.api-error {
  position: fixed;
  bottom: var(--tab-height);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  text-align: center;
  font-size: var(--font-size-sm);
  color: #F56C6C;
  padding: 8px 16px;
  background: rgba(245, 108, 108, 0.95);
  border-radius: 20px;
  z-index: 100;
}
</style>
