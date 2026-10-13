# Phase 7 Monster Balance Audit

- Source commit: `e05cc78f1ef452e2672df223f2febf48444dcbd3`; recursive source fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`.
- Evidence: `j-formal-20261013/combat-attempt-05/` (SHA manifest included).
- **Controlled fixtures only:** 118,800 public-API encounters; 1,188 matrix cells; 100 samples per cell; 3 seeds. All fixture rows are explicitly marked `CONTROLLED_LEGAL_FIXTURE_NOT_NATURAL_PLAY`.
- Builds: legacy, attack, defense, generated, crafted, masterpiece. The runner formed legal spawn witnesses, applied progression via the public XP path, and started canonical content encounters.

## Aggregate outcome

| Rank | Samples | Wins | Deaths | Win rate | Mean turns |
| --- | ---: | ---: | ---: | ---: | ---: |
| normal | 64,800 | 64,800 | 0 | 100.0% | 2.94 |
| elite | 21,600 | 21,300 | 300 | 98.6% | 5.90 |
| miniBoss | 21,600 | 20,090 | 1,510 | 93.0% | 8.56 |
| boss | 10,800 | 3,697 | 7,103 | 34.2% | 11.51 |

| Boss band | Samples | Wins | Deaths | Win rate |
| --- | ---: | ---: | ---: | ---: |
| early | 3,600 | 400 | 3,200 | 11.1% |
| mid | 3,600 | 737 | 2,863 | 20.5% |
| late | 3,600 | 2,560 | 1,040 | 71.1% |

Normal enemies were defeated in every controlled sample. Elite and mini-boss fixtures were usually winnable across the matrix. Boss fixtures were materially harsher: early and mid aggregate wins were 11.1% and 20.5%; late was 71.1%. Across all bands, the defense fixture led Boss wins at 52.1%, while legacy was 11.1%; each build had 1,800 boss samples. The defensive profile required more turns on average, so this is a survival tradeoff signal, not proof that it is strictly dominant.

## Product/balance findings

- **P2 balance signal, not a confirmed bug:** early/mid Boss win rates are low even under the controlled samples. Confirm through ordinary player acquisition/gear trajectories and decide whether a strong preparation wall is intended. No tuning was applied in QA.
- **P2 signal:** normal encounters are 100% victories at all tested bands and builds. This may be appropriate onboarding content, but the controlled table suggests little combat risk after progression.
- In 100-year unattended simulation, no natural player encounter actions or content Boss defeats occurred; those worlds do not validate intended player progression into these fights.

These rates cannot be interpreted as population-level player win probability: fixtures select an eligible context, use six prescribed builds and seeded samples, and do not include human tactics, route choice, natural gear acquisition, or abandonment. The full matrix and witnesses are in the evidence directory; no automatic balance change is recommended from this isolated signal.
