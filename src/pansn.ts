// PanSN naming convention: `sample#haplotype#contig`. Shared by the all-vs-all
// PAF adapters (in-memory and tabix-indexed), which anchor on the sample prefix
// and strip it to recover each assembly's own refName.
const SEP = '#'

// The PanSN sample name is the token before the first separator, e.g.
// `grape#1#chr1` -> `grape`.
export function panSNSample(refName: string) {
  return refName.split(SEP)[0]!
}

// The haplotype a three-part PanSN name belongs to, `sample#hap`, which is the
// assembly that contributed it where one sample is two haplotypes (HPRC release
// 2.1 names every node `NA20809#2#CM094351.1`); undefined for a name that
// states no haplotype.
export function panSNHaplotype(refName: string) {
  const parts = refName.split(SEP)
  return parts.length >= 3 ? `${parts[0]}${SEP}${parts[1]}` : undefined
}

// Strip the PanSN prefix to recover the assembly's own refName: `sample#hap#chr1`
// -> `chr1`, `sample#chr1` -> `chr1`. A contig that itself contains the
// separator is assumed not to occur (PanSN uses `#` only as the delimiter).
export function panSNContig(refName: string) {
  const parts = refName.split(SEP)
  return parts.length >= 3
    ? parts.slice(2).join(SEP)
    : parts.length === 2
      ? parts[1]!
      : refName
}

// Whether a PanSN name belongs to a prefix at either depth: `grape#1#chr1`
// matches `grape` and `grape#1`, not `grape#2` or `grapefruit`. An undefined
// prefix is "no assembly supplied", which nothing belongs to.
export function panSNMatchesPrefix(
  refName: string,
  prefix: string | undefined,
) {
  return (
    prefix !== undefined &&
    (refName === prefix || refName.startsWith(prefix + SEP))
  )
}
