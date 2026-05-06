import type { SubstituteConfig, GameState, Player, SubstitutionRecord } from '~/types/substitute'

const STORAGE_KEY = 'substitute:sessionId'
const SYNC_INTERVAL_MS = 30_000

export function useSubstitute() {
  const sessionId = ref<string | null>(null)
  const gameState = ref<GameState | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Client-side timer
  const timerHandle = ref<ReturnType<typeof setInterval> | null>(null)
  const syncHandle = ref<ReturnType<typeof setInterval> | null>(null)
  const nowMs = ref(Date.now())

  // Tap-tap swap selection
  const selectedPlayerId = ref<string | null>(null)

  // Manual bench order (overrides computed sort when set by drag)
  const manualBenchOrder = ref<string[] | null>(null)

  // Alert state
  const showSubAlert = ref(false)

  // ---- Computed ----

  const isRunning = computed(() => gameState.value?.phase === 'playing')

  const livePlayTime = computed<Map<string, number>>(() => {
    const map = new Map<string, number>()
    if (!gameState.value) return map
    const now = nowMs.value
    for (const p of gameState.value.players) {
      let time = p.totalPlayTimeMs
      if (p.isOnCourt && p.isActive && p.currentStintStartMs !== null) {
        time += now - p.currentStintStartMs
      }
      map.set(p.id, time)
    }
    return map
  })

  const courtPlayers = computed<Player[]>(() => {
    if (!gameState.value) return []
    return gameState.value.players.filter(p => p.isOnCourt && p.isActive)
  })

  const benchPlayers = computed<Player[]>(() => {
    if (!gameState.value) return []
    const active = gameState.value.players.filter(p => !p.isOnCourt && p.isActive)
    if (manualBenchOrder.value) {
      // Respect manual order, append any new players at end
      const ordered: Player[] = []
      for (const id of manualBenchOrder.value) {
        const p = active.find(p => p.id === id)
        if (p) ordered.push(p)
      }
      for (const p of active) {
        if (!ordered.includes(p)) ordered.push(p)
      }
      return ordered
    }
    return active.sort((a, b) => {
      // Non-skipped players first, then by play time
      if (a.isSkipped !== b.isSkipped) return a.isSkipped ? 1 : -1
      const timeDiff = (livePlayTime.value.get(a.id) ?? 0) - (livePlayTime.value.get(b.id) ?? 0)
      if (timeDiff !== 0) return timeDiff
      return a.substitutionCount - b.substitutionCount
    })
  })

  const subCountdownMs = computed<number>(() => {
    if (!gameState.value) return 0
    const intervalMs = gameState.value.config.intervalSeconds * 1000
    if (gameState.value.phase === 'playing' && gameState.value.timerStartedAt !== null) {
      const elapsedInInterval =
        gameState.value.subIntervalElapsedMs + (nowMs.value - gameState.value.timerStartedAt)
      return Math.max(0, intervalMs - elapsedInInterval)
    }
    return Math.max(0, intervalMs - gameState.value.subIntervalElapsedMs)
  })

  const fairnessStats = computed(() => {
    if (!gameState.value) return []
    const activePlayers = gameState.value.players.filter(p => p.isActive)
    if (activePlayers.length === 0) return []
    const times = activePlayers.map(p => livePlayTime.value.get(p.id) ?? 0)
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const max = Math.max(...times)
    return activePlayers.map(p => {
      const time = livePlayTime.value.get(p.id) ?? 0
      const ratio = max > 0 ? time / max : 0
      const deviation = avg > 0 ? (time - avg) / avg : 0
      return { playerId: p.id, time, ratio, deviation }
    })
  })

  // ---- Timer ----

  function startTimerTick() {
    if (timerHandle.value) return
    timerHandle.value = setInterval(() => {
      nowMs.value = Date.now()
      if (!gameState.value || gameState.value.phase !== 'playing') return
      if (subCountdownMs.value === 0 && !showSubAlert.value) {
        triggerSubAlert()
      }
    }, 100)
  }

  function stopTimerTick() {
    if (timerHandle.value) {
      clearInterval(timerHandle.value)
      timerHandle.value = null
    }
  }

  function startTimer() {
    if (!gameState.value || gameState.value.phase === 'ended') return
    const now = Date.now()
    gameState.value.phase = 'playing'
    gameState.value.timerStartedAt = now
    // Restore court players' stint start if they don't have one
    for (const p of gameState.value.players) {
      if (p.isOnCourt && p.isActive && p.currentStintStartMs === null) {
        p.currentStintStartMs = now
      }
    }
    startTimerTick()
    syncToServer()
  }

  function pauseTimer() {
    if (!gameState.value || gameState.value.phase !== 'playing') return
    const now = Date.now()
    const elapsed = gameState.value.timerStartedAt ? now - gameState.value.timerStartedAt : 0
    gameState.value.timerElapsedMs += elapsed
    gameState.value.subIntervalElapsedMs += elapsed
    // Freeze court player play times
    for (const p of gameState.value.players) {
      if (p.isOnCourt && p.isActive && p.currentStintStartMs !== null) {
        p.totalPlayTimeMs += now - p.currentStintStartMs
        p.currentStintStartMs = null
      }
    }
    gameState.value.phase = 'paused'
    gameState.value.timerStartedAt = null
    stopTimerTick()
    syncToServer()
  }

  function resetSubInterval() {
    if (!gameState.value) return
    gameState.value.subIntervalElapsedMs = 0
    if (gameState.value.phase === 'playing') {
      gameState.value.timerStartedAt = Date.now()
    }
  }

  function setCountdown(ms: number) {
    if (!gameState.value) return
    const intervalMs = gameState.value.config.intervalSeconds * 1000
    gameState.value.subIntervalElapsedMs = Math.max(0, intervalMs - ms)
    syncToServer()
  }

  // ---- Alert ----

  function playBeep() {
    if (!import.meta.client) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
      osc.onended = () => ctx.close()
    } catch {/* AudioContext not available */}
  }

  function triggerSubAlert() {
    showSubAlert.value = true
    if (import.meta.client && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }
    playBeep()
  }

  function dismissAlert() {
    showSubAlert.value = false
    resetSubInterval()
  }

  // ---- Substitution ----

  const nextSubPreview = computed<{ out: Player[]; in: Player[] }>(() => {
    if (!gameState.value) return { out: [], in: [] }
    const { outIds, inIds } = computeSubstitution()
    return {
      out: outIds.map(id => gameState.value!.players.find(p => p.id === id)!).filter(Boolean),
      in: inIds.map(id => gameState.value!.players.find(p => p.id === id)!).filter(Boolean),
    }
  })

  function computeSubstitution(): { outIds: string[]; inIds: string[] } {
    if (!gameState.value) return { outIds: [], inIds: [] }
    const now = nowMs.value
    const { substituteCount } = gameState.value.config

    const onCourt = courtPlayers.value.slice().sort((a, b) => {
      const aTime = livePlayTime.value.get(a.id) ?? 0
      const bTime = livePlayTime.value.get(b.id) ?? 0
      return bTime - aTime // most played first
    })

    const available = benchPlayers.value.filter(p => !p.isSkipped)

    const count = Math.min(substituteCount, onCourt.length, available.length)
    return {
      outIds: onCourt.slice(0, count).map(p => p.id),
      inIds: available.slice(0, count).map(p => p.id),
    }
  }

  function applySubstitution(outIds: string[], inIds: string[]) {
    if (!gameState.value) return
    const now = Date.now()
    const isPlaying = gameState.value.phase === 'playing'

    for (const p of gameState.value.players) {
      if (outIds.includes(p.id)) {
        if (isPlaying && p.currentStintStartMs !== null) {
          p.totalPlayTimeMs += now - p.currentStintStartMs
          p.currentStintStartMs = null
        }
        p.isOnCourt = false
      }
      if (inIds.includes(p.id)) {
        p.isOnCourt = true
        p.isSkipped = false
        p.substitutionCount++
        p.currentStintStartMs = isPlaying ? now : null
      }
    }

    const record: SubstitutionRecord = {
      timestamp: now,
      period: gameState.value.currentPeriod,
      playersOut: outIds,
      playersIn: inIds,
    }
    gameState.value.substitutionHistory.push(record)
    manualBenchOrder.value = null // reset manual order after substitution
    syncToServer()
  }

  function performSubstitution() {
    const { outIds, inIds } = computeSubstitution()
    if (outIds.length === 0) return
    applySubstitution(outIds, inIds)
    resetSubInterval()
    showSubAlert.value = false
  }

  function swapPlayers(outId: string, inId: string) {
    applySubstitution([outId], [inId])
  }

  function reorderBench(newOrderIds: string[]) {
    manualBenchOrder.value = newOrderIds
  }

  // ---- Tap-tap swap ----

  function selectPlayer(playerId: string) {
    if (!gameState.value) return
    const player = gameState.value.players.find(p => p.id === playerId && p.isActive)
    if (!player) return

    if (selectedPlayerId.value === null) {
      selectedPlayerId.value = playerId
      return
    }

    const selected = gameState.value.players.find(p => p.id === selectedPlayerId.value)
    if (!selected) {
      selectedPlayerId.value = playerId
      return
    }

    // Same player → deselect
    if (selectedPlayerId.value === playerId) {
      selectedPlayerId.value = null
      return
    }

    // Both on court or both on bench → just reselect
    if (player.isOnCourt === selected.isOnCourt) {
      selectedPlayerId.value = playerId
      return
    }

    const courtId = player.isOnCourt ? playerId : selected.id
    const benchId = player.isOnCourt ? selected.id : playerId
    swapPlayers(courtId, benchId)
    selectedPlayerId.value = null
  }

  // ---- Player management ----

  function skipPlayer(playerId: string) {
    if (!gameState.value) return
    const p = gameState.value.players.find(p => p.id === playerId)
    if (p) p.isSkipped = true
    syncToServer()
  }

  function unskipPlayer(playerId: string) {
    if (!gameState.value) return
    const p = gameState.value.players.find(p => p.id === playerId)
    if (p) p.isSkipped = false
    syncToServer()
  }

  function removePlayer(playerId: string) {
    if (!gameState.value) return
    const now = Date.now()
    const p = gameState.value.players.find(p => p.id === playerId)
    if (!p) return
    if (p.isOnCourt && p.currentStintStartMs !== null && gameState.value.phase === 'playing') {
      p.totalPlayTimeMs += now - p.currentStintStartMs
      p.currentStintStartMs = null
    }
    p.isActive = false
    p.isOnCourt = false
    syncToServer()
  }

  // ---- Undo ----

  function undoLastSub() {
    if (!gameState.value || gameState.value.substitutionHistory.length === 0) return
    const last = gameState.value.substitutionHistory[gameState.value.substitutionHistory.length - 1]
    const now = Date.now()
    const isPlaying = gameState.value.phase === 'playing'

    for (const p of gameState.value.players) {
      if (last.playersIn.includes(p.id)) {
        // Reverse: was subbed in, now goes back to bench
        if (isPlaying && p.currentStintStartMs !== null) {
          p.totalPlayTimeMs += now - p.currentStintStartMs
          p.currentStintStartMs = null
        }
        p.isOnCourt = false
        p.substitutionCount = Math.max(0, p.substitutionCount - 1)
      }
      if (last.playersOut.includes(p.id)) {
        // Reverse: was subbed out, now goes back on court
        p.isOnCourt = true
        p.currentStintStartMs = isPlaying ? now : null
      }
    }

    gameState.value.substitutionHistory.pop()
    syncToServer()
  }

  // ---- Periods ----

  function nextPeriod() {
    if (!gameState.value) return
    if (gameState.value.phase === 'playing') {
      pauseTimer()
    }
    if (gameState.value.currentPeriod >= gameState.value.config.periodCount) {
      endGame()
      return
    }
    gameState.value.currentPeriod++
    gameState.value.phase = 'period_break'
    gameState.value.subIntervalElapsedMs = 0
    gameState.value.timerStartedAt = null
    syncToServer()
  }

  function startPeriod() {
    if (!gameState.value || gameState.value.phase !== 'period_break') return
    gameState.value.phase = 'paused'
  }

  // ---- Game lifecycle ----

  async function createGame(config: SubstituteConfig) {
    loading.value = true
    error.value = null
    try {
      const { sessionId: id } = await $fetch<{ sessionId: string }>('/api/substitute/session', {
        method: 'POST',
        body: config,
      })
      sessionId.value = id
      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, id)
      }
      await loadGame(id)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create game'
    } finally {
      loading.value = false
    }
  }

  async function loadGame(id: string) {
    loading.value = true
    error.value = null
    try {
      const state = await $fetch<GameState>('/api/substitute/state', {
        method: 'POST',
        body: { sessionId: id },
      })
      sessionId.value = id
      gameState.value = state
      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, id)
      }
      if (state.phase === 'playing') {
        startTimerTick()
        startSyncInterval()
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Session not found'
      if (import.meta.client) {
        localStorage.removeItem(STORAGE_KEY)
      }
    } finally {
      loading.value = false
    }
  }

  async function endGame() {
    if (gameState.value?.phase === 'playing') {
      pauseTimer()
    }
    if (gameState.value) {
      gameState.value.phase = 'ended'
    }
    stopTimerTick()
    stopSyncInterval()
    if (sessionId.value) {
      await $fetch('/api/substitute/end', {
        method: 'POST',
        body: { sessionId: sessionId.value },
      }).catch(() => {})
    }
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // ---- KV Sync ----

  async function syncToServer() {
    if (!sessionId.value || !gameState.value) return
    gameState.value.updatedAt = Date.now()
    await $fetch('/api/substitute/sync', {
      method: 'POST',
      body: { sessionId: sessionId.value, state: gameState.value },
    }).catch(() => {/* fail silently */})
  }

  function startSyncInterval() {
    if (syncHandle.value) return
    syncHandle.value = setInterval(syncToServer, SYNC_INTERVAL_MS)
  }

  function stopSyncInterval() {
    if (syncHandle.value) {
      clearInterval(syncHandle.value)
      syncHandle.value = null
    }
  }

  // ---- Roster localStorage ----

  function saveRoster(names: string[]) {
    if (import.meta.client) {
      localStorage.setItem('substitute:roster', JSON.stringify(names))
    }
  }

  function loadRoster(): string[] {
    if (!import.meta.client) return []
    const raw = localStorage.getItem('substitute:roster')
    return raw ? JSON.parse(raw) : []
  }

  function getSavedSessionId(): string | null {
    if (!import.meta.client) return null
    return localStorage.getItem(STORAGE_KEY)
  }

  // ---- Lifecycle ----

  onUnmounted(() => {
    stopTimerTick()
    stopSyncInterval()
  })

  return {
    // State
    sessionId,
    gameState,
    loading,
    error,
    showSubAlert,
    selectedPlayerId,
    // Computed
    isRunning,
    courtPlayers,
    benchPlayers,
    subCountdownMs,
    fairnessStats,
    livePlayTime,
    nextSubPreview,
    // Timer
    startTimer,
    pauseTimer,
    setCountdown,
    // Alert
    dismissAlert,
    // Substitution
    performSubstitution,
    swapPlayers,
    reorderBench,
    selectPlayer,
    // Player management
    skipPlayer,
    unskipPlayer,
    removePlayer,
    // Undo
    undoLastSub,
    // Periods
    nextPeriod,
    startPeriod,
    // Game lifecycle
    createGame,
    loadGame,
    endGame,
    // Roster
    saveRoster,
    loadRoster,
    getSavedSessionId,
    // Sync
    syncToServer,
    startSyncInterval,
    stopSyncInterval,
  }
}
