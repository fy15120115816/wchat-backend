/**
 * localStorage 封装工具
 */

export function getItem(key) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.error('localStorage setItem error:', e)
    return false
  }
}

export function removeItem(key) {
  localStorage.removeItem(key)
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}
