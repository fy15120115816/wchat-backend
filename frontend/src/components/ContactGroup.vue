<template>
  <div class="contact-group">
    <div class="group-letter">{{ letter }}</div>
    <ContactItem v-for="contact in list" :key="contact.id" :contact="contact" />
  </div>
</template>

<script setup>
import ContactItem from './ContactItem.vue'

defineProps({
  letter: {
    type: String,
    required: true
  },
  list: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
.contact-group {
  margin-bottom: 8px;
}

.group-letter {
  padding: 4px 16px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background-color: var(--bg-gray);
}
</style>
