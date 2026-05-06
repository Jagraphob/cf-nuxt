import type { SubstituteConfig, GameState, Player } from '~/types/substitute'
import { saveSubSession } from '~/server/utils/substitute'

export default defineEventHandler(async (event) => {
  const config = await readBody<SubstituteConfig>(event)

  if (!config.playerNames || config.playerNames.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'At least 2 players required' })
  }
  if (config.onCourtCount < 1 || config.onCourtCount >= config.playerNames.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid onCourtCount' })
  }
  if (config.substituteCount < 1 || config.substituteCount >= config.onCourtCount) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid substituteCount' })
  }
  if (config.intervalSeconds < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Interval must be at least 10 seconds' })
  }

  const players: Player[] = config.playerNames.map((name, i) => ({
    id: crypto.randomUUID(),
    name: name.trim(),
    totalPlayTimeMs: 0,
    currentStintStartMs: null,
    isOnCourt: i < config.onCourtCount,
    isActive: true,
    isSkipped: false,
    substitutionCount: 0,
  }))

  const now = Date.now()
  const state: GameState = {
    id: crypto.randomUUID(),
    config,
    players,
    phase: 'paused',
    currentPeriod: 1,
    timerStartedAt: null,
    timerElapsedMs: 0,
    subIntervalElapsedMs: 0,
    substitutionHistory: [],
    createdAt: now,
    updatedAt: now,
  }

  const kv = event.context.cloudflare.env.CF_NUXT_KV
  await saveSubSession(kv, state)

  return { sessionId: state.id }
})
