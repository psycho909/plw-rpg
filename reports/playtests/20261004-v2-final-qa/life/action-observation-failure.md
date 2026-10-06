# Harvest checkpoint reporter error (preserved)

- Source commit: `c02b600c6f5f1533374d671b707d333c86d852d7`
- A real UI harvest click completed, then the Python-side observation projection raised `AttributeError: 'list' object has no attribute 'length'` because it used JavaScript `.length` in Python (`s['crops'].length`).
- Product action completed and auto-saved; no state mutation originated from the reporter. Follow-up uses `len(s['crops'])`.
- Classified as QA harness/reporting defect, not a product bug; preserved for transparency.
