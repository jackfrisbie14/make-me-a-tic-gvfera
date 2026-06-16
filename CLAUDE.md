# Make me a ticket spinner - Benmore App (TSX-by-default)

This app uses the TSX stack. The framework serves files from `static/`
and exposes REST APIs at `/api/*`. You write `.tsx` files; the framework
compiles them to `.js` on the fly via embedded esbuild (no Node, no
build step). Per-app TypeScript types live at `src/bm.d.ts` and
regenerate on every push that touches the schema or config.

## How the agent should work

1. **Understand the backend.** Call the `api` MCP tool with `at: "*"` to
   get the table of contents (routes, tables, flows). Call `api` with
   `at: "table:<name>"` for a table's CRUD shape, or
   `at: "POST /api/<table>"` for a single route's request /
   response schema + JS snippet.
2. **Write TSX modules - keep `app.tsx` thin.** `static/app.tsx` is just
   the entry (imports + wiring). Real code lives in folders: `lib/` for logic
   (`lib/auth.ts`), `components/` for shared UI (`components/ui.tsx`),
   `views/` for features (`views/notes.tsx`). Add a feature as a new
   `views/<name>.tsx` imported from `app.tsx`; relative imports resolve
   `.ts`/`.tsx` and esbuild bundles the graph. Don't grow one giant file.
   Use the typed `bm` SDK from `'bm'`:
   `import bm, { type User } from 'bm';`. `bm.table('typo')` is a TS error.
3. **No fetch() boilerplate.** `bm.api.get/post/patch/delete` wrap fetch
   with auto-CSRF + auto-JSON. `bm.table(name)` does CRUD on any model.
   `bm.live(table, cb)` for SSE. `bm.room(name)` for WS rooms.
   See `api({at:"frontend"})` for the full surface.

   **High-leverage SDK primitives** - call `api({at:"<name>"})` for each.
   Reach for these before hand-rolling the equivalent pattern (every one
   replaces 30+ LOC):

   - `bm.table(x).count()` - TRUE row count (auto-CRUD list defaults to 50).
   - `bm.live.scoped(t, fn)` - racing-refetch-safe live subscription.
   - `bm.api.optimistic({…})` - optimistic mutation + reconcile.
   - `bm.presence(slug)` - heartbeat + cleanup + sweep, all wired.
   - `bm.cache.namespaced(n,v)` - self-busting client cache (sessionStorage).
   - `bm.markdown(text)` - tiny safe Markdown → HTML.
   - `bm.upload(file)` - multipart upload → {path}.
4. **Verify.** `benmore probe <app> GET /<path>` returns the rendered HTML.
   `benmore errors <app>` surfaces JS runtime errors captured by the
   framework. `benmore probe <app> <method> <route> [--body J]` live-fires
   an API endpoint. There is no screenshot tool in this environment -
   describe pages by their HTML or share the live URL with the user.

## Styling + componentization (READ FIRST - non-negotiable)

UI drift is the single biggest source of "this app looks scrappy"
complaints after week 3 of building. The fix is structural, not
aesthetic, and the discipline starts on day one. Two rules:

### Rule 1 - Tailwind is the styling language. Don't write component CSS.

Tailwind ships from the framework binary at `/_internal/tailwind.js`;
every utility class works without a build step. The scaffold's HTML
files already use Tailwind. Add utility classes directly in your
markup - don't define `.my-button` selectors in styles.css.

  ✓ `<button class="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500">Save</button>`
  ✗ `<button class="save-btn">Save</button>` + `.save-btn { ... }` in styles.css

`styles.css` is for things Tailwind CANNOT express - keyframe
animations, `@font-face` declarations, custom CSS variables that
extend Tailwind's palette. NOT for component styles. If you find
yourself opening styles.css to add a button rule, you took the wrong
path 30 seconds ago - go back, use utility classes in the markup.

### Rule 2 - Componentize on the SECOND use, not the third.

The scaffold ships `static/components/ui.tsx` with canonical primitives:

  • `Button({label, variant, size, attrs})`   - primary/secondary/ghost/danger
  • `Input({name, type, placeholder, value})` - themed text input
  • `Field({label, input, hint})`             - label + input + hint
  • `Card({title, body})`                     - bordered panel with optional title
  • `Badge({label, variant})`                 - status pill
  • `EmptyState({message, cta})`              - empty-list placeholder

When you'd write the same `class="..."` Tailwind string twice across
feature files, ADD it to `components/ui.tsx` instead. Concrete heuristics:

  - Form fields with the SAME label/input/hint structure → `Field()`
  - Filled buttons of any kind → `Button({variant: 'primary'})`
  - Bordered content cards → `Card({title, body})`
  - Status pills (active/pending/error) → `Badge({variant})`
  - "Nothing to show yet" placeholders → `EmptyState()`

The third copy of a class string is wasted work AND a drift signal -
extract on the SECOND use. The agent that follows you will modify
one component and every consumer updates.

### Why this matters

In Benmore apps, feature code lives in small files under `views/`
(`views/notes.tsx`, `views/payroll.tsx`…). Without component primitives, each new
feature reinvents button + input + card markup. By the fifth feature
you have five button "styles" that all SHOULD have been one. The fix
when this happens isn't "redesign" - it's structural: move the markup
into `components/ui.tsx`, point every feature at the same primitive,
modify one place to restyle the whole app.

The scaffold's `views/notes.tsx` uses `Button()` for its row-delete
action on purpose - copy that pattern.

## Quick commands

- `benmore logs make-me-a-tic-gvfera-dev` - recent log lines
- `benmore check make-me-a-tic-gvfera-dev/` - validate app.yaml / schema / flows / hooks
- `benmore sql make-me-a-tic-gvfera-dev "SELECT * FROM ..."` - read-only DB query
- `benmore git log make-me-a-tic-gvfera-dev` - commit history (auto on every push)
- `benmore git revert make-me-a-tic-gvfera-dev <sha>` - roll back to a known-good state
- `benmore delete-file <path> --app make-me-a-tic-gvfera-dev` - remove a deployed file (v2.7.31+)
- `benmore integrity-check make-me-a-tic-gvfera-dev` - PRAGMA integrity_check (v2.7.37+)
- `benmore restore make-me-a-tic-gvfera-dev` - list / swap pre-migrate DB backups (v2.7.37+)

## File layout

```
make-me-a-tic-gvfera-dev/
├── app.yaml          # config: theme, auth, features, access, roles, aggregates
├── schema.prisma     # data model → SQLite, migrations auto-applied
├── tsconfig.json     # paths: { "bm": ["./src/bm.d.ts"] }
├── src/
│   └── bm.d.ts       # AUTO-REGEN per-app TS types - do NOT edit
├── static/           # YOUR frontend lives here
│   ├── partials/
│   │   └── head.html # shared <head> chrome - <include src="partials/head.html" /> in every page; edit once
│   ├── index.html    # GET / (auto-injected importmap for 'bm')
│   ├── login.html    # GET /login.html
│   ├── signup.html   # GET /signup.html
│   ├── app.tsx       # THIN entry - imports + wiring only
│   ├── lib/
│   │   └── auth.ts   # logic - auth state + sign-out
│   ├── components/
│   │   └── ui.tsx    # shared UI primitives - extend when class strings repeat
│   ├── views/
│   │   └── notes.tsx # feature - example CRUD on Notes (one file per feature)
│   └── styles.css    # opt-in custom CSS - Tailwind is primary, served from /_internal/tailwind.js
├── flows.yaml or flows/*.yaml   # optional: custom HTTP routes
├── hooks.yaml        # optional: after-CRUD side effects
├── workflows.yaml    # optional: state machines
└── env.yaml          # secrets (gitignored)
```

## Routing

Clean URLs map to files in `static/`:

| URL | File |
|-----|------|
| `/` | `static/index.html` |
| `/contacts` | `static/contacts.html` |
| `/settings/profile` | `static/settings/profile.html` |

Unknown routes fall back to `static/index.html` (SPA-style), so you can
implement client-side routing if you want without breaking direct links.

## Partials - share chrome across pages (DON'T copy-paste `<head>`)

Multi-page apps duplicate a lot of `<head>` (meta, fonts, stylesheet,
importmap). Factor the shared part into a partial and `<include>` it -
one source of truth, edit once:

```html
<!-- static/partials/head.html -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/_internal/tailwind.js"></script>
<link rel="stylesheet" href="/static/styles.css">
```

```html
<!-- any page -->
<head>
  <include src="partials/head.html" />
  <title>This page</title>   <!-- keep page-specific bits in the page -->
</head>
```

- `src` resolves relative to `static/` (so `partials/head.html` → `static/partials/head.html`).
- The tag is self-closing: `<include src="..." />`. Expanded server-side before the page is sent.
- Use it for any repeated fragment - nav, footer, `<head>`. The scaffold already wires `partials/head.html` into index/login/signup as the example.

## What the framework adds at serve time

- `<meta name="csrf-token" content="...">` injected before `</head>`
- HSTS + CSP + `X-Frame-Options: DENY` headers
- Gzip compression
- Static-asset caching (immutable in production)

That's it. Nothing else is rewritten. What you write is what gets served.

## Backend APIs you can call

| Need | Endpoint |
|------|----------|
| Login | `POST /login` (form-encoded: email, password, _csrf) |
| Signup | `POST /signup` (form-encoded: email, password, _csrf, …) |
| Current user | `GET /api/_auth/profile` |
| Sign out | `POST /logout` |
| List rows | `GET /api/{table}?orderBy=col:desc&limit=N&cursor=X` |
| Create row | `POST /api/{table}` (JSON body) |
| Update row | `PATCH /api/{table}/{id}` (JSON body) |
| Delete row | `DELETE /api/{table}/{id}` |
| Search | `GET /api/{table}/search?q=...` |
| Real-time | `new EventSource('/sse/events')` |
| WebSocket | `new WebSocket('wss://host/ws')` |
| File upload | `POST /api/_upload` (multipart) - or `bm.upload(file)` from the SDK |
| Row count | `GET /api/{table}?count=true` (v2.7.33+) - `{count: N}` true total ignoring page caps |
| Presence | `POST /api/_presence/heartbeat` / `GET /api/_presence?slug=` - or `bm.presence(slug)` from the SDK (v2.7.35+) |
| Notifications | `GET /api/_notifications` |
| MFA setup | `POST /api/_auth/mfa/setup` |
| OAuth | `GET /api/_auth/oauth/{provider}` |

Full spec: `GET /api/_docs` (JSON) or `GET /docs` (HTML).

## Conventions

- **Don't ship a custom framework.** No bm.js, no React, no abstractions
  on top of fetch. Plain JS scales further than people think.
- **Default to cookie sessions + CSRF.** The framework auto-issues a
  session cookie on `/login` and an auto-rotating CSRF token in the
  `<meta>` tag. Read it once, attach to every mutation.
- **Use Bearer tokens for non-browser clients** (CLI, native apps).
  `POST /api/_auth/token` exchanges email+password for a bearer token.
- **Protected fields are server-only.** `user_id`, `role`, `password_hash`,
  `created_at`, `updated_at` are stripped from any client-submitted body.
- **Always parameterize SQL** in `flows.yaml` and `hooks.yaml` using `?` /
  `:name` placeholders. The framework rejects raw string interpolation.

## Before going live

The framework injects no legal pages. If the app collects real user data
(signups, profile fields, anything beyond static content), add two pages
before flipping out of testing mode:

- `static/privacy.html` - disclose what's collected. At minimum: the
  framework's anonymous `_bm_vid` analytics cookie (set only after
  the cookie banner is accepted; pageviews + session timing only, no
  third-party trackers), the email provider you wired (Resend / Postmark
  / SMTP), any OAuth providers, the data tables in `schema.prisma`,
  and a contact for data requests.
- `static/terms.html` - the app owner's relationship with their users.
  At minimum: governing law, acceptable use, warranty disclaimer,
  limitation of liability, account termination. If you deploy on a hosting
  provider, its TOS covers hosting; this TOS covers your end-user use.

Link both from the footer + signup page. Don't fabricate a generic
boilerplate - a half-filled policy looks like the app owner tried but
didn't actually describe what the app does, which is worse than no
policy at all in any real legal review.

## After any change

1. `benmore check <app>` - verifies app.yaml, schema, flows, hooks, static files
2. `benmore probe <app> GET /<path>` - fetch rendered HTML for visual review
3. `benmore errors <app>` - JS runtime errors captured by the framework
4. `benmore probe <app> <method> <route> --body '{...}'` - live-fire an API endpoint
