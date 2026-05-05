<template>
  <div
    class="card-container"
    :class="{ flipped, disabled }"
    @click="handleClick"
  >
    <div class="card-inner">
      <!-- Front: card back design -->
      <div class="card-face card-front">
        <div class="card-back-design">
          <Icon name="tabler:cards" class="text-4xl opacity-70" />
        </div>
      </div>
      <!-- Back: revealed value -->
      <div class="card-face card-back" :class="cardColorClass">
        <div class="card-reveal-content">
          <Icon :name="cardIcon" class="text-4xl" />
          <span class="text-lg font-bold mt-1">{{ cardLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardValue } from '~/types/tower'

const props = defineProps<{
  index: number
  flipped: boolean
  value: CardValue | null
  disabled: boolean
}>()

const emit = defineEmits<{
  pick: [index: number]
}>()

function handleClick() {
  if (!props.flipped && !props.disabled) {
    emit('pick', props.index)
  }
}

const cardColorClass = computed(() => {
  if (props.value === 2) return 'bg-yellow-400 text-yellow-900'
  if (props.value === 1) return 'bg-green-500 text-white'
  if (props.value === -1) return 'bg-red-600 text-white'
  return ''
})

const cardIcon = computed(() => {
  if (props.value === 2) return 'tabler:star-filled'
  if (props.value === 1) return 'tabler:thumb-up-filled'
  if (props.value === -1) return 'tabler:skull'
  return 'tabler:question-mark'
})

const cardLabel = computed(() => {
  if (props.value === 2) return '+2'
  if (props.value === 1) return '+1'
  if (props.value === -1) return 'Bust!'
  return ''
})
</script>

<style scoped>
.card-container {
  width: 80px;
  height: 120px;
  perspective: 800px;
  cursor: pointer;
}

.card-container.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.card-container:not(.flipped):not(.disabled):hover .card-inner {
  transform: rotateY(15deg);
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.card-container.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid oklch(var(--bc) / 0.2);
}

.card-front {
  background-color: oklch(var(--b2));
}

.card-back-design {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: oklch(var(--bc) / 0.5);
}

.card-back {
  transform: rotateY(180deg);
}

.card-reveal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
