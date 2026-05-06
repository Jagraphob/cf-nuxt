<script setup lang="ts">
import type { SubstituteConfig } from '~/types/substitute'

const emit = defineEmits<{
  submit: [config: SubstituteConfig]
  saveRoster: [names: string[]]
  loadRoster: []
}>()

const props = defineProps<{
  savedRosterExists: boolean
}>()

const playerNames = ref<string[]>(['', '', '', '', '', '', '', ''])
const onCourtCount = ref(5)
const substituteCount = ref(2)
const intervalMinutes = ref(3)
const periodCount = ref(4)

const errors = ref<string[]>([])

const duplicateIndices = computed<Set<number>>(() => {
  const seen = new Map<string, number>()
  const dupes = new Set<number>()
  playerNames.value.forEach((name, i) => {
    const trimmed = name.trim().toLowerCase()
    if (!trimmed) return
    if (seen.has(trimmed)) {
      dupes.add(seen.get(trimmed)!)
      dupes.add(i)
    } else {
      seen.set(trimmed, i)
    }
  })
  return dupes
})

function addPlayer() {
  playerNames.value.push('')
}

function removePlayer(i: number) {
  playerNames.value.splice(i, 1)
}

function validate(): SubstituteConfig | null {
  errors.value = []
  const names = playerNames.value.map(n => n.trim()).filter(Boolean)
  if (names.length < 2) {
    errors.value.push('Enter at least 2 player names')
    return null
  }
  if (duplicateIndices.value.size > 0) {
    errors.value.push('Player names must be unique')
    return null
  }
  if (onCourtCount.value >= names.length) {
    errors.value.push('Players on court must be less than total players')
    return null
  }
  if (substituteCount.value >= onCourtCount.value) {
    errors.value.push('Substitute count must be less than court count')
    return null
  }
  return {
    playerNames: names,
    onCourtCount: onCourtCount.value,
    substituteCount: substituteCount.value,
    intervalSeconds: intervalMinutes.value * 60,
    periodCount: periodCount.value,
  }
}

function handleSubmit() {
  const config = validate()
  if (config) emit('submit', config)
}

function handleSaveRoster() {
  const names = playerNames.value.map(n => n.trim()).filter(Boolean)
  emit('saveRoster', names)
}

function setRosterNames(names: string[]) {
  playerNames.value = [...names, '']
}

defineExpose({ setRosterNames })
</script>

<template>
  <div class="flex flex-col gap-6 pb-8">
    <!-- Players -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-base">Players</h2>
        <div class="flex gap-2">
          <button
            v-if="savedRosterExists"
            class="btn btn-ghost btn-xs gap-1"
            @click="emit('loadRoster')"
          >
            <Icon name="tabler:download" class="w-3 h-3" />
            Load
          </button>
          <button class="btn btn-ghost btn-xs gap-1" @click="handleSaveRoster">
            <Icon name="tabler:device-floppy" class="w-3 h-3" />
            Save
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <div
          v-for="(_, i) in playerNames"
          :key="i"
          class="flex flex-col gap-0.5"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs text-base-content/40 w-5 text-right">{{ i + 1 }}</span>
            <input
              v-model="playerNames[i]"
              type="text"
              :placeholder="`Player ${i + 1}`"
              class="input input-bordered input-sm flex-1"
              :class="duplicateIndices.has(i) ? 'input-error' : ''"
              @keydown.enter="i === playerNames.length - 1 && addPlayer()"
            />
            <button
              v-if="playerNames.length > 2"
              class="btn btn-ghost btn-xs btn-square"
              @click="removePlayer(i)"
            >
              <Icon name="tabler:x" class="w-3.5 h-3.5" />
            </button>
          </div>
          <p v-if="duplicateIndices.has(i)" class="text-xs text-error pl-7">
            Duplicate name
          </p>
        </div>
      </div>

      <button class="btn btn-ghost btn-sm w-full" @click="addPlayer">
        <Icon name="tabler:plus" />
        Add Player
      </button>
    </div>

    <!-- Config -->
    <div class="flex flex-col gap-4">
      <h2 class="font-bold text-base">Game Settings</h2>

      <label class="flex flex-col gap-1">
        <span class="text-sm text-base-content/70">Players on court</span>
        <input
          v-model.number="onCourtCount"
          type="number"
          min="1"
          max="11"
          class="input input-bordered"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-sm text-base-content/70">Players to substitute each time</span>
        <input
          v-model.number="substituteCount"
          type="number"
          min="1"
          max="5"
          class="input input-bordered"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-sm text-base-content/70">Substitution interval (minutes)</span>
        <input
          v-model.number="intervalMinutes"
          type="number"
          min="1"
          max="30"
          class="input input-bordered"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-sm text-base-content/70">Number of periods</span>
        <div class="flex gap-2">
          <button
            v-for="n in [1, 2, 4]"
            :key="n"
            class="btn flex-1"
            :class="periodCount === n ? 'btn-primary' : 'btn-outline'"
            @click="periodCount = n"
          >
            {{ n === 1 ? 'No periods' : n === 2 ? '2 Halves' : '4 Quarters' }}
          </button>
        </div>
      </label>
    </div>

    <!-- Errors -->
    <div v-if="errors.length" class="alert alert-error">
      <ul class="list-disc list-inside text-sm">
        <li v-for="e in errors" :key="e">{{ e }}</li>
      </ul>
    </div>

    <!-- Submit -->
    <button class="btn btn-primary btn-lg w-full" @click="handleSubmit">
      <Icon name="tabler:ball-football" />
      Start Game
    </button>
  </div>
</template>
