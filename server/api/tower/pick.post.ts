import { getSession, saveSession } from '~/server/utils/tower'

export default defineEventHandler(async (event) => {
  const kv = event.context.cloudflare.env.CF_NUXT_KV
  const { sessionId, cardIndex } = await readBody(event)

  if (!sessionId || cardIndex === undefined || cardIndex === null) {
    throw createError({ statusCode: 400, message: 'Missing sessionId or cardIndex' })
  }

  const session = await getSession(kv, sessionId)
  if (!session) {
    throw createError({ statusCode: 404, message: 'Session not found' })
  }

  if (session.status !== 'playing') {
    throw createError({ statusCode: 400, message: 'Cannot pick card in current state' })
  }

  if (cardIndex < 0 || cardIndex > 4) {
    throw createError({ statusCode: 400, message: 'Invalid card index' })
  }

  const pickedValue = session.cards[cardIndex]
  const isGameOver = pickedValue === -1

  session.pickedIndex = cardIndex
  session.updatedAt = Date.now()

  if (isGameOver) {
    session.totalScore = 0
    session.status = 'game_over'
  } else {
    session.totalScore += pickedValue
    session.status = 'round_complete'
  }

  await saveSession(kv, session)

  return {
    pickedValue,
    cards: session.cards, // reveal all cards now that round is done
    totalScore: session.totalScore,
    status: session.status,
    round: session.round,
  }
})
