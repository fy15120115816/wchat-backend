// 聊天列表数据（已清空，用户创建的 AI 角色会动态显示）
export const mockChats = []

// 聊天消息数据
export const mockMessages = {
  1: [
    { id: 1, type: 'other', content: '你好，在吗？', time: '10:20' },
    { id: 2, type: 'self', content: '在的，有什么事情吗？', time: '10:21' },
    { id: 3, type: 'other', content: '想约你明天一起开会，讨论一下项目进度', time: '10:22' },
    { id: 4, type: 'self', content: '好的，明天几点？', time: '10:23' },
    { id: 5, type: 'other', content: '上午 10 点怎么样？', time: '10:25' },
    { id: 6, type: 'self', content: '没问题！', time: '10:26' },
    { id: 7, type: 'self', content: '好的，明天见！', time: '10:30' }
  ],
  2: [
    { id: 1, type: 'other', content: '这个功能很有意思', time: '15:30' }
  ],
  3: [
    { id: 1, type: 'other', content: '你好！我是 AI 助手小智', time: '09:00' },
    { id: 2, type: 'self', content: '你好小智，你能做什么？', time: '09:01' },
    { id: 3, type: 'other', content: '我可以帮你回答问题、聊天、创作内容等等，有什么我可以帮助你的吗？', time: '09:02' }
  ],
  4: [
    { id: 1, type: 'other', content: '[图片]', time: '14:00', image: 'https://picsum.photos/200/200?random=1' }
  ],
  5: [
    { id: 1, type: 'other', sender: '赵六', content: '大家好，讨论一下下周的迭代计划', time: '14:00' },
    { id: 2, type: 'other', sender: '张三', content: '好的，我整理一下这周的进度', time: '14:05' },
    { id: 3, type: 'other', sender: '钱七', content: '我这边有个 bug 需要支援', time: '14:10' },
    { id: 4, type: 'self', content: '@钱七 什么情况？', time: '14:12' },
    { id: 5, type: 'other', sender: '钱七', content: '讨论一下下周的迭代计划', time: '14:15' }
  ],
  6: [
    { id: 1, type: 'other', content: '嗨~今天心情不错呢~', time: '10:00' },
    { id: 2, type: 'self', content: '为什么呀？', time: '10:01' },
    { id: 3, type: 'other', content: '因为天气很好呀！你呢？', time: '10:02' }
  ],
  7: [
    { id: 1, type: 'self', content: '那个需求文档你看了吗？', time: '11:00' },
    { id: 2, type: 'other', content: '收到，我处理一下', time: '11:05' }
  ],
  8: [
    { id: 1, type: 'other', content: '周末一起吃饭吗？', time: '09:00' },
    { id: 2, type: 'self', content: '可以呀，去哪里吃？', time: '09:05' }
  ]
}

// 通讯录数据（已清空，用户创建的 AI 角色动态显示）
export const mockContacts = {}

// 朋友圈数据（已清空，用户动态发布）
export const mockMoments = []

// 设置页数据
export const mockSettings = [
  {
    title: '个人账户',
    items: [
      { icon: '👤', label: '头像和昵称', arrow: true },
      { icon: '🔔', label: '消息通知', arrow: true }
    ]
  },
  {
    title: '通用',
    items: [
      { icon: '🖼️', label: '聊天背景', arrow: true },
      { icon: '🔒', label: '聊天隐私', arrow: true },
      { icon: '🗣️', label: '语音和视频', arrow: true }
    ]
  },
  {
    title: '账号和安全',
    items: [
      { icon: '📱', label: '绑定手机', arrow: true },
      { icon: '🔑', label: '修改密码', arrow: true }
    ]
  },
  {
    title: '其他',
    items: [
      { icon: 'ℹ️', label: '关于小微信', arrow: true },
      { icon: '🌙', label: '深色模式', arrow: false, isSwitch: true }
    ]
  }
]
