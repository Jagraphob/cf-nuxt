import { getSubSession } from '~/server/utils/substitute'

export default defineEventHandler(async (event) => {
  const { sessionId } = await readBody<{ sessionId: string }>(event)

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId required' })
  }

  const kv = event.context.cloudflare.env.CF_NUXT_KV
  const state = await getSubSession(kv, sessionId)

  if (!state) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  return state
})
