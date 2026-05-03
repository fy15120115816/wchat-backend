<template>
  <div 
    class="moment-card" 
    ref="cardRef"
    @touchstart.passive="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
    @contextmenu.prevent="handleDelete"
  >
    <div class="moment-header">
      <img :src="moment.userAvatar" :alt="moment.userName" class="moment-avatar" />
      <div class="moment-user-info">
        <span class="moment-name">{{ moment.userName }}</span>
        <span v-if="moment.isAI" class="ai-badge">AI</span>
      </div>
    </div>
    <div class="moment-content">
      <p class="moment-text">{{ moment.content }}</p>
      <div v-if="moment.images && moment.images.length" class="moment-images" :class="getImageGridClass(moment.images.length)">
        <img
          v-for="(img, i) in moment.images"
          :key="i"
          :src="img"
          class="moment-img"
          @click="handleImageClick(i)"
        />
      </div>
    </div>
    <div class="moment-footer">
      <span class="moment-time">{{ displayTime }}</span>
      <div class="more-container">
        <button class="more-btn" @click.stop="showActions = !showActions">
          <div class="more-dots-box">
            <span class="more-dot"></span>
            <span class="more-dot"></span>
            <span class="more-dot"></span>
          </div>
        </button>
        <transition name="actions-slide">
          <div v-show="showActions" class="moment-actions-panel">
            <div class="moment-actions">
              <button class="action-btn like-btn" :class="{ liked: moment.isLiked }" @click="handleLike">
                <HeartIcon :size="16" :filled="moment.isLiked" class="action-icon" :class="{ 'is-liked': moment.isLiked }" />
              </button>
              <span class="action-separator">|</span>
              <button class="action-btn comment-btn" @click.stop="handleComment">
                <CommentIcon :size="16" class="action-icon" />
              </button>
              <span v-if="moment.userId === 'me' || moment.isAI" class="action-separator">|</span>
              <button v-if="moment.userId === 'me' || moment.isAI" class="action-btn delete-btn" @click.stop="handleDelete">
                <DeleteIcon :size="16" class="action-icon delete-icon" />
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>
    <div class="moment-interactions">
      <div v-if="moment.likes && moment.likes.length > 0" class="likes">
        <span class="heart-filled">❤️</span> {{ formatLikes(moment.likes) }}
      </div>
      <MomentComment
        v-if="moment.comments && moment.comments.length > 0"
        :comments="moment.comments"
        :moment-id="moment.id"
        @delete-comment="emit('delete-comment', $event, moment.id)"
      />
    </div>

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="删除朋友圈"
      message="确定要删除这条朋友圈吗？"
      @confirm="handleConfirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MomentComment from './MomentComment.vue'
import HeartIcon from './icons/HeartIcon.vue'
import CommentIcon from './icons/CommentIcon.vue'
import DeleteIcon from './icons/DeleteIcon.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps({
  moment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['toggle-like', 'comment', 'image-click', 'delete', 'delete-comment'])

const showActions = ref(false)
const showDeleteConfirm = ref(false)
let pressTimer = null

const handleLike = () => {
  emit('toggle-like', props.moment.id)
  showActions.value = false
}

const handleDelete = () => {
  showActions.value = false
  showDeleteConfirm.value = true
}

const handleConfirmDelete = () => {
  showDeleteConfirm.value = false
  emit('delete', props.moment.id)
}

// 长按删除
const handleTouchStart = () => {
  if (!props.moment.isAI && props.moment.userId !== 'me') return
  pressTimer = setTimeout(() => {
    showDeleteConfirm.value = true
  }, 600)
}

const handleTouchEnd = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

const getImageGridClass = (count) => {
  if (count === 1) return 'grid-1'
  if (count === 2 || count === 4) return 'grid-2'
  if (count === 3) return 'grid-3'
  return 'grid-3'
}

const displayTime = computed(() => {
  if (!props.moment.timeTs) return props.moment.time
  const diff = Date.now() - props.moment.timeTs
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 2 * day) return '昨天'
  const d = new Date(props.moment.timeTs)
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
})

const handleComment = () => {
  showActions.value = false
  emit('comment', props.moment.id)
}

const handleImageClick = (index) => {
  emit('image-click', { momentId: props.moment.id, index })
}

const formatLikes = (likes) => {
  return likes.map(l => l.userName).join('、')
}
</script>

<style scoped>
.moment-card {
  background-color: var(--bg-white);
  padding: 16px;
  margin-bottom: 8px;
}

.moment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.moment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.moment-user-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.moment-name {
  font-size: var(--font-size-md);
  color: #5777A7;
  font-weight: 500;
}

.ai-badge {
  font-size: var(--font-size-xs);
  color: var(--wechat-green);
  background-color: rgba(7, 193, 96, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
}

.moment-content {
  margin-left: 50px;
}

.moment-text {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.moment-images {
  display: grid;
  gap: 4px;
  margin-bottom: 8px;
}

.moment-images.grid-1 {
  grid-template-columns: 1fr;
  max-width: 250px;
}

.moment-images.grid-2 {
  grid-template-columns: repeat(2, 1fr);
  max-width: 200px;
}

.moment-images.grid-3 {
  grid-template-columns: repeat(3, 1fr);
  max-width: 300px;
}

.moment-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.moment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: 50px;
  margin-top: 6px;
  position: relative;
}

.moment-time {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.more-container {
  position: relative;
  display: flex;
  align-items: center;
}

.more-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-dots-box {
  display: flex;
  gap: 3px;
  padding: 3px 6px;
  background-color: var(--bg-gray);
  border-radius: 4px;
}

.more-dot {
  width: 4px;
  height: 4px;
  background-color: var(--text-secondary);
  border-radius: 50%;
}

.moment-actions-panel {
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: 6px;
  background-color: #343536;
  border-radius: 4px;
  padding: 4px 8px;
  z-index: 1000;
}

.moment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-separator {
  color: rgba(255, 255, 255, 0.5);
}

.action-btn {
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  display: flex;
  align-items: center;
  gap: 0;
  color: #fff;
  background: none;
  border: none;
}

.action-btn .action-icon {
  color: #fff;
}

.action-btn .action-icon.is-liked {
  color: #F56C6C;
}

.delete-icon {
  color: #fff;
}

.delete-btn {
  cursor: pointer;
  opacity: 0.8;
}

.delete-btn:hover {
  opacity: 1;
}

.actions-slide-enter-active,
.actions-slide-leave-active {
  transition: all 0.2s ease;
}

.actions-slide-enter-from,
.actions-slide-leave-to {
  opacity: 0;
  transform: translateX(10px) translateY(-50%);
}

.moment-interactions {
  margin-left: 50px;
  margin-top: 8px;
  padding: 6px 10px;
  background-color: var(--bg-gray);
  border-radius: 4px;
}

.likes {
  font-size: var(--font-size-sm);
  color: #5777A7;
  margin-bottom: 4px;
}
</style>
