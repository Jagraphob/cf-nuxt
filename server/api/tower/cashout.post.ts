import { getSession, saveSession } from '~/server/utils/tower'

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
    throw createError({ statusCode: 400, message: 'Cannot cash out in current state' })
  }

  if (session.round < 2) {
    throw createError({ statusCode: 400, message: 'Must complete at least one more round before cashing out' })
  }

  session.status = 'cashed_out'
  session.updatedAt = Date.now()

  await saveSession(kv, session)

  return {
    totalScore: session.totalScore,
    round: session.round,
    status: session.status,
  }
})
