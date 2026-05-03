<template>
  <div class="comments-list">
    <div
      v-for="(comment, index) in comments"
      :key="index"
      class="comment-row"
    >
      <span class="comment-user">{{ comment.userName }}</span>
      <span class="comment-colon">:</span>
      <span class="comment-text">{{ comment.content }}</span>
      <button
        v-if="comment.userId === 'me'"
        class="comment-del"
        @click.stop="emit('delete-comment', { comment, index })"
      >🗑️</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  comments: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['delete-comment'])
</script>

<style scoped>
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.comment-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  flex-wrap: wrap;
}

.comment-user {
  color: #5777A7;
  font-weight: 500;
  flex-shrink: 0;
}

.comment-colon {
  color: var(--text-primary);
  flex-shrink: 0;
}

.comment-text {
  color: var(--text-primary);
  word-break: break-all;
  flex: 1;
}

.comment-del {
  font-size: 12px;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.5;
  background: none;
  border: none;
  flex-shrink: 0;
  align-self: center;
}

.comment-del:hover {
  opacity: 1;
}
</style>
