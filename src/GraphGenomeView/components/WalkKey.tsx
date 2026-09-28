import { formatBp } from '@jbrowse/bandage-core/graphLabels'
import { encodingSwatchCss } from '@jbrowse/bandage-core/walkEncoding'

import { legendRowStyle } from './legendStyles'

import type { LiftedWalk } from '@jbrowse/bandage-core/walkHighlight'

export const walkSwatchStyle = {
  width: 18,
  height: 8,
  borderRadius: 2,
  flex: 'none',
}
const walkBlockStyle = { marginBottom: 2 }
const walkBarStyle = { ...walkSwatchStyle, width: 48 }

function rangeText(contig: string | undefined, start: number, end: number) {
  const s = Math.round(start)
  const e = Math.round(end)
  return `${contig ? `${contig}:` : ''}${s.toLocaleString()}-${e.toLocaleString()} (${formatBp(e - s)})`
}

// One walk's key: its swatch, its name and its length against the reference.
// A lane shading along the walk has a short bar of its scale, with the stretch
// it runs over written under it; a flat lane's stretch hovers on the row.
export default function WalkKey({
  walk: w,
  label,
  referenceDomain,
  referenceName,
  hint,
}: {
  walk: LiftedWalk
  label: string
  referenceDomain?: { start: number; end: number }
  referenceName?: string
  hint?: string
}) {
  const delta =
    w.referenceBp === undefined || w.bp === w.referenceBp
      ? ''
      : ` ${w.bp > w.referenceBp ? '+' : '−'}${formatBp(Math.abs(w.bp - w.referenceBp))}`
  const own = w.range
    ? rangeText(w.range.contig, w.range.start, w.range.end)
    : undefined
  const shades = w.encoding.field !== 'walk'
  const scale =
    w.encoding.field === 'progress'
      ? own
      : w.encoding.field === 'reference' && referenceDomain
        ? rangeText(referenceName, referenceDomain.start, referenceDomain.end)
        : undefined
  return (
    <div
      style={walkBlockStyle}
      title={
        [scale === own ? undefined : own, hint].filter(Boolean).join(' · ') ||
        undefined
      }
    >
      <div style={legendRowStyle}>
        <div
          style={{
            ...(shades ? walkBarStyle : walkSwatchStyle),
            background: encodingSwatchCss(w.encoding),
          }}
        />
        <span>
          <strong>{label}</strong>
          {delta}
          {w.reversedBp > 0 ? `, ${formatBp(w.reversedBp)} reversed` : ''}
        </span>
      </div>
      {scale ? <div>{scale}</div> : null}
    </div>
  )
}
