// public/service-worker.js
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {}
    const title = data.title || '新消息'
    const options = {
        body: data.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: data.url || '/' },
        requireInteraction: true
    }

    event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    )
})

self.addEventListener('install', () => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        clients.claim()
    )
})