// One table drives the persisted enum and both colour dropdowns, the same way
// LAYOUT_MODES drives the layout enum and its menu. The values and their labels
// used to live in two lists in two directories, so adding a scheme meant editing
// both and a mismatch showed up as a dropdown entry that selected nothing.
//
// Kept out of the components directory because the model needs it too.
export const COLOR_SCHEMES = [
  { value: 'uniform', label: 'Uniform' },
  { value: 'random', label: 'Random' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'depth', label: 'Depth' },
  { value: 'node-length', label: 'Node Length' },
  { value: 'stable-rank', label: 'Stable rank (rGFA)' },
  { value: 'grey', label: 'Grey' },
] as const

export type ColorScheme = (typeof COLOR_SCHEMES)[number]['value']

export const COLOR_SCHEME_VALUES = COLOR_SCHEMES.map(s => s.value)
