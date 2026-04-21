import React from 'react'
import type { PieceType } from '@gungi/engine'
import { PieceToken } from '../Board/PieceToken'
import { getPieceReach, type PieceReach } from './pieceDiagramFixtures'

const BOARD = 9
const CENTER = { row: 4, col: 4 }

interface PieceDiagramProps {
  pieceType: PieceType
  tier?: 1 | 2 | 3
  /** Override label. Defaults to "Tier {n}" for tier-varying pieces, none otherwise. */
  label?: string
  /** Total SVG width in pixels. Height matches. */
  size?: number
}

/**
 * Renders a 9x9 mini-board with the subject piece at center and reachability
 * markers on every cell the engine says is reachable.
 *
 * Markers:
 *   • green dot  = cell reachable to an empty square (move) OR stack on friendly
 *   • red ring   = cell reachable as an enemy capture
 *   • both       = render both (green dot inside red ring)
 *
 * Dedicated "jump capture" overlay for Tier-3 Cannon (platform + target arrows).
 */
export const PieceDiagram: React.FC<PieceDiagramProps> = ({
  pieceType,
  tier = 1,
  label,
  size = 220,
}) => {
  const reach = getPieceReach(pieceType, tier)

  // Viewbox math — one internal unit per cell + padding for axis labels
  const PAD = 6
  const CELL = 24
  const GRID = BOARD * CELL
  const VB = GRID + PAD * 2
  const boardStyle = {
    background: '#2A1810',
  }

  const defaultLabel = hasTierVariation(pieceType)
    ? `Tier ${tier}`
    : label

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        style={{ display: 'block', borderRadius: 4, ...boardStyle }}
        aria-label={`${pieceType} tier ${tier} reach diagram`}
      >
        {/* Grid cells */}
        {Array.from({ length: BOARD }).flatMap((_, r) =>
          Array.from({ length: BOARD }).map((_, c) => {
            const x = PAD + c * CELL
            const y = PAD + r * CELL
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

        {/* Reach markers */}
        {renderReachMarkers(reach, PAD, CELL)}

        {/* Subject token overlay at center (scaled to fit cell with margin) */}
        {(() => {
          const cx = PAD + CENTER.col * CELL + CELL / 2
          const cy = PAD + CENTER.row * CELL + CELL / 2
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
        })()}
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
 * Tier-3 Cannon has an additional pattern: jump over a platform to capture
 * beyond. Shown as a separate small diagram emphasising the platform piece.
 */
export const CannonJumpDiagram: React.FC<{ size?: number }> = ({ size = 220 }) => {
  const reach = getPieceReach('cannon', 3)
  const jumps = reach.jumps ?? []

  // Pick one representative jump per direction for clarity (closest platform,
  // closest target). Collapse to 4 arrows.
  const representative: Array<{ platform: string; target: string }> = []
  const seenDirs = new Set<string>()
  for (const j of jumps) {
    const [pr, pc] = j.platform.split(',').map(Number)
    const [tr, tc] = j.target.split(',').map(Number)
    const dr = Math.sign(tr - CENTER.row)
    const dc = Math.sign(tc - CENTER.col)
    const dirKey = `${dr},${dc}`
    if (seenDirs.has(dirKey)) continue
    // nearest platform + nearest target to center in this direction
    if (Math.abs(pr - CENTER.row) + Math.abs(pc - CENTER.col) !== 1) continue
    if (Math.abs(tr - pr) + Math.abs(tc - pc) !== 1) continue
    representative.push(j)
    seenDirs.add(dirKey)
  }

  const PAD = 6
  const CELL = 24
  const GRID = BOARD * CELL
  const VB = GRID + PAD * 2

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        style={{ display: 'block', borderRadius: 4, background: '#2A1810' }}
        aria-label="Cannon tier 3 jump capture"
      >
        {Array.from({ length: BOARD }).flatMap((_, r) =>
          Array.from({ length: BOARD }).map((_, c) => {
            const x = PAD + c * CELL
            const y = PAD + r * CELL
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

        {/* Arrows: from center → through platform → to target, for each direction */}
        {representative.map((j, i) => {
          const [pr, pc] = j.platform.split(',').map(Number)
          const [tr, tc] = j.target.split(',').map(Number)
          const sx = PAD + CENTER.col * CELL + CELL / 2
          const sy = PAD + CENTER.row * CELL + CELL / 2
          const ex = PAD + tc * CELL + CELL / 2
          const ey = PAD + tr * CELL + CELL / 2
          return (
            <g key={i}>
              <line
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke="#C64040"
                strokeWidth={1.5}
                strokeDasharray="3,2"
                opacity={0.8}
              />
              {/* Platform marker */}
              <circle
                cx={PAD + pc * CELL + CELL / 2}
                cy={PAD + pr * CELL + CELL / 2}
                r={8}
                fill="none"
                stroke="#E0BA72"
                strokeWidth={2}
                strokeDasharray="2,2"
              />
              {/* Target marker (red ring = capture) */}
              <circle cx={ex} cy={ey} r={9} fill="none" stroke="#C64040" strokeWidth={2.5} />
            </g>
          )
        })}

        {/* Subject (tier-3 cannon at center) */}
        {(() => {
          const cx = PAD + CENTER.col * CELL + CELL / 2
          const cy = PAD + CENTER.row * CELL + CELL / 2
          const tokenSize = CELL * 0.95
          return (
            <foreignObject
              x={cx - tokenSize / 2}
              y={cy - tokenSize / 2}
              width={tokenSize}
              height={tokenSize}
            >
              <div style={{ pointerEvents: 'none' }}>
                <PieceToken type="cannon" owner="black" height={3} size={tokenSize} />
              </div>
            </foreignObject>
          )
        })()}
      </svg>
      <div className="text-xs text-amber-300/70 tracking-wider uppercase">
        Tier 3 · Jump capture
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderReachMarkers(reach: PieceReach, PAD: number, CELL: number) {
  const marks: React.ReactElement[] = []
  for (let r = 0; r < BOARD; r++) {
    for (let c = 0; c < BOARD; c++) {
      if (r === CENTER.row && c === CENTER.col) continue
      const key = `${r},${c}`
      const canMove = reach.moves.has(key) || reach.stacks.has(key)
      const canCapture = reach.captures.has(key)
      if (!canMove && !canCapture) continue

      const cx = PAD + c * CELL + CELL / 2
      const cy = PAD + r * CELL + CELL / 2

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
 * Convenience — render all tiers for a piece side-by-side. Returns 1 diagram
 * for non-tier-varying pieces, 3 diagrams for tier-varying ones.
 */
export const PieceDiagramSet: React.FC<{ pieceType: PieceType; size?: number }> = ({
  pieceType,
  size = 200,
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
