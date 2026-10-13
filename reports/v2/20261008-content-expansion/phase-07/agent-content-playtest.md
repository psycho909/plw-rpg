# Phase 7-K Agent Exploratory Playtest — Content-Agent Lane

## Method and result

This was a 3,603.84-second Chromium session against a fresh normal save, run 2026-10-13T17:30:53Z–18:30:58Z. Run ID 20261013T173052Z-pid410744. The runner method is runner_driven_agent_heuristic_semantic_visible_control_v1: it chose visible actions from the UI and recorded observations, with no LLM inference and no human tester. This is an Agent/Playwright heuristic trace, not human play.

The runner completed with launcher status COMPLETE_STRESS_REVIEW_REQUIRED, 58 checkpoints, 840 actions, 11 verified ordinary save/reloads, zero browser errors, and stable source identity. The complete trace is in qa-browser-runs/20261013T173052Z-pid410744/; the closeout is in k-final-runner-content-agent-3600-after-soak-20261013-attempt-02/.

## What the action trace shows

- Action categories: 289 advance, 230 navigation, 117 equipment/use, 114 farming, 42 combat, 14 exploration, 6 observe, 27 close-dialog, and one opening action.
- The visible action policy chose Wait 1 day 289 times. Menu/window cycling and repeated waits dominated the session.
- 247/840 actions (29.4%) had no observable action-state change by the runner's fingerprint. The runner excluded the ineffective gear-tab control after repetition. A no-progress action does not mean the world clock did not move.
- 56 saved JSON paths were added and none removed; the additions were primarily NPC farming-skill experience/level fields. They are simulation growth, not 56 newly unlocked player rewards.
- The 11 normal save/reload cycles preserved the runtime state; there were no storage, page, console, request, HTTP, or unhandled rejection errors.

## Time-ordered evidence

| Approx. elapsed | Observed transition |
| --- | --- |
| 00:00 | Fresh opening; Year 1 Spring 1; 29 living NPCs; hamlet; threat 1; Boss dormant; 2 events and 2 history rows. |
| 00:15 | Population and settlement growth appeared while the runner advanced days and cycled visible windows. |
| 00:30 | Threat reached 3; Boss reached alive/cooldown; event count continued rising. The runner did not follow a deliberate Boss-preparation plan. |
| 00:45 | Settlement reached town; the runner continued a repeated advance/menu/farm/equipment pattern. |
| 01:00 | Final checkpoint at Year 3 Summer 25; 57 living NPCs; town; threat 3; Boss alive/cooldown; 130 events; 47 history rows. |

These are observable state changes, many caused by the autonomous simulation during visible waits. They do not prove a player's goal formation or attachment. The run did not preserve a single intentional strategy or isolate Life, Adventure, and Hybrid mastery routes.

## Exploratory findings

- The world continued changing during foreground play and after ordinary reloads; save state equality and zero Browser errors support stability.
- The heuristic surfaced farm, equipment, combat, region, property, history, and character-facing controls. It repeated Wait 1 day and window cycling far more than goal-directed actions.
- A limited action fingerprint suggests repetition, but cannot establish that a human felt bored, confused, rewarded, or retained.
- The action log is not a cause-to-outcome audit for living-event arcs. Event counts increased, but this lane alone does not identify which world-state consequence changed because of a particular event.

## Gate interpretation

The one-hour automated exploratory duration is complete. The harness itself asks for review because 247 actions had no visible progress. Classify the Agent Exploratory Gate as PASS WITH FINDINGS for execution/stability only; route-specific play goals remain NOT ESTABLISHED. No human Fun Gate answer is inferred.
