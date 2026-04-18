import type { GameState, Position, Move, Player, PieceType } from './types.js'
import { getTopPiece, getTier, inBounds, buildPlaceMove, canLandOn } from './moveUtils.js'
import { HOME_ROWS, MAX_ON_BOARD, PIECE_KANJI } from './constants.js'

import { getMarshalMoves } from './pieces/marshal.js'
import { getPawnMoves } from './pieces/pawn.js'
import { getGeneralMoves } from './pieces/general.js'
import { getMajorMoves } from './pieces/major.js'
import { getMusketeeerMoves } from './pieces/musketeer.js'
import { getKnightMoves } from './pieces/knight.js'
import { getSamuraiMoves } from './pieces/samurai.js'
import { getCannonMoves } from './pieces/cannon.js'
import { getSpyMoves } from './pieces/spy.js'
import { getFortressMoves } from './pieces/fortress.js'
import { getArcherMoves } from './pieces/archer.js'

// ─── Per-Piece Dispatch ───────────────────────────────────────────────────────

export function getPieceMoves(
  state: GameState,
  pos: Position,
): Move[] {
  const tower = state.board[pos.row]?.[pos.col] ?? null
  if (!tower) return []
  const top = getTopPiece(tower)
  if (!top) return []
  if (top.owner !== state.currentPlayer) return []

  const tier = getTier(tower) as 1 | 2 | 3
  const board = state.board
  const owner = top.owner

  switch (top.type) {
    case 'marshal':   return getMarshalMoves(board, pos, owner, tier)
    case 'pawn':      return getPawnMoves(board, pos, owner, tier)
    case 'general':   return getGeneralMoves(board, pos, owner, tier)
    case 'major':     return getMajorMoves(board, pos, owner, tier)
    case 'musketeer': return getMusketeeerMoves(board, pos, owner, tier)
    case 'knight':    return getKnightMoves(board, pos, owner, tier)
    case 'samurai':   return getSamuraiMoves(board, pos, owner, tier)
    case 'cannon':    return getCannonMoves(board, pos, owner, tier)
    case 'spy':       return getSpyMoves(board, pos, owner, tier)
    case 'fortress':  return getFortressMoves(board, pos, owner, tier)
    case 'archer':    return getArcherMoves(board, pos, owner, tier)
  }
}

// ─── All Legal Moves ──────────────────────────────────────────────────────────

/**
 * Returns all legal moves for the current player in the given state.
 * Filters out moves that would leave the current player's Marshal in check.
 */
export function getLegalMoves(state: GameState): Move[] {
  if (state.gameStatus !== 'active') return []

  const player = state.currentPlayer
  const moves: Move[] = []

  // 1. Placement moves (if allowed by phase rules)
  const placeMoves = getPlacementMoves(state, player)
  moves.push(...placeMoves)

  // 2. Board moves (if in hybrid phase, or... placement phase = no board moves)
  if (state.phase === 'hybrid') {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const tower = state.board[r]?.[c] ?? null
        if (!tower) continue
        const top = getTopPiece(tower)
        if (!top || top.owner !== player) continue

        const pos: Position = { row: r, col: c }
        const pieceMoves = getPieceMoves(state, pos)
        moves.push(...pieceMoves)
      }
    }
  }

  // 3. Filter: remove moves that leave own Marshal in check
  return moves.filter(move => !moveLeavesInCheck(state, move, player))
}

// ─── Placement Move Generation ────────────────────────────────────────────────

/**
 * Returns all valid placement (drop) moves for a player.
 * Rules:
 * - Player must have pieces in reserve.
 * - Must not exceed MAX_ON_BOARD on-board count.
 * - Pawns: anywhere on the board (any empty or stackable friendly square).
 *   - Not into a file that already has a friendly pawn.
 *   - Not to give check/checkmate (filtered later via moveLeavesInCheck for check;
 *     pawnDropGivesCheck is a separate check for checkmate-by-drop).
 * - Non-pawns: only in own first 3 rows.
 * - Can stack on friendly towers (height < 3).
 * - Cannot place on enemy-occupied squares.
 * - Cannot place on Fortresses.
 * - Phase: placement phase → only if this player's placedCount < 15.
 *          hybrid phase → always allowed (if pieces in reserve and room).
 */
function getPlacementMoves(state: GameState, player: Player): Move[] {
  const playerState = state.players[player]

  // Check if placement is allowed this turn
  if (state.phase === 'placement' && playerState.placedCount >= 15) return []
  if (playerState.onBoardCount >= MAX_ON_BOARD) return []

  const reserve = playerState.reserve
  if (reserve.length === 0) return []

  // Deduplicate piece types to avoid redundant moves
  const uniqueTypes = Array.from(new Set(reserve)) as PieceType[]

  const homeRows = HOME_ROWS[player]
  const moves: Move[] = []

  // Find files that already have a friendly pawn (for pawn restriction)
  const friendlyPawnFiles = new Set<number>()
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const tower = state.board[r]?.[c] ?? null
      if (!tower) continue
      // Check ALL pieces in the tower for friendly pawns, not just the top
      for (const piece of tower) {
        if (piece.owner === player && piece.type === 'pawn') {
          friendlyPawnFiles.add(c)
          break
        }
      }
    }
  }

  for (const pieceType of uniqueTypes) {
    const isPawn = pieceType === 'pawn'

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        // Pawn placement zone: anywhere; non-pawn: own first 3 rows
        if (!isPawn && !homeRows.includes(r)) continue

        // Pawn file restriction: cannot place in file with friendly pawn
        if (isPawn && friendlyPawnFiles.has(c)) continue

        const pos: Position = { row: r, col: c }
        const tower = state.board[r]?.[c] ?? null

        if (!tower) {
          // Empty square: always valid
          moves.push(buildPlaceMove(pieceType, pos))
        } else {
          // Must be friendly tower with room
          const top = getTopPiece(tower)
          if (!top) continue
          if (top.owner !== player) continue // cannot place on enemy
          if (top.type === 'fortress') continue // cannot place on fortress (it can't be captured)
          if (tower.length >= 3) continue // tower full

          moves.push(buildPlaceMove(pieceType, pos))
        }
      }
    }
  }

  return moves
}

// ─── Check Helpers ────────────────────────────────────────────────────────────

/**
 * Returns true if applying `move` would leave `player`'s Marshal in check.
 * Used to filter illegal moves.
 */
function moveLeavesInCheck(state: GameState, move: Move, player: Player): boolean {
  // Apply move tentatively
  const newState = applyMoveNoValidation(state, move)
  return isInCheck(newState, player)
}

/**
 * Apply a move without validation — used internally for check detection.
 * Returns a new GameState after the move (does not switch turns, does not check phase).
 */
export function applyMoveNoValidation(state: GameState, move: Move): GameState {
  // Deep clone board
  const board = cloneBoard(state.board)
  const players = {
    black: { ...state.players.black, reserve: [...state.players.black.reserve] },
    white: { ...state.players.white, reserve: [...state.players.white.reserve] },
  }

  const player = state.currentPlayer

  if (move.type === 'place') {
    const pieceType = move.piece!
    // Remove one instance from reserve
    const idx = players[player].reserve.indexOf(pieceType)
    if (idx !== -1) players[player].reserve.splice(idx, 1)

    const { row, col } = move.to
    if (!board[row]![col]) {
      board[row]![col] = [{ type: pieceType, owner: player }]
    } else {
      board[row]![col]!.push({ type: pieceType, owner: player })
    }
    players[player].placedCount++
    players[player].onBoardCount++
  } else {
    // move / capture / stack
    const from = move.from!
    const to = move.to
    const srcTower = board[from.row]![from.col]!
    const movingPiece = srcTower[srcTower.length - 1]!

    // Remove from source
    srcTower.pop()
    if (srcTower.length === 0) board[from.row]![from.col] = null

    const destTower = board[to.row]![to.col]
    if (!destTower) {
      // Move to empty
      board[to.row]![to.col] = [movingPiece]
    } else {
      const destTop = destTower[destTower.length - 1]!
      if (destTop.owner === player) {
        // Stack on friendly
        destTower.push(movingPiece)
      } else {
        // Capture: remove enemy top piece
        destTower.pop()
        players[destTop.owner].onBoardCount--

        if (destTower.length === 0) {
          board[to.row]![to.col] = [movingPiece]
        } else {
          destTower.push(movingPiece)
        }

        // Handle spy: if moving piece is a spy, it also dies after capturing
        if (movingPiece.type === 'spy') {
          const currentDest = board[to.row]![to.col]!
          currentDest.pop() // remove the spy that was just placed
          if (currentDest.length === 0) board[to.row]![to.col] = null
          players[player].onBoardCount--
        }
      }
    }
  }

  return {
    ...state,
    board,
    players,
  }
}

// ─── isInCheck ────────────────────────────────────────────────────────────────

/**
 * Returns true if the given player's Marshal is under attack by any opponent piece.
 */
export function isInCheck(state: GameState, player: Player): boolean {
  // Find the Marshal
  const marshalPos = findMarshal(state.board, player)
  if (!marshalPos) return false // no marshal = already captured (shouldn't happen normally)

  // Check if any enemy piece can attack the Marshal position
  const opponent: Player = player === 'black' ? 'white' : 'black'

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const tower = state.board[r]?.[c] ?? null
      if (!tower) continue
      const top = getTopPiece(tower)
      if (!top || top.owner !== opponent) continue

      // Get this piece's attack squares
      // We need a state-like object where it's the opponent's turn
      const opponentState: GameState = { ...state, currentPlayer: opponent }
      const pieceMoves = getPieceMoves(opponentState, { row: r, col: c })

      for (const m of pieceMoves) {
        if (m.to.row === marshalPos.row && m.to.col === marshalPos.col) {
          if (m.type === 'capture') return true
        }
      }
    }
  }

  return false
}

export function findMarshal(board: GameState['board'], player: Player): Position | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const tower = board[r]?.[c] ?? null
      if (!tower) continue
      const top = getTopPiece(tower)
      if (top && top.type === 'marshal' && top.owner === player) {
        return { row: r, col: c }
      }
    }
  }
  return null
}

// ─── Board Clone ──────────────────────────────────────────────────────────────

export function cloneBoard(board: GameState['board']): GameState['board'] {
  return board.map(row =>
    row.map(tower => (tower ? tower.map(p => ({ ...p })) : null))
  )
}
