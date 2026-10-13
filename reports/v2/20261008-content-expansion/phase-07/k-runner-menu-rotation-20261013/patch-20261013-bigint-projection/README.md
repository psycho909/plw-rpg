# Bounded IndexedDB projection: BigInt edge case

Root review found that the bounded record projector called `BigInt.prototype.toString()` before clipping the result. A very large BigInt could therefore still allocate an unbounded decimal string even though node and text budgets were enforced.

The RED contract in `red/` instruments `BigInt.prototype.toString()` and projects a 1,000,001-bit value. Before the fix, the method was called once and the assertion failed (`1 != 0`). The runner now marks BigInt as `[BigInt omitted]`, sets the sample's truncation flag, and never converts the value to decimal text. The store estimate is consequently suppressed when this record was sampled.

The updated 32-contract suite, Python compilation, inert launcher, runner help, release-manifest parse, scoped diff check, and Node syntax check of the generated IndexedDB cursor expression passed. Outputs and hashes are in `green/`. No Browser, app server, build, or product source changed or ran for this edge-case patch.
