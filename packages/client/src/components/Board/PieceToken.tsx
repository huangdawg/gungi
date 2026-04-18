import React from 'react'
import type { PieceType, Player } from '@gungi/engine'

// ─── Kanji map ────────────────────────────────────────────────────────────────

const KANJI: Record<PieceType, string> = {
  marshal: '帅',
  pawn: '兵',
  general: '大',
  major: '中',
  musketeer: '筒',
  knight: '马',
  samurai: '士',
  cannon: '炮',
  spy: '忍',
  fortress: '岩',
  archer: '弓',
}

// ─── SVG arc helpers ──────────────────────────────────────────────────────────

/**
 * Computes SVG arc path for a segment of a circle.
 * cx, cy = center; r = radius; startDeg = start angle (0 = top, clockwise);
 * sweepDeg = arc sweep in degrees.
 */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  sweepDeg: number
): string {
  // Convert to radians. 0° = top (12 o'clock), clockwise.
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180

  const startRad = toRad(startDeg)
  const endRad = toRad(startDeg + sweepDeg)

  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)

  const largeArc = sweepDeg > 180 ? 1 : 0

  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PieceTokenProps {
  type: PieceType
  owner: Player
  /** Tower height (1–3) — determines how many arc segments are filled */
  height: number
  /** Size in pixels */
  size?: number
  /** Whether this piece is selected */
  selected?: boolean
  /** Whether this is showing in a reserve slot (smaller variant) */
  reserve?: boolean
}

export const PieceToken: React.FC<PieceTokenProps> = ({
  type,
  owner,
  height,
  size = 52,
  selected = false,
  reserve = false,
}) => {
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 2
  const strokeWidth = size * 0.1

  // The arc ring radius is at the center of the stroke
  const ringR = outerR - strokeWidth / 2

  const isBlack = owner === 'black'
  const filledColor = isBlack ? '#C0392B' : '#2C2C2C'
  const emptyColor = '#D4C4A8'
  const kanjiColor = isBlack ? '#C0392B' : '#1A1A1A'

  // Each segment is 120° with a 5° gap on each side → 110° fill
  const GAP = 5
  const SEG = 120
  const FILL = SEG - GAP * 2

  // Segments start positions (0° = top/12 o'clock, clockwise):
  // Segment 1: 0° + GAP → 120° - GAP
  // Segment 2: 120° + GAP → 240° - GAP
  // Segment 3: 240° + GAP → 360° - GAP
  const segments = [0, 120, 240]

  const fontSize = reserve ? size * 0.42 : size * 0.44

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={`${owner} ${type}`}
    >
      {/* Token background (cream circle) */}
      <circle
        cx={cx}
        cy={cy}
        r={outerR - strokeWidth}
        fill="#F5F0E8"
        stroke={selected ? '#D4A017' : 'transparent'}
        strokeWidth={selected ? 3 : 0}
        filter={selected ? 'url(#selectedGlow)' : undefined}
      />

      {/* Arc segments (ring) */}
      {segments.map((startDeg, i) => {
        const filled = i < height
        return (
          <path
            key={i}
            d={arcPath(cx, cy, ringR, startDeg + GAP, FILL)}
            fill="none"
            stroke={filled ? filledColor : emptyColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )
      })}

      {/* Selected glow filter */}
      {selected && (
        <defs>
          <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* Kanji character */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontFamily="'Noto Serif SC', serif"
        fontWeight="700"
        fill={kanjiColor}
        style={{ userSelect: 'none' }}
      >
        {KANJI[type]}
      </text>
    </svg>
  )
}
