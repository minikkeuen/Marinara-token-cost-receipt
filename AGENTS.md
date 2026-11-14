# Coding Agent Guidelines

## Scope

- This repository is a Marinara personal extension for per-message token usage and estimated text API cost. Review README, README-KO.md, PRICING-SOURCES.md, manifest.json and affected source files before changes.
- Respect script load order and keep configuration and existing usage calculations compatible. Do not change unrelated Engine integration or receipt presentation.
- Price tables, provider rates, cache-read adjustments and billing assumptions are time-sensitive. Verify source and effective dates before changing them; distinguish estimates from actual provider invoices.
- Keep existing presets and local user settings intact. Never silently replace saved prices or infer missing provider prices without stating assumptions.
- Keep docs and calculation behavior consistent; record the source of changed rates or billing rules.

## Work and verification

- Prefer small root-cause fixes and targeted code-based regression proofs. Do not repeat expensive or unrelated checks.
- Do not start a server/browser, use real paid providers, or interact with personal accounts without explicit authorization.
- Never commit tokens, API keys, private usage records or generated personal receipts.
- Separate static inspection, mocked/unit tests, live Engine checks and real billing verification in reports.
- Documentation-only PRs do not require runtime code or version changes. Do not merge, publish or release without user approval.
