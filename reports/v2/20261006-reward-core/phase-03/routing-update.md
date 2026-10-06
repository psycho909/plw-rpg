# Agent routing policy update

This final Owner revision supersedes the original uploaded policy and the intermediate canonical revision. The original 9,088-byte CRLF upload is preserved byte-for-byte in `agent-routing-original.txt` (SHA-256 `4539d575556c7b2a119becf597e4b4140382658af2942e22234c2865cbac6d40`); the intermediate canonical policy is preserved in `agent-routing-intermediate.txt` (SHA-256 `38fd26d7f0846097a3cf1ac3f469936b6c0664b7c23611356e070813046c7f54`). Earlier report publications remain in the JSONL archive.

The effective policy is direct routing to the lowest total-token-cost role that can reliably finish in one effective attempt. Low handles mechanical exploration/data/content/fixtures, bug reproduction, tests/Browser QA/simulation/benchmarks/long runners. Medium is the daily default for general features/bugs, local refactors, test design and general review. Max handles complex/high-risk core state, Save/Migration, RNG/Determinism, Race/Concurrency, complex algorithms, hard bugs and deep independent review. Sol 6.1 Medium owns Spec/product/architecture/Scope/Phase decisions, delegation, integration and final Gate. No fixed Low→Medium→Max→Sol pipeline; do not send obvious Medium/Max work to Low first, default to Max for insurance, duplicate agents on one problem, or repeat work reliably completed by a subagent. Escalate after one reasonable lower-cost attempt proves inadequate, cause cannot be reliably identified, or core/high-risk scope is confirmed. Max tradeoffs and spec/scope conflicts return to Sol. Long runners remain runner-driven without LLM polling. Runtime model/effort telemetry is unavailable.

Synchronized `AGENTS.md`, `README.md`, `docs/SUBAGENTS.md`, and `docs/agents/agent-routing.md`. Tool task name conversion preserves requested model/effort/role; it does not certify runtime identity. No source, QA metrics, runtime configuration, tests, or new delegation were changed.

Changed-document SHA-256 values:

- `AGENTS.md`: `bf4a459e3d20f8086f2ad62f3b2e92bbb5907b81abd876e66b3d5779503bd94a`
- `README.md`: `9922394efee1d4f9219bec2bc8b9396b2962ef960286f9b5c9c00f253970e092`
- `docs/SUBAGENTS.md`: `419352ab83948c76a84fe2e13740a9e7e967eb06d3a02c8729007492bdac5697`
- `docs/agents/agent-routing.md`: `9c97ca110bc8ca31720030913cb00d2041eec363e8ab3f087c373d3b3e925a42`
