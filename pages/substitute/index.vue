<script setup lang="ts">
import type { SubstituteConfig } from '~/types/substitute'

const { createGame, loadGame, loading, error, saveRoster, loadRoster, getSavedSessionId } = useSubstitute()

const formRef = ref<{ setRosterNames: (names: string[]) => void } | null>(null)
const savedRosterExists = ref(false)
const resumeSessionId = ref<string | null>(null)
const showResumePrompt = ref(false)

onMounted(() => {
  savedRosterExists.value = !!localStorage.getItem('substitute:roster')
  resumeSessionId.value = getSavedSessionId()
  showResumePrompt.value = !!resumeSessionId.value
})

async function handleSubmit(config: SubstituteConfig) {
  await createGame(config)
  await navigateTo('/substitute/game')
}

function handleSaveRoster(names: string[]) {
  saveRoster(names)
  savedRosterExists.value = true
}

function handleLoadRoster() {
  const names = loadRoster()
  formRef.value?.setRosterNames(names)
}

async function handleResume() {
  if (!resumeSessionId.value) return
  await loadGame(resumeSessionId.value)
  if (!error.value) {
    await navigateTo('/substitute/game')
  } else {
    showResumePrompt.value = false
    resumeSessionId.value = null
  }
}
</script>

<template>
  <div class="max-w-md mx-auto px-4 pt-4">
    <div class="flex items-center gap-3 mb-6">
      <Icon name="tabler:ball-football" class="text-primary w-7 h-7" />
      <div>
        <h1 class="text-xl font-bold">Substitute</h1>
        <p class="text-sm text-base-content/60">Fair play time manager</p>
      </div>
    </div>

    <!-- Resume prompt -->
    <div v-if="showResumePrompt" class="alert mb-4 flex-col items-start gap-2">
      <div class="flex items-center gap-2">
        <Icon name="tabler:clock-play" class="text-primary" />
        <span class="font-semibold text-sm">Game in progress</span>
      </div>
      <p class="text-sm text-base-content/70">You have an ongoing game session.</p>
      <div class="flex gap-2 w-full">
        <button class="btn btn-primary btn-sm flex-1" :disabled="loading" @click="handleResume">
          <span v-if="loading" class="loading loading-spinner loading-xs" />
          Resume Game
        </button>
        <button class="btn btn-ghost btn-sm" @click="showResumePrompt = false">
          New Game
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-error mb-4 text-sm">{{ error }}</div>

    <div v-if="!showResumePrompt">
      <SubstituteSetupForm
        ref="formRef"
        :saved-roster-exists="savedRosterExists"
        @submit="handleSubmit"
        @save-roster="handleSaveRoster"
        @load-roster="handleLoadRoster"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>
  </div>
</template>
