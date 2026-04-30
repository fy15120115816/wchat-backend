<template>
  <div class="login-page">
    <div class="login-container">
      <div class="logo">
        <span class="logo-text">💬</span>
        <h1>小微信</h1>
      </div>

      <div v-if="!isLoggedIn" class="form-container">
        <div class="tabs">
          <button 
            :class="['tab', { active: activeTab === 'login' }]" 
            @click="activeTab = 'login'"
          >
            登录
          </button>
          <button 
            :class="['tab', { active: activeTab === 'register' }]" 
            @click="activeTab = 'register'"
          >
            注册
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="form">
          <div v-if="activeTab === 'register'" class="form-group">
            <input 
              v-model="form.username" 
              type="text" 
              placeholder="用户名"
              class="input"
            />
          </div>
          <div class="form-group">
            <input 
              v-model="form.email" 
              type="email" 
              placeholder="邮箱"
              class="input"
            />
          </div>
          <div class="form-group">
            <input 
              v-model="form.password" 
              type="password" 
              placeholder="密码"
              class="input"
            />
          </div>
          <div v-if="activeTab === 'register'" class="form-group">
            <input 
              v-model="form.confirmPassword" 
              type="password" 
              placeholder="确认密码"
              class="input"
            />
          </div>
          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? '加载中...' : (activeTab === 'login' ? '登录' : '注册') }}
          </button>
        </form>

        <div v-if="error" class="error-message">{{ error }}</div>
      </div>

      <div v-else class="logged-in">
        <div class="user-info">
          <img :src="user.avatar" :alt="user.nickname" class="avatar" />
          <div>
            <p class="nickname">{{ user.nickname }}</p>
            <p class="email">{{ user.email }}</p>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)
const error = ref('')

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const isLoggedIn = computed(() => !!userStore.token)
const user = computed(() => ({
  avatar: userStore.user.avatar,
  nickname: userStore.user.nickname,
  email: ''
}))

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    if (activeTab.value === 'login') {
      await userStore.login(form.email, form.password)
    } else {
      // 验证确认密码
      if (form.password !== form.confirmPassword) {
        throw new Error('两次输入的密码不一致')
      }
      await userStore.register(form.username, form.email, form.password)
      // 注册成功后自动登录
      await userStore.login(form.email, form.password)
    }
    router.push('/chats')
  } catch (err) {
    error.value = err.message || '操作失败'
  } finally {
    loading.value = false
  }
}

const handleLogout = () => {
  userStore.logout()
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo-text {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.logo h1 {
  font-size: 28px;
  color: #333;
  margin: 0;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: none;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #07c160;
  border-bottom-color: #07c160;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.input {
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.input:focus {
  outline: none;
  border-color: #07c160;
}

.submit-btn {
  background: linear-gradient(135deg, #07c160 0%, #10b981 100%);
  color: white;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #ff4d4f;
  text-align: center;
  margin-top: 15px;
  font-size: 14px;
}

.logged-in {
  text-align: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.nickname {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.email {
  font-size: 14px;
  color: #999;
  margin: 5px 0 0;
}

.logout-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  background: none;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #f5f5f5;
}
</style>