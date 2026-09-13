// Label placement shared by the SVG overlays: a label is a box in screen px,
// and one that would land on a placed box, or off the pane, is dropped. Callers
// order their candidates so the ones that matter place first.

export interface Box {
  x0: number
  x1: number
  y0: number
  y1: number
}

export const LABEL_PX = 11
export const LABEL_CHAR_PX = 6.2
export const LABEL_PAD = 4

export interface LabelCandidate<T> {
  item: T
  x: number
  y: number
  text: string
}

export interface PlacedLabel<T> extends LabelCandidate<T> {
  w: number
}

export function labelWidth(text: string) {
  return text.length * LABEL_CHAR_PX + LABEL_PAD * 2
}

function overlaps(a: Box, b: Box) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
}

export function placeLabels<T>(
  candidates: LabelCandidate<T>[],
  frame: { width: number; height: number },
  reserved: Box[] = [],
): PlacedLabel<T>[] {
  const placed = [...reserved]
  const out: PlacedLabel<T>[] = []
  for (const c of candidates) {
    const w = labelWidth(c.text)
    const box = {
      x0: c.x - w / 2,
      x1: c.x + w / 2,
      y0: c.y - LABEL_PX - LABEL_PAD,
      y1: c.y + LABEL_PAD,
    }
    if (
      box.x1 < 0 ||
      box.x0 > frame.width ||
      box.y1 < 0 ||
      box.y0 > frame.height ||
      placed.some(p => overlaps(p, box))
    ) {
      continue
    }
    placed.push(box)
    out.push({ ...c, w })
  }
  return out
}
