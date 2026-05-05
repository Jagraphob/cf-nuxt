import type { CardValue, GameSession } from '~/types/tower'

const CARD_DECK: CardValue[] = [1, 1, 1, 2, -1]
const SESSION_TTL = 3600 // 1 hour in seconds
const SESSION_PREFIX = 'tower:session:'

export function shuffleCards(): CardValue[] {
  const deck = [...CARD_DECK]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function sessionKey(id: string): string {
  return `${SESSION_PREFIX}${id}`
}

export async function getSession(kv: KVNamespace, id: string): Promise<GameSession | null> {
  const raw = await kv.get(sessionKey(id))
  if (!raw) return null
  return JSON.parse(raw) as GameSession
}

export async function saveSession(kv: KVNamespace, session: GameSession): Promise<void> {
  await kv.put(sessionKey(session.id), JSON.stringify(session), { expirationTtl: SESSION_TTL })
}

export async function deleteSession(kv: KVNamespace, id: string): Promise<void> {
  await kv.delete(sessionKey(id))
}
