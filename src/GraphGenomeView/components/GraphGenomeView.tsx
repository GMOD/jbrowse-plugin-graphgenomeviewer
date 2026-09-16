import { observer } from 'mobx-react'

import GraphCanvas from './GraphCanvas'
import GraphLoading from './GraphLoading'
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
  // Hidden rather than unmounted, so a typed URL survives a failed load
  return (
    <>
      {model.isLoading ? <GraphLoading model={model} /> : null}
      <div hidden={model.isLoading}>
        <ImportForm model={model} />
      </div>
    </>
  )
})

export default GraphGenomeView
