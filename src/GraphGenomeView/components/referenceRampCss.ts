import { REFERENCE_RAMP_MAX_HUE } from '@jbrowse/bandage-core/renderer/GeometryBuilder'

// The reference-position ramp in CSS, from the same three numbers
// `getNodeColor` paints with (hue 0 to REFERENCE_RAMP_MAX_HUE at 70%/50%), so
// a key or an overlay cannot come to describe a ramp the canvas stopped using.

export function rampHueCss(hue: number) {
  return `hsl(${hue}, 70%, 50%)`
}

export function rampHue(bp: number, domain: { start: number; end: number }) {
  const frac = (bp - domain.start) / (domain.end - domain.start)
  return Math.max(0, Math.min(1, frac)) * REFERENCE_RAMP_MAX_HUE
}

export const RAMP_GRADIENT_CSS = `linear-gradient(to right, ${Array.from(
  { length: 7 },
  (_, i) => `${rampHueCss((i / 6) * REFERENCE_RAMP_MAX_HUE)} ${(i / 6) * 100}%`,
).join(', ')})`
