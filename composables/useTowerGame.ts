import type { CardValue, GameStatus } from '~/types/tower'

export function useTowerGame() {
  const sessionId = ref<string | null>(null)
  const round = ref(1)
  const totalScore = ref(0)
  const status = ref<GameStatus>('playing')
  const pickedIndex = ref<number | null>(null)
  const revealedCards = ref<(CardValue | null)[]>(Array(5).fill(null))
  const loading = ref(false)
  const error = ref<string | null>(null)

  function resetState() {
    sessionId.value = null
    round.value = 1
    totalScore.value = 0
    status.value = 'playing'
    pickedIndex.value = null
    revealedCards.value = Array(5).fill(null)
    error.value = null
  }

  async function startGame() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<{ sessionId: string }>('/api/tower/session', { method: 'POST' })
      sessionId.value = data.sessionId
      round.value = 1
      totalScore.value = 0
      status.value = 'playing'
      pickedIndex.value = null
      revealedCards.value = Array(5).fill(null)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to start game'
    } finally {
      loading.value = false
    }
  }

  async function pickCard(index: number) {
    if (!sessionId.value || status.value !== 'playing') return
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<{
        pickedValue: CardValue
        cards: CardValue[]
        totalScore: number
        status: GameStatus
        round: number
      }>('/api/tower/pick', {
        method: 'POST',
        body: { sessionId: sessionId.value, cardIndex: index },
      })

      pickedIndex.value = index
      revealedCards.value = data.cards
      totalScore.value = data.totalScore
      status.value = data.status
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to pick card'
    } finally {
      loading.value = false
    }
  }

  async function cashOut() {
    if (!sessionId.value || status.value !== 'round_complete') return
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<{ totalScore: number; round: number; status: GameStatus }>(
        '/api/tower/cashout',
        { method: 'POST', body: { sessionId: sessionId.value } }
      )
      totalScore.value = data.totalScore
      status.value = data.status
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to cash out'
    } finally {
      loading.value = false
    }
  }

  async function nextRound() {
    if (!sessionId.value || status.value !== 'round_complete') return
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<{ round: number; totalScore: number; status: GameStatus }>(
        '/api/tower/next-round',
        { method: 'POST', body: { sessionId: sessionId.value } }
      )
      round.value = data.round
      totalScore.value = data.totalScore
      status.value = data.status
      pickedIndex.value = null
      revealedCards.value = Array(5).fill(null)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to start next round'
    } finally {
      loading.value = false
    }
  }

  return {
    sessionId,
    round,
    totalScore,
    status,
    pickedIndex,
    revealedCards,
    loading,
    error,
    startGame,
    pickCard,
    cashOut,
    nextRound,
    resetState,
  }
}
