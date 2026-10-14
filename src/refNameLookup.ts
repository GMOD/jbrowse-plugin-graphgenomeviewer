import {
  panSNContig,
  panSNHaplotype,
  panSNSample,
} from '@jbrowse/bandage-core/pansn'

// A tab can occur in neither half — both come out of BED columns.
function qualifiedKey(assemblyName: string, refName: string) {
  return `${assemblyName}\t${refName}`
}

// The stable sequences in these files are usually PanSN (`K12#1#chr`) while the
// assembly asking for them uses the bare contig (`chr` in assembly `K12`). One
// map answers both spellings: the raw tabix name, plus a sample+contig key for
// PanSN names.
export function buildRefNameLookup(tabixRefNames: string[]) {
  const lookup = new Map<string, string>()
  for (const name of tabixRefNames) {
    lookup.set(name, name)
    const sample = panSNSample(name)
    if (sample !== name) {
      const contig = panSNContig(name)
      lookup.set(qualifiedKey(sample, contig), name)
      const haplotype = panSNHaplotype(name)
      if (haplotype !== undefined) {
        lookup.set(qualifiedKey(haplotype, contig), name)
      }
    }
  }
  return lookup
}

export function resolveRefName(
  lookup: Map<string, string>,
  assemblyName: string,
  refName: string,
) {
  const qualified = lookup.get(qualifiedKey(assemblyName, refName))
  return qualified === undefined ? lookup.get(refName) : qualified
}
