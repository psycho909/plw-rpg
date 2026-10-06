# UI interaction attempt failure (preserved)

- Source commit: `c02b600c6f5f1533374d671b707d333c86d852d7`
- During navigation toward the forest, a batch of arrow-button clicks timed out after 30 seconds. Original Playwright evidence: `Locator.click: Timeout 30000ms exceeded`; button `往右` remained visible/enabled, but the open native `<dialog>` intercepted pointer events.
- The world was in the app menu (clock continued, x5); this was an exploratory harness interaction mistake, not a game defect. No movement happened during the timeout.
- Recovery: explicitly use the in-dialog close control before map movement.
