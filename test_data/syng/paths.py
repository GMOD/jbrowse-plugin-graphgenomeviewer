#!/usr/bin/env python3
"""Path helpers for building the syng C4 demo graph.

  paths.py fasta <in.gfa>    spells each P line as FASTA, reverse-complemented
                             when most of its steps run backwards
  paths.py compose <in.gfa>  rewrites impg's `name:a-b:c-d` path names as
                             `name:(a+c)-(a+d)`
"""

import re
import sys

COMPLEMENT = str.maketrans("ACGTNacgtn", "TGCANtgcan")


def revcomp(seq):
    return seq.translate(COMPLEMENT)[::-1]


def fasta(gfa):
    segments = {}
    paths = []
    for line in open(gfa):
        fields = line.rstrip("\n").split("\t")
        if fields[0] == "S":
            segments[fields[1]] = fields[2]
        elif fields[0] == "P":
            paths.append((fields[1], fields[2].split(",")))
    for name, steps in paths:
        seq = "".join(
            segments[s[:-1]] if s[-1] == "+" else revcomp(segments[s[:-1]])
            for s in steps
        )
        if 2 * sum(s[-1] == "-" for s in steps) > len(steps):
            seq = revcomp(seq)
        print(f">{name}\n{seq}")


def compose(gfa):
    nested = re.compile(r"(.*):(\d+)-(\d+):(\d+)-(\d+)")
    for line in open(gfa):
        fields = line.split("\t")
        if fields[0] == "P":
            m = nested.fullmatch(fields[1])
            if m:
                start = int(m[2])
                fields[1] = f"{m[1]}:{start + int(m[4])}-{start + int(m[5])}"
                line = "\t".join(fields)
        sys.stdout.write(line)


{"fasta": fasta, "compose": compose}[sys.argv[1]](sys.argv[2])
