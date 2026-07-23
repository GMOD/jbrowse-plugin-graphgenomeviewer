// Minimal ABGR-packed-color helpers, vendored from @jbrowse/core/util/colorBits
// (published @jbrowse/core does not yet export that subpath). Only the pure
// bit-packing/formatting functions the renderer uses are copied here; the CSS
// color-parsing parts, which pull in the color-bits library, are omitted.

// Pack 0..255 RGBA channel bytes into an ABGR u32 (R at byte 0, A at byte 3).
// >>> 0 keeps the result an unsigned 32-bit — bit 31 (alpha's top bit) would
// otherwise make opaque colors negative in JS.
export function packAbgr(r: number, g: number, b: number, a: number) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
}

// Channel accessors for the ABGR packed layout (R at byte 0, A at byte 3).
export function abgrRed(c: number) {
  return c & 0xff
}
export function abgrGreen(c: number) {
  return (c >>> 8) & 0xff
}
export function abgrBlue(c: number) {
  return (c >>> 16) & 0xff
}
export function abgrAlpha(c: number) {
  return (c >>> 24) & 0xff
}

// Format an ABGR-packed u32 as a CSS rgba() string.
export function abgrToCssRgba(c: number) {
  return `rgba(${abgrRed(c)},${abgrGreen(c)},${abgrBlue(c)},${abgrAlpha(c) / 255})`
}

// Format a 0..1 normalized RGB triple + alpha as a CSS `rgba(r,g,b,a)` string.
export function normalizedRgbToCssRgba(
  c: readonly [number, number, number],
  alpha: number,
) {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${alpha})`
}
