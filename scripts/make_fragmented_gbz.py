"""The GFA behind src/GbzBaseSyntenyAdapter/test_data/fragmented.*: GRCh38 chr1
in two fragments, [0, 4L) and [6L, 10L), and haplotypes that bridge the gap,
break at it, walk it backwards, visit it twice, and meet at one coordinate as
two paths with no edge between them. L is each node's length.

    python3 scripts/make_fragmented_gbz.py 1000 fragmented.gfa
    vg gbwt -G fragmented.gfa --gbz-format -g fragmented.gbz
    gbz-base construct fragmented.gbz
    gbz-haplotype-index fragmented.gbz fragmented.gbz.db fragmented.haplotype-index.db
"""
import random
import sys

L = int(sys.argv[1])
out = sys.argv[2]
random.seed(1)
nodes = [str(i) for i in range(1, 13)]
seq = {n: ''.join(random.choice('ACGT') for _ in range(L)) for n in nodes}


def walk(ns):
    return ''.join(('<' + n[1:]) if n.startswith('-') else '>' + n for n in ns)


def length(ns):
    return L * len(ns)


f1 = ['1', '2', '4', '5']
gap = ['6', '7']
f2 = ['8', '9', '11', '12']
W = [
    ('GRCh38', '0', 'chr1', 0, f1),
    ('GRCh38', '0', 'chr1', length(f1 + gap), f2),
    ('HG002', '1', 'chr1', 0, ['1', '3', '4', '5', '6', '7', '8', '10', '11', '12']),
    ('HG002', '2', 'chr1', 0, f1),
    ('HG002', '2', 'chr1', length(f1 + gap), ['8', '10', '11', '12']),
    ('HG003', '1', 'chr1', 0, ['1', '2', '4', '5', '6', '7', '8', '9', '11', '12']),
    ('HG005', '1', 'chr1', 0, ['-12', '-11', '-9', '-8', '-7', '-6', '-5', '-4', '-2', '-1']),
    ('HG006', '1', 'chr1', 0, ['1', '2', '4', '5', '6', '7', '6', '7', '8', '9', '11', '12']),
    ('HG004', '1', 'chr1', 0, f1),
    ('HG004', '1', 'chr1', length(f1), f2),
]
edges = set()
for w in W:
    ns = w[4]
    for a, b in zip(ns, ns[1:]):
        if a.startswith('-'):
            a, b = b[1:], a[1:]
        edges.add((a, b))
with open(out, 'w') as o:
    o.write('H\tVN:Z:1.1\tRS:Z:GRCh38\n')
    for n in nodes:
        o.write(f'S\t{n}\t{seq[n]}\n')
    for a, b in sorted(edges):
        o.write(f'L\t{a}\t+\t{b}\t+\t0M\n')
    for s, h, c, st, ns in W:
        o.write(f'W\t{s}\t{h}\t{c}\t{st}\t{st + length(ns)}\t{walk(ns)}\n')
