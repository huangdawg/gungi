/**
 * Gungi Rule Engine — main entry point.
 *
 * Pure functions: (GameState, Move) → GameState (or error).
 * Zero I/O dependencies.
 */

import type { GameState, Move, Player, PieceType } from './types.js'
import { getLegalMoves, cloneBoard } from './movement.js'
import { isCheckmate } from './check.js'
import { computePhase, nextPlayer } from './phase.js'
import { MODES } from './constants.js'
import type { GameMode } from './constants.js'

export { getLegalMoves, isInCheck } from './movement.js'
export { isCheckmate } from './check.js'
export type { GameState, Move, Position, Player, PieceType, Tower, Piece, Tier, PlayerState, GamePhase, GameStatus, MoveType } from './types.js'
export { buildHybridState, buildMiniHybridState, buildNearCheckmateState, buildPreset } from './debugFixtures.js'
export type { DebugPreset } from './debugFixtures.js'
export type { GameMode, ModeConfig } from './constants.js'
export { MODES, NORMAL_MODE, MINI_MODE } from './constants.js'

// ─── Initial State Factory ────────────────────────────────────────────────────

/**
 * Creates a fresh GameState for the given mode. Default 'normal' keeps legacy
 * callers (tests, older imports) working without changes.
 */
export function createInitialState(mode: GameMode = 'normal'): GameState {
  const cfg = MODES[mode]
  const size = cfg.boardSize

  const board: GameState['board'] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  )

  const buildReserve = (): PieceType[] => {
    const reserve: PieceType[] = []
    for (const [type, count] of Object.entries(cfg.pieceCounts) as [PieceType, number][]) {
      for (let i = 0; i < count; i++) reserve.push(type)
    }
    return reserve
  }

  return {
    mode,
    board,
    players: {
      black: { reserve: buildReserve(), placedCount: 0, onBoardCount: 0 },
      white: { reserve: buildReserve(), placedCount: 0, onBoardCount: 0 },
    },
    currentPlayer: 'black',
    phase: 'placement',
    turnNumber: 1,
    gameStatus: 'active',
    winner: null,
  }
}

// ─── Move Validation ──────────────────────────────────────────────────────────

export type ApplyMoveResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string }

/**
 * Validates and applies a move to the game state.
 * Returns the new state or an error if the move is illegal.
 *
 * This is the authoritative entry point for all game actions.
 */
export function applyMove(state: GameState, move: Move): ApplyMoveResult {
  if (state.gameStatus !== 'active') {
    return { ok: false, error: 'Game is not active' }
  }

  // Validate that this move is in the legal move set
  const legal = getLegalMoves(state)
  if (!isMoveLegal(legal, move)) {
    return { ok: false, error: `Illegal move: ${move.notation}` }
  }

  // Apply the move
  const newState = executeMove(state, move)
  return { ok: true, state: newState }
}

// ─── Move Legality Check ──────────────────────────────────────────────────────

function isMoveLegal(legal: Move[], move: Move): boolean {
  return legal.some(m => movesEqual(m, move))
}

function movesEqual(a: Move, b: Move): boolean {
  if (a.type !== b.type) return false
  if (a.to.row !== b.to.row || a.to.col !== b.to.col) return false
  if (a.type === 'place') return a.piece === b.piece
  // For board moves, compare from position
  if (!a.from || !b.from) return false
  return a.from.row === b.from.row && a.from.col === b.from.col
}

// ─── Move Execution ───────────────────────────────────────────────────────────

/**
 * Executes a validated move and returns the complete new game state.
 * Handles all special rules: Spy mutual capture, phase transitions, checkmate detection.
 */
function executeMove(state: GameState, move: Move): GameState {
  const board = cloneBoard(state.board)
  const player = state.currentPlayer
  let capturedMarshal = false

  const players = {
    black: {
      ...state.players.black,
      reserve: [...state.players.black.reserve],
    },
    white: {
      ...state.players.white,
      reserve: [...state.players.white.reserve],
    },
  }

  if (move.type === 'place') {
    // ── Placement ──
    const pieceType = move.piece!
    const { row, col } = move.to

    // Remove from reserve
    const idx = players[player].reserve.indexOf(pieceType)
    players[player].reserve.splice(idx, 1)

    // Place on board
    if (!board[row]![col]) {
      board[row]![col] = [{ type: pieceType, owner: player }]
    } else {
      board[row]![col]!.push({ type: pieceType, owner: player })
    }

    players[player].placedCount++
    players[player].onBoardCount++
  } else {
    // ── Board Move (move / capture / stack) ──
    const from = move.from!
    const to = move.to

    const srcTower = board[from.row]![from.col]!
    const movingPiece = srcTower[srcTower.length - 1]!

    // Remove top piece from source
    srcTower.pop()
    if (srcTower.length === 0) board[from.row]![from.col] = null

    const destTower = board[to.row]![to.col]

    if (!destTower) {
      // Move to empty square
      board[to.row]![to.col] = [movingPiece]
    } else {
      const destTop = destTower[destTower.length - 1]!

      if (move.type === 'stack') {
        // Stack: push on top regardless of ownership — no removal
        destTower.push(movingPiece)
      } else {
        // Capture: remove top piece (enemy or self-capture)
        const capturedOwner = destTop.owner
        if (destTop.type === 'marshal') capturedMarshal = true

        destTower.pop()
        players[capturedOwner].onBoardCount--

        if (destTower.length === 0) {
          board[to.row]![to.col] = [movingPiece]
        } else {
          destTower.push(movingPiece)
        }

        // Spy mutual capture — dies on ANY capture (friendly or enemy)
        if (movingPiece.type === 'spy') {
          const finalDestTower = board[to.row]![to.col]!
          finalDestTower.pop()
          if (finalDestTower.length === 0) board[to.row]![to.col] = null
          players[player].onBoardCount--
        }
      }
    }

  }

  // ── Phase Transition ──
  const newPhase = computePhase({ ...state, players })

  // ── Turn Switch ──
  const nextTurnPlayer = nextPlayer(player)
  const nextTurnNumber = state.turnNumber + 1

  // ── Checkmate Detection ──
  const tempState: GameState = {
    ...state,
    board,
    players,
    currentPlayer: nextTurnPlayer,
    phase: newPhase,
    turnNumber: nextTurnNumber,
    gameStatus: 'active',
    winner: null,
  }

  // Check if next player has any legal moves — only in hybrid phase
  // In placement phase, a player who has already placed 15 pieces has no placement moves
  // but that is not checkmate; the game continues once the other player also reaches 15.
  let gameStatus = state.gameStatus
  let winner = state.winner

  if (capturedMarshal) {
    // Marshal taken — instant win
    gameStatus = 'checkmate'
    winner = player
  } else if (newPhase === 'hybrid' && isCheckmate(tempState, nextTurnPlayer)) {
    gameStatus = 'checkmate'
    winner = player
  }

  return {
    mode: state.mode,
    board,
    players,
    currentPlayer: nextTurnPlayer,
    phase: newPhase,
    turnNumber: nextTurnNumber,
    gameStatus,
    winner,
  }
}

// ─── Resign ───────────────────────────────────────────────────────────────────

export function resign(state: GameState, player: Player): GameState {
  return {
    ...state,
    gameStatus: 'resigned',
    winner: player === 'black' ? 'white' : 'black',
  }
}

// ─── Draw ─────────────────────────────────────────────────────────────────────

export function declareDraw(state: GameState): GameState {
  return {
    ...state,
    gameStatus: 'draw',
    winner: null,
  }
}
