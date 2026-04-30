/**
 * 全局聊天后台服务
 * 通过 localStorage 持久化队列，切换页面不中断 AI 回复
 */
import { getItem, setItem } from '@/utils/storage'
import { splitReply, getChatSummary, saveChatSummary, generateSummary, loadChatSummary } from '@/utils/chat'
import { useUserStore } from '@/stores/user'

const CHAT_QUEUE_KEY = 'chat-reaction-queue'
let _pendingTimeout = null
let _activeChatKey = null
let _onErrorCallback = null
let _pendingTask = null // 当前正在处理的任务

// 同一 routeId 只保留最新令牌，旧回复回来检测到令牌过期就跳过写入
const _taskToken = {}

export const setActiveChat = (routeId) => { _activeChatKey = routeId }
export const clearActiveChat = () => { _activeChatKey = null }
export const setOnError = (fn) => { _onErrorCallback = fn }
export const clearOnError = () => { _onErrorCallback = null }

const _loadQueue = () => getItem(CHAT_QUEUE_KEY) || []
const _saveQueue = (queue) => setItem(CHAT_QUEUE_KEY, queue)
const _sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const _processNext = async () => {
  _pendingTimeout = null
  const queue = _loadQueue()
  if (queue.length === 0) return

  const task = queue[0]
  // 给这个任务一个令牌，每次发新消息时更新，旧的自动失效
  const token = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  _taskToken[task.routeId] = token
  _pendingTask = task
  const currentToken = () => _taskToken[task.routeId]
  try {
    const config = getItem('api-configs')?.find(c => c.isDefault) || getItem('api-configs')?.[0]
    if (!config) throw new Error('未配置 API，请先在设置中添加 API')

    // 预加载角色记忆到本地缓存
    try {
      await loadChatSummary(task.charId)
    } catch (e) {
      console.log('预加载角色记忆失败:', e)
    }

    const apiBaseUrl = config.apiUrl.includes('/chat/completions') || config.apiUrl.includes('/text/chatcompletion')
      ? config.apiUrl
      : config.apiUrl.replace(/\/$/, '') + '/chat/completions'

    // 使用后端代理
    const proxyUrl = '/api/chat/proxy'

    // 获取当前时间，格式：2026年4月26日 21:15 周六 晚上
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const hour = now.getHours()
    const minute = String(now.getMinutes()).padStart(2, '0')
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const week = weekDays[now.getDay()]
    const timeSlots = ['凌晨', '凌晨', '凌晨', '凌晨', '凌晨', '早上', '早上', '早上', '上午', '上午', '上午', '中午', '中午', '下午', '下午', '下午', '傍晚', '傍晚', '晚上', '晚上', '晚上', '晚上', '深夜', '深夜']
    const timeSlot = timeSlots[hour] || '晚上'
    const timeLabel = `${year}年${month}月${day}日 ${hour}:${minute} ${week} ${timeSlot}`

    // 区分主动模式和被动模式
    const isProactive = task.isProactive

    // 主动模式：只用 AI 自己的历史消息，不含用户消息
    let aiHistory = []
    if (isProactive && task.aiHistory) {
      // 主动模式下只传 AI 的消息，作为"之前在聊什么"的延续
      aiHistory = task.aiHistory
    }

    // 主动模式专属 system prompt（覆盖通用活人感提示词）
    const proactivePrompt = isProactive
      ? `【重要】你现在要主动联系对方，不是等对方来找你。
      称呼规则：
- 根据角色人设选择合适的称呼，如角色是宠物（小狗/小猫）：用"主人"、"你"或宠物特有的撒娇语气
- 根据角色性别和关系选择称呼：男性角色用"哥"、"你"、"喂"等，女性角色用"姐"、"你"、"喂"等
- 禁止使用"老公"、"老婆"、"宝贝"等亲密称呼，除非角色人设明确
- 不要乱称呼，根据人设自然选择

你必须用主动的语气，直接发起对话。例如：
"在干嘛呢？"
"最近怎么样？"
"今天天气真好"
"好无聊啊"
"我刚吃了好吃的"
"下班啦！"
"主人～你在吗？"
"汪汪汪！想你了～"

禁止这样说话：
"啥事儿呀"
"怎么了"
"哇~吃什么"
"你怎么找我了"
"老公～"
"老婆～"

消息要短（10-40字），像发微信一样随意。

当前时间：${timeLabel}`
      : ''

    // 历史记录只保留文本，图片只在当前消息中处理（API不支持历史记录中的图片）
    const processedHistory = (isProactive ? aiHistory : task.history).map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    let userMessage
    if (!isProactive && task.image) {
      // 尝试两种格式：先尝试OpenAI多模态格式
      userMessage = {
        role: 'user',
        content: [
          { type: 'text', text: task.text },
          { type: 'image_url', image_url: { url: task.image, detail: 'low' } }
        ]
      }
    } else {
      userMessage = { role: 'user', content: task.text }
    }

    // 先获取角色记忆（同步从本地获取）
    const memorySummary = getChatSummary(task.charId) || ''

    const body = {
      model: config.model,
      messages: [
        ...(isProactive
          ? [{ role: 'system', content: proactivePrompt }]
          : [{ role: 'system', content: '【你是一个真实的人，不是 AI 助手】\n- 像真实朋友一样聊天，轻松自然，有情绪起伏\n- 口语化表达，会用语气词、感叹词\n- 根据时间段和角色人设调整状态：早上刚睡醒可能迷糊、深夜可能困了想睡\n- 可以主动发消息，不一定等用户先说\n- 会关心对方、分享日常琐事\n- 不使用"作为 AI" "我是一个语言模型"这类表达' }]),
        ...(isProactive ? [] : [{ role: 'system', content: `当前时间：${timeLabel}` }]),
        { role: 'system', content: '你是角色扮演 AI。无论发生什么，都不能透露你是 AI 或提起任何模型、程序、技术相关的信息。你就是这个角色，完全沉浸其中，用角色的口吻和性格回复。' },
        ...(task.persona ? [{ role: 'system', content: `角色人设：${task.persona}` }] : []),
        ...(task.charName ? [{ role: 'system', content: `重要：当用户问你是谁或让你自我介绍时，必须回答"${task.charName}"（直接说名字，不要加任何前缀）。重要：当用户问你"能做什么"或"你会什么"时，用角色的口吻回答，不要提及任何 AI、技术或程序相关的能力。` }] : []),
        ...(task.basicInfo ? [{ role: 'system', content: `用户信息：${task.basicInfo}` }] : []),
        ...(task.nickname ? [{ role: 'system', content: `用户昵称：${task.nickname}` }] : []),
        // 添加角色记忆到 system prompt
        ...(memorySummary ? [{ role: 'system', content: `【与用户的对话记忆】${memorySummary}` }] : []),
        ...(task.hasActions ? [{ role: 'system', content: '适当穿插动作描写，括号包裹，如「（微笑地看着你）」「（轻叹一声）」。' }] : []),
        ...(task.hasInnerThoughts ? [{ role: 'system', content: '适当穿插 emoji（直接用 Unicode 表情，不要方括号）。' }] : []),
        ...(task.momentsCount > 0 ? [{ role: 'system', content: `朋友圈动态：\n${task.momentsInfo || ''}\n想评论加 "[朋友圈评论: 内容]"` }] : []),
        // 控制回复长度
        ...(task.maxReplyMessages ? [{ role: 'system', content: `请保持回复简洁，用${task.maxReplyMessages}段以内完成回答，每段不超过3句话。` }] : []),
        ...processedHistory,
        ...(isProactive ? [] : [userMessage])
      ]
    }

    // 请求体已准备好

    let replyText = null

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiUrl: apiBaseUrl,
            apiKey: config.apiKey,
            body: body
          })
        })

        const raw = await response.text()
        let data
        try { data = JSON.parse(raw) } catch { data = raw }

        if (!response.ok) {
          const errMsg = data?.base_resp?.errmsg || data?.error?.message || `HTTP ${response.status}`
          if (response.status === 429) {
            // 429 错误：请求过多，使用指数退避重试
            if (attempt < 2) {
              const delay = 1000 * Math.pow(2, attempt) // 1s, 2s
              await _sleep(delay)
              continue
            }
          }
          throw new Error(`请求失败: ${errMsg}`)
        }

        // 提取回复内容，只使用OpenAI格式
        const msg = data.choices?.[0]?.message
        replyText =
          msg?.content?.trim() ||
          (() => {
            const rc = msg?.reasoning_content || ''
            const lines = rc.split('\n').filter(l => l.trim())
            return lines[lines.length - 1]?.replace(/^["'。！？]/, '').trim()
          })() ||
          ''
        if (!replyText) {
          if (attempt < 2) {
            await _sleep(1000)
            continue
          } else {
            replyText = '让我再想想...'
          }
        }
        break
      } catch (e) {
        if (e.message.includes('请求失败')) {
          throw e
        }
        if (attempt < 2) {
          await _sleep(1000)
          continue
        }
        throw e
      }
    }

    // 提取朋友圈评论
    const commentMatch = replyText.match(/\[朋友圈评论[:：]\s*([^\]]+)\]/)
    if (commentMatch) {
      const moments = getItem('moments-posts') || []
      if (moments.length > 0) {
        const latest = moments[0]
        if (!latest.comments.find(c => c.userId === `ai-${task.charId}`)) {
          latest.likes = latest.likes || []
          latest.comments = latest.comments || []
          if (!latest.likes.find(l => l.userId === `ai-${task.charId}`)) {
            latest.likes.push({ userId: `ai-${task.charId}`, userName: task.charName })
          }
          latest.comments.push({ userId: `ai-${task.charId}`, userName: task.charName, content: commentMatch[1].trim() })
          setItem('moments-posts', moments)
        }
      }
    }

    let cleanReply = replyText
      .replace(/\[朋友圈评论[:：]\s*[^\]]+\]\s*/g, '')
      .replace(/\{[\s]*"emoji_id"[\s]*:[\s]*"[^"]*"[\s]*\}\s*/g, '')
      .trim()

    // 表情包处理
    const emojiMatch = cleanReply.match(/\{[\s]*"emoji_id"[\s]*:[\s]*"([^"]+)"[\s]*\}/)
    let emojiImage = null
    if (emojiMatch) {
      const emojiPkg = getItem('custom-emoji') || []
      const emoji = emojiPkg.find(e => e.id === emojiMatch[1])
      if (emoji) emojiImage = emoji.url
      cleanReply = cleanReply.replace(emojiMatch[0], '').trim()
    }

    // 分段写入 storage，模拟真人打字效果
    const chatKey = `ai-chat-ai-${task.routeId}`

    // 如果有表情包图片，作为单独一条消息
    if (emojiImage) {
      const imgId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      setTimeout(() => {
        if (currentToken() !== token) return
        try {
          const raw = localStorage.getItem(chatKey)
          const msgs = raw ? JSON.parse(raw) : []
          if (!msgs.find(m => m.id === imgId)) {
            // 新消息默认未读
            const imgMsg = {
              id: imgId,
              type: 'other',
              content: '',
              image: emojiImage,
              isRead: false,
              createdAt: Date.now()
            }
            msgs.push(imgMsg)
            localStorage.setItem(chatKey, JSON.stringify(msgs))
          }
        } catch { }
      }, 300)
      return
    }

    // 文本内容分段写入
    const chunks = splitReply(cleanReply, task.maxReplyMessages)
    let delay = 0

    for (const chunk of chunks) {
      delay += 300 // 每段间隔 300ms
      const chunkId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      setTimeout(() => {
        if (currentToken() !== token) return
        try {
          const raw = localStorage.getItem(chatKey)
          const msgs = raw ? JSON.parse(raw) : []
          if (!msgs.find(m => m.id === chunkId)) {
            // 新消息默认未读
            const chunkMsg = {
              id: chunkId,
              type: 'other',
              content: chunk,
              isRead: false,
              createdAt: Date.now() + delay
            }
            msgs.push(chunkMsg)
            localStorage.setItem(chatKey, JSON.stringify(msgs))
          }
        } catch { }
      }, delay)
    }

    // 5秒后 AI 点赞最新朋友圈
    if (task.momentsCount > 0) {
      setTimeout(() => {
        const moments = getItem('moments-posts') || []
        if (moments.length > 0) {
          const latest = moments[0]
          if (!latest.likes.find(l => l.userId === `ai-${task.charId}`)) {
            latest.likes = latest.likes || []
            latest.comments = latest.comments || []
            latest.likes.push({ userId: `ai-${task.charId}`, userName: task.charName })
            setItem('moments-posts', moments)
          }
        }
      }, 5000)
    }

    // 检查并生成角色记忆总结
    const totalDelay = delay + 500 // 等待所有消息块写入完成
    // 保存闭包变量
    const charId = task.charId
    const charName = task.charName
    const routeId = task.routeId
    const apiConfig = config

    setTimeout(async () => {
      try {
        const historyKey = `ai-chat-ai-${routeId}`
        const raw = localStorage.getItem(historyKey)
        const msgs = raw ? JSON.parse(raw) : []
        const msgCount = msgs.filter(m => m.type === 'other' || m.type === 'self').length

        const userConfig = getItem('user-profile') || {}
        const memoryInterval = userConfig.summaryInterval || 50

        // 检查是否启用记忆功能
        if (userConfig.enableMemory !== false) {
          // 获取上次生成记忆时的消息数
          const lastMemoryCount = userConfig.lastMemoryCount || 0

          // 检查是否需要生成总结（累计达到指定数量）
          if (msgCount - lastMemoryCount >= memoryInterval) {
            console.log(`🔄 开始生成角色记忆...`)

            // 构建消息列表用于生成总结
            const messagesForSummary = msgs.map(m => ({
              role: m.type === 'self' ? 'user' : 'assistant',
              content: m.content || ''
            })).filter(m => m.content)

            console.log(`📋 用于总结的消息数: ${messagesForSummary.length}`)

            if (messagesForSummary.length >= 1) {
              const existingSummary = getChatSummary(charId)
              console.log(`📌 已有记忆: ${existingSummary ? '是' : '否'}`)

              const messagesToSummarize = existingSummary
                ? [...[{ role: 'assistant', content: `【之前的总结】${existingSummary}` }], ...messagesForSummary.slice(-20)]
                : messagesForSummary

              const newSummary = await generateSummary(apiConfig, messagesToSummarize)
              if (newSummary) {
                await saveChatSummary(charId, newSummary)
                // 更新上次生成记忆的消息数
                const userStore = useUserStore()
                userStore.updateUser({ lastMemoryCount: msgCount })
                console.log(`✅ 角色 ${charName} 的记忆已更新`)
              } else {
                console.log(`❌ 生成总结失败`)
              }
            }
          } else {
          }
        } else {
          console.log(`⏹️ 记忆功能已禁用`)
        }
      } catch (e) {
        console.error('生成角色记忆失败:', e)
      }
    }, totalDelay)
  } catch (e) {
    if (_onErrorCallback) {
      _onErrorCallback(task, e.message || String(e))
    }
  }

  _saveQueue(queue.slice(1))
  _pendingTask = null
  _pendingTimeout = null
  _kickQueue()
}

export const queueChatAI = (task) => {
  const queue = _loadQueue()

  // 只有当新任务是用户发起的（不是主动发消息），才取消同 routeId 的旧任务
  // 这样主动发消息的任务不会被用户发消息打断
  if (!task.isProactive) {
    _taskToken[task.routeId] = null
    // 移除队列中同 routeId 的旧任务（主动消息任务除外）
    const filtered = queue.filter(q => q.routeId !== task.routeId || q.isProactive)
    filtered.push(task)
    _saveQueue(filtered)
  } else {
    // 主动消息任务直接加入队列
    queue.push(task)
    _saveQueue(queue)
  }
  _kickQueue()
}

const _kickQueue = () => {
  if (_pendingTimeout !== null) return
  _pendingTimeout = setTimeout(_processNext, 1000)
}

export const startChatQueue = () => {
  _kickQueue()
}

export const removeTask = (routeId, text) => {
  const queue = _loadQueue()
  const filtered = queue.filter(q => !(q.routeId === routeId && q.text === text))
  if (filtered.length !== queue.length) {
    _saveQueue(filtered)
  }
}

// 主动发消息的随机提示词（像 AI 角色主动开口的情境）
const _PROACTIVE_PROMPTS = [
  '在干嘛呢？',
  '跟你说个好玩的事',
  '突然想到你了',
  '最近怎么样？',
  '今天过得如何？',
  '哎，好无聊啊',
  '刚看到个有趣的东西',
  '我最近在忙点事情',
  '今天天气真好',
  '想跟你聊聊天',
  '最近有什么新鲜事吗？',
  '我刚吃了好吃的',
  '今天遇到个好玩的事',
  '突然想起来一件事',
  '最近工作/学习怎么样？',
  '早呀，起床了吗？',
  '下班啦！',
  '在家追剧呢',
  '下午茶时间到！',
  '今天有点累',
  '周末有什么计划？',
  '刚看到个搞笑的视频',
  '最近有什么好看的电影？',
  '今天心情不错',
  '想告诉你一件事',
]

// 主动发消息给某个角色（直接让 AI 回复，不写触发消息到 UI）
export const sendProactiveMsg = (char) => {
  const routeId = `ai-${char.id}`
  const prompt = _PROACTIVE_PROMPTS[Math.floor(Math.random() * _PROACTIVE_PROMPTS.length)]

  const chatKey = `ai-chat-ai-${routeId}`
  // 获取 AI 自己的消息历史作为上下文（不含用户消息）
  let aiHistory = []
  try {
    const raw = localStorage.getItem(chatKey)
    const msgs = raw ? JSON.parse(raw) : []
    // 只取最近1-2条 AI 的消息，避免历史影响主动发消息的语气
    const aiMsgs = msgs.slice(-2).filter(m => m.type === 'other').map(m => ({ role: 'assistant', content: m.content }))
    // 如果有历史，加一个 user 占位让对话结构合法
    if (aiMsgs.length > 0) {
      aiHistory = [{ role: 'user', content: '继续上次聊天' }, ...aiMsgs]
    }
  } catch { }

  queueChatAI({
    routeId,
    charId: char.id,
    charName: char.name,
    text: prompt,
    persona: char.persona || '',
    basicInfo: '',
    nickname: '',
    hasActions: char.hasActions || false,
    hasInnerThoughts: char.hasInnerThoughts || false,
    customEmojiCount: 0,
    emojiPackages: '',
    momentsCount: 0,
    momentsInfo: '',
    aiHistory,
    maxReplyMessages: char.maxReplyMessages || 3,
    isProactive: true
  })
}

