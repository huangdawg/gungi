# Rules Reference + Interactive Tutorial — Design Plan

## Goals

Two distinct features, one PR each:

1. **Rules reference**: a static, well-organized page that players can open at
   any time to look up rules. Covers normal and mini variants. Accessible from
   landing page + in-game.
2. **Interactive tutorial**: a single-player guided walkthrough that teaches
   Gungi by running scripted scenarios. Replaces "read the rules" with
   "play-along lessons."

Both should work for players who have never seen Gungi before.

## Feature 1: Rules reference

### Content structure

Single page / modal with tabs or sections:

```
[Getting Started] [Normal] [Mini] [Piece Index] [Custom Rules]

GETTING STARTED
├── Goal of the game
├── Board overview
├── Turn structure
└── Modes available (normal vs mini — link to each section)

NORMAL (9×9)
├── Board + coordinates
├── Roster per player (with visual)
├── Placement phase — rules + drop zone
├── Hybrid phase — rules + advanced-pawn beachhead
├── Win conditions
└── Piece caps (15 to transition, 22 on board)

MINI (5×5)
├── What differs from normal (diff-style: board size, roster, thresholds)
├── Roster per player (with visual)
├── Placement phase
├── Hybrid phase
└── Piece caps (9 to transition, 13 on board)

PIECE INDEX
├── Marshal — movement, captures, constraints
├── Pawn — movement, dead-pawn-as-cannon-platform
├── General — orthogonal move / diagonal capture
├── Major — forward only / diagonal capture
├── Musketeer — ranged
├── Knight — L-shape
├── Samurai — range 3 in 4 directions
├── Cannon — tier mechanics (tier 1 jump, tier 2 rook, tier 3 Chinese)
├── Spy — movement + mutual capture
├── Fortress — uncapturable, stackable base
└── Archer — movement + range

CUSTOM RULES (this implementation's deviations from standard Gungi)
├── Hybrid-phase placement: non-pawns in home rows OR on own advanced pawn
├── Fortress can be stacked on (friendly only)
├── General/Major: no orthogonal capture, diagonals only
├── Generals 4 / Majors 6 (swapped from traditional counts)
├── Stacking on any occupied square: choose stack OR capture
├── Self-capture allowed
├── Dead pawn acts as Cannon tier-3 jump platform
├── All-moves-in-check = checkmate (no stalemate draw)
└── Lieutenant / Counsel removed from roster
```

### UI — two options, pick one

**Option A: Dedicated route `/rules`** (full page)
- Pro: more space for content, coordinate diagrams, piece movement animations
- Pro: shareable URL (can link directly to `/rules#cannon`)
- Con: players have to leave the game screen to reference rules mid-match
- Con: new component, new route

**Option B: Modal overlay** (slide-over panel from edge of screen)
- Pro: in-game reference without losing board state
- Pro: smaller implementation surface
- Con: less room for diagrams
- Con: only accessible via the in-game help button

**My recommendation**: **both**. Content is one shared component. Two entry
points:
- `/rules` route (full-page, landing page and home button both link here)
- In-game "?" button top-right that opens the same component as a slide-over
  panel

Minimal extra code — single source of truth for rules content.

### Content authoring approach

Write rules content as markdown or structured React components. I'd lean React
(not MD) so that piece-movement diagrams can be actual inline Board snippets
rendered from gameState. A player reading "the General moves forward or
backward, captures diagonally" benefits hugely from seeing a 5×5 mini-board
with the general's actual legal moves highlighted.

**Diagram source-of-truth**: use the real engine's `getLegalMoves()` on a
constructed board state. This guarantees the diagrams stay correct if rules
change — they regenerate from the engine.

### Validation criteria (rules reference)

- [ ] Rules content matches engine behavior (cross-reference test: each rule
      stated has a corresponding engine test or easily-verifiable code path)
- [ ] Accessible from landing page (Play Locally / Create Room screen)
- [ ] Accessible from within any active game
- [ ] Covers both normal and mini, with diffs surfaced clearly
- [ ] All 11 piece types documented with movement/capture rules + a live
      diagram rendered from the real engine
- [ ] Custom-rules section lists every deviation from standard Gungi
- [ ] Works in both light and dark contexts (matches existing ukiyo-e theme)

### Milestones

**M1.1 — Static rules content** (2-3 days)
- Author all prose content
- Build the `<RulesPage>` React component with tabs
- Hook up `/rules` route
- Add link from CreateRoom landing
- ✅ Ship-able standalone

**M1.2 — Live piece diagrams** (1-2 days)
- Build `<PieceDemo>` component that takes a piece type + board position, runs
  `getLegalMoves` internally, displays a small board with move highlights
- Embed in PIECE INDEX section
- ✅ Content becomes self-verifying

**M1.3 — In-game help button** (half day)
- Add "?" button to GamePage top-right
- Opens RulesPage as a slide-over modal
- ✅ Rules accessible from any game state

---

## Feature 2: Interactive tutorial

### Concept

Single-player mode at `/tutorial`. Scripted lesson series with narrated prompts
and constrained legal-move sets. Player reads a prompt, makes the requested
move, advances. Progress bar across top.

Not a freeform game — each step has a pre-set board and expects a specific
action (or one of a small set of valid actions). The engine validates; the
tutorial controller advances on success, shows a hint on wrong input.

### Why scripted vs sandbox

Sandbox "play around" mode is tempting but bad pedagogy — players wander, get
confused, don't learn rules in a structured order. Scripted lessons force the
narrative.

### Lesson plan

**Chapter 1: Orientation** (5 min)
- Lesson 1.1: What is Gungi? Goal of the game. (read only)
- Lesson 1.2: The board. Coordinates. (read only)
- Lesson 1.3: Your first piece: place a marshal in your home row.
  (scripted: reserve has only marshal, placement phase, click to drop in row 0)

**Chapter 2: Placement phase** (5 min)
- Lesson 2.1: Drop zones. Non-pawns go in your first 3 rows; pawns anywhere.
  (scripted: try to drop a general in row 5; see it rejected; drop in row 2)
- Lesson 2.2: Stacking on your own pieces. (scripted: drop a pawn, then stack
  another piece on top)
- Lesson 2.3: The marshal must go first. (already demonstrated)

**Chapter 3: Movement basics** (10 min)
- Lesson 3.1: The pawn moves forward 1 square. (scripted: move a pawn)
- Lesson 3.2: The general moves forward/backward, captures diagonally.
  (scripted: move a general, then capture an enemy piece)
- Lesson 3.3: The marshal moves like a chess king.
- Lesson 3.4: Generals and majors never capture orthogonally — diagonals only.
  (trap: player tries to capture enemy directly in front; gets rejected;
  shown the legal diagonal capture instead)

**Chapter 4: Special mechanics** (10 min)
- Lesson 4.1: Stack-or-capture choice on occupied squares.
- Lesson 4.2: Tiers. A tier-2 cannon moves like a rook. A tier-3 cannon jumps.
  (scripted: build a stack to promote a cannon to tier 3, then demonstrate the
  jump capture)
- Lesson 4.3: Fortress is uncapturable; your own pieces can stack on it.
- Lesson 4.4: Spy mutual capture — capturing with a spy removes both pieces.

**Chapter 5: Endgame** (5 min)
- Lesson 5.1: Check — when your marshal is attacked.
- Lesson 5.2: Checkmate — no legal move out of check ends the game.
  (scripted: player is in check-mate position with exactly one escape, asked
  to find it; next scenario, actual checkmate, game ends)

**Chapter 6: Advanced** (optional, 10 min)
- Lesson 6.1: Hybrid phase. Place OR move each turn. Non-pawns can drop on own
  advanced pawns (beachhead rule).
- Lesson 6.2: The dead-pawn-as-cannon-platform rule.
- Lesson 6.3: Piece limits (22 on board for normal, 13 for mini).

Total: ~14 lessons, ~35 minutes if completed in one sitting. Each lesson
individually replay-able.

### Tutorial framework design

Minimum viable engine for the tutorial:

```typescript
interface TutorialLesson {
  id: string
  chapter: number
  title: string
  narrative: string          // shown in the sidebar
  initialState: GameState    // board set up before player acts
  goal: LessonGoal           // what counts as "completing" the lesson
  hint: string               // shown on wrong move
}

type LessonGoal =
  | { type: 'read-only' }                                  // advance via Next button
  | { type: 'make-specific-move'; move: Move }             // specific action
  | { type: 'any-legal-move-matching'; filter: (m: Move) => boolean }
  | { type: 'reach-state'; predicate: (s: GameState) => boolean }
```

UI shell: left pane = narrative + hint + Next button, right pane = actual
interactive board (same `<Board>` component we already have).

State management: single `useState<{ lesson: TutorialLesson; gameState: GameState }>`
in a `<TutorialPage>` component. On successful move, transition to next lesson.

### Validation criteria (tutorial)

- [ ] Each lesson's `initialState` is a valid `GameState` (engine would accept
      it as a mid-game position)
- [ ] Each lesson's goal can be satisfied with the actions the lesson
      describes (i.e. the prompt isn't impossible)
- [ ] Each lesson's illegal-action hint fires correctly
- [ ] Progress bar persists across lessons within a session
- [ ] Skip/replay controls for each lesson
- [ ] Accessible from landing page ("New to Gungi? Start here →")
- [ ] Completion confirmation at end of each chapter
- [ ] Works in mini and normal contexts (mini mini-tutorial optional; normal
      is primary)

### Milestones

**M2.1 — Tutorial framework** (3-4 days)
- `TutorialLesson` type + `LessonGoal` validators
- `<TutorialPage>` component (narrative pane + board)
- Lesson runner (advance on goal met, show hint on fail)
- `/tutorial` route
- Ship with 1 stub lesson (placement-only) end-to-end
- ✅ Shippable with one lesson; easy to add more after

**M2.2 — Chapters 1-3 content** (3-5 days)
- Authoring scripts for chapters 1 (3 lessons), 2 (3), 3 (4)
- Review each initial state for realism
- QA flow: go through each lesson, verify engine accepts intended move, rejects
  illegal
- ✅ MVP tutorial: orientation + placement + basic movement

**M2.3 — Chapters 4-5 content** (3-5 days)
- Tier mechanics, fortress, spy, check/checkmate
- These lessons require more careful board setup
- ✅ Tutorial covers all core rules

**M2.4 — Chapter 6 + polish** (2-3 days)
- Hybrid phase advanced rules
- Completion screen with "Play your first real game →" CTA linking to
  Create Room or Local
- Progress saved in localStorage (returning users start where they left off)
- ✅ Full tutorial experience

---

## Overall milestone summary

| | Feature | Estimate | Shippable? |
|---|---|---|---|
| M1.1 | Rules page (static content) | 2-3 days | ✅ alone |
| M1.2 | Live piece diagrams | 1-2 days | ✅ layered onto M1.1 |
| M1.3 | In-game "?" button | 0.5 day | ✅ layered onto M1.1 |
| M2.1 | Tutorial framework + 1 lesson | 3-4 days | ✅ alone |
| M2.2 | Tutorial chapters 1-3 | 3-5 days | ✅ as MVP tutorial |
| M2.3 | Tutorial chapters 4-5 | 3-5 days | ✅ as full core tutorial |
| M2.4 | Tutorial chapter 6 + polish | 2-3 days | ✅ as complete |

**Total**: ~3-4 weeks of focused solo work for both features fully shipped.

Can be shipped in parts: each milestone above is independently valuable.
Natural ship order: M1.1 → M1.3 → M2.1 → M2.2 → M1.2 → M2.3 → M2.4.

---

## Human validation process (your step)

After each milestone, I deliver:
1. The code
2. A short demo script ("hit /rules → click Piece Index → see all 11 pieces
   listed with diagrams")
3. A list of edge cases worth verifying

You then spend ~10-20 min per milestone:
1. Walk through the demo script on live deploy
2. Try to break it (weird inputs, back/forward navigation, mobile viewport)
3. Report anything that felt confusing, broken, or stylistically off
4. Approve or request iteration

For the tutorial specifically, the most important validation is **"would a
non-Gungi-player learn from this?"** — that's best answered by you handing the
tutorial URL to a friend who doesn't know the rules and watching them play.
Call this "alpha test with 1 non-expert user." Report back any confusion.

---

## Open questions / decisions I need from you

1. **UI approach for rules**: dedicated `/rules` page only? Modal only? Both?
   I recommended both. Confirm.
2. **Tutorial scope**: ship chapter 1-3 first (basic tutorial) and iterate, or
   wait for all chapters before releasing? I recommend iterative.
3. **Mini tutorial**: separate tutorial track for mini mode, or include mini
   briefly in chapter 6 of the main tutorial? The custom rules are nearly
   identical; I'd add a short mini section to chapter 6 rather than build a
   parallel track.
4. **Mobile**: target mobile viewports too, or desktop only for now? Tutorial
   and rules both become harder on mobile; I'd say "works but not optimized"
   for now and revisit later.
5. **Progress persistence**: save tutorial progress in localStorage per-browser
   (simple) or in the database against the user account (more robust)? I'd say
   localStorage until you have real users requesting cross-device.

Once these are answered I can start M1.1 (static rules page). That's the
lowest-risk starting point — pure content + layout, no new engine concepts.
