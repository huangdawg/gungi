import { createInitialState } from '@gungi/engine'
import type { GameState, Piece, PieceType, Player, Move } from '@gungi/engine'
import type { TutorialLesson } from './types'

// ─── State builder ────────────────────────────────────────────────────────────

type Placement = {
  row: number
  col: number
  stack: Array<{ type: PieceType; owner: Player }>
}

function buildState(opts: {
  phase: 'setup' | 'game'
  currentPlayer?: Player
  placements: Placement[]
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
 * Design:
 *   • Chapters 4+ do NOT restrict which piece the player may move. Clicking
 *     any friendly piece works as it would in a real game — wrong choices
 *     lock the lesson with a teacher-written correction.
 *   • `confirmAllOccupied` is set from ch4 onward so the stack-vs-capture
 *     modal fires on every occupied-square landing.
 *   • Lessons that teach a tier behavior put the only available target at a
 *     square reachable ONLY at that tier, so players must demonstrate the
 *     specific capability.
 */
export const LESSONS: TutorialLesson[] = [
  // ─── Chapter 1: Orientation ────────────────────────────────────────────────
  {
    id: 'ch1-l1-welcome',
    chapter: 1,
    chapterTitle: 'Orientation',
    title: 'Welcome',
    readOnly: true,
    intro: {
      komugi:
        "Hi. Um… I'm Komugi. I'll try to teach you Gungi, if that's alright.\n\nThe board is 9 by 9. Every square can hold up to three pieces stacked on top of each other, and the piece on top is the one that acts. The goal is simple: capture the opponent's Marshal. When the Marshal is taken, the game ends.\n\nThere's no time pressure. We'll go step by step.",
      meruem:
        "I am Meruem. You will learn Gungi. Attend.\n\nA 9-by-9 board. Up to three pieces stack on any square — the topmost acts. Victory requires one thing: capture your opponent's Marshal.\n\nBegin when ready.",
    },
  },
  {
    id: 'ch1-l2-first-piece',
    chapter: 1,
    chapterTitle: 'Orientation',
    title: 'Your first piece',
    intro: {
      komugi:
        "Before anything else, the Marshal must go down. It's… the piece you're protecting, so it has to go first. Please place it anywhere in your home rows — the three rows nearest you.",
      meruem:
        "The Marshal. First, always. Place it within your home rows — the three nearest your side. Any square. Proceed.",
    },
    outro: {
      komugi:
        "There. Your Marshal is on the board. Every game of Gungi begins this way.",
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

  // ─── Chapter 2: Setup phase ────────────────────────────────────────────────
  {
    id: 'ch2-l1-drop-zone',
    chapter: 2,
    chapterTitle: 'Setup',
    title: 'Drop zones',
    intro: {
      komugi:
        "During setup, every piece goes in your home rows — the three rows nearest you. Setup ends once both players have placed 15 pieces each, so you'll do this 15 times in a real game.\n\nGo ahead — drop one of your Generals. The board will show you where it can land.",
      meruem:
        "Setup phase. Each player deploys 15 pieces into their own home rows — three ranks only. After 30 total placements, setup ends and movement begins.\n\nPlace a General. Observe the permitted territory.",
    },
    outro: {
      komugi:
        "Good. Only your first three rows were clickable. That's your drop zone during setup.",
      meruem:
        "Noted. You understand the boundary of your territory in setup.",
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
        "You can place a piece on top of one of your own pieces — that's stacking. Towers go up to three pieces tall, and the piece on top is the one that acts.\n\nTry dropping any piece on top of your General. Only squares with a friendly piece are clickable this time.",
      meruem:
        "Stacks. Up to three pieces per square; the topmost acts. A well-built tower changes a piece's capabilities.\n\nPlace any piece onto your General. Form your first tower.",
    },
    outro: {
      komugi:
        "You made your first tower! When you move it later, the piece on top is the one that moves. The ones underneath wait their turn — and several pieces gain new powers when they're stacked higher.",
      meruem:
        "A tower rises. Height matters — several pieces gain new powers at higher tiers. You will see this shortly.",
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
        "Pawns are special here. They can't move on their own — once you place a pawn, it stays put.\n\nBut they're useful as supports and tower foundations. Place one now — any home-row square will do.",
      meruem:
        "Pawns. Inert alone — they never move — but they occupy ground and form the base of towers.\n\nDeploy one.",
    },
    outro: {
      komugi:
        "That pawn is staying right there. Pawns make great anchors — they hold squares and form the base of towers.",
      meruem:
        "The pawn holds its ground. A foundation piece. Advance.",
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

  // ─── Chapter 3: Movement basics ────────────────────────────────────────────
  {
    id: 'ch3-l1-marshal-moves',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'The Marshal moves',
    intro: {
      komugi:
        "Once both players have each placed 15 pieces, setup is done. Now pieces can move — that's where we are now.\n\nYour Marshal moves one square in any of eight directions. Try it — move your Marshal anywhere.",
      meruem:
        "Setup concluded at the 15-piece threshold. Movement now permitted.\n\nThe Marshal steps one square in any of eight directions. Demonstrate.",
    },
    outro: {
      komugi:
        "Perfect. The Marshal isn't the strongest piece, but it's the most important. Keep it safe.",
      meruem:
        "Correct. The Marshal's reach is short. Guard it with your army.",
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
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'marshal'
    },
    isComplete: (state) => {
      const start = state.board[1]?.[4]
      return !start?.some((p) => p.type === 'marshal' && p.owner === 'black')
    },
  },
  {
    id: 'ch3-l2-major-step',
    chapter: 3,
    chapterTitle: 'Movement',
    title: "The Major's step",
    intro: {
      komugi:
        "The Major only moves forward — one square, straight ahead. It can't go sideways or backward.\n\nStep your Major forward one square.",
      meruem:
        "The Major advances. One square, directly forward. It cannot retreat; its commitment is absolute.\n\nAdvance the Major.",
    },
    outro: {
      komugi:
        "That's it. The Major is… a little scary, actually — it can't retreat. Once it's committed, it has to keep going forward or capture.",
      meruem:
        "The Major is a blade aimed at the enemy. It does not look back.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('major')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move, state) => {
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'major'
    },
    isComplete: (state) => {
      const start = state.board[3]?.[4]
      return !start?.some((p) => p.type === 'major' && p.owner === 'black')
    },
  },
  {
    id: 'ch3-l3-major-strike',
    chapter: 3,
    chapterTitle: 'Movement',
    title: "The Major's strike",
    intro: {
      komugi:
        "The Major captures on its forward diagonals — not straight ahead. An enemy directly in front is safe from the Major, but one diagonal ahead is fair game.\n\nCapture one of the enemy Pawns on your diagonals.",
      meruem:
        "The Major's capture is diagonal-forward only — never straight. Take an enemy on your diagonal.",
    },
    outro: {
      komugi:
        "Good. Because the Major can't move backward and only captures diagonal-forward, it's always committing to an advance.",
      meruem:
        "A spearhead that cannot retreat. Understood.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('major')] },
        { row: 4, col: 3, stack: [W('pawn')] },
        { row: 4, col: 5, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move, state) => {
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'major'
    },
    softHint: {
      komugi:
        "You moved forward instead of capturing. That's a legal move, but the lesson is about the Major's diagonal strike. Press Start over and capture one of the enemy Pawns instead.",
      meruem:
        "You advanced. The lesson demanded a capture. Reset. Strike the diagonal.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 3,
  },
  {
    id: 'ch3-l4-general-step',
    chapter: 3,
    chapterTitle: 'Movement',
    title: "The General's step",
    intro: {
      komugi:
        "The General moves forward OR backward one square. Unlike the Major, it can retreat — which makes it much more flexible.\n\nMove your General either way.",
      meruem:
        "The General advances or retreats one square. Unlike the Major, it may withdraw.\n\nMove the General.",
    },
    outro: {
      komugi:
        "Because the General can retreat, it's much safer to use. You can pull it back when it's in danger.",
      meruem:
        "Mobility. Valued highly in a piece whose true strength lies in its diagonals — which you will see next.",
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
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'general'
    },
    isComplete: (state) => {
      const start = state.board[3]?.[4]
      return !start?.some((p) => p.type === 'general' && p.owner === 'black')
    },
  },
  {
    id: 'ch3-l5-general-strike',
    chapter: 3,
    chapterTitle: 'Movement',
    title: "The General's strike",
    intro: {
      komugi:
        "Generals capture diagonally — four directions, not just forward. Unlike Majors, Generals can capture enemies BEHIND them on a diagonal too.\n\nThere are enemy Pawns on all four of your diagonals. Capture any one of them.",
      meruem:
        "The General strikes on four diagonals — forward AND backward. Select any diagonal target.",
    },
    outro: {
      komugi:
        "A General directly in front of an enemy can't take that enemy — only diagonals. But because it can strike all four, it's much more flexible than a Major.",
      meruem:
        "Four-way diagonal lethality. The General's superiority over the Major lies precisely in the backward strike.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('general')] },
        // Forward diagonals
        { row: 4, col: 3, stack: [W('pawn')] },
        { row: 4, col: 5, stack: [W('pawn')] },
        // Backward diagonals — the signature General capability
        { row: 2, col: 3, stack: [W('pawn')] },
        { row: 2, col: 5, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move, state) => {
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'general'
    },
    softHint: {
      komugi:
        "You moved the General instead of capturing. That's legal! But the lesson needs a capture — one of the four diagonal Pawns. Press Start over and try again.",
      meruem:
        "You moved, not struck. Reset. Capture a diagonal pawn — any of the four.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 5,
  },
  {
    id: 'ch3-l6-pawn-drop-anywhere',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'Pawns in the game phase',
    intro: {
      komugi:
        "Once the game phase starts, pawns can be dropped anywhere on the board — not just your home rows.\n\nDrop a pawn somewhere past your third row — outside your starting territory.",
      meruem:
        "The game phase lifts the pawn's territorial restriction. Pawns may now be deployed to any empty square.\n\nProject one into enemy territory — past your third row.",
    },
    outro: {
      komugi:
        "Advanced pawns are really useful — your non-pawn pieces can be dropped on top of them in the game phase, so a forward pawn is like a landing platform for reinforcements.",
      meruem:
        "An advanced pawn is a beachhead. Your reinforcements may land atop your own pawns anywhere on the board — extend your reach.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move) => move.type === 'place' && move.piece === 'pawn',
    softHint: {
      komugi:
        "That counts as a drop, but it was still in your home rows. The lesson is about the NEW rule — pawns can now go anywhere. Press Start over and drop past your third row.",
      meruem:
        "A pawn in the rear. The lesson demanded projection beyond your third row. Reset.",
    },
    isComplete: (state) => {
      for (let r = 3; r < 9; r++) {
        const row = state.board[r]!
        for (const tower of row) {
          if (tower?.some((p) => p.type === 'pawn' && p.owner === 'black')) return true
        }
      }
      return false
    },
  },
  {
    id: 'ch3-l7-nonpawn-drop-home',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'Non-pawn drops in the game phase',
    intro: {
      komugi:
        "Non-pawns are more restricted than pawns in the game phase. They can still only be dropped in your own first three rows — just like during setup.\n\nDrop a non-pawn piece — like a General — somewhere in your home rows.",
      meruem:
        "Non-pawns. The game phase preserves their territorial restriction: home rows only, or — as you will see next — atop one of your own advanced pawns.\n\nDeploy a non-pawn to your home rows.",
    },
    outro: {
      komugi:
        "Good. Non-pawns stay in your home rows unless you've done something special. Let's see what that special something is next.",
      meruem:
        "A standard reinforcement drop. One exception exists. Continue.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move) =>
      move.type === 'place' && move.piece !== 'pawn' && move.to.row < 3,
    softHint: {
      komugi:
        "Non-pawns can only drop in your home rows — your first three rows. Press Start over and try again.",
      meruem:
        "Off-territory. Reset. Home rows only.",
    },
    isComplete: (state) => {
      for (let r = 0; r < 3; r++) {
        const row = state.board[r]!
        for (const tower of row) {
          if (!tower) continue
          for (const p of tower) {
            if (p.owner === 'black' && p.type !== 'pawn' && p.type !== 'marshal') return true
          }
        }
      }
      return false
    },
  },
  {
    id: 'ch3-l8-nonpawn-beachhead',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'Advanced pawns as beachheads',
    intro: {
      komugi:
        "Here's the exception. If one of your pawns is forward of your home rows, you can drop a non-pawn piece RIGHT ON TOP of it — anywhere on the board. Your pawn becomes a landing platform for reinforcements.\n\nThere's a black Pawn advanced at e5. Drop any non-pawn piece onto it.",
      meruem:
        "The beachhead rule. A forward-deployed pawn of your own serves as a valid drop point for non-pawn reinforcements — anywhere on the board.\n\nYour pawn stands at e5. Drop a non-pawn onto it.",
    },
    outro: {
      komugi:
        "Beachheads are a huge part of Gungi strategy. A pawn pushed forward is a future deployment point — it's how you get your stronger pieces into enemy territory.",
      meruem:
        "The beachhead projects your army. Use it. Seize position.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 4, col: 4, stack: [B('pawn')] }, // e5 — advanced beachhead
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move) =>
      move.type === 'place' && move.piece !== 'pawn' && move.to.row === 4 && move.to.col === 4,
    softHint: {
      komugi:
        "We're dropping a non-pawn onto the advanced Pawn at e5. Press Start over and try again.",
      meruem:
        "Reset. Drop a non-pawn onto the beachhead.",
    },
    isComplete: (state) => {
      const t = state.board[4]?.[4]
      if (!t || t.length < 2) return false
      const top = t[t.length - 1]!
      return top.owner === 'black' && top.type !== 'pawn'
    },
  },
  {
    id: 'ch3-l9-stack-or-capture',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'Stack or capture — a choice',
    readOnly: true,
    intro: {
      komugi:
        "There's a recurring mechanic you'll meet from here on. When many of the other pieces move onto a square that already has something on it (yours OR the enemy's), you get a choice: stack on top, or capture.\n\nFrom now on, any time you move onto an occupied square, the game will prompt you — even when only one option is legal — so you always confirm what you meant.\n\nNot every piece behaves this way, and several of them also have different movement at higher tiers. You'll see those rules as we go.",
      meruem:
        "A recurring mechanic. When most pieces move onto an occupied square — enemy or friendly — they present a choice: stack, or capture.\n\nFrom this point forward, the game will prompt you on every occupied-square landing. Confirm your intent before acting.\n\nMany pieces also behave differently at higher tiers. You will observe this shortly.",
    },
  },

  // ─── Chapter 4: Other pieces ───────────────────────────────────────────────
  {
    id: 'ch4-l1-samurai',
    chapter: 4,
    chapterTitle: 'Other pieces',
    title: 'The Samurai',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "The Samurai slides up to three squares in any of eight directions — straight or diagonal — and it can capture anywhere along the path.\n\nThere's an enemy Pawn three squares ahead. Capture it with your Samurai. You can click any of your pieces to look at their options, but the Samurai is the one for this lesson.",
      meruem:
        "The Samurai. Three squares, any direction, capture or move.\n\nAn enemy pawn stands three squares forward. Take it with the Samurai.",
    },
    outro: {
      komugi:
        "Nice! When you moved onto the pawn's square, you saw the prompt — stack or capture. You chose capture. That choice is yours every time a piece like the Samurai lands on something.",
      meruem:
        "The choice was yours. You struck. Internalize the prompt.",
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
    softHint: {
      komugi:
        "Um… we're practicing with the Samurai right now, and we need to capture the Pawn. Press Start over and try again with the Samurai — it can reach three squares in any direction.",
      meruem:
        "That was not the Samurai, or not the capture. Reset. Use the Samurai. Take the Pawn.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch4-l2-musketeer',
    chapter: 4,
    chapterTitle: 'Other pieces',
    title: 'The Musketeer',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "The Musketeer slides any distance straight forward and captures the first enemy it hits. It can also step one square diagonally backward to retreat.\n\nThere's an enemy Pawn down your file. Take it with the Musketeer.",
      meruem:
        "The Musketeer. Unbounded forward slide; backward retreat limited to one diagonal square. Captures the first enemy in its line.\n\nFire.",
    },
    outro: {
      komugi:
        "The Musketeer is powerful at range, but fragile if you get close. It's hard for it to retreat.",
      meruem:
        "A piece of reach, not resilience. Position accordingly.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 2, col: 4, stack: [B('musketeer')] },
        { row: 6, col: 4, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We need the Musketeer to take the Pawn down its file. Press Start over and try again with the Musketeer.",
      meruem:
        "Wrong piece, or wrong action. Reset. Fire down the file with the Musketeer.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch4-l3-tier-intro',
    chapter: 4,
    chapterTitle: 'Other pieces',
    title: 'Higher tiers, new powers',
    readOnly: true,
    intro: {
      komugi:
        "Remember when we stacked a piece on top of another? The piece on top is the one that acts — but some pieces ALSO gain new movement when they sit at a higher tier.\n\nIn the next few lessons, you'll see the Knight, the Archer, and the Cannon at each of their three tiers. Each tier unlocks something the lower tiers can't do.",
      meruem:
        "A consequence of stacking: several pieces — the Knight, the Archer, the Cannon — gain new movement at higher tiers. Three tiers, three repertoires.\n\nYou will learn each piece one tier at a time.",
    },
  },

  // ─── Chapter 5: Tiered pieces ─────────────────────────────────────────────
  {
    id: 'ch5-l1-knight-t1',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Knight (tier 1)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "The Knight jumps in a narrow L — two squares forward or backward, then one to the side. It hops over whatever's in between.\n\nThere's an enemy Pawn at a Knight's distance. Take it.",
      meruem:
        "The Knight. Tier 1 — narrow-L leap only. Two squares along a file, one across. Hops intervening pieces.\n\nStrike.",
    },
    outro: {
      komugi:
        "Good. The Knight's leap is great for getting behind enemy lines.",
      meruem:
        "The Knight reaches where others cannot. Continue.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('knight')] },
        { row: 4, col: 4, stack: [B('pawn')] },
        { row: 5, col: 3, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the Knight to leap over the pawn wall and take the enemy. Press Start over and try with the Knight.",
      meruem:
        "Wrong piece. Reset. Knight. Leap.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch5-l2-knight-t2',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Knight (tier 2)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "Your Knight is on top of a tower now — tier 2. At this tier, it gets the wider L-shape too: one square out, two squares over.\n\nThe enemy is only reachable by the wide L this time. Take it.",
      meruem:
        "Tier-2 Knight. Full repertoire of L-shapes — narrow and wide.\n\nA wide-L target waits.",
    },
    outro: {
      komugi:
        "That wide L isn't available at tier 1 — the Knight had to climb the tower to reach it.",
      meruem:
        "The tower expands the Knight's authority. Continue.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 4, col: 4, stack: [B('pawn'), B('knight')] },
        { row: 3, col: 6, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the Knight to use its new wide-L move and capture the pawn. Press Start over and try with the Knight.",
      meruem:
        "Reset. Tier-2 Knight. Wide L.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch5-l3-knight-t3',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Knight (tier 3)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "At tier 3, the Knight gains one more trick on top of all its L-shapes: it can jump exactly three squares in a straight line.\n\nThere's an enemy Pawn three squares directly ahead. Use the orthogonal three-hop.",
      meruem:
        "Tier-3 Knight. All L-shapes plus an orthogonal three-hop in any of four directions.\n\nStrike three squares ahead.",
    },
    outro: {
      komugi:
        "That three-square hop only exists at tier 3 — a huge reach for a Knight.",
      meruem:
        "An orthogonal reach reserved for tier three. Prize it.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 4, col: 4, stack: [B('pawn'), B('pawn'), B('knight')] },
        { row: 7, col: 4, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We're after the tier-3 three-hop — the Pawn three squares ahead. Press Start over and try with the Knight.",
      meruem:
        "Reset. Three squares forward. Knight.",
    },
    isComplete: (state) => {
      const t = state.board[7]?.[4]
      return !t?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },
  {
    id: 'ch5-l4-archer-t1',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Archer (tier 1)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "The Archer fires on the diagonals — up to two squares at tier 1.\n\nAn enemy Pawn sits two diagonal squares away. Shoot it down.",
      meruem:
        "The Archer. Tier 1 — two-square diagonal range only.\n\nFire.",
    },
    outro: {
      komugi:
        "Nice. The tier-1 Archer is limited to two diagonal squares — but it grows far more dangerous with each tier.",
      meruem:
        "Tier one is modest. Ascend.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('archer')] },
        { row: 5, col: 6, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the Archer to fire on the Pawn. Press Start over and try with the Archer.",
      meruem:
        "Reset. Archer. Diagonal. Strike.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch5-l5-archer-t2',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Archer (tier 2)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "At tier 2, the Archer can fire any distance along its diagonals.\n\nAn enemy Pawn is far down a diagonal — too far for the tier-1 Archer. A tier-2 Archer can reach it.",
      meruem:
        "Tier-2 Archer. Unlimited diagonal range.\n\nStrike the distant target.",
    },
    outro: {
      komugi:
        "See how much farther the Archer reaches now? Stacking pieces changes everything.",
      meruem:
        "Range, unleashed. Continue.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 3, stack: [B('pawn'), B('archer')] },
        { row: 7, col: 7, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We're using the tier-2 Archer for the long diagonal. Press Start over and try with the Archer.",
      meruem:
        "Reset. Tier-2 Archer. Long diagonal.",
    },
    isComplete: (state) => {
      const t = state.board[7]?.[7]
      return !t?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },
  {
    id: 'ch5-l6-archer-t3',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Archer (tier 3)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "At tier 3, the Archer adds the orthogonal directions too — so it can fire in any of eight directions, unlimited range.\n\nAn enemy Pawn sits along your row — a straight line no lower-tier Archer could reach.",
      meruem:
        "Tier-3 Archer. Unlimited range across all eight directions.\n\nStrike.",
    },
    outro: {
      komugi:
        "A tier-3 Archer is devastating. It's the most powerful piece on the board once you get there.",
      meruem:
        "Cultivate her. She claims the board.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 4, col: 3, stack: [B('pawn'), B('pawn'), B('archer')] },
        { row: 4, col: 7, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the tier-3 Archer's orthogonal strike. Press Start over and try with the Archer.",
      meruem:
        "Reset. Strike along the row. Tier-3 Archer.",
    },
    isComplete: (state) => {
      const t = state.board[4]?.[7]
      return !t?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },
  {
    id: 'ch5-l7-cannon-t1',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Cannon (tier 1)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "The Cannon at tier 1 moves one or two squares in the four orthogonal directions, stopping on the first piece it hits.\n\nThere's an enemy Pawn two squares ahead. Take it.",
      meruem:
        "Tier-1 Cannon. Two-square orthogonal reach, stops on occupation.\n\nStrike.",
    },
    outro: {
      komugi:
        "That's the baseline Cannon. It gets stronger fast as you stack it.",
      meruem:
        "Tier one establishes the rhythm. Ascend.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 4, col: 4, stack: [B('cannon')] },
        { row: 6, col: 4, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the Cannon to take the Pawn two squares ahead. Press Start over and try with the Cannon.",
      meruem:
        "Reset. Cannon. Strike.",
    },
    isComplete: (state) => {
      const t = state.board[6]?.[4]
      return !t?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },
  {
    id: 'ch5-l8-cannon-t2',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Cannon (tier 2)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "At tier 2, the Cannon's orthogonal range is unlimited — any distance in a straight line, stopping on the first piece it hits.\n\nThere's an enemy Pawn far across your row. Only a tier-2 Cannon can reach it. Take it — be careful not to fire in a direction where a different target sits.",
      meruem:
        "Tier-2 Cannon. Unlimited orthogonal range.\n\nStrike the distant pawn — not other pieces in line.",
    },
    outro: {
      komugi:
        "A tier-2 Cannon dominates open files. The next tier adds something no other piece has — the jump capture.",
      meruem:
        "The file is yours. Tier three awaits.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 4, col: 4, stack: [B('pawn'), B('cannon')] },
        { row: 4, col: 0, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the tier-2 Cannon to take the Pawn across the row. Press Start over and aim for the pawn specifically — not other pieces in range.",
      meruem:
        "Reset. Strike the designated pawn. Nothing else.",
    },
    isComplete: (state) => {
      const t = state.board[4]?.[0]
      return !t?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },
  {
    id: 'ch5-l9-cannon-t3',
    chapter: 5,
    chapterTitle: 'Tiered pieces',
    title: 'The Cannon (tier 3 jump)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "At tier 3, the Cannon keeps all its sliding moves AND can jump over exactly one piece to capture the one beyond.\n\nThere's a white Pawn in line as your platform, another behind it as the target. Jump the platform and capture the far pawn.",
      meruem:
        "Tier-3 Cannon. All sliding moves preserved; adds a jump capture — leap exactly one piece, strike the next in line.\n\nThe platform stands in your path. The target waits beyond.",
    },
    outro: {
      komugi:
        "That's the signature Cannon move. Any piece between you and the target works as a platform — your own, the enemy's, anything.",
      meruem:
        "The Cannon's jump does not discriminate. Any piece serves as a platform. Construct lines deliberately.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('pawn'), B('general'), B('cannon')] },
        { row: 4, col: 4, stack: [W('pawn')] },
        { row: 6, col: 4, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the jump-capture — over the platform to the far pawn. Press Start over and try with the Cannon again.",
      meruem:
        "The far target was not struck. Reset. Execute the jump.",
    },
    isComplete: (state) => {
      const tower = state.board[6]?.[4]
      return !tower?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },

  // ─── Chapter 6: Special-rule pieces + Endgame ──────────────────────────────
  {
    id: 'ch6-l1-spy',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'The Spy',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "The Spy moves one square in any direction at tier 1 — like the Marshal. But it has a special rule: if the Spy captures anything, the Spy is also removed from the board.\n\nMutual destruction. Capture the enemy Pawn with your Spy.",
      meruem:
        "The Spy. Tier-1 reach equivalent to the Marshal. Singular property: any capture it executes kills the Spy as well.\n\nA piece to be spent, not preserved. Capture.",
    },
    outro: {
      komugi:
        "See? Both pieces are gone. Spies are for trading — you use them to kill something important, knowing you'll lose them.\n\nAt higher tiers, the Spy hops — tier 2 lands exactly 2 squares away in 8 directions, tier 3 lands 3 squares away.",
      meruem:
        "A sacrificial blade. Spend Spies on high-value targets. At higher tiers they hop — ring-2 and ring-3 — making them assassins of considerable range.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('spy')] },
        { row: 4, col: 5, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We need the Spy to capture the Pawn — mutual destruction. Press Start over and try again with the Spy.",
      meruem:
        "The Spy was not spent. Reset. Capture.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch6-l2-spy-stack',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'The Spy — when not to capture',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "The Spy's mutual-destruction rule means every capture costs you the Spy. So sometimes the smarter move is to NOT capture — just stack onto a piece so the Spy survives.\n\nThere's a friendly Pawn next to your Spy. Move the Spy onto the pawn, and when the prompt appears, choose Stack. Your Spy lives to assassinate another day.",
      meruem:
        "The Spy is a sacrificial instrument. Squander it only on a worthy target.\n\nDemonstrate restraint: move your Spy onto the friendly pawn and select Stack. The Spy endures atop the tower, its threat preserved.",
    },
    outro: {
      komugi:
        "Good. Now your Spy is perched on top of the pawn — still alive, still dangerous. Save the capture for when it really matters.",
      meruem:
        "Correct. A living Spy threatens. A dead Spy is merely a trade. Choose your moment.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('spy')] },
        { row: 3, col: 5, stack: [B('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We wanted the Spy to stack onto the friendly Pawn — if you captured instead, the Spy is gone. Press Start over and choose Stack this time.",
      meruem:
        "The Spy was spent or unused. Reset. Stack it onto the pawn.",
    },
    isComplete: (state) => {
      const t = state.board[3]?.[5]
      if (!t || t.length < 2) return false
      const top = t[t.length - 1]!
      return top.type === 'spy' && top.owner === 'black'
    },
  },
  {
    id: 'ch6-l3-spy-t2',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'The Spy (tier 2)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "At tier 2, the Spy hops instead of stepping. It lands exactly two squares away in any of the eight directions — leaping over whatever's between.\n\nThere's an enemy Pawn exactly two squares away, with another piece in the way. Hop over and take it (remember, the Spy dies too).",
      meruem:
        "Tier-2 Spy. Ring-2 hop — exactly two squares, eight directions, leaps intervening pieces.\n\nThe target sits at ring-2. Strike.",
    },
    outro: {
      komugi:
        "Two-square hops make the tier-2 Spy much harder to block. The more you stack it, the further it reaches.",
      meruem:
        "A longer leap. Observe the difference the tower makes.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('pawn'), B('spy')] },
        { row: 4, col: 4, stack: [W('pawn')] },
        { row: 5, col: 4, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the tier-2 Spy to hop over the near Pawn and take the one behind it. Press Start over and try with the Spy.",
      meruem:
        "Reset. Tier-2 Spy. Ring-2 leap. Capture.",
    },
    isComplete: (state) => {
      const t = state.board[5]?.[4]
      return !t?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },
  {
    id: 'ch6-l4-spy-t3',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'The Spy (tier 3)',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "At tier 3, the Spy hops three squares — still eight directions, still leaping anything between. That's a very long reach for a piece that can appear almost anywhere.\n\nAn enemy Pawn sits exactly three squares away. Hop and capture.",
      meruem:
        "Tier-3 Spy. Ring-3 hop — exactly three squares, eight directions.\n\nStrike the distant target.",
    },
    outro: {
      komugi:
        "A tier-3 Spy is an assassin. Anywhere in a ring three squares out is fair game — and mutual destruction still applies.",
      meruem:
        "Three-square reach combined with mutual destruction. A terminal instrument. Spend accordingly.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('pawn'), B('pawn'), B('spy')] },
        { row: 6, col: 4, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We want the tier-3 Spy to hop three squares forward and capture. Press Start over and try with the Spy.",
      meruem:
        "Reset. Ring-3 leap. Strike.",
    },
    isComplete: (state) => {
      const t = state.board[6]?.[4]
      return !t?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },
  {
    id: 'ch6-l5-fortress-move',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'The Fortress moves',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "Before the special rules, the basics: the Fortress moves one square in any of eight directions, like a Marshal.\n\nStep your Fortress one square.",
      meruem:
        "The Fortress. One square, any direction. Baseline movement.\n\nMove it.",
    },
    outro: {
      komugi:
        "Simple movement. Now let's look at what makes the Fortress unusual.",
      meruem:
        "A kingly step. The peculiarities come next.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('fortress')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We're showing Fortress movement — move the Fortress one square. Press Start over and try again.",
      meruem:
        "Reset. Move the Fortress.",
    },
    isComplete: (state) => {
      const start = state.board[3]?.[4]
      return !start?.some((p) => p.type === 'fortress' && p.owner === 'black')
    },
  },
  {
    id: 'ch6-l6-fortress-no-capture',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'The Fortress cannot capture',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "Here's the first strange thing about the Fortress: it can't capture. Not anyone, ever.\n\nThere's an enemy Pawn right next to your Fortress. Click the Fortress — you'll see the enemy square isn't offered as a move. Move the Fortress somewhere else.",
      meruem:
        "The Fortress does not capture. Any side, any piece — immune to its attack.\n\nSelect the Fortress. Note: the enemy pawn's square is not among its moves. Relocate the Fortress.",
    },
    outro: {
      komugi:
        "See? The enemy Pawn was right there, but the Fortress couldn't touch it. Fortresses are purely defensive — they hold ground, they don't attack.",
      meruem:
        "Purely defensive. A Fortress holds territory; it does not contest it. Plan accordingly.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('fortress')] },
        { row: 3, col: 5, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We're showing that the Fortress can't capture. Move the Fortress anywhere it's allowed — the enemy pawn's square won't be one of those options. Press Start over and try again.",
      meruem:
        "Reset. Move the Fortress. The enemy square is forbidden; find another.",
    },
    isComplete: (state) => {
      const start = state.board[3]?.[4]
      return !start?.some((p) => p.type === 'fortress' && p.owner === 'black')
    },
  },
  {
    id: 'ch6-l7-fortress-uncapturable',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'The Fortress is uncapturable',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "The other strange thing: the Fortress can't be captured, either. By anyone, ever. But any piece CAN stack on top of it — the fortress below stays alive underneath.\n\nThere's a white Fortress in front of your Samurai. Move onto it. The prompt will only offer Stack (no Capture), because the Fortress underneath is untouchable.",
      meruem:
        "The second peculiarity: the Fortress cannot be captured. By any side. But any piece may stack atop it.\n\nAn enemy Fortress stands before your Samurai. Advance onto it. The prompt will show Stack only; the Fortress beneath remains indestructible.",
    },
    outro: {
      komugi:
        "Your Samurai is now on top of the enemy Fortress. The white Fortress is still there, underneath — if your Samurai is ever captured from up there, the Fortress will still be alive below. That's what makes Fortresses powerful anchors: they can't be removed, and they serve as tower bases for whoever climbs on top.",
      meruem:
        "You occupy the summit. The Fortress persists beneath your Samurai — should the top piece fall, the Fortress endures. Exploit this asymmetry: stack on enemy Fortresses to deny them, on friendly Fortresses to fortify.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('samurai')] },
        { row: 4, col: 4, stack: [W('fortress')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We're stacking the Samurai on top of the enemy Fortress at (e5). Press Start over and try again.",
      meruem:
        "Reset. Samurai onto the Fortress. Stack.",
    },
    isComplete: (state) => {
      const t = state.board[4]?.[4]
      if (!t || t.length < 2) return false
      const bottom = t[0]!
      const top = t[t.length - 1]!
      return bottom.type === 'fortress' && bottom.owner === 'white'
        && top.type === 'samurai' && top.owner === 'black'
    },
  },
  {
    id: 'ch6-l8-capture-marshal',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'End the game',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "This is how the game ends — you physically capture the enemy Marshal. There's no check or checkmate; the Marshal has to actually be taken off the board.\n\nYour Samurai can reach the enemy Marshal in one move. Take it.",
      meruem:
        "Victory. The Marshal must be captured — not threatened, not cornered. Taken.\n\nYour Samurai has the reach. Strike.",
    },
    outro: {
      komugi:
        "You won! A defeated Marshal can't be replaced, so every game ends the instant one is captured.\n\nThat's everything I know how to teach. One last concept to mention — a strange one — and then you're ready.",
      meruem:
        "Victory. The game ends at the capture of the Marshal; there is no alternative win condition.\n\nOne remaining mechanic, then you are fit to play.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 5, col: 4, stack: [B('samurai')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "The Samurai needed to capture the enemy Marshal to end the game. Press Start over and take it.",
      meruem:
        "Useless motion. Reset. Take the Marshal.",
    },
    isComplete: (state) => state.gameStatus === 'checkmate',
  },
  {
    id: 'ch6-l9-friendly-capture',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'Friendly capture',
    confirmAllOccupied: true,
    intro: {
      komugi:
        "One last thing. In Gungi, you're allowed to capture your own pieces. It's… weird, I know. But sometimes it's the right move — to free up a blocked square, or to remove a dead-weight piece.\n\nYour own Pawn blocks your Samurai's forward path. Remove it by capturing it with your Samurai — you'll see both Stack and Capture offered in the prompt.",
      meruem:
        "Self-capture. Permitted. A piece of your own that obstructs may be sacrificed to clear the line.\n\nThe pawn before your Samurai blocks nothing useful. Remove it.",
    },
    outro: {
      komugi:
        "A captured friendly piece is gone for good — it doesn't go back into your reserve. So it's a real sacrifice. Use it wisely.\n\nAnd… that's the tutorial. Thank you for being patient with me.",
      meruem:
        "A permanent cost. The pawn will not return to reserve. Sacrifice with purpose.\n\nYou are ready.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('samurai')] },
        { row: 4, col: 4, stack: [B('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    softHint: {
      komugi:
        "We're showing friendly capture — move your Samurai onto your own Pawn and choose Capture. Press Start over and try again.",
      meruem:
        "Reset. Samurai onto the pawn. Choose capture.",
    },
    isComplete: (state) => {
      const target = state.board[4]?.[4]
      return !target?.some((p) => p.type === 'pawn' && p.owner === 'black')
        && !!target?.some((p) => p.type === 'samurai' && p.owner === 'black')
    },
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

export type { Move }
