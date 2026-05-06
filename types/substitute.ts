export interface SubstituteConfig {
  playerNames: string[]
  onCourtCount: number
  substituteCount: number
  intervalSeconds: number
  periodCount: number
}

export type GamePhase = 'playing' | 'paused' | 'period_break' | 'ended'

export interface Player {
  id: string
  name: string
  totalPlayTimeMs: number
  currentStintStartMs: number | null
  isOnCourt: boolean
  isActive: boolean
  isSkipped: boolean
  substitutionCount: number
}

export interface SubstitutionRecord {
  timestamp: number
  period: number
  playersOut: string[]
  playersIn: string[]
}

export interface GameState {
  id: string
  config: SubstituteConfig
  players: Player[]
  phase: GamePhase
  currentPeriod: number
  timerStartedAt: number | null
  timerElapsedMs: number
  subIntervalElapsedMs: number
  substitutionHistory: SubstitutionRecord[]
  createdAt: number
  updatedAt: number
}
