import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { GameState, Move, Position, PieceType, Player } from '@gungi/engine'
import { getLegalMoves } from '@gungi/engine'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  from: string
  color: Player
  text: string
  timestamp: number
}

export interface GameStore {
  // Connection
  roomCode: string | null
  playerColor: Player | null
  opponentName: string | null
  sessionToken: string | null

  // Game state (from server)
  gameState: GameState | null

  // UI state
  selectedPosition: Position | null
  selectedReservePiece: PieceType | null
  legalMoves: Move[]
  lastMove: { from: Position | null; to: Position } | null

  // Chat
  messages: ChatMessage[]

  // Draw state
  drawOffered: boolean
  drawPending: boolean

  // Room status
  waitingForOpponent: boolean

  // Actions
  setRoomCode(code: string): void
  setPlayerColor(color: Player): void
  setOpponentName(name: string): void
  setSessionToken(token: string): void
  setGameState(state: GameState): void
  setWaitingForOpponent(waiting: boolean): void

  selectCell(pos: Position): void
  selectReservePiece(piece: PieceType): void
  clearSelection(): void

  setLastMove(move: { from: Position | null; to: Position } | null): void

  addMessage(msg: Omit<ChatMessage, 'id'>): void
  setDrawOffered(val: boolean): void
  setDrawPending(val: boolean): void

  reset(): void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    // Initial state
    roomCode: null,
    playerColor: null,
    opponentName: null,
    sessionToken: null,
    gameState: null,
    selectedPosition: null,
    selectedReservePiece: null,
    legalMoves: [],
    lastMove: null,
    messages: [],
    drawOffered: false,
    drawPending: false,
    waitingForOpponent: false,

    // ── Actions ──

    setRoomCode: (code) =>
      set((s) => {
        s.roomCode = code
      }),

    setPlayerColor: (color) =>
      set((s) => {
        s.playerColor = color
      }),

    setOpponentName: (name) =>
      set((s) => {
        s.opponentName = name
      }),

    setSessionToken: (token) =>
      set((s) => {
        s.sessionToken = token
      }),

    setGameState: (state) =>
      set((s) => {
        s.gameState = state
        // Clear selection when game state updates (after a move)
        s.selectedPosition = null
        s.selectedReservePiece = null
        s.legalMoves = []
      }),

    setWaitingForOpponent: (waiting) =>
      set((s) => {
        s.waitingForOpponent = waiting
      }),

    selectCell: (pos) =>
      set((s) => {
        const { gameState, playerColor } = s

        if (!gameState || !playerColor) return

        // If in reserve-drop mode, clicking a cell tries a drop
        if (s.selectedReservePiece !== null) {
          // The actual drop emission is handled by useGame hook
          return
        }

        const tower = gameState.board[pos.row]?.[pos.col]
        const topPiece = tower ? tower[tower.length - 1] : null

        // Clicking own piece: select it
        if (topPiece && topPiece.owner === playerColor) {
          s.selectedPosition = pos
          s.selectedReservePiece = null
          // Compute legal moves for this piece from the selected position
          const allLegal = getLegalMoves(gameState)
          s.legalMoves = allLegal.filter(
            (m) =>
              m.from &&
              m.from.row === pos.row &&
              m.from.col === pos.col
          )
          return
        }

        // Clicking a legal destination
        if (s.selectedPosition !== null) {
          const isLegal = s.legalMoves.some(
            (m) => m.to.row === pos.row && m.to.col === pos.col
          )
          if (isLegal) {
            // Selection remains; the useGame hook reads this and emits the move
            return
          }
        }

        // Clicking empty/enemy with no selection: clear
        s.selectedPosition = null
        s.selectedReservePiece = null
        s.legalMoves = []
      }),

    selectReservePiece: (piece) =>
      set((s) => {
        const { gameState, playerColor } = s
        if (!gameState || !playerColor) return

        if (s.selectedReservePiece === piece) {
          // Deselect
          s.selectedReservePiece = null
          s.selectedPosition = null
          s.legalMoves = []
          return
        }

        s.selectedReservePiece = piece
        s.selectedPosition = null
        // Compute valid drop squares
        const allLegal = getLegalMoves(gameState)
        s.legalMoves = allLegal.filter(
          (m) => m.type === 'place' && m.piece === piece
        )
      }),

    clearSelection: () =>
      set((s) => {
        s.selectedPosition = null
        s.selectedReservePiece = null
        s.legalMoves = []
      }),

    setLastMove: (move) =>
      set((s) => {
        s.lastMove = move
      }),

    addMessage: (msg) =>
      set((s) => {
        s.messages.push({
          ...msg,
          id: `${msg.timestamp}-${Math.random().toString(36).slice(2)}`,
        })
      }),

    setDrawOffered: (val) =>
      set((s) => {
        s.drawOffered = val
      }),

    setDrawPending: (val) =>
      set((s) => {
        s.drawPending = val
      }),

    reset: () =>
      set((s) => {
        s.gameState = null
        s.selectedPosition = null
        s.selectedReservePiece = null
        s.legalMoves = []
        s.lastMove = null
        s.messages = []
        s.drawOffered = false
        s.drawPending = false
        s.waitingForOpponent = false
        s.opponentName = null
      }),
  }))
)
