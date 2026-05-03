import { getItem, setItem } from './storage'

const HISTORY_KEY = 'ai-chat-history'
const SUMMARY_KEY = 'ai-chat-summary'  // 存储对话总结
const USER_KEY = 'user-profile'  // 用户配置key

// 获取用户配置
function getUserConfig() {
  return getItem(USER_KEY) || {}
}

/**
 * 获取某个角色的对话历史
 */
export function getChatHistory(characterId) {
  const all = getItem(HISTORY_KEY) || {}
  return all[characterId] || []
}

/**
 * 保存某个角色的完整对话历史
 */
export function saveChatHistory(characterId, messages) {
  const all = getItem(HISTORY_KEY) || {}
  all[characterId] = messages
  setItem(HISTORY_KEY, all)
}

/**
 * 追加一条消息到对话历史
 */
export function appendMessage(characterId, message) {
  const history = getChatHistory(characterId)
  history.push(message)
  saveChatHistory(characterId, history)
  return history
}

/**
 * 调用 AI API 并返回回复内容（等完整响应，不使用流式）
 * @param {Object} config - API 配置 { apiUrl, apiKey, model }
 * @param {Object} character - AI 角色 { persona }
 * @param {string} userMessage - 用户发送的消息
 * @param {Array} history - 历史消息 [{ role, content }]
 * @param {string} [summary] - 对话总结（可选）
 * @returns {Promise<string>} AI 回复内容
 */
export async function sendToAI(config, character, userMessage, history, summary) {
  // 构建完整的消息列表
  const messages = buildMessagesForAI(character, userMessage, history, summary)

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages
    })
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // 兼容 OpenAI 格式
  const reply = data.choices?.[0]?.message?.content
  if (!reply) {
    throw new Error('API 返回格式异常')
  }

  return reply
}

/**
 * 获取某个角色的对话总结
 */
export function getChatSummary(characterId) {
  const all = getItem(SUMMARY_KEY) || {}
  return all[characterId] || ''
}

/**
 * 从后端获取角色的对话总结
 */
export async function getChatSummaryFromBackend(characterId) {
  try {
    const token = localStorage.getItem('auth-token')
    if (!token) return ''

    const response = await fetch(`https://wchat-backend-production.up.railway.app/api/character/${characterId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await response.json()
    if (result.success && result.data?.memory) {
      return result.data.memory
    }
  } catch (error) {
    console.error('从后端获取角色记忆失败:', error)
  }
  return ''
}

/**
 * 保存某个角色的对话总结
 */
export async function saveChatSummary(characterId, summary) {
  const all = getItem(SUMMARY_KEY) || {}
  all[characterId] = summary
  setItem(SUMMARY_KEY, all)

  try {
    const token = localStorage.getItem('auth-token')
    if (!token) return

    const response = await fetch(`https://wchat-backend-production.up.railway.app/api/character/${characterId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ memory: summary })
    })
    const result = await response.json()
    if (result.success) {
      console.log('✅ 角色记忆已保存到后端')
    }
  } catch (error) {
    console.error('保存角色记忆到后端失败:', error)
  }
}

/**
 * 加载角色记忆（优先从本地，本地没有则从后端获取）
 */
export async function loadChatSummary(characterId) {
  let summary = getChatSummary(characterId)
  if (summary) {
    return summary
  }
  summary = await getChatSummaryFromBackend(characterId)
  if (summary) {
    const all = getItem(SUMMARY_KEY) || {}
    all[characterId] = summary
    setItem(SUMMARY_KEY, all)
  }
  return summary
}

/**
 * 生成对话总结
 * @param {Object} config - API 配置
 * @param {Array} messages - 要总结的消息列表
 * @returns {Promise<string>} 总结内容
 */
export async function generateSummary(config, messages) {
  // 构建完整的 API 地址
  const apiUrl = config.apiUrl.includes('/chat/completions') || config.apiUrl.includes('/text/chatcompletion')
    ? config.apiUrl
    : config.apiUrl.replace(/\/$/, '') + '/chat/completions'

  // 只取文本内容
  const textContent = messages
    .map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
    .join('\n')

  const prompt = `请总结以下对话内容，用简洁的语言概括主要话题和关键点：

${textContent}

---
总结：`

  const requestBody = {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: '你是一个专业的对话总结助手。请用简洁、准确的语言总结对话内容。'
      },
      { role: 'user', content: prompt }
    ]
  }

  // 使用后端代理
  const response = await fetch('https://wchat-backend-production.up.railway.app/api/chat/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      apiUrl: apiUrl,
      apiKey: config.apiKey,
      body: requestBody
    })
  })

  if (!response.ok) {
    throw new Error(`总结请求失败: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const summary = data.choices?.[0]?.message?.content
  if (!summary) {
    throw new Error('总结返回格式异常')
  }

  return summary.trim()
}

/**
 * 检查是否需要生成新的总结
 * @param {number} messageCount - 当前消息总数
 * @returns {boolean}
 */
export function needSummary(messageCount) {
  const config = getUserConfig()
  const interval = config.summaryInterval || 50
  return messageCount > 0 && messageCount % interval === 0
}

/**
 * 生成并保存对话总结
 * @param {string} characterId - 角色ID
 * @param {Array} messages - 对话消息列表
 * @returns {Promise<string|null>} 返回生成的总结或null
 */
export async function generateAndSaveSummary(characterId, messages) {
  if (messages.length < 10) return null

  try {
    const config = getItem('api-configs')?.find(c => c.isDefault) || getItem('api-configs')?.[0]
    if (!config) {
      console.log('未配置 API，跳过总结生成')
      return null
    }

    const summary = await generateSummary(config, messages)
    if (summary) {
      await saveChatSummary(characterId, summary)
      console.log('✅ 对话总结已生成并保存')
      return summary
    }
  } catch (error) {
    console.error('生成对话总结失败:', error)
  }
  return null
}

/**
 * 构建发送给 AI 的消息（包含历史和总结）
 * @param {Object} character - AI 角色
 * @param {string} userMessage - 用户消息
 * @param {Array} history - 历史消息
 * @param {string} summary - 对话总结
 * @returns {Array} 完整的消息列表
 */
export function buildMessagesForAI(character, userMessage, history, summary) {
  const messages = []

  // system prompt：角色人设
  if (character.persona) {
    messages.push({ role: 'system', content: character.persona })
  }

  // 如果有总结，添加到 system prompt 中
  if (summary) {
    messages.push({
      role: 'system',
      content: `【对话总结】${summary}`
    })
  }

  // 历史消息（只保留最近的部分，避免超出上下文窗口）
  // 如果有总结，可以适当减少历史消息数量
  const historyToSend = summary
    ? history.slice(-SUMMARY_INTERVAL)  // 有总结时只保留最近一轮
    : history

  messages.push(...historyToSend)

  // 当前用户消息
  messages.push({ role: 'user', content: userMessage })

  return messages
}

/**
 * 将 AI 回复内容切分成多段，模拟真人打字效果
 * @param {string} content - 完整回复内容
 * @param {number} [maxChunks] - 可选，最多返回多少段
 * @returns {string[]} 分段数组
 */
export function splitReply(content, maxChunks) {
  if (!content) return []

  // 每段最大长度（限制单条消息长度）
  const MAX_CHUNK_LENGTH = 50
  // 总最大长度（限制整个回复长度）
  const MAX_TOTAL_LENGTH = 150

  // 先截断总长度
  const trimmedContent = content.length > MAX_TOTAL_LENGTH
    ? content.substring(0, MAX_TOTAL_LENGTH).replace(/[^。？！\n]+$/, '') + '...'
    : content

  // 按句子边界分割：句号、问号、感叹号、换行、表情符号
  // 保留分割符在每段末尾
  const sentences = trimmedContent.split(/(?<=[。？！\n])(?=[^。？！\n])/g)

  const chunks = []
  let buffer = ''

  for (const s of sentences) {
    const trimmed = s.trim()
    if (!trimmed) continue

    // 如果加上当前句子会超过单段最大长度
    if (buffer.length + trimmed.length > MAX_CHUNK_LENGTH && buffer.length > 0) {
      // 如果当前buffer不为空，先输出
      chunks.push(buffer.trim())
      buffer = ''
    }

    // 如果单句本身就超过最大长度，分割它
    if (trimmed.length > MAX_CHUNK_LENGTH) {
      // 如果buffer有内容，先输出
      if (buffer) {
        chunks.push(buffer.trim())
        buffer = ''
      }
      // 按最大长度分割长句
      let start = 0
      while (start < trimmed.length) {
        // 找到合适的分割点（优先在标点处分割）
        let end = Math.min(start + MAX_CHUNK_LENGTH, trimmed.length)
        // 如果不是最后一段，尝试在标点处分割
        if (end < trimmed.length) {
          const lastPunctuation = trimmed.lastIndexOf('。', end)
          if (lastPunctuation > start + 10) {
            end = lastPunctuation + 1
          }
        }
        chunks.push(trimmed.substring(start, end).trim())
        start = end
      }
    } else {
      buffer += trimmed
    }
  }

  // 把剩余 buffer 也作为一段（即使很短）
  if (buffer.trim()) {
    chunks.push(buffer.trim())
  }

  // 限制最大段数（如果有设置）
  if (maxChunks && chunks.length > maxChunks) {
    // 截断多余的段
    chunks.splice(maxChunks)
    // 在最后一段末尾加省略号
    if (chunks.length > 0 && !chunks[chunks.length - 1].endsWith('...')) {
      chunks[chunks.length - 1] = chunks[chunks.length - 1] + '...'
    }
  }

  return chunks
}
