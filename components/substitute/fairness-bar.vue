<script setup lang="ts">
const props = defineProps<{
  ratio: number    // 0-1 relative to max player
  deviation: number // negative = below avg, positive = above avg
}>()

const color = computed(() => {
  if (props.deviation > 0.15) return 'bg-error'
  if (props.deviation < -0.15) return 'bg-success'
  return 'bg-warning'
})
</script>

<template>
  <div class="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
    <div
      class="h-full rounded-full transition-all duration-500"
      :class="color"
      :style="{ width: `${Math.round(ratio * 100)}%` }"
    />
  </div>
</template>
