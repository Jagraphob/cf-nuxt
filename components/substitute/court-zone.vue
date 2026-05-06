<script setup lang="ts">
import { Sortable } from 'sortablejs-vue3'
import type { Player } from '~/types/substitute'

const props = defineProps<{
  players: Player[]
  playTimeMap: Map<string, number>
  fairnessStats: { playerId: string; ratio: number; deviation: number }[]
  selectedPlayerId: string | null
}>()

const emit = defineEmits<{
  select: [playerId: string]
  skip: [playerId: string]
  unskip: [playerId: string]
  remove: [playerId: string]
}>()

const localList = ref([...props.players])

watch(() => props.players, (val) => {
  const newIds = val.map(p => p.id).sort().join(',')
  const localIds = localList.value.map(p => p.id).sort().join(',')
  if (newIds !== localIds) {
    localList.value = [...val]
  }
})

const sortableOptions = {
  handle: '.drag-handle',
  animation: 150,
  ghostClass: 'opacity-30',
}

function getFairness(playerId: string) {
  return props.fairnessStats.find(f => f.playerId === playerId) ?? { ratio: 0, deviation: 0 }
}

function onUpdate(evt: { newIndex: number; oldIndex: number }) {
  const moved = localList.value.splice(evt.oldIndex, 1)[0]
  localList.value.splice(evt.newIndex, 0, moved)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-success animate-pulse" />
      <span class="text-sm font-semibold text-base-content/70">On Court ({{ players.length }})</span>
    </div>
    <Sortable
      :list="localList"
      item-key="id"
      :options="sortableOptions"
      class="flex flex-col gap-2 min-h-10"
      @update="onUpdate"
    >
      <template #item="{ element: player }">
        <div :key="player.id">
          <SubstitutePlayerCard
            :player="player"
            :play-time-ms="playTimeMap.get(player.id) ?? 0"
            :fairness-ratio="getFairness(player.id).ratio"
            :fairness-deviation="getFairness(player.id).deviation"
            :is-selected="selectedPlayerId === player.id"
            :is-on-court="true"
            @select="emit('select', $event)"
            @skip="emit('skip', $event)"
            @unskip="emit('unskip', $event)"
            @remove="emit('remove', $event)"
          />
        </div>
      </template>
    </Sortable>
  </div>
</template>
