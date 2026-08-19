# TicketSpin

**Live app:** https://make-me-a-tic-gvfera.benmore.ai

TicketSpin finds hard-to-get event tickets. Type an artist, team, or show and it "spins" — firing a batch of differently-angled searches at once (nearby cities, shifted date windows, alternate sorts and categories) instead of the single query everyone else runs. Alongside one-off spins, users build **watchlists** that scan around the clock and email them the moment matching tickets appear under their price ceiling.

## What it does

- **Spin search** — a slot-machine-style multi-strategy search. Each spin expands one query into up to 25–150 concurrent search variations (tier-dependent) across Ticketmaster, with SeatGeek and StubHub as resale sources. Strategies include nearby-city expansion (15 metro maps), rotating sort orders, category/segment targeting, and sliding date windows.
- **Watchlists** — saved hunts with keyword, cities, seat types (floor / pit / VIP / GA), price ceiling, marketplace sources, and per-watch scan interval. A cron flow sweeps all active watches every 5 minutes, 24/7.
- **Instant alerts** — when a scan hits, the match is recorded and an email alert (styled HTML template) goes to the user. Watches can arm an "auto-purchase" flag that marks at-or-under-ceiling hits for instant-buy attention.
- **Ticketmaster maintenance handling** — TM's nightly ~2:00–6:00 AM ET service window (DST-aware, computed in SQL) auto-pauses TM-only watches while resale sources keep scanning; every pause is logged, so cadence stats stay honest.
- **Plans & metering** — starter / pro / broker tiers gate strategy count (25 / 75 / 150). Users can bring their own marketplace API keys or draw from an admin-managed house-key pool; per-day and lifetime usage are metered on both.
- **Scan health** — every sweep writes a `scan_logs` row (`ok | maintenance | error | rate_limited`) per watch, so failures and rate limits are visible instead of silent.

## How it's built

Runs on the **Benmore platform** (TSX-by-default stack): the framework serves `static/`, compiles `.tsx` on the fly via embedded esbuild (no Node, no build step), auto-generates REST CRUD from the Prisma schema, and provides auth, sessions, CSRF, SSE, and cron.

| Piece | Where | Notes |
|---|---|---|
| Data model | `schema.prisma` | `broker_profiles`, `house_keys`, `searches`, `watchlists`, `watch_hits`, `scan_logs` (SQLite, migrations auto-applied) |
| Scanner | `flows/scan.yaml` + `cron.yaml` | Every 5 min; per-watch cadence via `interval_mins`; ET/DST maintenance logic in SQL |
| Marketplace proxies | `flows/ticketmaster.yaml`, `flows/seatgeek.yaml`, `flows/stubhub.yaml` | Server-side API calls so keys never reach the browser |
| Strategy engine | `static/lib/strategies.ts` | Tiered strategy definitions + nearby-city maps + param builders |
| TM client | `static/lib/ticketmaster.ts` | Search param typing + response normalization |
| UI | `static/dashboard.ts`, `static/settings.ts`, `static/app.tsx` | Dark violet theme, Tailwind utilities, shared primitives in `static/components/ui.tsx` |
| Spin animation | `static/components/SlotMachine.ts` | The spinner UX |
| Alert email | `emails/watch_alert.html` | HTML template for watch-hit notifications |
| Access control | `app.yaml` | Per-table rules: users see only their own profiles/watches; house keys are admin-only |

## Configuration

- **Auth:** email + password (30-day sessions), first-name signup field.
- **API keys:** users paste their own Ticketmaster / SeatGeek / StubHub keys in Settings, or admins seed shared `house_keys`. Secrets belong in `env.yaml` (gitignored) — never in code.
- **Cron:** `scan_watchlists` runs `*/5 * * * *`; each watch throttles itself via `interval_mins`.

## Development

```bash
benmore check make-me-a-tic-gvfera-dev/          # validate app.yaml / schema / flows
benmore logs make-me-a-tic-gvfera-dev            # recent log lines
benmore probe make-me-a-tic-gvfera-dev GET /     # rendered HTML
benmore errors make-me-a-tic-gvfera-dev          # captured JS runtime errors
benmore sql make-me-a-tic-gvfera-dev "SELECT status, COUNT(*) FROM scan_logs GROUP BY status"
```

Full backend API docs are served by the app itself at `/docs` (HTML) or `/api/_docs` (JSON).

## Status / roadmap

Working today: spin search, watchlists, 5-minute scanning with TM-maintenance awareness, hit logging, email alerts, tier limits, BYO/house API keys, scan health logs. Auto-purchase currently arms priority alerts (no checkout automation). Privacy/terms pages should be added before opening signups beyond testing.
