import type { ColorScheme } from '../types'

export const COLOR_SCHEME_OPTIONS: { value: ColorScheme; label: string }[] = [
  { value: 'uniform', label: 'Uniform' },
  { value: 'random', label: 'Random' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'depth', label: 'Depth' },
  { value: 'node-length', label: 'Node Length' },
  { value: 'stable-rank', label: 'Stable rank (rGFA)' },
  { value: 'grey', label: 'Grey' },
]
