<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ label: string; value: number; max: number; compact?: boolean }>(), { compact: false })
const filled = computed(() => Math.round(Math.max(0, Math.min(1, props.value / (props.max || 1))) * 10))
</script>

<template>
  <div class="pixel-meter" :class="{ compact }" role="meter" :aria-label="label" aria-valuemin="0" :aria-valuemax="max" :aria-valuenow="value">
    <span class="meter-title">{{ label }}</span>
    <span class="meter-blocks" aria-hidden="true"><i v-for="i in 10" :key="i" :class="{ filled: i <= filled }"></i></span>
    <span class="meter-value">{{ Math.round(value) }}<span class="muted">/{{ max }}</span></span>
  </div>
</template>
