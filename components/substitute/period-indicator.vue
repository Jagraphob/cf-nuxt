<script setup lang="ts">
const props = defineProps<{
  current: number
  total: number
  phase: string
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-sm font-semibold text-base-content/70">
      <span v-if="phase === 'period_break'">Break</span>
      <span v-else-if="phase === 'ended'">Final</span>
      <span v-else>
        {{ total === 2 ? (current === 1 ? '1st Half' : '2nd Half') : `Q${current}` }}
      </span>
    </span>
    <div class="flex gap-1">
      <div
        v-for="i in total"
        :key="i"
        class="w-2 h-2 rounded-full transition-all"
        :class="i < current ? 'bg-primary' : i === current ? 'bg-primary animate-pulse' : 'bg-base-300'"
      />
    </div>
  </div>
</template>
