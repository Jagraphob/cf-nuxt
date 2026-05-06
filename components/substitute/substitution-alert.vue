<script setup lang="ts">
import type { Player } from '~/types/substitute'

const props = defineProps<{
  nextSubOut: Player[]
  nextSubIn: Player[]
}>()

const emit = defineEmits<{
  substitute: []
  dismiss: []
}>()
</script>

<template>
  <div class="modal modal-open">
    <div class="modal-box max-w-sm text-center">
      <div class="text-5xl mb-3">📣</div>
      <h3 class="font-bold text-xl mb-3">Substitution Time!</h3>

      <div v-if="nextSubIn.length" class="flex flex-col gap-2 mb-5 text-sm">
        <div class="flex items-center justify-center gap-3">
          <div class="flex flex-col items-center gap-1">
            <span class="text-xs text-base-content/50 uppercase tracking-wide">Coming In</span>
            <div class="flex flex-col gap-1">
              <span
                v-for="p in nextSubIn"
                :key="p.id"
                class="badge badge-success badge-lg font-semibold"
              >{{ p.name }}</span>
            </div>
          </div>
          <Icon name="tabler:arrows-exchange" class="text-base-content/40 w-5 h-5 shrink-0" />
          <div class="flex flex-col items-center gap-1">
            <span class="text-xs text-base-content/50 uppercase tracking-wide">Going Out</span>
            <div class="flex flex-col gap-1">
              <span
                v-for="p in nextSubOut"
                :key="p.id"
                class="badge badge-warning badge-lg font-semibold"
              >{{ p.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action justify-center gap-3">
        <button class="btn btn-primary btn-lg flex-1" @click="emit('substitute')">
          <Icon name="tabler:replace" />
          Sub Now
        </button>
        <button class="btn btn-ghost flex-1" @click="emit('dismiss')">
          Skip
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="emit('dismiss')" />
  </div>
</template>
