export type CardValue = 1 | 2 | -1

export type GameStatus = 'playing' | 'round_complete' | 'cashed_out' | 'game_over'
export type GameMode = 'quick' | 'competitive'

export interface GameSession {
  id: string
  mode: GameMode
  round: number
  totalScore: number
  cards: CardValue[] // server-only, never sent to client before pick
  pickedIndex: number | null
  status: GameStatus
  createdAt: number
  updatedAt: number
}

// Phase 2 types
export interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
  active: boolean
  createdBy: string
}

export interface LeaderboardEntry {
  userId: string
  name: string
  avatar: string
  score: number
  roundsReached: number
  playedAt: string
}
