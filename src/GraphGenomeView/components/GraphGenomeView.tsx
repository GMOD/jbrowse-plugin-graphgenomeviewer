import { observer } from 'mobx-react'

import GraphCanvas from './GraphCanvas'
import ImportForm from './ImportForm'

import type { GraphGenomeViewModel } from '../model'

const GraphGenomeView = observer(function GraphGenomeView({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  if (model.hasGraph) {
    return <GraphCanvas model={model} />
  }
  return <ImportForm model={model} />
})

export default GraphGenomeView
