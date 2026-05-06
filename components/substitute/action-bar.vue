<script setup lang="ts">
import type { GamePhase, Player } from '~/types/substitute'

const props = defineProps<{
  phase: GamePhase
  currentPeriod: number
  totalPeriods: number
  nextSubOut: Player[]
  nextSubIn: Player[]
}>()

const emit = defineEmits<{
  forceSub: []
  nextPeriod: []
  startPeriod: []
  endGame: []
}>()

const isLastPeriod = computed(() => props.currentPeriod >= props.totalPeriods)

const subLabel = computed(() => {
  if (props.nextSubIn.length === 0) return null
  const inNames = props.nextSubIn.map(p => p.name).join(', ')
  const outNames = props.nextSubOut.map(p => p.name).join(', ')
  return { inNames, outNames }
})
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 px-4 py-3 safe-area-bottom">

    <div v-if="phase === 'period_break'" class="flex gap-2">
      <button class="btn btn-primary flex-1" @click="emit('startPeriod')">
        <Icon name="tabler:player-play" />
        Start {{ totalPeriods === 2 ? '2nd Half' : `Q${currentPeriod}` }}
      </button>
      <button class="btn btn-error btn-outline" @click="emit('endGame')">
        End
      </button>
    </div>

    <div v-else-if="phase === 'ended'" class="flex justify-center">
      <span class="text-base-content/50 text-sm">Game ended</span>
    </div>

    <div v-else class="flex flex-col gap-2">
      <!-- Sub In button with preview -->
      <button class="btn btn-secondary btn-lg w-full" @click="emit('forceSub')">
        <Icon name="tabler:replace" />
        Sub In
        <span v-if="subLabel" class="text-xs font-normal opacity-80 truncate max-w-48">
          {{ subLabel.inNames }} ← {{ subLabel.outNames }}
        </span>
      </button>

      <!-- Next Period / End -->
      <button
        class="btn btn-outline btn-lg w-full"
        :class="isLastPeriod ? 'btn-error' : ''"
        @click="isLastPeriod ? emit('endGame') : emit('nextPeriod')"
      >
        <Icon :name="isLastPeriod ? 'tabler:flag-filled' : 'tabler:arrow-right'" />
        {{ isLastPeriod ? 'End Game' : 'Next Period' }}
      </button>
    </div>
  </div>
</template>
