# Action-state fingerprint refinement

The temporary stalled-control key now uses URL, visible headings, open-dialog headings, classified enabled-control labels/categories, and the active player's action-relevant projection (character level/resources/stats/skills/inventory/equipment/position/region/status, combat/party/dungeon, and owned crafting materials/items). Ambient RNG, world time, history, events, NPC state and other world fields do not clear the exclusion.

Progress uses the same narrowed observable key for normal actions. A visible advance is separately accepted when persisted world time increases. Unit contracts show ambient ticks leave the key stable, while player inventory, visible surface, or available controls changing produce a new key.

Limitation: this semantic fingerprint does not inspect pixel-level changes or unlabelled controls. A screen transition with identical accessible headings, classified controls, URL, and player-action state may not clear exclusions; this remains a preparation-only mock/unit result, with no app/browser execution.
