import { shuffleCards, saveSession } from '~/server/utils/tower'
import type { GameSession } from '~/types/tower'

export default defineEventHandler(async (event) => {
  const kv = event.context.cloudflare.env.CF_NUXT_KV

  const id = crypto.randomUUID()
  const session: GameSession = {
    id,
    mode: 'quick',
    round: 1,
    totalScore: 0,
    cards: shuffleCards(),
    pickedIndex: null,
    status: 'playing',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await saveSession(kv, session)

  return { sessionId: id }
})
