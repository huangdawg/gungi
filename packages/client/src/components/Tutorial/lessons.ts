import { createInitialState } from '@gungi/engine'
import type { GameState, Piece, PieceType, Player, Move } from '@gungi/engine'
import type { TutorialLesson } from './types'

// ─── State builder ────────────────────────────────────────────────────────────

type Placement = {
  row: number
  col: number
  /** Bottom-to-top stack; the last entry is the active (top) piece. */
  stack: Array<{ type: PieceType; owner: Player }>
}

/**
 * Construct an ad-hoc GameState for a lesson. Handles reserve drain and
 * on-board-count bookkeeping so the engine's legal-move generator works
 * consistently. Assumes normal (9×9) mode.
 */
function buildState(opts: {
  phase: 'setup' | 'game'
  currentPlayer?: Player
  placements: Placement[]
  /** Override placedCount per side. Defaults to #pieces on board per side. */
  blackPlaced?: number
  whitePlaced?: number
}): GameState {
  const base = createInitialState('normal')
  const board: GameState['board'] = base.board.map((row) => row.slice())

  for (const p of opts.placements) {
    board[p.row]![p.col] = p.stack.map((pc) => ({ ...pc }))
  }

  let bCount = 0
  let wCount = 0
  const bReserve: PieceType[] = [...base.players.black.reserve]
  const wReserve: PieceType[] = [...base.players.white.reserve]

  for (const row of board) {
    for (const tower of row) {
      if (!tower) continue
      for (const pc of tower) {
        if (pc.owner === 'black') {
          bCount++
          const i = bReserve.indexOf(pc.type)
          if (i !== -1) bReserve.splice(i, 1)
        } else {
          wCount++
          const i = wReserve.indexOf(pc.type)
          if (i !== -1) wReserve.splice(i, 1)
        }
      }
    }
  }

  const bPlaced = opts.blackPlaced ?? bCount
  const wPlaced = opts.whitePlaced ?? wCount

  return {
    mode: 'normal',
    board,
    players: {
      black: { reserve: bReserve, placedCount: bPlaced, onBoardCount: bCount },
      white: { reserve: wReserve, placedCount: wPlaced, onBoardCount: wCount },
    },
    currentPlayer: opts.currentPlayer ?? 'black',
    phase: opts.phase,
    turnNumber: opts.phase === 'game' ? 30 : bPlaced + wPlaced + 1,
    gameStatus: 'active',
    winner: null,
  }
}

const B = (type: PieceType): Piece => ({ type, owner: 'black' })
const W = (type: PieceType): Piece => ({ type, owner: 'white' })

function topPiece(state: GameState, row: number, col: number) {
  const tower = state.board[row]?.[col]
  return tower?.[tower.length - 1]
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

/**
 * Two voices. Keep each under ~4 sentences so the narrative doesn't bury the
 * board. Komugi = gentle, humble, slight stutter on hard ideas. Meruem =
 * precise, imperious, rewards correct play with clipped approval.
 */
export const LESSONS: TutorialLesson[] = [
  // ── Chapter 1: Orientation ──
  {
    id: 'ch1-l1-welcome',
    chapter: 1,
    chapterTitle: 'Orientation',
    title: 'Welcome',
    readOnly: true,
    intro: {
      komugi:
        "Hi. Um… I'm Komugi. I'll try to teach you Gungi, if that's alright.\n\nGungi is like chess, but each square can hold up to three pieces stacked on top of each other. The goal is simple: capture the other player's Marshal — the general piece. When the Marshal is taken, the game ends.\n\nThere's no time pressure here. We'll go step by step.",
      meruem:
        "I am Meruem. You will learn Gungi. Pay attention.\n\nThe game is chess-like, played on a 9-by-9 board. Up to three pieces stack on any square — the piece on top is the one that acts. Victory is simple: capture your opponent's Marshal.\n\nThat is all you need to know for now. Begin.",
    },
  },
  {
    id: 'ch1-l2-first-piece',
    chapter: 1,
    chapterTitle: 'Orientation',
    title: 'Your first piece',
    intro: {
      komugi:
        "Before anything else, the Marshal must go down. It's… the piece you're protecting, so it goes first. Please place it anywhere in your home rows — the three rows nearest you.",
      meruem:
        "The Marshal. First, always. Place it within your home rows — the three nearest your side. Any square will do. Proceed.",
    },
    outro: {
      komugi:
        "There. Your Marshal is on the board. Every game of Gungi begins this way. Well done.",
      meruem:
        "Acceptable. Your Marshal stands. Every game begins thus.",
    },
    initialState: createInitialState('normal'),
    isValidMove: (move) => move.type === 'place' && move.piece === 'marshal',
    isComplete: (state) =>
      state.board.some((row) =>
        row.some((tower) =>
          tower?.some((p) => p.type === 'marshal' && p.owner === 'black'),
        ),
      ),
  },

  // ── Chapter 2: Setup phase ──
  {
    id: 'ch2-l1-drop-zone',
    chapter: 2,
    chapterTitle: 'Setup',
    title: 'Drop zones',
    intro: {
      komugi:
        "During setup, every piece you place has to go in your own home rows — the three nearest you. You'll see that squares farther up the board just aren't clickable.\n\nGo ahead — drop one of your Generals. The board will show you where it can land.",
      meruem:
        "Setup confines you to your home rows. The other six ranks are forbidden ground until the game phase.\n\nPlace a General. Observe where the board permits it. Only those squares exist, for now.",
    },
    outro: {
      komugi:
        "Good. See how the legal squares were only in your first three rows? That's the drop zone for setup.",
      meruem:
        "Noted. You now understand the boundary of your territory in setup.",
    },
    initialState: buildState({
      phase: 'setup',
      placements: [{ row: 0, col: 4, stack: [B('marshal')] }],
    }),
    isValidMove: (move) => move.type === 'place' && move.piece === 'general',
    isComplete: (state) =>
      state.board.some((row) =>
        row.some((tower) =>
          tower?.some((p) => p.type === 'general' && p.owner === 'black'),
        ),
      ),
  },
  {
    id: 'ch2-l2-stacking',
    chapter: 2,
    chapterTitle: 'Setup',
    title: 'Stacking',
    intro: {
      komugi:
        "You can place a piece on top of one of your own pieces — that's stacking. Towers can be up to three tall, and the piece on top is the one that acts.\n\nTry dropping any piece on top of your General. Only squares with a friendly piece are clickable this time.",
      meruem:
        "Stacks. Up to three pieces per square; the topmost piece is the acting one. A well-built tower changes a piece's capabilities.\n\nPlace any piece onto your General. Form your first tower.",
    },
    outro: {
      komugi:
        "You've made your first tower! When you move it later, the piece on top is the one in play. The ones underneath just wait their turn.",
      meruem:
        "A tower rises. Higher-tiered pieces gain new powers — a rook's reach, a cannon's jump, a samurai's range. You have seen the mechanic. Continue.",
    },
    initialState: buildState({
      phase: 'setup',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 1, col: 4, stack: [B('general')] },
      ],
    }),
    isValidMove: (move, state) => {
      if (move.type !== 'place') return false
      const tower = state.board[move.to.row]?.[move.to.col]
      return !!tower && tower.length >= 1
    },
    isComplete: (state) =>
      state.board.some((row) =>
        row.some((tower) =>
          tower !== null && tower.length >= 2 && tower.every((p) => p.owner === 'black'),
        ),
      ),
  },
  {
    id: 'ch2-l3-pawn-placement',
    chapter: 2,
    chapterTitle: 'Setup',
    title: 'Pawns in the ranks',
    intro: {
      komugi:
        "Pawns are special here. They can't move on their own — once you place a pawn, it stays where it is.\n\nBut they're useful as supports and as part of towers. Place one now — any home-row square will do.",
      meruem:
        "Pawns. Inert on their own — they do not move — but they occupy ground, form the base of towers, and serve as platforms for certain pieces.\n\nDeploy one to your home rows.",
    },
    outro: {
      komugi:
        "That pawn is staying right there. When pieces are captured, a pawn becomes a \"dead pawn\" — you'll hear about those later when we talk about the Cannon.",
      meruem:
        "The pawn holds its ground. Its corpse, later, will serve a purpose. Advance.",
    },
    initialState: buildState({
      phase: 'setup',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 1, col: 4, stack: [B('general')] },
      ],
    }),
    isValidMove: (move) => move.type === 'place' && move.piece === 'pawn',
    isComplete: (state) =>
      state.board.some((row) =>
        row.some((tower) =>
          tower?.some((p) => p.type === 'pawn' && p.owner === 'black'),
        ),
      ),
  },

  // ── Chapter 3: Movement basics ──
  {
    id: 'ch3-l1-marshal-moves',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'The Marshal moves',
    intro: {
      komugi:
        "Setup is over. Now we're in the game phase, and pieces can move.\n\nYour Marshal moves one square in any direction, just like a chess king. Try it — move your Marshal anywhere.",
      meruem:
        "Setup has concluded. Pieces may now move.\n\nThe Marshal steps one square in any of eight directions. Demonstrate.",
    },
    outro: {
      komugi:
        "Perfect. The Marshal isn't the strongest piece, but it's the most important. Keep it safe.",
      meruem:
        "Correct. The Marshal's reach is short. Guard it with your army; do not expose it carelessly.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 1, col: 4, stack: [B('marshal')] },
        { row: 7, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move, state) => {
      if (move.type !== 'move') return false
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'marshal'
    },
    isComplete: (state) => {
      // Marshal no longer at starting square (1,4)
      const start = state.board[1]?.[4]
      return !start?.some((p) => p.type === 'marshal' && p.owner === 'black')
    },
  },
  {
    id: 'ch3-l2-general-step',
    chapter: 3,
    chapterTitle: 'Movement',
    title: "The General's step",
    intro: {
      komugi:
        "Generals only step forward or backward, one square at a time. They can't sidestep or move diagonally — not for plain movement, anyway.\n\nMove your General one square. Forward or back, either works.",
      meruem:
        "The General advances or retreats one square, along its file. No lateral drift; no diagonal movement.\n\nMove your General.",
    },
    outro: {
      komugi:
        "Good. The General is slow, but it's reliable — it can retreat when most pieces can't.",
      meruem:
        "Understood. The General's value lies in its diagonal capture, which you will see next. Continue.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('general')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move, state) => {
      if (move.type !== 'move') return false
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'general'
    },
    isComplete: (state) => {
      const start = state.board[3]?.[4]
      return !start?.some((p) => p.type === 'general' && p.owner === 'black')
    },
  },
  {
    id: 'ch3-l3-general-strike',
    chapter: 3,
    chapterTitle: 'Movement',
    title: "The General's strike",
    intro: {
      komugi:
        "Now the interesting part — Generals capture differently from how they move. A General captures on the diagonal, not in front of it.\n\nAn enemy Pawn is one square diagonally ahead of your General. Capture it.",
      meruem:
        "The General's capture is perpendicular to its movement — one square forward-diagonal, or backward-diagonal. Never straight ahead.\n\nAn enemy stands to your diagonal. Take it.",
    },
    outro: {
      komugi:
        "Excellent. A piece directly in front of a General is safe from that General. You work around them by attacking on the diagonal.",
      meruem:
        "A fundamental asymmetry. Exploit it. A General blocks a file; only its diagonals are lethal.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('general')] },
        { row: 4, col: 3, stack: [W('pawn')] },
        { row: 4, col: 5, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move, state) => {
      if (move.type !== 'capture') return false
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'general'
    },
    isComplete: (state) => state.players.white.onBoardCount < 3,
  },
  {
    id: 'ch3-l4-samurai-charge',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'Samurai on the charge',
    intro: {
      komugi:
        "The Samurai is fast. It slides up to three squares in any of the eight directions — straight or diagonal — and it can capture at any point along its path.\n\nThere's a white Pawn three squares forward of your Samurai. Charge and take it.",
      meruem:
        "The Samurai — a queen with a leash. Three squares, any direction, capture or move.\n\nStrike the pawn in your line.",
    },
    outro: {
      komugi:
        "Nice! The Samurai is one of the most versatile pieces. Three squares is enough to reach most of the nearby board in a single turn.",
      meruem:
        "The Samurai rewards bold play. Use its reach. Press.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('samurai')] },
        { row: 6, col: 4, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move, state) => {
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'samurai'
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
]

export function findLesson(id: string): TutorialLesson | undefined {
  return LESSONS.find((l) => l.id === id)
}

export function nextLesson(id: string): TutorialLesson | undefined {
  const idx = LESSONS.findIndex((l) => l.id === id)
  if (idx === -1 || idx === LESSONS.length - 1) return undefined
  return LESSONS[idx + 1]
}

// Export unused symbols for type-safety (helps tree-shaking notices in tsc)
export type { Move }
