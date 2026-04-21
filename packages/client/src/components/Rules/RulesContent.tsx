import React from 'react'
import { PieceDiagramSet } from './PieceDiagram'

// ─── Shared primitives ────────────────────────────────────────────────────────

const H2: React.FC<React.PropsWithChildren> = ({ children }) => (
  <h2 className="text-lg font-semibold text-amber-300 mt-6 mb-2 tracking-wide">
    {children}
  </h2>
)

const H3: React.FC<React.PropsWithChildren> = ({ children }) => (
  <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-widest mt-4 mb-1">
    {children}
  </h3>
)

const P: React.FC<React.PropsWithChildren> = ({ children }) => (
  <p className="text-sm text-amber-100/85 leading-relaxed mb-2">{children}</p>
)

const UL: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ul className="text-sm text-amber-100/85 list-disc list-outside pl-5 space-y-1 mb-2">
    {children}
  </ul>
)

const Kanji: React.FC<{ char: string; children: React.ReactNode }> = ({ char, children }) => (
  <span className="text-amber-300 font-semibold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
    {char} {children}
  </span>
)

const Callout: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="text-xs text-amber-200/70 bg-amber-900/20 border-l-2 border-amber-500/60 rounded-r px-3 py-2 my-3 leading-relaxed">
    {children}
  </div>
)

// ─── Tab content ──────────────────────────────────────────────────────────────

const GettingStarted: React.FC = () => (
  <>
    <H2>What is Gungi?</H2>
    <P>
      Gungi (軍儀) is a chess-like board game invented in the manga <em>Hunter × Hunter</em>.
      Two players take turns placing and moving a full army of pieces on a square
      grid, with the goal of capturing the opponent's Marshal (帅). Unlike chess,
      pieces can stack into towers up to three pieces tall, and the piece on top
      gains new movement powers from its tier.
    </P>

    <H2>Goal of the game</H2>
    <P>
      Capture your opponent's Marshal. Unlike chess, there is no "escape required" —
      you may leave your Marshal exposed to capture. Each player <strong>must act
      every turn</strong>: you must place from reserve or move a piece. If your Marshal
      has no safe squares but you still have pieces in reserve, you drop a piece and
      play continues; if your Marshal is your last piece and every move walks into
      capture, you must still play one — and lose when the opponent takes it.
    </P>
    <P>
      In short: the game ends only when the Marshal is <em>physically captured</em>, never
      automatically on "trapped but uncaptured."
    </P>

    <H2>Two phases per game</H2>
    <UL>
      <li><strong>Setup</strong>: each player takes turns placing pieces from reserve onto their own home rows. Once both players have placed the required number of pieces, setup ends and the game phase begins.</li>
      <li><strong>Game phase</strong>: each turn, choose to either <em>place</em> another piece from reserve or <em>move</em> a piece already on the board. Continues until a Marshal is captured.</li>
    </UL>

    <H2>Two modes available</H2>
    <UL>
      <li><strong>Normal Gungi</strong> — 9×9 board, 34 pieces per player, place 15 in setup. The standard experience. See the "Normal" tab for full rules.</li>
      <li><strong>Mini Gungi</strong> — 5×5 board, 16 pieces per player, place 9 in setup. Faster games with a trimmed piece roster. See the "Mini" tab for differences.</li>
    </UL>

    <H2>Playing online vs. local</H2>
    <UL>
      <li><strong>Play Locally</strong>: both players use the same device, alternating turns. No account or internet needed.</li>
      <li><strong>Create Room</strong>: play with a friend over the internet. One player creates a room and shares the URL; the other player clicks the link to join. Each player sees the board from their own perspective.</li>
    </UL>

    <Callout>
      New to Gungi? The interactive tutorial at <strong>/tutorial</strong> walks you
      through all the mechanics in ~30 minutes. Come back here anytime to look up a
      specific rule.
    </Callout>
  </>
)

const NormalRules: React.FC = () => (
  <>
    <H2>Normal mode (9×9)</H2>
    <P>
      The classic mode. A 9×9 board with columns labeled <strong>a–i</strong> and rows
      labeled <strong>1–9</strong>. Each player sees their own pieces at the bottom of
      their view.
    </P>

    <H3>Roster — 34 pieces per player</H3>
    <UL>
      <li><Kanji char="帅">Marshal</Kanji> × 1 — must be placed first</li>
      <li><Kanji char="兵">Pawn</Kanji> × 9</li>
      <li><Kanji char="大">General</Kanji> × 4</li>
      <li><Kanji char="中">Major</Kanji> × 6</li>
      <li><Kanji char="筒">Musketeer</Kanji> × 2</li>
      <li><Kanji char="马">Knight</Kanji> × 2</li>
      <li><Kanji char="士">Samurai</Kanji> × 2</li>
      <li><Kanji char="炮">Cannon</Kanji> × 2</li>
      <li><Kanji char="忍">Spy</Kanji> × 2</li>
      <li><Kanji char="岩">Fortress</Kanji> × 2</li>
      <li><Kanji char="弓">Archer</Kanji> × 2</li>
    </UL>

    <H3>Setup</H3>
    <UL>
      <li>Each player must place <strong>15 pieces</strong> before the game phase begins.</li>
      <li>The Marshal must be your first placement.</li>
      <li><strong>All pieces</strong> — including pawns — must be placed in your own first 3 rows during setup.</li>
      <li>You can stack pieces on top of your own existing pieces (on top of a friendly pawn, general, etc., but not on your own Marshal).</li>
    </UL>

    <H3>Game phase</H3>
    <UL>
      <li>On each turn: place <em>or</em> move — your choice.</li>
      <li><strong>Pawn placement</strong>: anywhere on the board.</li>
      <li><strong>Non-pawn placement</strong>: your own first 3 rows, <em>or</em> on top of one of your own pawns anywhere on the board (the "advanced pawn as beachhead" rule).</li>
      <li>You may <em>not</em> stack on top of any Marshal (yours or your opponent's).</li>
      <li>You may not place on an enemy-occupied square.</li>
      <li>Max tower height: 3.</li>
    </UL>

    <H3>Piece cap</H3>
    <P>
      Each player may have at most <strong>22 pieces on the board</strong> simultaneously.
      If you're at 22, you cannot place another piece until you lose one to capture.
    </P>

    <H3>Turn-taking</H3>
    <P>
      Black goes first. Then turns alternate until the game ends.
    </P>

    <H3>Movement mechanics</H3>
    <UL>
      <li><strong>Stack OR capture on any occupied square</strong>. When a piece moves to a square occupied by another piece — <em>friendly or enemy</em> — you may choose to either stack on top (your piece lands on the tower, the piece underneath stays) or capture (the top of the tower is removed). Both options are offered for every such move.</li>
      <li><strong>Self-capture allowed</strong>. You may intentionally capture your own piece. The captured piece is removed from play permanently (it does <em>not</em> return to your reserve). Useful rarely, but legal.</li>
      <li><strong>Tier changes movement</strong>. A piece's active rules depend on the tier it sits at (how high in the tower). Some pieces gain new powers at tier 2 or tier 3 — see the Piece Index for each piece's tier-specific behavior.</li>
      <li><strong>Max tower height: 3</strong>. You cannot stack onto a tower that already has 3 pieces.</li>
      <li><strong>Cannot stack on Marshal</strong>. Neither yours nor your opponent's — the Marshal is unstackable regardless of ownership.</li>
    </UL>

    <H3>Win conditions</H3>
    <UL>
      <li><strong>Marshal captured</strong>: the only way the game ends by play. A Marshal in check may still move (even into further danger), remain in place via another piece's move, or be saved by a reinforcement drop. The game ends when a Marshal is actually taken off the board.</li>
      <li><strong>Resignation</strong>: either player may resign at any time.</li>
      <li><strong>Draw</strong>: by mutual agreement (draw offer + accept).</li>
      <li><strong>Forfeit</strong>: in network play, a player who disconnects for longer than the grace window forfeits the match.</li>
    </UL>
  </>
)

const MiniRules: React.FC = () => (
  <>
    <H2>Mini mode (5×5)</H2>
    <P>
      A shorter, denser variant of Gungi. Rules are identical to normal Gungi
      except for the differences listed below. Good for quick games (~15 min)
      and for learning the core mechanics without a long placement phase.
    </P>

    <H3>What differs from normal</H3>
    <UL>
      <li><strong>Board size</strong>: 5×5 instead of 9×9. Files labeled a–e, ranks 1–5.</li>
      <li><strong>Setup threshold</strong>: 9 pieces each before game phase (vs. 15).</li>
      <li><strong>Piece cap on board</strong>: 13 per player (vs. 22).</li>
      <li><strong>Non-pawn drop zone</strong>: your own first <strong>2</strong> rows (vs. first 3). Pawn drop zone during placement phase is also restricted to first 2 rows.</li>
      <li><strong>Smaller roster</strong>: 16 pieces per player. Several piece types are removed (too strong on a small board).</li>
    </UL>

    <H3>Mini roster — 16 pieces per player</H3>
    <UL>
      <li><Kanji char="帅">Marshal</Kanji> × 1</li>
      <li><Kanji char="兵">Pawn</Kanji> × 6</li>
      <li><Kanji char="大">General</Kanji> × 3</li>
      <li><Kanji char="筒">Musketeer</Kanji> × 2</li>
      <li><Kanji char="士">Samurai</Kanji> × 1</li>
      <li><Kanji char="岩">Fortress</Kanji> × 2</li>
      <li><Kanji char="弓">Archer</Kanji> × 1</li>
    </UL>

    <H3>Pieces removed in mini</H3>
    <P>
      No <Kanji char="中">Major</Kanji>, no <Kanji char="马">Knight</Kanji>,
      no <Kanji char="炮">Cannon</Kanji>, no <Kanji char="忍">Spy</Kanji>. These pieces have
      long-range or board-disrupting abilities that are overpowered on a 5×5 grid.
    </P>

    <Callout>
      Everything else — how pieces move, stacking, tier mechanics, fortress rules,
      check and checkmate — is exactly the same as normal Gungi.
    </Callout>
  </>
)

const Legend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-amber-100/80 my-3 px-3 py-2 bg-amber-900/15 border border-amber-700/20 rounded">
    <span className="flex items-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#6BAE8A' }} />
      can move here (empty) or stack on friendly
    </span>
    <span className="flex items-center gap-2">
      <span
        className="inline-block rounded-full"
        style={{ width: 10, height: 10, border: '2px solid #C64040' }}
      />
      can capture enemy here
    </span>
  </div>
)

type PieceEntry = {
  pieceType: import('@gungi/engine').PieceType
  kanji: string
  name: string
  countLabel: string
  notes: React.ReactNode[]
}

const PIECE_ENTRIES: PieceEntry[] = [
  {
    pieceType: 'marshal',
    kanji: '帅',
    name: 'Marshal',
    countLabel: '1 per player',
    notes: [
      <>Cannot be stacked on by either side. Cannot be self-captured.</>,
      <>The game ends only when a Marshal is <em>physically captured</em>.</>,
    ],
  },
  {
    pieceType: 'pawn',
    kanji: '兵',
    name: 'Pawn',
    countLabel: '9 in normal, 6 in mini',
    notes: [
      <>Cannot move or capture at any tier — pawns stay where they are placed.</>,
      <>A captured pawn becomes a <em>dead pawn</em>: it counts as a valid platform for a Tier-3 Cannon's jump capture.</>,
    ],
  },
  {
    pieceType: 'major',
    kanji: '中',
    name: 'Major',
    countLabel: '6 in normal, removed in mini',
    notes: [
      <>Captures <em>diagonal-forward only</em>. No orthogonal capture — an enemy directly ahead is untouchable by this piece.</>,
    ],
  },
  {
    pieceType: 'general',
    kanji: '大',
    name: 'General',
    countLabel: '4 in normal, 3 in mini',
    notes: [
      <>Captures <em>diagonally only</em>. No orthogonal capture — an enemy directly ahead or behind is untouchable.</>,
    ],
  },
  {
    pieceType: 'musketeer',
    kanji: '筒',
    name: 'Musketeer',
    countLabel: '2 in both modes',
    notes: [
      <>Asymmetric: slides any distance forward but only steps 1 square diagonally backward.</>,
    ],
  },
  {
    pieceType: 'knight',
    kanji: '马',
    name: 'Knight',
    countLabel: '2 in normal, removed in mini',
    notes: [
      <>Jumps over any intervening pieces.</>,
      <><strong>Tier 1</strong>: narrow L only (long leg vertical). <strong>Tier 2</strong>: full chess knight. <strong>Tier 3</strong>: full knight plus a 3-square orthogonal hop.</>,
    ],
  },
  {
    pieceType: 'fortress',
    kanji: '岩',
    name: 'Fortress',
    countLabel: '2 in both modes',
    notes: [
      <><strong>Uncapturable</strong>. No piece can capture a Fortress — from either side.</>,
      <>Cannot capture. <strong>Any</strong> piece (yours or the enemy's) may stack on top of a Fortress; the Fortress underneath remains indestructible.</>,
    ],
  },
  {
    pieceType: 'cannon',
    kanji: '炮',
    name: 'Cannon',
    countLabel: '2 in normal, removed in mini',
    notes: [
      <><strong>Tier 1</strong>: 1–2 square rook step. <strong>Tier 2</strong>: full rook slide. <strong>Tier 3</strong>: rook slide <em>plus</em> jump-capture — attacks by hopping over exactly one piece (the platform) to hit the next piece in line. Dead pawns count as valid platforms.</>,
    ],
  },
  {
    pieceType: 'samurai',
    kanji: '士',
    name: 'Samurai',
    countLabel: '2 in normal, 1 in mini',
    notes: [
      <>Queen movement capped at 3 squares — 8 directions, stops on the first piece hit.</>,
    ],
  },
  {
    pieceType: 'archer',
    kanji: '弓',
    name: 'Archer',
    countLabel: '2 in normal, 1 in mini',
    notes: [
      <><strong>Tier 1</strong>: bishop, capped at 2 squares. <strong>Tier 2</strong>: full bishop. <strong>Tier 3</strong>: queen (bishop + rook, unlimited).</>,
    ],
  },
  {
    pieceType: 'spy',
    kanji: '忍',
    name: 'Spy',
    countLabel: '2 in normal, removed in mini',
    notes: [
      <>Ring teleport: at tier <em>N</em>, lands exactly <em>N</em> squares away in any of 8 directions, hopping over anything in between.</>,
      <><strong>Mutual destruction</strong>: when the Spy captures <em>any</em> piece (enemy or friendly), the Spy is also removed from play.</>,
    ],
  },
]

const PieceEntryBlock: React.FC<{ entry: PieceEntry }> = ({ entry }) => (
  <details open className="my-5 border-t border-amber-700/20 pt-4 group">
    <summary
      className="list-none cursor-pointer flex items-center gap-2 select-none hover:text-amber-200 transition-colors"
      style={{ outline: 'none' }}
    >
      <span
        className="inline-block text-amber-400/60 group-open:rotate-90 transition-transform text-xs"
        aria-hidden
      >
        ▶
      </span>
      <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-widest mb-0 inline">
        <span
          className="text-amber-300 font-semibold"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          {entry.kanji}
        </span>
        <span className="ml-2">{entry.name}</span>
        <span className="text-amber-200/50 ml-2 text-xs normal-case tracking-normal">
          ({entry.countLabel})
        </span>
      </h3>
    </summary>
    <div className="mt-2">
      <PieceDiagramSet pieceType={entry.pieceType} size={300} />
      {entry.notes.length > 0 && (
        <UL>
          {entry.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </UL>
      )}
    </div>
  </details>
)

const PieceIndex: React.FC = () => (
  <>
    <H2>Piece Index</H2>
    <P>
      Each piece below shows a reach diagram from the center of an empty 9×9 board.
      Green dots mark squares the piece can move to or stack on; red rings mark
      enemy-capture targets. Where a piece's behavior changes by tier (Knight, Cannon,
      Spy, Archer), all three tiers are shown side-by-side.
    </P>
    <Legend />

    {PIECE_ENTRIES.map((entry) => (
      <PieceEntryBlock key={entry.pieceType} entry={entry} />
    ))}

    <Callout>
      Diagrams are generated directly from the rule engine — if the rules change,
      so do the diagrams. Max tower height is 3; a piece's tier = how high in the
      tower it sits (bottom = 1, top of a 3-stack = 3).
    </Callout>
  </>
)


// ─── Dispatcher ───────────────────────────────────────────────────────────────

type Tab = 'start' | 'normal' | 'mini' | 'pieces'

interface RulesContentProps {
  tab: Tab
}

export const RulesContent: React.FC<RulesContentProps> = ({ tab }) => {
  switch (tab) {
    case 'start':  return <GettingStarted />
    case 'normal': return <NormalRules />
    case 'mini':   return <MiniRules />
    case 'pieces': return <PieceIndex />
  }
}
