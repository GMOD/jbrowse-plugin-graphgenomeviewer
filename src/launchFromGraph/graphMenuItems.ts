import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import LineStyleIcon from '@mui/icons-material/LineStyle'

import { locLabel } from './contributors'

import type { Contributor, GraphLocation } from './contributors'
import type { LaunchableSyntenyTrack } from './syntenyTracks'
import type { MenuItem } from '@jbrowse/core/ui'

const LINEAR_LABEL = 'Linear genome view'
const SYNTENY_LABEL = 'Linear synteny view'
const NO_SYNTENY_TRACK =
  'No synteny track in this session aligns these assemblies'

export interface LinearTarget {
  location: GraphLocation
  assembly: string
}

// One flat item when there is one thing to open, a submenu when there is a
// choice. Same shape as subgraphMenuItems uses in the other direction, so the
// two ends of the graph <-> linear trip read the same way.
function oneOrMany<T>({
  label,
  icon,
  entries,
  entryLabel,
  onSelect,
  disabledHelpText,
}: {
  label: string
  icon: React.ElementType
  entries: T[]
  entryLabel: (entry: T) => string
  onSelect: (entry: T) => () => void
  disabledHelpText?: string
}): MenuItem[] {
  const [first] = entries
  // Nothing to open: a *disabled* item with the reason in its tooltip, when
  // there is a reason worth reading. An item that vanishes teaches nobody that
  // the session is one synteny track short of a multi-genome view.
  const empty: MenuItem[] = disabledHelpText
    ? [{ label, icon, disabled: true, disabledHelpText, onClick: () => {} }]
    : []
  return entries.length === 0
    ? empty
    : entries.length === 1 && first
      ? [
          {
            label: `${label} — ${entryLabel(first)}`,
            icon,
            onClick: onSelect(first),
          },
        ]
      : [
          {
            label,
            icon,
            type: 'subMenu',
            subMenu: entries.map(entry => ({
              label: entryLabel(entry),
              onClick: onSelect(entry),
            })),
          },
        ]
}

// The graph's way out: a linear view of any assembly the graph names here, and a
// synteny view of all of them at once. Until this existed the triangle had two
// edges — a linear view could open a graph or a synteny view of a locus, and the
// graph could open nothing at all.
//
// `contributors` are already resolved against the session's assemblies. On an
// E. coli pangenome every strain is its own assembly, so all of them appear and
// the synteny item is the interesting one; on an HPRC graph the 400-odd
// contributing haplotypes are not loaded assemblies and only the reference
// appears, which is the honest answer rather than a missing feature.
export function graphLaunchMenuItems({
  contributors,
  syntenyTracks,
  onShowLinear,
  onShowSynteny,
}: {
  contributors: Contributor[]
  syntenyTracks: LaunchableSyntenyTrack[]
  onShowLinear: (target: LinearTarget) => void
  onShowSynteny: (trackId: string) => void
}): MenuItem[] {
  return [
    ...oneOrMany({
      label: LINEAR_LABEL,
      icon: LineStyleIcon,
      entries: contributors,
      entryLabel: c => `${c.sample} ${locLabel(c)}`,
      onSelect: c => () => {
        onShowLinear({ location: c, assembly: c.sample })
      },
    }),
    ...(contributors.length >= 2
      ? oneOrMany({
          label: `${SYNTENY_LABEL} (${contributors.length} assemblies)`,
          icon: CompareArrowsIcon,
          entries: syntenyTracks,
          entryLabel: track => track.name,
          disabledHelpText: NO_SYNTENY_TRACK,
          onSelect: track => () => {
            onShowSynteny(track.trackId)
          },
        })
      : []),
  ]
}

// A single node's way out, for the node context menu. Two different questions,
// both worth offering:
//
//   - the node's own coordinates, on the assembly that contributed it. Exact,
//     from the node's SN/SO, and available at every rank — but only openable
//     when that assembly is loaded, which for an HPRC haplotype it is not.
//   - where the node sits on the reference the graph was cut against. Always
//     openable, and off the backbone it is the flanking projection rather than
//     an exact span (see nodeReferenceSpan), so it is labelled as the region
//     around the node rather than as the node.
//
// Flat, not under a "Launch view" submenu: this menu is three items long and
// every one is contextual to the node just clicked.
export function nodeLaunchMenuItems({
  own,
  reference,
  onShowLinear,
}: {
  own: LinearTarget | undefined
  reference: LinearTarget | undefined
  onShowLinear: (target: LinearTarget) => void
}): MenuItem[] {
  const entries = [
    own
      ? {
          label: `${LINEAR_LABEL} — ${own.assembly} ${locLabel(own.location)}`,
          target: own,
        }
      : undefined,
    // Only when it says something the item above doesn't. A backbone segment on
    // a loaded reference answers both questions with the same assembly and
    // nearly the same span, and offering that twice reads as two different
    // places to go.
    reference && reference.assembly !== own?.assembly
      ? {
          label: `${LINEAR_LABEL} — around this node on ${reference.assembly}`,
          target: reference,
        }
      : undefined,
  ].filter(entry => entry !== undefined)

  return entries.map(({ label, target }) => ({
    label,
    icon: LineStyleIcon,
    onClick: () => {
      onShowLinear(target)
    },
  }))
}
