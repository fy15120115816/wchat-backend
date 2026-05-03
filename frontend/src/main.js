import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/variables.css'
import './assets/styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 捕获所有未处理错误，防止 JS 错误冻结 UI
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err, info)
}
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason)
})
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error)
})

app.mount('#app')

// 注册 Service Worker（PWA 支持）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker 注册成功:', registration.scope)
      })
      .catch((error) => {
        console.log('❌ Service Worker 注册失败:', error)
      })
  })
}
