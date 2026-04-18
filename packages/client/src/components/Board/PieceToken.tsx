import React from 'react'
import type { PieceType, Player } from '@gungi/engine'

// ─── Maps ─────────────────────────────────────────────────────────────────────

const KANJI: Record<PieceType, string> = {
  marshal:    '帅',
  pawn:       '兵',
  general:    '大',
  major:      '中',
  musketeer:  '筒',
  knight:     '马',
  samurai:    '士',
  cannon:     '炮',
  spy:        '忍',
  fortress:   '岩',
  archer:     '弓',
}

const ENGLISH: Record<PieceType, string> = {
  marshal:    'Marshal',
  pawn:       'Pawn',
  general:    'General',
  major:      'Major',
  musketeer:  'Musketeer',
  knight:     'Knight',
  samurai:    'Samurai',
  cannon:     'Cannon',
  spy:        'Spy',
  fortress:   'Fortress',
  archer:     'Archer',
}

// ─── Annular sector path (filled thick arc wedge) ─────────────────────────────
// Draws a filled crescent shape between innerR and outerR, from startDeg to endDeg.
// 0° = top (12 o'clock), clockwise.

function annularSector(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const sR = toRad(startDeg)
  const eR = toRad(endDeg)
  const largeArc = (endDeg - startDeg) > 180 ? 1 : 0

  const ox1 = cx + outerR * Math.cos(sR)
  const oy1 = cy + outerR * Math.sin(sR)
  const ox2 = cx + outerR * Math.cos(eR)
  const oy2 = cy + outerR * Math.sin(eR)
  const ix1 = cx + innerR * Math.cos(sR)
  const iy1 = cy + innerR * Math.sin(sR)
  const ix2 = cx + innerR * Math.cos(eR)
  const iy2 = cy + innerR * Math.sin(eR)

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PieceTokenProps {
  type: PieceType
  owner: Player
  height: number
  size?: number
  selected?: boolean
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
  // Use a fixed 100×100 viewBox for clean math, scale via size prop
  const VB = 100
  const cx = 50
  const cy = 50

  const isBlack = owner === 'black'
  // Filled arc color: deep red for black, dark charcoal for white
  const filledColor  = isBlack ? '#8B1A1A' : '#1C1C1C'
  const emptyColor   = '#3A3530'
  const tokenBg      = '#F0EAD6'
  const borderOuter  = isBlack ? '#5C1010' : '#111111'
  const borderInner  = isBlack ? '#C0392B' : '#333333'
  const kanjiColor   = isBlack ? '#8B1A1A' : '#1A1A1A'

  // Token circle radii — two borders
  const tokenOuter   = 26
  const tokenInner   = 22   // gap creates the double-border look

  // Arc wedge radii — sit outside the token with a gap
  const arcGap       = 4
  const arcInner     = tokenOuter + arcGap   // 30
  const arcOuter     = arcInner + 14          // 44 — thick chunky arcs

  // 3 segments, 120° each, with 10° gap on each side → 100° fill per segment
  const GAP_DEG = 10
  const SEG_DEG = 120
  const FILL_DEG = SEG_DEG - GAP_DEG * 2  // 100°
  const starts = [0, 120, 240]

  const fontSize = reserve ? VB * 0.28 : VB * 0.30

  return (
    <div
      className="relative group inline-block"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        style={{ display: 'block' }}
        aria-label={`${owner} ${ENGLISH[type]}`}
      >
        <defs>
          {selected && (
            <filter id={`glow-${type}-${owner}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Arc wedge segments (tier indicators) — drawn first, behind token */}
        {/* Tier 1: top only (index 0). Tier 2: bottom two (indices 1+2). Tier 3: all. */}
        {starts.map((startDeg, i) => {
          const filled = height === 1 ? i === 0 : height === 2 ? i > 0 : true
          return (
            <path
              key={i}
              d={annularSector(cx, cy, arcInner, arcOuter, startDeg + GAP_DEG, startDeg + GAP_DEG + FILL_DEG)}
              fill={filled ? filledColor : emptyColor}
              opacity={filled ? 1 : 0.35}
            />
          )
        })}

        {/* Outer border circle */}
        <circle
          cx={cx} cy={cy} r={tokenOuter}
          fill={borderOuter}
          filter={selected ? `url(#glow-${type}-${owner})` : undefined}
        />

        {/* Inner border ring */}
        <circle cx={cx} cy={cy} r={tokenInner} fill={borderInner} />

        {/* Token face */}
        <circle cx={cx} cy={cy} r={tokenInner - 2} fill={tokenBg} />

        {/* Selected highlight ring */}
        {selected && (
          <circle
            cx={cx} cy={cy} r={tokenOuter + 2}
            fill="none"
            stroke="#F0C040"
            strokeWidth={2.5}
            opacity={0.85}
          />
        )}

        {/* Kanji */}
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

      {/* English name tooltip on hover */}
      {!reserve && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
            opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50
            whitespace-nowrap px-2 py-0.5 rounded text-xs font-semibold
            bg-stone-900/90 text-amber-200 border border-amber-700/40 shadow-lg"
        >
          {ENGLISH[type]}
          {height > 1 && (
            <span className="ml-1 text-amber-400/60 font-normal">
              (tier {height})
            </span>
          )}
        </div>
      )}
    </div>
  )
}
