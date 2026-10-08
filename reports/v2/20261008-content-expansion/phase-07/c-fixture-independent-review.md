# Phase 7-C fixture independent review

The fixture correction review accepted the scoped test changes. The V1 inputs remain historical fixtures, current Save output expectations use version 8, and the crafting projection asserts the four legacy recipes plus the four Slime recipes by stable ID/name/unlocked state. The Slime station denial now checks the exact \`station_unavailable\` reason code and Traditional Chinese message.

The 100-year simulation helper preserves its seed, save/reload, determinism, serialization, and bounded-world assertions. Only that named test has a 15-second local timeout; the 10- and 50-year cases retain the default timeout. Observed timings and the unresolved performance cause are recorded in \`c-fixture-correction.md\`; this review did not rerun tests.

Disposition: ACCEPTED for the scoped test-fixture correction. Full regression passed afterward (30 files, 565 tests, typecheck and build); independent Max review of the C production fix remains pending.
