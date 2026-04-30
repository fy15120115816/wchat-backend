import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItem, setItem } from '@/utils/storage'

const STORAGE_KEY = 'moments-posts'
const REACTION_QUEUE_KEY = 'moments-reaction-queue'
const AI_MOMENTS_QUEUE_KEY = 'ai-moments-queue'
let _pendingTimeout = null
let _aiMomentsInterval = null

// 后端 API 配置
const BASE_URL = 'https://wchat-backend-production.up.railway.app/api'

function getToken() {
  return localStorage.getItem('auth-token')
}

async function apiRequest(url, options = {}) {
  const token = getToken()
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...options
  }
  const response = await fetch(`${BASE_URL}${url}`, defaultOptions)
  return response.json()
}

export const useMomentsStore = defineStore('moments', () => {
  const moments = ref([])

  const overlay = ref({ show: false, type: '', text: '', targetId: null, targetName: '' })

  const getUser = () => {
    return getItem('user-profile') || { nickname: '我的昵称', avatar: 'https://picsum.photos/seed/me/100/100', basicInfo: '' }
  }

  const saveMoments = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(moments.value))
  }

  // ========== 后端 API 方法 ==========

  // 从后端加载朋友圈
  const fetchMoments = async () => {
    try {
      const result = await apiRequest('/moment')
      if (result.success) {
        moments.value = result.data.map(m => ({
          ...m,
          id: m._id,
          time: formatTime(m.createdAt),
          timeTs: new Date(m.createdAt).getTime(),
          isLiked: m.likes.includes('me')
        }))
        saveMoments()
      }
    } catch (error) {
      console.error('获取朋友圈失败:', error)
    }
  }

  // 发布朋友圈（到后端）
  const addMoment = async (content, images = []) => {
    const user = getUser()
    const post = {
      id: Date.now().toString(),
      userId: 'me',
      userName: user.nickname,
      userAvatar: user.avatar,
      content,
      images,
      time: '刚刚',
      timeTs: Date.now(),
      likes: [],
      comments: [],
      isLiked: false
    }

    // 先保存到本地
    moments.value.unshift(post)
    saveMoments()

    // 尝试保存到后端
    try {
      await apiRequest('/moment', {
        method: 'POST',
        body: JSON.stringify({ content, images, userName: user.nickname, userAvatar: user.avatar })
      })
    } catch (error) {
      console.error('发布朋友圈失败:', error)
    }

    return post
  }

  // 删除朋友圈（从后端）
  const deleteMoment = async (momentId) => {
    // 先从本地删除
    moments.value = moments.value.filter(m => m.id !== momentId)
    saveMoments()

    // 尝试从后端删除
    try {
      await apiRequest(`/moment/${momentId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('删除朋友圈失败:', error)
    }
  }

  // 点赞/取消点赞（到后端）
  const toggleLike = async (momentId) => {
    const moment = moments.value.find(m => m.id === momentId)
    if (!moment) return

    if (moment.isLiked) {
      moment.likes = moment.likes.filter(l => l.userId !== 'me')
      moment.isLiked = false
    } else {
      const user = getUser()
      moment.likes.push({ userId: 'me', userName: user.nickname })
      moment.isLiked = true
    }
    saveMoments()

    // 尝试同步到后端
    try {
      await apiRequest(`/moment/${momentId}/like`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  // 添加评论（到后端）
  const addComment = async (momentId, comment) => {
    const moment = moments.value.find(m => m.id === momentId)
    if (!moment) return
    const user = getUser()
    moment.comments.push({ userId: 'me', userName: user.nickname, content: comment })
    saveMoments()

    // 尝试同步到后端
    try {
      await apiRequest(`/moment/${momentId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ content: comment, userName: user.nickname, userAvatar: user.avatar })
      })
    } catch (error) {
      console.error('评论失败:', error)
    }
  }

  // 辅助方法：格式化时间
  const formatTime = (dateStr) => {
    const now = Date.now()
    const ts = new Date(dateStr).getTime()
    const diff = now - ts
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return '昨天'
  }

  // ========== 后台评论队列 ==========
  const _loadQueue = () => getItem(REACTION_QUEUE_KEY) || []
  const _saveQueue = (queue) => setItem(REACTION_QUEUE_KEY, queue)

  const _processQueue = () => {
    const queue = _loadQueue()
    if (queue.length === 0) { _pendingTimeout = null; return }

    const task = queue[0]
    _doReaction(task, () => {
      _saveQueue(queue.slice(1))
      _pendingTimeout = setTimeout(_processQueue, 500)
    }, () => {
      _saveQueue(queue.slice(1))
      _pendingTimeout = setTimeout(_processQueue, 500)
    })
  }

  const _doReaction = async (task, onSuccess, onFailure) => {
    try {
      const config = getItem('api-configs')?.find(c => c.isDefault) || getItem('api-configs')?.[0]
      if (!config) { onFailure(); return }

      const apiBaseUrl = config.apiUrl.includes('/chat/completions')
        ? config.apiUrl
        : config.apiUrl.replace(/\/$/, '') + '/chat/completions'

      const response = await fetch(apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: `你扮演的角色设定如下，请严格按这个人设来回复：\n${task.persona || '一个友善的朋友'}` },
            { role: 'user', content: `用户（昵称：${task.userNickname}）的朋友圈动态：\n「${task.content}${task.charNote ? '\n备注：' + task.charNote : ''}」\n\n请以角色的口吻、性格和说话风格，对这条朋友圈发表一句简短的评论（10-30字）。评论要符合角色人设，自然、真实，不要加引号、不要加任何格式标记，直接输出评论内容。` }
          ]
        })
      })
      if (!response.ok) { onFailure(); return }
      const data = await response.json()
      const comment = data.choices?.[0]?.message?.content?.trim()
      if (!comment) { onFailure(); return }

      const moment = moments.value.find(m => m.id === task.momentId)
      if (moment) {
        if (!moment.likes.find(l => l.userId === `ai-${task.charId}`)) {
          moment.likes.push({ userId: `ai-${task.charId}`, userName: task.charName })
        }
        moment.comments.push({ userId: `ai-${task.charId}`, userName: task.charName, content: comment })
        saveMoments()
      }
      onSuccess()
    } catch {
      onFailure()
    }
  }

  // ========== 业务方法 ==========

  const loadMoments = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      moments.value = data ? JSON.parse(data) : []
      const user = getUser()
      const characters = getItem('ai-characters') || []
      moments.value.forEach(m => {
        if (m.userId === 'me') {
          m.userName = user.nickname
          m.userAvatar = user.avatar
        } else if (m.userId.startsWith('ai-')) {
          // 同步角色头像
          const charId = m.userId.replace('ai-', '')
          const char = characters.find(c => c.id === charId)
          if (char) {
            m.userName = char.name
            m.userAvatar = char.avatar
          }
        }
      })
      saveMoments()
    } catch {
      moments.value = []
    }
  }

  const deleteComment = (momentId, commentIndex) => {
    const moment = moments.value.find(m => m.id === momentId)
    if (!moment) return
    moment.comments.splice(commentIndex, 1)
    saveMoments()
  }

  const openComment = (momentId) => {
    const moment = moments.value.find(m => m.id === momentId)
    overlay.value = {
      show: true,
      type: 'comment',
      targetId: momentId,
      targetName: moment?.userName || '',
      text: ''
    }
  }

  const openDelete = (momentId) => {
    overlay.value = { show: true, type: 'delete', targetId: momentId, text: '' }
  }

  const closeOverlay = () => {
    overlay.value.show = false
  }

  const submitOverlayComment = () => {
    if (!overlay.value.text.trim()) return
    addComment(overlay.value.targetId, overlay.value.text.trim())
    closeOverlay()
  }

  const aiReact = (momentId, charId, charName, comment) => {
    const moment = moments.value.find(m => m.id === momentId)
    if (!moment) return
    if (!moment.likes.find(l => l.userId === `ai-${charId}`)) {
      moment.likes.push({ userId: `ai-${charId}`, userName: charName })
    }
    if (comment) {
      moment.comments.push({ userId: `ai-${charId}`, userName: charName, content: comment })
    }
    saveMoments()
  }

  const confirmOverlayDelete = () => {
    if (overlay.value.targetId) {
      deleteMoment(overlay.value.targetId)
      closeOverlay()
    }
  }

  // 加入评论队列
  const queueReaction = (reaction) => {
    const queue = _loadQueue()
    if (queue.find(r => r.momentId === reaction.momentId && r.charId === reaction.charId)) return
    queue.push(reaction)
    _saveQueue(queue)
    _kickQueue()
  }

  // 启动队列处理（setTimeout 链，不使用 setInterval）
  const _kickQueue = () => {
    if (_pendingTimeout !== null) return
    _pendingTimeout = setTimeout(_processQueue, 2000)
  }

  const startReactionQueue = () => {
    _kickQueue()
  }

  // ========== AI 自动发朋友圈 ==========

  const _loadAIMomentsQueue = () => getItem(AI_MOMENTS_QUEUE_KEY) || []
  const _saveAIMomentsQueue = (queue) => setItem(AI_MOMENTS_QUEUE_KEY, queue)

  const postMomentAsAI = async ({ charId, charName, charAvatar, persona }) => {
    try {
      const config = getItem('api-configs')?.find(c => c.isDefault) || getItem('api-configs')?.[0]
      if (!config) {
        return { success: false, error: '请先配置 API' }
      }

      const apiBaseUrl = config.apiUrl.includes('/chat/completions')
        ? config.apiUrl
        : config.apiUrl.replace(/\/$/, '') + '/chat/completions'

      const user = getUser()
      const userBasicInfo = user.basicInfo || ''

      const response = await fetch(apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: `你是一个真实的人，正在使用朋友圈分享生活。你的角色设定如下：
${persona}

${userBasicInfo ? `你的好友（用户）简介：${userBasicInfo}` : ''}

请根据你的角色性格、爱好、日常生活，发布一条真实自然的朋友圈动态。要求：
1. 内容要符合角色性格，真实自然
2. 可以是日常生活、心情、感悟、趣事等
3. 不要太长，20-50字即可
4. 不要加引号、不要加任何格式标记
5. 直接输出朋友圈内容文本即可`
            },
            { role: 'user', content: '请发布一条朋友圈动态' }
          ]
        })
      })

      if (!response.ok) {
        return { success: false, error: 'API 请求失败' }
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        return { success: false, error: '生成内容失败' }
      }

      const post = {
        id: Date.now().toString(),
        userId: `ai-${charId}`,
        userName: charName,
        userAvatar: charAvatar || `https://picsum.photos/seed/${charId}/100/100`,
        content,
        images: [],
        time: '刚刚',
        timeTs: Date.now(),
        likes: [],
        comments: [],
        isLiked: false,
        isAI: true
      }

      moments.value.unshift(post)
      saveMoments()

      // 尝试保存到后端
      try {
        await apiRequest('/moment', {
          method: 'POST',
          body: JSON.stringify({
            content,
            images: [],
            userName: charName,
            userAvatar: charAvatar || '',
            isAI: true
          })
        })
      } catch (error) {
        console.error('发布 AI 朋友圈失败:', error)
      }

      return { success: true, content }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  const scheduleAIMoments = () => {
    if (_aiMomentsInterval) {
      clearInterval(_aiMomentsInterval)
    }

    const checkAndPost = async () => {
      const userSettings = getItem('user-profile') || {}
      if (!userSettings.autoPostMoments) return

      const characters = getItem('ai-characters') || []
      const now = Date.now()

      for (const char of characters) {
        if (!char.autoPostMoments) continue

        const lastPostKey = `last-ai-moment-${char.id}`
        const lastPost = localStorage.getItem(lastPostKey)
        const lastPostTime = lastPost ? parseInt(lastPost) : 0

        let interval = 0
        switch (char.momentsFrequency) {
          case 'daily':
            interval = 24 * 60 * 60 * 1000
            break
          case 'often':
            interval = 8 * 60 * 60 * 1000
            break
          case 'occasional':
            interval = 24 * 60 * 60 * 1000 * 2
            break
          default:
            interval = 8 * 60 * 60 * 1000
        }

        if (now - lastPostTime >= interval) {
          const result = await postMomentAsAI({
            charId: char.id,
            charName: char.name,
            charAvatar: char.avatar,
            persona: char.persona
          })

          if (result.success) {
            localStorage.setItem(lastPostKey, now.toString())
          }
        }
      }
    }

    _aiMomentsInterval = setInterval(checkAndPost, 60 * 60 * 1000)
    checkAndPost()
  }

  const startAIMomentsScheduler = () => {
    scheduleAIMoments()
  }

  loadMoments()

  return {
    moments,
    overlay,
    getUser,
    addMoment,
    deleteMoment,
    toggleLike,
    deleteComment,
    addComment,
    openComment,
    openDelete,
    closeOverlay,
    submitOverlayComment,
    confirmOverlayDelete,
    aiReact,
    queueReaction,
    startReactionQueue,
    postMomentAsAI,
    startAIMomentsScheduler,
    // 后端 API 方法
    fetchMoments
  }
})
