import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/views/LoginView.vue')
  },
  {
    path: '/chats',
    name: 'Chats',
    component: () => import('@/views/ChatsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:id',
    name: 'ChatDetail',
    component: () => import('@/views/ChatDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: () => import('@/views/ContactsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/moments',
    name: 'Moments',
    component: () => import('@/views/MomentsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings/api-config',
    name: 'ApiConfig',
    component: () => import('@/views/ApiConfigView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings/api-config/edit/:id',
    name: 'ApiEdit',
    component: () => import('@/views/ApiEditView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/')
  } else if (to.path === '/' && userStore.isLoggedIn) {
    next('/chats')
  } else {
    next()
  }
})

export default router
