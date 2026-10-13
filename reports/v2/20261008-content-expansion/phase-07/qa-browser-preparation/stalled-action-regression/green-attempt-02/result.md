# Stalled action edge contracts

The chooser now attempts an exact safe dialog close before reporting that every recognized dialog control is stalled. Ambiguous `關閉訊息` remains unsafe and is never clicked.

The action-state key ignores only persisted `worldTime`, `lastSavedAt`, `playJournal`, and a displayed `HH:MM` clock token. Thus time-only background movement does not clear a stalled-control exclusion or count as progress for a non-advance action. The `advance` category still counts a persisted world-time increase as progress.

Validation used only mocked/unit contracts, Python bytecode compilation, and `git diff --check`; no app or browser was started.
