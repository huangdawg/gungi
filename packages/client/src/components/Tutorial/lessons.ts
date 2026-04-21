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
 * Full 6-chapter tutorial. Komugi = gentle, humble, mild stutter on hard
 * concepts. Meruem = precise, imperious, rewards correct play with clipped
 * approval. Each narrative kept to ~4 sentences so the board stays in focus.
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
        "Hi. Um… I'm Komugi. I'll try to teach you Gungi, if that's alright.\n\nIt's a bit like chess, but every square can hold up to three pieces stacked on top of each other. The goal is simple: capture the opponent's Marshal. When the Marshal is taken, the game ends.\n\nThere's no time pressure. We'll go step by step.",
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
        "During setup, every piece has to go in your home rows — the three rows nearest you. You'll see the other squares just… aren't clickable.\n\nGo ahead — drop one of your Generals. The board will show you where it can land.",
      meruem:
        "Setup confines you to your home rows. The other ranks are forbidden until the game phase.\n\nPlace a General. Observe where the board permits it.",
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
        "You made your first tower! When you move it later, the piece on top is the one that moves. The ones underneath wait their turn.",
      meruem:
        "A tower rises. Higher tiers grant new powers — a rook's reach, a cannon's jump, a samurai's range. Continue.",
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
        "Pawns. Inert alone — they never move — but they occupy ground, form the base of towers, and serve as platforms for certain pieces.\n\nDeploy one.",
    },
    outro: {
      komugi:
        "That pawn is staying right there. When pawns are captured they become 'dead pawns' — you'll hear about that when we get to the Cannon.",
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

  // ─── Chapter 3: Movement basics ────────────────────────────────────────────
  {
    id: 'ch3-l1-marshal-moves',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'The Marshal moves',
    intro: {
      komugi:
        "Setup is done — now pieces can move.\n\nYour Marshal moves one square in any of eight directions, like a chess king. Try it — move your Marshal anywhere.",
      meruem:
        "Setup has concluded. Pieces may now move.\n\nThe Marshal steps one square in any of eight directions. Demonstrate.",
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
      if (move.type !== 'move') return false
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
      if (move.type !== 'move') return false
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
        "The Major captures on its forward diagonals — not straight ahead. So an enemy directly in front of your Major is safe… but one diagonal ahead isn't.\n\nCapture the enemy Pawn on your diagonal.",
      meruem:
        "The Major's capture is diagonal-forward only — never straight. Take the enemy on your diagonal.",
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
      if (move.type !== 'capture') return false
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'major'
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
    id: 'ch3-l5-general-strike',
    chapter: 3,
    chapterTitle: 'Movement',
    title: "The General's strike",
    intro: {
      komugi:
        "Generals capture like Majors do — on the diagonals, not straight ahead. But Generals can capture on BOTH forward and backward diagonals.\n\nCapture the enemy Pawn on your diagonal.",
      meruem:
        "The General strikes on four diagonals — forward and backward. Never orthogonal.\n\nTake the pawn.",
    },
    outro: {
      komugi:
        "A General directly in front of an enemy can't take that enemy — only diagonals. You have to maneuver around.",
      meruem:
        "Exploit the asymmetry. A General blocks a file; only its diagonals are lethal.",
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
    id: 'ch3-l6-pawn-drop-anywhere',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'Pawns in the game phase',
    intro: {
      komugi:
        "Once the game phase starts, pawns can be dropped anywhere on the board — not just your home rows. This lets you reinforce far forward.\n\nDrop a pawn somewhere past your third row — anywhere empty.",
      meruem:
        "The game phase lifts the pawn's territorial restriction. Your pawns may now be deployed to any empty square on the board.\n\nProject one into enemy territory.",
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
    isValidMove: (move) =>
      move.type === 'place' && move.piece === 'pawn' && move.to.row > 2,
    isComplete: (state) => {
      // A pawn exists somewhere past row 2 (outside home rows)
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
    id: 'ch3-l7-stack-or-capture',
    chapter: 3,
    chapterTitle: 'Movement',
    title: 'Stack or capture — a choice',
    readOnly: true,
    intro: {
      komugi:
        "You've seen this in the last few lessons — when you move a piece to a square that already has something on it (yours OR the enemy's), you have a choice.\n\nYou can stack, putting your piece on top of what's there. Or you can capture, removing the top piece and taking its spot. When both are legal, the game will ask you which you meant.\n\nThe pieces we'll see next — Musketeer, Knight, Samurai, Archer — all follow this same rule. Any move onto an occupied square offers you both options.",
      meruem:
        "A recurring mechanic. Any move onto an occupied square — enemy or friendly — presents a choice: stack, or capture.\n\nStack: your piece lands on top. Capture: the top piece is removed; yours takes its place. When both are legal, the game will prompt you.\n\nInternalize this. Every piece that follows respects it.",
    },
  },

  // ─── Chapter 4: Other pieces ───────────────────────────────────────────────
  {
    id: 'ch4-l1-samurai-charge',
    chapter: 4,
    chapterTitle: 'Other pieces',
    title: 'Samurai on the charge',
    intro: {
      komugi:
        "The Samurai is like a queen, but limited to three squares per move. Eight directions — straight or diagonal — and it can capture anywhere along the path.\n\nThere's an enemy Pawn three squares forward. Go get it.",
      meruem:
        "The Samurai — a queen on a leash. Three squares, any direction, capture or move.\n\nStrike the pawn.",
    },
    outro: {
      komugi:
        "Nice! The Samurai is one of the most versatile pieces. Three squares is enough to reach most of the board nearby.",
      meruem:
        "Bold play rewarded. The Samurai thrives on pressure. Press.",
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
  {
    id: 'ch4-l2-musketeer',
    chapter: 4,
    chapterTitle: 'Other pieces',
    title: 'The Musketeer',
    intro: {
      komugi:
        "The Musketeer is a long-range attacker. It slides any distance straight forward and captures the first enemy it hits — but it can only step one square diagonally backward to retreat.\n\nThere's an enemy Pawn down your file. Take it.",
      meruem:
        "The Musketeer. A forward cannon in miniature — slides any distance down its file; captures the first enemy in line. Retreat is limited: one square, backward-diagonal only.\n\nFire.",
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
    isValidMove: (move, state) => {
      if (!move.from) return false
      if (topPiece(state, move.from.row, move.from.col)?.type !== 'musketeer') return false
      return move.type === 'capture' || move.type === 'stack'
    },
    softHint: {
      komugi:
        "You stacked on the pawn. For this lesson we need you to capture it with the Musketeer's slide. Start over and choose Capture.",
      meruem:
        "You stacked. Reset. Capture.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch4-l3-knight-leap',
    chapter: 4,
    chapterTitle: 'Other pieces',
    title: 'The Knight leaps',
    intro: {
      komugi:
        "The Knight jumps in an L-shape — two squares forward or backward, then one to the side. It hops over whatever's in between, so walls of pawns don't stop it.\n\nThere's an enemy Pawn at a Knight's distance. Leap over and take it.",
      meruem:
        "The Knight. Narrow-L leap — two squares along a file, one across. Hops intervening pieces.\n\nStrike.",
    },
    outro: {
      komugi:
        "The Knight's leap is great for getting behind enemy lines. It's also stronger at higher tiers — at tier 2 it gets all eight chess-knight moves, and at tier 3 it can also jump three squares straight.",
      meruem:
        "At higher tiers the Knight gains the full chess-knight repertoire and an orthogonal three-hop. Cultivate towers with Knights on top.",
    },
    initialState: buildState({
      phase: 'game',
      placements: [
        { row: 0, col: 4, stack: [B('marshal')] },
        { row: 3, col: 4, stack: [B('knight')] },
        { row: 4, col: 4, stack: [B('pawn')] }, // wall to demonstrate the hop
        { row: 5, col: 3, stack: [W('pawn')] },
        { row: 8, col: 4, stack: [W('marshal')] },
      ],
      blackPlaced: 15,
      whitePlaced: 15,
    }),
    isValidMove: (move, state) => {
      if (!move.from) return false
      if (topPiece(state, move.from.row, move.from.col)?.type !== 'knight') return false
      return move.type === 'capture' || move.type === 'stack'
    },
    softHint: {
      komugi:
        "You stacked when we needed a capture. Try again — the Knight should leap and take the enemy.",
      meruem:
        "Reset. Capture with the Knight.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch4-l4-archer-fire',
    chapter: 4,
    chapterTitle: 'Other pieces',
    title: 'The Archer fires',
    intro: {
      komugi:
        "The Archer shoots on the diagonals — up to two squares away at tier 1. Higher tiers make it stronger: tier 2 is a full bishop, tier 3 is a queen.\n\nAn enemy Pawn sits two diagonal squares away. Shoot it down.",
      meruem:
        "The Archer. A tier-1 Archer is a bishop capped at two squares. A tier-2 Archer is a full bishop; a tier-3 Archer is a queen.\n\nFire.",
    },
    outro: {
      komugi:
        "Archers are amazing when you stack them to tier 3. A tier-3 Archer has eight directions of unlimited range, just like a chess queen.",
      meruem:
        "At tier 3 the Archer reigns. Build the tower; unleash the queen.",
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
    isValidMove: (move, state) => {
      if (!move.from) return false
      if (topPiece(state, move.from.row, move.from.col)?.type !== 'archer') return false
      return move.type === 'capture' || move.type === 'stack'
    },
    softHint: {
      komugi:
        "You stacked instead of firing. Try again — we want the Archer to capture the enemy.",
      meruem:
        "Reset. Fire.",
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },

  // ─── Chapter 5: Complex pieces ─────────────────────────────────────────────
  {
    id: 'ch5-l1-fortress',
    chapter: 5,
    chapterTitle: 'Complex pieces',
    title: 'The Fortress',
    intro: {
      komugi:
        "The Fortress is… kind of amazing. It can't be captured — nothing the enemy does can take it off the board.\n\nBut it can't capture enemies either. It moves one square in any direction, and it's meant to anchor your formation. Try stepping it forward one square.",
      meruem:
        "The Fortress. Unkillable. No enemy piece may capture it; none may stack upon it. In exchange: it cannot capture. It moves one square, eight directions.\n\nMove it.",
    },
    outro: {
      komugi:
        "Your own pieces can stack ON TOP of a Fortress, which is really useful — when the piece on top gets captured, the Fortress underneath is still there, untouchable.",
      meruem:
        "A Fortress with a piece stacked atop it — the stack can be captured, but the Fortress beneath endures. A bulwark that regenerates by sacrificing its riders.",
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
    isValidMove: (move, state) => {
      if (move.type !== 'move') return false
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'fortress'
    },
    isComplete: (state) => {
      const start = state.board[3]?.[4]
      return !start?.some((p) => p.type === 'fortress' && p.owner === 'black')
    },
  },
  {
    id: 'ch5-l2-spy',
    chapter: 5,
    chapterTitle: 'Complex pieces',
    title: 'The Spy',
    intro: {
      komugi:
        "The Spy moves like the Marshal — one square in any direction at tier 1. But it has a special rule: if it captures anything, the Spy dies too.\n\nMutual destruction. Capture the enemy Pawn with your Spy — both pieces will be removed.",
      meruem:
        "The Spy. Tier-1 movement equivalent to the Marshal. Its singular property: any capture it performs kills the Spy as well.\n\nA piece to be spent, not preserved. Execute the capture.",
    },
    outro: {
      komugi:
        "See? Both pieces are gone. Spies are for trading — you use them to kill something important, knowing you'll lose them.\n\nAt higher tiers, the Spy can jump — tier 2 lands exactly 2 squares away in 8 directions, tier 3 lands 3 squares away.",
      meruem:
        "A sacrificial blade. Spend Spies on high-value targets. At higher tiers they hop — ring-2 at tier 2, ring-3 at tier 3 — making them even deadlier assassins.",
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
    isValidMove: (move, state) => {
      if (move.type !== 'capture') return false
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'spy'
    },
    isComplete: (state) => state.players.white.onBoardCount < 2,
  },
  {
    id: 'ch5-l3-cannon',
    chapter: 5,
    chapterTitle: 'Complex pieces',
    title: 'The Cannon (tier 3 jump)',
    intro: {
      komugi:
        "The Cannon gets better with tiers. Tier 1 is just a 1-2 square rook step. Tier 2 is a full rook. Tier 3 — what you have in front of you — can do both, AND can jump over exactly one piece to capture the one beyond.\n\nThere's a white Pawn in line as your platform, another behind it as the target. Jump the platform and capture the far pawn.",
      meruem:
        "The Chinese cannon. Your Cannon sits atop a tier-3 tower. It slides like a rook — and, crucially, captures by leaping exactly one piece to strike the next in line.\n\nThe platform stands in your path. The target waits beyond. Execute the jump.",
    },
    outro: {
      komugi:
        "That's the signature Cannon move. Any piece between you and the target works as a platform — even a dead pawn, which is why dead pawns aren't removed from the board.",
      meruem:
        "The Cannon's jump does not discriminate. Ally, enemy, dead pawn — all serve as platforms. Construct lines deliberately.",
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
    isValidMove: (move, state) => {
      if (move.type !== 'capture') return false
      if (!move.from) return false
      return topPiece(state, move.from.row, move.from.col)?.type === 'cannon'
    },
    softHint: {
      komugi:
        "You captured the platform pawn instead of the one behind it. That's a legal slide — but for this lesson we want the jump-capture. Start over and target the pawn further back.",
      meruem:
        "You took the near target. The lesson's demand is the far one, across the platform. Reset.",
    },
    isComplete: (state) => {
      // The target (the far white pawn at row 6, col 4) is gone.
      const tower = state.board[6]?.[4]
      return !tower?.some((p) => p.type === 'pawn' && p.owner === 'white')
    },
  },

  // ─── Chapter 6: Endgame ────────────────────────────────────────────────────
  {
    id: 'ch6-l1-capture-marshal',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'End the game',
    intro: {
      komugi:
        "This is how the game ends — you physically capture the enemy Marshal. There's no check or checkmate like in chess; the Marshal has to actually be taken off the board.\n\nYour Samurai can reach the enemy Marshal in one move. Take it.",
      meruem:
        "Victory. The Marshal must be captured — not threatened, not cornered. Taken.\n\nYour Samurai has the reach. Strike.",
    },
    outro: {
      komugi:
        "You won! A defeated Marshal can't be replaced, so every game ends the instant one is captured.\n\nThat's everything I know how to teach. There's one more concept to mention — a strange one — and then you're ready.",
      meruem:
        "Victory. The game ends at the capture of the Marshal; there is no alternative win condition.\n\nOne remaining mechanic to absorb, then you are fit to play.",
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
    isValidMove: (move) => move.type === 'capture' && move.to.row === 8 && move.to.col === 4,
    isComplete: (state) => state.gameStatus === 'checkmate',
  },
  {
    id: 'ch6-l2-friendly-capture',
    chapter: 6,
    chapterTitle: 'Endgame',
    title: 'Friendly capture',
    intro: {
      komugi:
        "One last thing. In Gungi, you're allowed to capture your own pieces. It's… weird, I know. But sometimes it's the right move — to free up a blocked square, or to remove a dead-weight piece.\n\nYour own Pawn is directly in front of your Samurai, blocking its path. Remove it by capturing it with your Samurai.",
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
    isValidMove: (move, state) => {
      if (!move.from) return false
      if (topPiece(state, move.from.row, move.from.col)?.type !== 'samurai') return false
      return move.type === 'capture' || move.type === 'stack'
    },
    softHint: {
      komugi:
        "You stacked on your own pawn — also a valid choice in real play! But for this lesson we're showing the friendly-capture option. Start over and choose Capture.",
      meruem:
        "You stacked. Valid. But the lesson demands removal. Reset. Capture.",
    },
    isComplete: (state) => {
      // The pawn at (4,4) is gone AND the samurai has moved there.
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

// Re-export for type-checking compatibility
export type { Move }
