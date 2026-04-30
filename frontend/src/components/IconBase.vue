<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="viewBox"
    :fill="filled ? 'currentColor' : 'none'"
    :stroke="filled ? 'none' : 'currentColor'"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="className"
  >
    <slot />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 24
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.5
  },
  viewBox: {
    type: String,
    default: '0 0 24 24'
  },
  className: {
    type: String,
    default: ''
  },
  filled: {
    type: Boolean,
    default: false
  }
})
</script>