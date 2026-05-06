import type { GameState } from '~/types/substitute'

const SESSION_PREFIX = 'sub:session:'
const SESSION_TTL = 14400 // 4 hours

export async function getSubSession(kv: KVNamespace, id: string): Promise<GameState | null> {
  const raw = await kv.get(`${SESSION_PREFIX}${id}`)
  if (!raw) return null
  return JSON.parse(raw) as GameState
}

export async function saveSubSession(kv: KVNamespace, state: GameState): Promise<void> {
  await kv.put(`${SESSION_PREFIX}${state.id}`, JSON.stringify(state), {
    expirationTtl: SESSION_TTL,
  })
}

export async function deleteSubSession(kv: KVNamespace, id: string): Promise<void> {
  await kv.delete(`${SESSION_PREFIX}${id}`)
}
