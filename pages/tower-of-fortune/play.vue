<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8">
    <div class="w-full max-w-xl">
      <div class="flex items-center gap-4 mb-8">
        <NuxtLink to="/tower-of-fortune" class="btn btn-ghost btn-sm">
          <Icon name="tabler:arrow-left" />
          Back
        </NuxtLink>
        <h1 class="text-2xl font-bold">🗼 Tower of Fortune</h1>
      </div>

      <!-- Not started -->
      <div v-if="!sessionId" class="text-center">
        <p class="text-base-content/60 mb-6">Ready to test your luck?</p>
        <button class="btn btn-primary btn-lg" :disabled="loading" @click="startGame">
          <Icon v-if="loading" name="tabler:loader-2" class="animate-spin" />
          <Icon v-else name="tabler:play" />
          Start Game
        </button>
      </div>

      <!-- Game active -->
      <div v-else-if="status === 'playing' || status === 'round_complete'">
        <TowerGameBoard
          :round="round"
          :total-score="totalScore"
          :status="status"
          :picked-index="pickedIndex"
          :revealed-cards="revealedCards"
          @pick="pickCard"
          @cash-out="cashOut"
          @next-round="nextRound"
        />
      </div>

      <!-- Error -->
      <div v-if="error" class="alert alert-error mt-4">
        <Icon name="tabler:alert-circle" />
        {{ error }}
      </div>
    </div>

    <!-- Result screen modal -->
    <TowerResultScreen
      v-if="status === 'cashed_out' || status === 'game_over'"
      :status="status"
      :round="round"
      :total-score="totalScore"
      @play-again="playAgain"
    />
  </div>
</template>

<script setup lang="ts">
const { sessionId, round, totalScore, status, pickedIndex, revealedCards, loading, error, startGame, pickCard, cashOut, nextRound, resetState } = useTowerGame()

async function playAgain() {
  resetState()
  await startGame()
}
</script>
