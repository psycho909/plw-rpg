# Life route save / reload evidence

- Browser: Chromium 151.0.7922.173 + Playwright 1.62.0, production `http://127.0.0.1:5195/`, isolated profile `/tmp/oakvale-life-profile-909`.
- Source: `c02b600c6f5f1533374d671b707d333c86d852d7`; loaded asset fingerprint recorded in `build-fingerprint.md`.
- Used the visible `存檔` control while world speed was paused. Then performed a normal page reload in the same browser profile and read the loaded state before resuming.

| Field | Immediately before reload save | Immediately after reload |
|---|---:|---:|
| worldTime | 16,738 | 16,738 |
| seed | 909 | 909 |
| identity | resident, farmer | resident, farmer |
| local reputation | 2 | 2 |
| gold | 1 | 1 |
| home properties | 1 | 1 |
| carried items | unchanged | unchanged |
| four growing crops | IDs 39/41/43/45 at normal plantedAt/matureAt | exactly same records |
| pending play journal | 0 | 0 |

There was no reload-time advancement/offline reward: the saved and loaded world time and tested fields matched exactly. After reload, normal browser time was explicitly paused again using the visible `暫停` control. The test did not edit storage or state.
