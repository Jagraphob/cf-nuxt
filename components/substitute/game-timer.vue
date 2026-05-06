<script setup lang="ts">
const props = defineProps<{
  countdownMs: number
  intervalSeconds: number
  isRunning: boolean
}>()

const emit = defineEmits<{
  toggle: []
  setCountdown: [ms: number]
}>()

function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const progress = computed(() => {
  const total = props.intervalSeconds * 1000
  return total > 0 ? props.countdownMs / total : 1
})

const urgency = computed(() => {
  if (progress.value < 0.1) return 'text-error'
  if (progress.value < 0.25) return 'text-warning'
  return 'text-base-content'
})

const circumference = 2 * Math.PI * 44
const dashOffset = computed(() => circumference * (1 - progress.value))

// Edit mode
const isEditing = ref(false)
const editValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function openEdit() {
  const total = Math.ceil(props.countdownMs / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  editValue.value = `${m}:${s.toString().padStart(2, '0')}`
  isEditing.value = true
  nextTick(() => {
    inputRef.value?.select()
  })
}

function commitEdit() {
  const raw = editValue.value.trim()
  let ms = 0
  if (raw.includes(':')) {
    // "1:20" → 1 min 20 sec
    const [mPart, sPart] = raw.split(':')
    const m = parseInt(mPart) || 0
    const s = parseInt(sPart) || 0
    ms = (m * 60 + s) * 1000
  } else {
    // "120" → treat as "1:20" (last 2 digits = seconds, rest = minutes)
    const digits = raw.replace(/\D/g, '')
    if (digits.length <= 2) {
      ms = (parseInt(digits) || 0) * 1000
    } else {
      const s = parseInt(digits.slice(-2)) || 0
      const m = parseInt(digits.slice(0, -2)) || 0
      ms = (m * 60 + s) * 1000
    }
  }
  if (ms > 0) emit('setCountdown', ms)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <!-- Clock circle -->
    <div
      class="relative w-28 h-28 cursor-pointer select-none active:scale-95 transition-transform"
      @click="!isEditing && $emit('toggle')"
    >
      <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="5" class="text-base-300" />
        <circle
          cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="5"
          class="transition-all duration-100"
          :class="progress < 0.25 ? 'text-error' : 'text-primary'"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
        />
      </svg>
      <!-- Editing: inline input -->
      <div v-if="isEditing" class="absolute inset-0 flex items-center justify-center" @click.stop>
        <input
          ref="inputRef"
          v-model="editValue"
          class="w-20 text-center text-xl font-bold tabular-nums bg-transparent border-b-2 border-primary outline-none"
          placeholder="1:20"
          @keydown.enter="commitEdit"
          @keydown.escape="cancelEdit"
          @blur="commitEdit"
        />
      </div>
      <!-- Normal: time + icon -->
      <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span class="text-2xl font-bold tabular-nums leading-none" :class="urgency">
          {{ formatCountdown(countdownMs) }}
        </span>
        <Icon
          :name="isRunning ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'"
          class="w-4 h-4 transition-colors"
          :class="isRunning ? 'text-base-content/30' : 'text-primary'"
        />
      </div>
    </div>

    <!-- Tap hint / edit button -->
    <div class="flex items-center gap-1.5">
      <span class="text-xs font-medium" :class="isRunning ? 'text-base-content/40' : 'text-primary'">
        {{ isRunning ? 'tap to pause' : 'tap to start' }}
      </span>
      <button
        v-if="!isRunning && !isEditing"
        class="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0"
        title="Edit countdown"
        @click.stop="openEdit"
      >
        <Icon name="tabler:pencil" class="w-3 h-3 text-base-content/40" />
      </button>
    </div>
  </div>
</template>
