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
  reorder: [ids: string[]]
}>()

// Local copy for sortable (sortablejs-vue3 reads from :list and reorders DOM;
// we capture the new order on update and emit it)
const localList = ref([...props.players])

watch(() => props.players, (val) => {
  // Only sync if the set of players changed (not just ordering from parent)
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
  emit('reorder', localList.value.map(p => p.id))
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <Icon name="tabler:list-numbers" class="text-base-content/40 w-4 h-4" />
      <span class="text-sm font-semibold text-base-content/70">Queue ({{ players.length }})</span>
      <span class="text-xs text-base-content/40">drag to reorder</span>
    </div>

    <Sortable
      :list="localList"
      item-key="id"
      :options="sortableOptions"
      class="flex flex-col gap-2 min-h-10"
      @update="onUpdate"
    >
      <template #item="{ element: player, index }">
        <div :key="player.id" class="relative">
          <span class="absolute -left-0.5 top-1/2 -translate-y-1/2 text-xs text-base-content/30 font-mono w-4 text-center select-none z-10">
            {{ index + 1 }}
          </span>
          <div class="pl-5">
            <SubstitutePlayerCard
              :player="player"
              :play-time-ms="playTimeMap.get(player.id) ?? 0"
              :fairness-ratio="getFairness(player.id).ratio"
              :fairness-deviation="getFairness(player.id).deviation"
              :is-selected="selectedPlayerId === player.id"
              :is-on-court="false"
              @select="emit('select', $event)"
              @skip="emit('skip', $event)"
              @unskip="emit('unskip', $event)"
              @remove="emit('remove', $event)"
            />
          </div>
        </div>
      </template>
    </Sortable>

    <p v-if="players.length === 0" class="text-sm text-base-content/40 text-center py-4">
      All players on court
    </p>
  </div>
</template>
