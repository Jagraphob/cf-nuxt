<script setup lang="ts">
const {
  gameState,
  loading,
  error,
  showSubAlert,
  selectedPlayerId,
  isRunning,
  courtPlayers,
  benchPlayers,
  subCountdownMs,
  fairnessStats,
  livePlayTime,
  nextSubPreview,
  startTimer,
  pauseTimer,
  setCountdown,
  dismissAlert,
  performSubstitution,
  reorderBench,
  selectPlayer,
  skipPlayer,
  unskipPlayer,
  removePlayer,
  nextPeriod,
  startPeriod,
  endGame,
  loadGame,
  getSavedSessionId,
} = useSubstitute()

onMounted(async () => {
  const id = getSavedSessionId()
  if (!id) {
    await navigateTo('/substitute')
    return
  }
  await loadGame(id)
  if (error.value) {
    await navigateTo('/substitute')
  }
})

function handleForceSub() {
  performSubstitution()
}


async function handleEndGame() {
  await endGame()
  await navigateTo('/substitute')
}
</script>

<template>
  <div class="max-w-md mx-auto pb-44">
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>

    <template v-else-if="gameState">
      <!-- Header -->
      <div class="sticky top-0 bg-base-100 z-10 px-4 pt-3 pb-2 border-b border-base-300">
        <div class="flex items-center justify-between">
          <SubstitutePeriodIndicator
            :current="gameState.currentPeriod"
            :total="gameState.config.periodCount"
            :phase="gameState.phase"
          />
          <SubstituteGameTimer
            :countdown-ms="subCountdownMs"
            :interval-seconds="gameState.config.intervalSeconds"
            :is-running="isRunning"
            @toggle="isRunning ? pauseTimer() : startTimer()"
            @set-countdown="setCountdown"
          />
        </div>
        <p v-if="selectedPlayerId" class="text-xs text-primary text-center mt-1 animate-pulse">
          Tap another player to swap
        </p>
      </div>

      <!-- Period break overlay -->
      <div
        v-if="gameState.phase === 'period_break'"
        class="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center"
      >
        <Icon name="tabler:coffee" class="w-12 h-12 text-primary" />
        <h2 class="text-xl font-bold">Period Break</h2>
        <p class="text-base-content/60 text-sm">
          {{
            gameState.config.periodCount === 2
              ? 'Half time! Rest up.'
              : `End of Q${gameState.currentPeriod - 1}`
          }}
        </p>
      </div>

      <!-- Game ended -->
      <div
        v-else-if="gameState.phase === 'ended'"
        class="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center"
      >
        <Icon name="tabler:trophy" class="w-12 h-12 text-warning" />
        <h2 class="text-xl font-bold">Game Over</h2>
        <div class="w-full mt-4">
          <table class="table table-sm w-full">
            <thead>
              <tr>
                <th>Player</th>
                <th class="text-right">Play Time</th>
                <th class="text-right">Subs</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in [...gameState.players].filter(p => p.isActive).sort((a, b) => (livePlayTime.get(b.id) ?? 0) - (livePlayTime.get(a.id) ?? 0))"
                :key="p.id"
              >
                <td>{{ p.name }}</td>
                <td class="text-right tabular-nums">
                  {{ Math.floor((livePlayTime.get(p.id) ?? 0) / 60000) }}:{{ String(Math.floor(((livePlayTime.get(p.id) ?? 0) % 60000) / 1000)).padStart(2, '0') }}
                </td>
                <td class="text-right">{{ p.substitutionCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <NuxtLink to="/substitute" class="btn btn-primary btn-lg w-full mt-2">
          <Icon name="tabler:home" />
          New Game
        </NuxtLink>
      </div>

      <!-- Active game -->
      <div v-else class="px-4 pt-4 flex flex-col gap-5">
        <!-- Court -->
        <SubstituteCourtZone
          :players="courtPlayers"
          :play-time-map="livePlayTime"
          :fairness-stats="fairnessStats"
          :selected-player-id="selectedPlayerId"
          @select="selectPlayer"
          @skip="skipPlayer"
          @unskip="unskipPlayer"
          @remove="removePlayer"
        />

        <div class="divider my-0" />

        <!-- Bench -->
        <SubstituteBenchQueue
          :players="benchPlayers"
          :play-time-map="livePlayTime"
          :fairness-stats="fairnessStats"
          :selected-player-id="selectedPlayerId"
          @select="selectPlayer"
          @skip="skipPlayer"
          @unskip="unskipPlayer"
          @remove="removePlayer"
          @reorder="reorderBench"
        />
      </div>
    </template>

    <!-- Substitution alert -->
    <SubstituteSubstitutionAlert
      v-if="showSubAlert"
      :next-sub-out="nextSubPreview.out"
      :next-sub-in="nextSubPreview.in"
      @substitute="performSubstitution"
      @dismiss="dismissAlert"
    />

    <!-- Action bar -->
    <SubstituteActionBar
      v-if="gameState"
      :phase="gameState.phase"
      :current-period="gameState.currentPeriod"
      :total-periods="gameState.config.periodCount"
      :next-sub-out="nextSubPreview.out"
      :next-sub-in="nextSubPreview.in"
      @force-sub="handleForceSub"
      @next-period="nextPeriod"
      @start-period="startPeriod"
      @end-game="handleEndGame"
    />
  </div>
</template>
