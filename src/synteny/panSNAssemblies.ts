import type { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'

function assemblyNameToPanSN(adapter: BaseFeatureDataAdapter) {
  return adapter.getConf('assemblyNameToPanSN') as Record<string, string>
}

export function resolvePanSNPrefix(
  adapter: BaseFeatureDataAdapter,
  name: string,
): string
export function resolvePanSNPrefix(
  adapter: BaseFeatureDataAdapter,
  name: string | undefined,
): string | undefined
export function resolvePanSNPrefix(
  adapter: BaseFeatureDataAdapter,
  name: string | undefined,
) {
  return name === undefined
    ? undefined
    : (assemblyNameToPanSN(adapter)[name] ?? name)
}

const asmByPrefixCache = new WeakMap<
  BaseFeatureDataAdapter,
  Record<string, string>
>()

export function assemblyByPanSNPrefix(adapter: BaseFeatureDataAdapter) {
  let out = asmByPrefixCache.get(adapter)
  if (out === undefined) {
    const map = assemblyNameToPanSN(adapter)
    out = {}
    for (const asm of adapter.getConf('assemblyNames') as string[]) {
      out[map[asm] ?? asm] = asm
    }
    asmByPrefixCache.set(adapter, out)
  }
  return out
}
