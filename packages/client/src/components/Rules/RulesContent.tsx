import React from 'react'

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
      Capture your opponent's Marshal. The Marshal is in <strong>check</strong> when an
      enemy piece threatens to capture it next turn. Unlike chess, there is no "escape
      required" — you may move into or remain in check. Each player <strong>must act
      every turn</strong>: you must place from reserve or move a piece. If your Marshal
      has no escape squares but you still have pieces in reserve, you drop a piece and
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
      labeled <strong>1–9</strong>. Black sits at the top (ranks 8–9 in raw coordinates);
      white sits at the bottom. Each player sees their own pieces at the bottom of
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

const PieceIndex: React.FC = () => (
  <>
    <H2>Piece Index</H2>
    <P>
      Every piece. Each has a base movement/capture pattern, and some gain new
      powers at higher tiers (when they sit on top of a tower of height 2 or 3).
    </P>

    <H3><Kanji char="帅">Marshal (1 per player)</Kanji></H3>
    <UL>
      <li>Moves 1 square in any direction (like a chess king).</li>
      <li>Captures with the same move.</li>
      <li>Cannot be stacked on by either side. Cannot be self-captured.</li>
      <li>Its capture / being-checkmated ends the game.</li>
    </UL>

    <H3><Kanji char="兵">Pawn (9 in normal, 6 in mini)</Kanji></H3>
    <UL>
      <li>Moves 1 square forward.</li>
      <li>Captures with the same forward move.</li>
      <li>Once captured (removed from board), it becomes a <em>dead pawn</em>. In some positions a dead pawn acts as a platform for tier-3 cannon jumps — see the Cannon entry.</li>
    </UL>

    <H3><Kanji char="大">General (4 in normal, 3 in mini)</Kanji></H3>
    <UL>
      <li>Moves 1 square forward <em>or</em> 1 square backward (orthogonal, same column).</li>
      <li>Captures <em>only diagonally</em> — 1 square diagonally forward or backward. No orthogonal captures.</li>
      <li>Cannot take an enemy piece directly ahead or behind. Works around them by capturing on the diagonal, or steps past with a stack move.</li>
    </UL>

    <H3><Kanji char="中">Major (6 in normal, not in mini)</Kanji></H3>
    <UL>
      <li>Moves 1 square forward (orthogonal only, no backward).</li>
      <li>Captures 1 square diagonally forward only. No orthogonal captures.</li>
    </UL>

    <H3><Kanji char="筒">Musketeer (2 in both modes)</Kanji></H3>
    <UL>
      <li>Slides forward any number of squares in the forward column until blocked.</li>
      <li>Captures the first enemy piece it reaches on the slide.</li>
    </UL>

    <H3><Kanji char="马">Knight (2 in normal, not in mini)</Kanji></H3>
    <UL>
      <li>L-shaped jumps: 2 squares in one orthogonal direction, then 1 square perpendicular.</li>
      <li>Jumps over intervening pieces.</li>
      <li>Captures on the landing square.</li>
    </UL>

    <H3><Kanji char="士">Samurai (2 in normal, 1 in mini)</Kanji></H3>
    <UL>
      <li>Moves up to 3 squares in any of the 4 orthogonal directions, stopping at the first obstruction.</li>
      <li>Captures anywhere along that path.</li>
    </UL>

    <H3><Kanji char="炮">Cannon (2 in normal, not in mini)</Kanji></H3>
    <UL>
      <li><strong>Tier 1</strong>: jumps exactly 2 squares orthogonally (over any square, friendly or enemy). No sliding.</li>
      <li><strong>Tier 2</strong>: slides like a chess rook — any number of squares orthogonally, stopping at the first piece.</li>
      <li><strong>Tier 3</strong>: "Chinese cannon" — slides like a rook, and additionally can capture by jumping <em>over exactly one piece</em> (the platform) to hit the first piece beyond. Dead pawns count as valid platforms.</li>
    </UL>

    <H3><Kanji char="忍">Spy (2 in normal, not in mini)</Kanji></H3>
    <UL>
      <li>Moves 1 square in any direction.</li>
      <li>When the Spy captures <em>any</em> piece (friend or foe), the Spy is also removed from the board. Mutual destruction.</li>
    </UL>

    <H3><Kanji char="岩">Fortress (2 in both modes)</Kanji></H3>
    <UL>
      <li>Moves 1 square in any direction.</li>
      <li><strong>Uncapturable</strong>: no enemy can capture a Fortress, ever. Not even via self-capture by your own side.</li>
      <li>Your own pieces <em>can</em> stack on top of a Fortress. The piece on top is the "active" piece and can be captured normally. When it is, the Fortress becomes exposed again.</li>
    </UL>

    <H3><Kanji char="弓">Archer (2 in normal, 1 in mini)</Kanji></H3>
    <UL>
      <li>Moves 1 square at tier 1.</li>
      <li>Range extends with tier — higher tiers can fire from farther away.</li>
      <li>Indirect attacker; slides past empty squares and captures at range.</li>
    </UL>

    <Callout>
      Tiers matter: a piece's active rules depend on what tier it sits at in its tower.
      Stacking a piece onto a tower of 2 makes it tier 3 — the top piece may gain new powers.
      Max tower height: 3.
    </Callout>
  </>
)

const CustomRules: React.FC = () => (
  <>
    <H2>Custom rules in this implementation</H2>
    <P>
      Standard Gungi rules vary between fan interpretations and the manga's
      minimal on-page treatment. This implementation makes specific choices —
      listed below so you know exactly what to expect.
    </P>

    <H3>Placement deviations</H3>
    <UL>
      <li><strong>Setup: all pieces must be placed in home rows</strong>, including pawns. Some rule sets allow pawns anywhere during setup; we don't.</li>
      <li><strong>Game phase: advanced-pawn-as-beachhead</strong>. During the game phase, non-pawns can be placed on top of one of your own pawns anywhere on the board, not just in your home rows. Push a pawn forward, then deploy reinforcements onto it.</li>
      <li><strong>Marshal must be placed first</strong>. You cannot place any other piece until your Marshal is on the board.</li>
    </UL>

    <H3>Movement deviations</H3>
    <UL>
      <li><strong>General and Major: no orthogonal capture</strong>. These pieces move forward/backward (General) or forward (Major) orthogonally, but only capture on the diagonal. An enemy directly ahead is unreachable via capture.</li>
    </UL>

    <H3>Stacking deviations</H3>
    <UL>
      <li><strong>Stack OR capture on any occupied square</strong>. Moving onto an occupied square offers both options. Stacking on an enemy piece leaves them on the board buried beneath yours.</li>
      <li><strong>Self-capture is allowed</strong>. You can capture your own piece intentionally. The captured piece is removed from play permanently (does not return to your reserve).</li>
      <li><strong>Cannot stack on Marshal</strong>, yours or the opponent's.</li>
      <li><strong>Fortress is uncapturable but stackable</strong>. Your own pieces can sit on top of your own Fortress.</li>
    </UL>

    <H3>Roster deviations</H3>
    <UL>
      <li><strong>4 Generals and 6 Majors per player</strong> (swapped from some references that have 6 Generals / 4 Majors).</li>
      <li><strong>No Lieutenant or Counsel pieces</strong>. Some standard rulesets include these; we don't.</li>
      <li><strong>Mini mode has a reduced roster</strong> — no Majors, Knights, Cannons, or Spies. See the Mini tab.</li>
    </UL>

    <H3>Endgame deviations</H3>
    <UL>
      <li><strong>Marshal must be physically captured to win.</strong> No chess-style "trapped but uncaptured = checkmate." A player whose Marshal is in check may move it into further danger, leave it in place via another piece's move, or drop a reinforcement from reserve. The game ends only when the Marshal is actually taken.</li>
      <li><strong>Each player must act every turn.</strong> You may not pass. If your Marshal is trapped and you have no legal Marshal-safe moves, you must still place from reserve or move some piece — even if every option leads to capture next turn.</li>
      <li><strong>Cannon tier 3 jumps over dead pawns</strong>. Dead pawns (pawns that have been captured but remain on the board as markers) act as valid platforms for the Chinese-cannon jump capture.</li>
    </UL>

    <H3>Piece caps</H3>
    <UL>
      <li>Normal: 22 pieces max on board per player.</li>
      <li>Mini: 13 pieces max on board per player.</li>
    </UL>
  </>
)

// ─── Dispatcher ───────────────────────────────────────────────────────────────

type Tab = 'start' | 'normal' | 'mini' | 'pieces' | 'custom'

interface RulesContentProps {
  tab: Tab
}

export const RulesContent: React.FC<RulesContentProps> = ({ tab }) => {
  switch (tab) {
    case 'start':  return <GettingStarted />
    case 'normal': return <NormalRules />
    case 'mini':   return <MiniRules />
    case 'pieces': return <PieceIndex />
    case 'custom': return <CustomRules />
  }
}
