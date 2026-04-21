import React from 'react'
import type { PieceType } from '@gungi/engine'
import { PieceToken } from '../Board/PieceToken'
import { getPieceReach, type PieceReach } from './pieceDiagramFixtures'

const BOARD = 9
const CENTER = { row: 4, col: 4 }
const PAD = 6
const CELL = 24
const VB = BOARD * CELL + PAD * 2

// Row 0 is Black's back rank (the engine's "south" edge). For diagrams we want
// the subject's forward direction to visually point UP, so we flip rows on
// render: higher row numbers appear closer to the top of the SVG.
const visualY = (row: number) => PAD + (BOARD - 1 - row) * CELL
const visualX = (col: number) => PAD + col * CELL

interface PieceDiagramProps {
  pieceType: PieceType
  tier?: 1 | 2 | 3
  label?: string
  size?: number
}

/**
 * 9x9 mini-board with the subject piece at center and reachability markers on
 * every cell the engine says is reachable.
 *
 *   • green dot  = cell reachable to an empty square (move) OR stack on friendly
 *   • red ring   = cell reachable as an enemy capture
 *   • both       = render both (dot inside ring)
 */
export const PieceDiagram: React.FC<PieceDiagramProps> = ({
  pieceType,
  tier = 1,
  label,
  size = 220,
}) => {
  const reach = getPieceReach(pieceType, tier)
  const defaultLabel = hasTierVariation(pieceType) ? `Tier ${tier}` : label

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        style={{ display: 'block', borderRadius: 4, background: '#2A1810' }}
        aria-label={`${pieceType} tier ${tier} reach diagram`}
      >
        <BoardCells />
        {renderReachMarkers(reach)}
        <SubjectToken pieceType={pieceType} tier={tier} />
      </svg>

      {defaultLabel && (
        <div className="text-xs text-amber-300/70 tracking-wider uppercase">
          {defaultLabel}
        </div>
      )}
    </div>
  )
}

/**
 * Concrete T3 Cannon jump example: one platform enemy + one target enemy in a
 * straight line north of the cannon. Arrow shows the jump trajectory; target
 * gets a red capture ring; platform gets an orange "platform" label.
 */
export const CannonJumpDiagram: React.FC<{ size?: number }> = ({ size = 220 }) => {
  // Pick a scenario: cannon at (4,4), platform at (5,4), target at (7,4).
  // After the forward=up flip, both appear north of the cannon.
  const platform = { row: 5, col: 4 }
  const target = { row: 7, col: 4 }

  const cx0 = visualX(CENTER.col) + CELL / 2
  const cy0 = visualY(CENTER.row) + CELL / 2
  const tx = visualX(target.col) + CELL / 2
  const ty = visualY(target.row) + CELL / 2
  const px = visualX(platform.col) + CELL / 2
  const py = visualY(platform.row) + CELL / 2

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        style={{ display: 'block', borderRadius: 4, background: '#2A1810' }}
        aria-label="Cannon tier 3 jump capture example"
      >
        <BoardCells />

        {/* Dashed trajectory from cannon through platform to target */}
        <line
          x1={cx0}
          y1={cy0}
          x2={tx}
          y2={ty}
          stroke="#C64040"
          strokeWidth={1.75}
          strokeDasharray="3,2"
          opacity={0.8}
        />

        {/* Platform halo */}
        <circle
          cx={px}
          cy={py}
          r={11}
          fill="none"
          stroke="#E0BA72"
          strokeWidth={2}
          strokeDasharray="2,2"
        />

        {/* Target capture ring */}
        <circle cx={tx} cy={ty} r={11} fill="none" stroke="#C64040" strokeWidth={2.5} />

        {/* Enemy platform piece (white pawn) */}
        <EnemyPawnAt row={platform.row} col={platform.col} />

        {/* Enemy target piece (white pawn) */}
        <EnemyPawnAt row={target.row} col={target.col} />

        {/* Subject — tier-3 cannon */}
        <SubjectToken pieceType="cannon" tier={3} />
      </svg>
      <div className="text-xs text-amber-300/70 tracking-wider uppercase">
        Tier 3 · Jump capture
      </div>
      <div className="text-[11px] text-amber-200/60 max-w-[220px] text-center leading-snug">
        Cannon captures by jumping the <span style={{ color: '#E0BA72' }}>platform</span>{' '}
        (orange) to hit the <span style={{ color: '#E08080' }}>target</span> beyond.
      </div>
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

const BoardCells: React.FC = () => (
  <>
    {Array.from({ length: BOARD }).flatMap((_, r) =>
      Array.from({ length: BOARD }).map((_, c) => {
        const x = visualX(c)
        const y = visualY(r)
        const isCenter = r === CENTER.row && c === CENTER.col
        return (
          <rect
            key={`cell-${r}-${c}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            fill={isCenter ? '#3A2418' : ((r + c) % 2 === 0 ? '#2E1C12' : '#2A180E')}
            stroke="#1F0F06"
            strokeWidth={0.5}
          />
        )
      }),
    )}
  </>
)

const SubjectToken: React.FC<{ pieceType: PieceType; tier: 1 | 2 | 3 }> = ({
  pieceType,
  tier,
}) => {
  const cx = visualX(CENTER.col) + CELL / 2
  const cy = visualY(CENTER.row) + CELL / 2
  const tokenSize = CELL * 0.95
  return (
    <foreignObject
      x={cx - tokenSize / 2}
      y={cy - tokenSize / 2}
      width={tokenSize}
      height={tokenSize}
    >
      <div style={{ pointerEvents: 'none' }}>
        <PieceToken type={pieceType} owner="black" height={tier} size={tokenSize} />
      </div>
    </foreignObject>
  )
}

const EnemyPawnAt: React.FC<{ row: number; col: number }> = ({ row, col }) => {
  const cx = visualX(col) + CELL / 2
  const cy = visualY(row) + CELL / 2
  const tokenSize = CELL * 0.95
  return (
    <foreignObject
      x={cx - tokenSize / 2}
      y={cy - tokenSize / 2}
      width={tokenSize}
      height={tokenSize}
    >
      <div style={{ pointerEvents: 'none' }}>
        <PieceToken type="pawn" owner="white" height={1} size={tokenSize} />
      </div>
    </foreignObject>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderReachMarkers(reach: PieceReach) {
  const marks: React.ReactElement[] = []
  for (let r = 0; r < BOARD; r++) {
    for (let c = 0; c < BOARD; c++) {
      if (r === CENTER.row && c === CENTER.col) continue
      const key = `${r},${c}`
      const canMove = reach.moves.has(key) || reach.stacks.has(key)
      const canCapture = reach.captures.has(key)
      if (!canMove && !canCapture) continue

      const cx = visualX(c) + CELL / 2
      const cy = visualY(r) + CELL / 2

      if (canCapture) {
        marks.push(
          <circle
            key={`cap-${r}-${c}`}
            cx={cx}
            cy={cy}
            r={9}
            fill="none"
            stroke="#C64040"
            strokeWidth={2.5}
          />,
        )
      }
      if (canMove) {
        marks.push(
          <circle
            key={`mv-${r}-${c}`}
            cx={cx}
            cy={cy}
            r={3.5}
            fill="#6BAE8A"
            opacity={0.95}
          />,
        )
      }
    }
  }
  return marks
}

function hasTierVariation(pieceType: PieceType): boolean {
  return pieceType === 'knight' || pieceType === 'cannon' || pieceType === 'spy' || pieceType === 'archer'
}

/**
 * Renders 1 or 3 tier diagrams side-by-side (+ jump example for Cannon).
 */
export const PieceDiagramSet: React.FC<{ pieceType: PieceType; size?: number }> = ({
  pieceType,
  size = 300,
}) => {
  const tiers: (1 | 2 | 3)[] = hasTierVariation(pieceType) ? [1, 2, 3] : [1]

  return (
    <div className="flex flex-wrap gap-3 my-3">
      {tiers.map((t) => (
        <PieceDiagram key={t} pieceType={pieceType} tier={t} size={size} />
      ))}
      {pieceType === 'cannon' && <CannonJumpDiagram size={size} />}
    </div>
  )
}
