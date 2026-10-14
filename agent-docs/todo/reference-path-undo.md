---
name: reference-path-undo
description:
  setReferencePath re-anchors inside the action and only the settings dialog
  lays out again, so undo or a session delta leaves the graph anchored on the
  old path.
metadata:
  category: ready
  area: layout
  first_move:
    "Move re-anchoring into a reaction on referencePath, and drop the dialog's
    recomputeLayout call."
  order: 8
---

# Undoing the reference path does not re-anchor

- `setReferencePath` (`pane/settingActions.ts` 147-155) re-anchors itself; only
  `GraphSettingsDialog.tsx` 167-168 calls `recomputeLayout` after it
- After undo, `activeReferencePath` (read off the graph) and the figure spec
  (read off the property) name different paths
- The gene and repeat tracks moved to reactions the same way
  (`pane/renderingActions.ts`)
