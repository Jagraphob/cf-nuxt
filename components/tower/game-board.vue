<template>
  <div class="flex flex-col items-center gap-6">
    <!-- Score & Round info -->
    <div class="flex gap-8 text-center">
      <div class="stat bg-base-200 rounded-box px-6 py-3">
        <div class="stat-title">Round</div>
        <div class="stat-value text-primary">{{ round }}</div>
      </div>
      <div class="stat bg-base-200 rounded-box px-6 py-3">
        <div class="stat-title">Score</div>
        <div class="stat-value text-secondary">{{ totalScore }}</div>
      </div>
    </div>

    <!-- Cards -->
    <div class="flex gap-4 flex-wrap justify-center">
      <TowerCard
        v-for="i in 5"
        :key="i - 1"
        :index="i - 1"
        :flipped="flippedCards[i - 1]"
        :value="cardValues[i - 1]"
        :disabled="status !== 'playing' || pickedIndex !== null"
        @pick="$emit('pick', $event)"
      />
    </div>

    <!-- Round result message -->
    <div v-if="roundResultMessage" class="text-lg font-semibold" :class="roundResultClass">
      {{ roundResultMessage }}
    </div>

    <!-- Action buttons -->
    <div v-if="status === 'round_complete'" class="flex gap-4">
      <button
        v-if="round >= 2"
        class="btn btn-success"
        @click="$emit('cashOut')"
      >
        <Icon name="tabler:cash" />
        Cash Out ({{ totalScore }} pts)
      </button>
      <button class="btn btn-primary" @click="$emit('nextRound')">
        <Icon name="tabler:arrow-up" />
        Next Round
      </button>
    </div>

    <div v-if="status === 'playing' && round === 1" class="text-base-content/50 text-sm">
      Pick a card to begin
    </div>
    <div v-else-if="status === 'playing' && round > 1" class="text-base-content/50 text-sm">
      Pick wisely — one card ends it all
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardValue, GameStatus } from '~/types/tower'

const props = defineProps<{
  round: number
  totalScore: number
  status: GameStatus
  pickedIndex: number | null
  revealedCards: (CardValue | null)[]
}>()

defineEmits<{
  pick: [index: number]
  cashOut: []
  nextRound: []
}>()

const flippedCards = computed(() =>
  Array.from({ length: 5 }, (_, i) => props.revealedCards[i] !== null)
)

const cardValues = computed(() =>
  Array.from({ length: 5 }, (_, i) => props.revealedCards[i] ?? null)
)

const roundResultMessage = computed(() => {
  if (props.status === 'round_complete' && props.pickedIndex !== null) {
    const val = props.revealedCards[props.pickedIndex]
    if (val === 2) return '★ Jackpot! +2 points!'
    if (val === 1) return '✓ Nice! +1 point'
  }
  return null
})

const roundResultClass = computed(() => {
  if (props.pickedIndex !== null) {
    const val = props.revealedCards[props.pickedIndex]
    if (val === 2) return 'text-yellow-500'
    if (val === 1) return 'text-green-500'
  }
  return ''
})
</script>
