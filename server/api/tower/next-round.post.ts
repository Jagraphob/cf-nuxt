import { getSession, saveSession, shuffleCards } from '~/server/utils/tower'

export default defineEventHandler(async (event) => {
  const kv = event.context.cloudflare.env.CF_NUXT_KV
  const { sessionId } = await readBody(event)

  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'Missing sessionId' })
  }

  const session = await getSession(kv, sessionId)
  if (!session) {
    throw createError({ statusCode: 404, message: 'Session not found' })
  }

  if (session.status !== 'round_complete') {
    throw createError({ statusCode: 400, message: 'Cannot start next round in current state' })
  }

  session.round += 1
  session.cards = shuffleCards()
  session.pickedIndex = null
  session.status = 'playing'
  session.updatedAt = Date.now()

  await saveSession(kv, session)

  return {
    round: session.round,
    totalScore: session.totalScore,
    status: session.status,
  }
})
