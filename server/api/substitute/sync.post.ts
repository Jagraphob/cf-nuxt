import type { GameState } from '~/types/substitute'
import { saveSubSession } from '~/server/utils/substitute'

export default defineEventHandler(async (event) => {
  const { sessionId, state } = await readBody<{ sessionId: string; state: GameState }>(event)

  if (!sessionId || !state) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId and state required' })
  }

  const kv = event.context.cloudflare.env.CF_NUXT_KV
  state.updatedAt = Date.now()
  await saveSubSession(kv, state)

  return { ok: true }
})
