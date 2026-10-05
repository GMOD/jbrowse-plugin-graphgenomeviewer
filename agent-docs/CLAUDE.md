# Agent documentation

Top level is exactly `TODO.md` and this file. Everything else is filed:

- `reference/` — settled: how a subsystem works, the decisions behind a route,
  and measurements with their numbers.
- `ideas/` — a proposal parked, one per file, in the subfolder naming what it
  waits on: `ready/` (only the work), `waiting-on-a-call/` (a decision),
  `waiting-on-a-number/` (a measurement that decides whether to build),
  `waiting-on-someone-else/` (upstream or data), `collections/` (several small
  items in one file). Each file carries `name:` and `description:` frontmatter,
  the description written as the hook someone picks the idea up by. A verdict
  leaves `ideas/`: an ADR if the decision deserves a record, otherwise deleted.
  Moving a file between folders is how its status changes.
- `architecture-decision-records/` — _why_, one per file, `adr-NNN-slug.md` with
  `status:` and `summary:` frontmatter. Read the relevant one before
  "simplifying" a design that looks accidental.
- `todo/` — committed work, one file per item with `metadata.category`, `area`,
  `first_move` and `order`; `TODO.md` indexes them. `todo/` vs `ideas/` is
  commitment, not size.
- Tried and declined → a sentence at the code that would re-try it, with the
  number. There is no rejected-ideas shelf.
- What a session did and which commits → git already holds it.

Cite a doc by its path, so a move is a grep. "State as of \<date\>" in a doc
means split it into the homes above.
