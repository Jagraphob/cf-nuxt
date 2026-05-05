<template>
  <dialog class="modal modal-open">
    <div class="modal-box text-center">
      <!-- Cash Out -->
      <template v-if="status === 'cashed_out'">
        <div class="text-6xl mb-4">🎉</div>
        <h2 class="text-2xl font-bold text-success mb-2">Cashed Out!</h2>
        <p class="text-base-content/70 mb-4">
          You survived <span class="font-bold text-primary">{{ round }} rounds</span> and walked away with
        </p>
        <div class="stat bg-success/10 rounded-box py-4 mb-6">
          <div class="stat-value text-success text-5xl">{{ totalScore }}</div>
          <div class="stat-title">points</div>
        </div>
        <p class="text-sm text-base-content/50 mb-4">{{ shareText }}</p>
        <button class="btn btn-ghost btn-sm mb-4" @click="copyShare">
          <Icon name="tabler:clipboard" />
          {{ copied ? 'Copied!' : 'Copy result' }}
        </button>
      </template>

      <!-- Game Over -->
      <template v-else-if="status === 'game_over'">
        <div class="text-6xl mb-4">💀</div>
        <h2 class="text-2xl font-bold text-error mb-2">Busted!</h2>
        <p class="text-base-content/70 mb-4">
          You hit the skull card on <span class="font-bold text-error">round {{ round }}</span>.
          Everything lost.
        </p>
        <div class="stat bg-error/10 rounded-box py-4 mb-6">
          <div class="stat-value text-error text-5xl">0</div>
          <div class="stat-title">points</div>
        </div>
        <p class="text-sm text-base-content/50 mb-4">{{ shareText }}</p>
        <button class="btn btn-ghost btn-sm mb-4" @click="copyShare">
          <Icon name="tabler:clipboard" />
          {{ copied ? 'Copied!' : 'Copy result' }}
        </button>
      </template>

      <div class="modal-action justify-center">
        <button class="btn btn-primary" @click="$emit('playAgain')">
          <Icon name="tabler:refresh" />
          Play Again
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import type { GameStatus } from '~/types/tower'

const props = defineProps<{
  status: GameStatus
  round: number
  totalScore: number
}>()

defineEmits<{
  playAgain: []
}>()

const copied = ref(false)

const shareText = computed(() => {
  if (props.status === 'cashed_out') {
    return `🗼 Tower of Fortune: Survived ${props.round} rounds, cashed out with ${props.totalScore} pts!`
  }
  return `🗼 Tower of Fortune: Busted on round ${props.round}! 💀`
})

async function copyShare() {
  await navigator.clipboard.writeText(shareText.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
