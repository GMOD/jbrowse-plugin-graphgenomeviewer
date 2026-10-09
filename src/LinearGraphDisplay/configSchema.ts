import { LAYOUT_MODE_VALUES } from '@jbrowse/bandage-core/layoutModes'
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import { trackHeightConfigSchemaFields } from '@jbrowse/display-kit/trackHeightConfigSchemaFields'
import { types } from '@jbrowse/mobx-state-tree'

import { HOVER_HIGHLIGHT_VALUES } from '../GraphGenomeView/hoverHighlight'
import { liftColor } from '../GraphGenomeView/nodeColor'
import { isRecord } from '../isRecord'

import type { Instance } from '@jbrowse/mobx-state-tree'

// 6.x kept the layout, color and hover on the display instance, and 4.0
// nested that under `pane`; these are the config slots they become
export function liftGrammar({
  layoutMode,
  colorScheme,
  colorDomain,
  hover,
}: Record<string, unknown>) {
  return {
    ...(layoutMode === undefined ? {} : { layoutMode }),
    ...(colorScheme === undefined && colorDomain === undefined
      ? {}
      : { color: liftColor(colorScheme, colorDomain) }),
    ...(hover === undefined ? {} : { hover }),
  }
}

/**
 * #config LinearGraphDisplay
 * The graph drawn as a track of the linear genome view. A layout whose x is
 * reference bp draws under the view's coordinates and re-cuts as the view
 * moves; force, ordered and walk rows draw in their own coordinates, fitted to
 * the track.
 */
export function configSchemaFactory() {
  return ConfigurationSchema(
    'LinearGraphDisplay',
    {
      /**
       * #slot
       * the layout the track opens in
       */
      layoutMode: {
        type: 'stringEnum',
        model: types.enumeration('LayoutMode', LAYOUT_MODE_VALUES),
        defaultValue: 'auto',
      },
      /**
       * #slot
       * the node color: `grey` or `uniform`, or the field nodes are colored
       * by, `depth`, `length`, `rank`, `position` or `id` (`scale:
       * 'categorical'` or `scheme: 'rainbow'`). `domainMin`/`domainMax` span
       * the position ramp. `{}` colors an anchored graph by position.
       * ```js
       * { color: { field: 'depth' } }
       * ```
       */
      color: {
        type: 'frozen',
        defaultValue: {},
      },
      /**
       * #slot
       * what the pointer lights: `nodes` lightens a hovered node and bands its
       * span on the view; `everything` also lights edges, and the node at the
       * view's pointer bp
       */
      hover: {
        type: 'stringEnum',
        model: types.enumeration('HoverHighlight', HOVER_HIGHLIGHT_VALUES),
        defaultValue: 'nodes',
      },
      ...trackHeightConfigSchemaFields({
        defaultHeight: 300,
        height: 'the height of the track the graph is drawn in',
      }),
    },
    {
      explicitlyTyped: true,
      explicitIdentifier: 'displayId',
      retired: {
        colorScheme: value => ({ color: liftColor(value) }),
        pane: value => (isRecord(value) ? liftGrammar(value) : {}),
      },
    },
  )
}

export type LinearGraphDisplayConfigModel = ReturnType<
  typeof configSchemaFactory
>
export type LinearGraphDisplayConfig = Instance<LinearGraphDisplayConfigModel>
