<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div v-if="message" class="status-notice" role="status" aria-live="polite">
    <span>{{ message }}</span><button aria-label="關閉訊息" @click="emit('dismiss')">×</button>
  </div>
</template>
