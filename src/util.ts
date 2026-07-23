import type { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'

// JBrowse assembly name -> its PanSN sample prefix (identity when unmapped).
// `?? {}` so an adapter whose schema lacks the slot identity-maps rather than
// throwing a TypeError deep inside a query.
function assemblyNameToPanSN(adapter: BaseFeatureDataAdapter) {
  return (adapter.getConf('assemblyNameToPanSN') ?? {}) as Record<string, string>
}

// Resolve one assembly name to its PanSN sample prefix; undefined passes through
// so callers can express "no anchor/target supplied".
export function resolvePanSNPrefix(
  adapter: BaseFeatureDataAdapter,
  name: string | undefined,
) {
  return name === undefined
    ? undefined
    : (assemblyNameToPanSN(adapter)[name] ?? name)
}
