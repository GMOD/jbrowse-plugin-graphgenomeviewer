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
const walkBarStyle = { flex: 1, minWidth: 60, height: 8, borderRadius: 2 }

// One walk's key: its swatch, its name and its length against the reference.
// A lane shading along the walk shows its scale, the walk's first and last
// coordinate either side of the bar; where it sits hovers on the row.
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
  const ends =
    w.encoding.field === 'progress'
      ? w.range
      : w.encoding.field === 'reference'
        ? referenceDomain
        : undefined
  const where = w.range
    ? `${w.range.contig}:${w.range.start.toLocaleString()}-${w.range.end.toLocaleString()}`
    : w.encoding.field === 'reference'
      ? referenceName
      : undefined
  const bar = (
    <div
      style={{
        ...(ends ? walkBarStyle : walkSwatchStyle),
        background: encodingSwatchCss(w.encoding),
      }}
    />
  )
  return (
    <div
      style={walkBlockStyle}
      title={[where, hint].filter(Boolean).join(' · ') || undefined}
    >
      <div style={legendRowStyle}>
        {ends ? null : bar}
        <span>
          <strong>{label}</strong>
          {delta}
          {w.reversedBp > 0 ? `, ${formatBp(w.reversedBp)} reversed` : ''}
        </span>
      </div>
      {ends ? (
        <div style={legendRowStyle}>
          <span>{Math.round(ends.start).toLocaleString()}</span>
          {bar}
          <span>{Math.round(ends.end).toLocaleString()}</span>
        </div>
      ) : null}
    </div>
  )
}
