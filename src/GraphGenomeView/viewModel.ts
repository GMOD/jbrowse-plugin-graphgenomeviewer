import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes/models'
import { types } from '@jbrowse/mobx-state-tree'

import { GraphPaneMixin } from './model'

import type { Instance } from '@jbrowse/mobx-state-tree'

export default function stateModelFactory() {
  return types
    .compose(
      'GraphGenomeView',
      BaseViewModel,
      GraphPaneMixin(),
      types.model({ type: types.literal('GraphGenomeView') }),
    )
    .views(self => ({
      menuItems() {
        return self.launchMenuItems()
      },
    }))
}

export type GraphGenomeViewModel = Instance<
  ReturnType<typeof stateModelFactory>
>
