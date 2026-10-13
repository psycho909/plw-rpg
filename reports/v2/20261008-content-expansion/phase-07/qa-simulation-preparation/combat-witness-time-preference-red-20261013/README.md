# Red reproduction

The new regression `preserves the default spring 08:00 when slime_slick time predicates already allow it` failed before the candidate-order fix: expected worldTime 480, received 360. `qa_simulation.test.red.ts` is the source snapshot used for this red run; `red-output.txt` and `red-exit-code.txt` preserve the test result.
