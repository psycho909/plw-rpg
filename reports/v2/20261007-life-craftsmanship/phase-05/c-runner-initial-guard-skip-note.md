# Focused QA capture clarification

`c-runner-lifecycle-guard-red.txt` is an initial **skipped** run, not a RED or GREEN result. Its test decorator looked for `dist/index.html` under the QA directory and skipped the Chromium check. The gate was corrected to use the repository root; `c-runner-lifecycle-guard-red02.txt` is the actual RED run, which failed because the old harness did not capture the pre-app storage state. The final GREEN result is recorded in `c-runner-lifecycle-guard-green.txt` and `c-runner-lifecycle-guard-navigation-qa.md`.

- Skipped capture SHA-256: `caba1c21c692fa0799d3bbd6308216d0ae25ab74b9ab45398bb6e6d7e1c80bc8`
- Executed RED capture SHA-256: `cb6a7e4d1c4a5af860510d613cce48ed21820f740a8e041f91cc0b871632ed2c`
