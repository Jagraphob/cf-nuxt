<script setup lang="ts">
import type { Player } from '~/types/substitute'

const props = defineProps<{
  player: Player
  playTimeMs: number
  fairnessRatio: number
  fairnessDeviation: number
  isSelected: boolean
  isOnCourt: boolean
}>()

const emit = defineEmits<{
  select: [playerId: string]
  skip: [playerId: string]
  unskip: [playerId: string]
  remove: [playerId: string]
}>()

const showMenu = ref(false)

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const cardClass = computed(() => ({
  'ring-2 ring-primary': props.isSelected,
  'opacity-50': props.player.isSkipped,
  'bg-primary/10': props.isOnCourt,
  'bg-base-200': !props.isOnCourt,
}))
</script>

<template>
  <div
    class="card card-compact rounded-xl cursor-pointer select-none relative transition-all active:scale-95"
    :class="cardClass"
    @click="emit('select', player.id)"
  >
    <div class="card-body gap-1 p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <Icon name="tabler:grip-vertical" class="drag-handle text-base-content/30 shrink-0 touch-none cursor-grab active:cursor-grabbing" />
          <span class="font-semibold truncate text-sm">{{ player.name }}</span>
          <span v-if="player.isSkipped" class="badge badge-ghost badge-xs">skip</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span class="text-xs text-base-content/60 tabular-nums">{{ formatTime(playTimeMs) }}</span>
          <button
            class="btn btn-ghost btn-xs p-0 w-6 h-6 min-h-0"
            @click.stop="showMenu = !showMenu"
          >
            <Icon name="tabler:dots-vertical" class="text-base-content/50" />
          </button>
        </div>
      </div>

      <SubstituteFairnessBar
        :ratio="fairnessRatio"
        :deviation="fairnessDeviation"
      />
    </div>

    <!-- Context menu -->
    <div
      v-if="showMenu"
      class="absolute right-0 top-10 z-20 bg-base-100 border border-base-300 rounded-xl shadow-lg py-1 min-w-36"
      @click.stop
    >
      <button
        v-if="!player.isSkipped"
        class="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-base-200 text-left"
        @click="emit('skip', player.id); showMenu = false"
      >
        <Icon name="tabler:player-pause" class="text-warning" />
        Skip (rest)
      </button>
      <button
        v-else
        class="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-base-200 text-left"
        @click="emit('unskip', player.id); showMenu = false"
      >
        <Icon name="tabler:player-play" class="text-success" />
        Back in queue
      </button>
      <button
        class="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-base-200 text-left text-error"
        @click="emit('remove', player.id); showMenu = false"
      >
        <Icon name="tabler:user-minus" />
        Remove (injury)
      </button>
    </div>
  </div>
</template>
