# Baseline harness corrections

Source ac144ef4759d14570bf686e6a0e6b2983075fa9b / unchanged V2 application 441e3c2.

Attempt 1: copied runner default fixture path missing. Fixed with existing supported PLW_NATIVE_V1 pointing to committed native fixture.
Attempt 2: strict post-pause worldTime comparison races legitimate foreground x1 progress after reload; original AssertionError retained in raw log and version archive.
Attempt 3 observes first real native Storage.setItem checkpoint on initialization and requires EXACT saved worldTime equality, before in-session timer ticks. This preserves the no-offline-progress invariant, makes no fixture/state/timer/speed changes and forwards every original setItem synchronously. Original test script preserved in prior repository source and current report versions; fixtures/other assertions unchanged.

Completed historical interactive processes with busy EOF loops were reversibly SIGSTOP-ed; no files/profiles removed.
