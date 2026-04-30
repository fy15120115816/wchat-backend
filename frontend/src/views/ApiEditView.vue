<template>
  <div class="page">
    <div class="page-header">
      <span class="back-btn" @click="$router.back()">
        <BackIcon :size="20" />
      </span>
      {{ isEdit ? '编辑 API' : '添加 API' }}
    </div>
    <div class="page-content hide-scrollbar" style="background: var(--bg-white);">
      <div class="form-section">
        <div class="form-label">配置名称</div>
        <input class="form-input" v-model="form.name" placeholder="例如：SiliconFlow" />
      </div>
      <div class="form-section">
        <div class="form-label">API 地址</div>
        <input class="form-input" v-model="form.apiUrl" placeholder="https://api.siliconflow.com/v1/chat/completions" />
      </div>
      <div class="form-section">
        <div class="form-label">API Key</div>
        <input class="form-input" v-model="form.apiKey" type="password" placeholder="sk-xxxxxxxx" />
      </div>
      <div class="form-section">
        <div class="form-label">模型名称</div>
        <input class="form-input" v-model="form.model" placeholder="手动输入模型名称" />
      </div>

      <div class="form-section">
        <div class="form-label">常用模型</div>
        <div class="dropdown-wrapper">
          <select class="dropdown-select" v-model="selectedCommonModel" @change="handleSelectCommonModel">
            <option value="">选择常用模型</option>
            <option v-for="m in commonModels" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <button class="btn-fetch" @click="handleFetchModels" :disabled="fetchingModels">
          {{ fetchingModels ? '获取中...' : '📡 获取可用模型' }}
        </button>
      </div>

      <!-- 从API获取的模型下拉菜单 -->
      <div v-if="modelList.length > 0" class="form-section">
        <div class="form-label">API 可用模型</div>
        <div class="dropdown-wrapper">
          <select class="dropdown-select" v-model="selectedApiModel" @change="handleSelectApiModel">
            <option value="">选择 API 模型</option>
            <option v-for="m in modelList" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
      </div>

      <!-- 测试按钮 -->
      <div class="form-actions">
        <button class="btn-test" @click="handleTest" :disabled="testing">
          {{ testing ? '测试中...' : '🧪 测试 API' }}
        </button>
      </div>

      <!-- 测试结果 -->
      <div v-if="testResult !== null" class="test-result" :class="testResult.ok ? 'success' : 'error'">
        {{ testResult.msg }}
      </div>

      <!-- 保存和默认 -->
      <div class="form-actions" style="margin-top:8px;">
        <button v-if="!form.isDefault" class="btn-default" @click="handleSetDefault">设为默认</button>
        <button class="btn-save" @click="handleSave">保存</button>
      </div>
      <div v-if="isEdit" class="form-delete">
        <button class="btn-delete" @click="handleDelete">删除此 API</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApiConfigsStore } from '@/stores/apiConfigs'
import BackIcon from '@/components/icons/BackIcon.vue'

const route = useRoute()
const router = useRouter()
const apiConfigsStore = useApiConfigsStore()

const isEdit = computed(() => route.params.id !== 'new')

const form = ref({
  name: '',
  apiUrl: '',
  apiKey: '',
  model: '',
  isDefault: false
})

const commonModels = [
  'MiniMax-abab6.5s',
  'MiniMax-abab6.5-chat',
  'MiniMax-abab5.5',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'Doubao-pro-32k',
  'Doubao-pro-128k',
  'DeepSeek-V3',
  'DeepSeek-R1',
  'GLM-4',
  'GLM-4-Flash',
  'Qwen-Max',
  'Qwen-Plus',
  'Qwen-Turbo',
  'Moonshot-v1-8k',
  'Moonshot-v1-32k',
  'Moonshot-v1-128k',
]

const fetchingModels = ref(false)
const modelList = ref([])
const testing = ref(false)
const testResult = ref(null)
const selectedCommonModel = ref('')
const selectedApiModel = ref('')

const handleSelectCommonModel = () => {
  form.value.model = selectedCommonModel.value
  selectedApiModel.value = ''
}

const handleSelectApiModel = () => {
  form.value.model = selectedApiModel.value
  selectedCommonModel.value = ''
}

onMounted(() => {
  if (isEdit.value) {
    const config = apiConfigsStore.getById(route.params.id)
    if (config) {
      form.value = { ...config }
    }
  }
})

// 监听模型变化，同步下拉菜单选中状态
import { watch } from 'vue'

watch(() => form.value.model, (newModel) => {
  if (commonModels.includes(newModel)) {
    selectedCommonModel.value = newModel
    selectedApiModel.value = ''
  } else if (modelList.value.includes(newModel)) {
    selectedApiModel.value = newModel
    selectedCommonModel.value = ''
  } else {
    selectedCommonModel.value = ''
    selectedApiModel.value = ''
  }
})

// 获取可用模型列表
const handleFetchModels = async () => {
  if (!form.value.apiUrl || !form.value.apiKey) {
    alert('请先填写 API 地址和 Key')
    return
  }
  fetchingModels.value = true
  modelList.value = []
  try {
    // 提取 base URL
    const baseUrl = form.value.apiUrl
      .replace(/\/v1\/chat\/completions\/?$/, '')
      .replace(/\/chat\/completions\/?$/, '')
      .replace(/\/v1\/?$/, '')
      .replace(/\/$/, '')

    // 尝试多个可能的模型列表接口
    const urls = [
      `${baseUrl}/models`,
      `${baseUrl}/v1/models`,
      `${baseUrl}/v1/available_models`,
      `${baseUrl}/v1/model_list`,
    ]

    let models = []
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${form.value.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          models = (data.data || data.models || data.result || []).map(m => m.id || m.model || m.name || m)
          if (models.length > 0) break
        }
      } catch {}
    }

    if (models.length === 0) {
      alert('该 API 不支持获取模型列表，请从常用模型中手动选择')
      return
    }

    modelList.value = models.slice(0, 50)
  } catch (e) {
    alert(`获取模型失败，可能是以下原因：\n1. 该 API 不支持获取模型列表\n2. 需要网络代理\n3. API Key 无效\n\n建议：直接手动输入模型名称（如 abab6.5s-chat）`)
    modelList.value = []
  } finally {
    fetchingModels.value = false
  }
}

// 测试 API
const handleTest = async () => {
  if (!form.value.apiUrl || !form.value.apiKey || !form.value.model) {
    alert('请填写完整信息后再测试')
    return
  }
  testing.value = true
  testResult.value = null
  try {
    const testUrl = form.value.apiUrl.includes('/chat/completions')
      ? form.value.apiUrl
      : form.value.apiUrl.replace(/\/$/, '') + '/chat/completions'

    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${form.value.apiKey}`
      },
      body: JSON.stringify({
        model: form.value.model,
        messages: [
          { role: 'user', content: '你好' }
        ]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 100)}`)
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content
    testResult.value = { ok: true, msg: `✅ 测试成功！角色回复: "${reply?.slice(0, 50)}..."` }
  } catch (e) {
    testResult.value = { ok: false, msg: `❌ 测试失败: ${e.message}` }
  } finally {
    testing.value = false
  }
}

const handleSetDefault = () => {
  if (isEdit.value) {
    apiConfigsStore.setDefault(route.params.id)
    form.value.isDefault = true
  }
}

const handleSave = () => {
  if (!form.value.name || !form.value.apiUrl || !form.value.apiKey || !form.value.model) {
    alert('请填写完整信息')
    return
  }
  if (isEdit.value) {
    apiConfigsStore.updateConfig(route.params.id, form.value)
  } else {
    apiConfigsStore.addConfig(form.value)
  }
  router.back()
}

const handleDelete = () => {
  if (confirm('确定要删除此 API 配置吗？')) {
    apiConfigsStore.deleteConfig(route.params.id)
    router.back()
  }
}
</script>

<style scoped>
.page-header {
  position: relative;
}

.back-btn {
  position: absolute;
  left: 16px;
  font-size: 20px;
  cursor: pointer;
}

.form-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--bg-gray);
}

.form-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 8px 0;
  border: none;
  outline: none;
  font-size: var(--font-size-md);
  font-family: inherit;
  background: transparent;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--text-time);
}

.dropdown-wrapper {
  position: relative;
  background: var(--bg-gray);
  border-radius: 8px;
  padding: 0 12px;
}

.dropdown-select {
  width: 100%;
  padding: 12px 36px 12px 0;
  border: none;
  outline: none;
  font-size: var(--font-size-md);
  font-family: inherit;
  background: transparent;
  box-sizing: border-box;
  appearance: none;
  cursor: pointer;
  color: var(--text-primary);
}

.dropdown-select:focus {
  outline: none;
}

.dropdown-select option {
  padding: 8px 12px;
  font-size: var(--font-size-sm);
}

.dropdown-wrapper::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--text-secondary);
  pointer-events: none;
}

.form-actions {
  padding: 12px 16px;
  display: flex;
  gap: 12px;
}

.btn-fetch,
.btn-test,
.btn-default,
.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  font-size: var(--font-size-md);
  font-family: inherit;
  cursor: pointer;
  border: none;
  text-align: center;
}

.btn-fetch {
  background-color: var(--bg-gray);
  color: var(--text-primary);
}

.btn-test {
  background-color: #EEF2FF;
  color: #6366f1;
}

.btn-default {
  background-color: var(--bg-gray);
  color: var(--text-primary);
}

.btn-save {
  background-color: var(--wechat-green);
  color: white;
}

.btn-fetch:disabled,
.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  margin: 0 16px 12px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.test-result.success {
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.test-result.error {
  background-color: #fef0f0;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.form-delete {
  padding: 0 16px 16px;
}

.btn-delete {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  font-size: var(--font-size-md);
  font-family: inherit;
  cursor: pointer;
  border: none;
  background-color: #fef0f0;
  color: #F56C6C;
}
</style>
