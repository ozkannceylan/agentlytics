# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission
When working in this repository, the primary goals are:
- preserve context across long tasks
- avoid unnecessary back-and-forth
- make minimal, safe, high-quality changes
- finish work with proof, not assumptions

Always understand the current state before making changes.
Prefer simple solutions over clever ones.

---

## Commands

### Development
```bash
npm install                # Install backend dependencies
cd ui && npm install       # Install frontend dependencies
npm run dev                # Run both frontend (port 5173) and backend (port 4637) concurrently
npm start                  # Run backend only (port 4637)
cd ui && npm run dev       # Run frontend only (proxies API to port 4637)
npm run build              # Build React UI to public/ via Vite
```

### Linting
```bash
cd ui && npm run lint      # ESLint on React frontend
```

### Running the app
```bash
node index.js                        # Start dashboard
node index.js --no-cache             # Wipe cache and rescan all editors
node index.js --collect              # Build cache without launching UI
node index.js --relay                # Start multi-user relay server (port 4638)
node index.js --join <host:port>     # Connect to relay server
```

---

## Operating Rules

### 1. Read Context First
Before starting any meaningful task, read the relevant project documents.

Default startup order:
1. `/docs/context.md`
2. `/docs/session.md`

Read additional files when relevant:
- `/docs/plan.md` if there is an active implementation task
- `/docs/architecture.md` if the task affects structure or design
- `/docs/api-contracts.md` if interfaces, schemas, or payloads may change
- `/docs/testing.md` if verification or debugging is involved
- `/docs/adr.md` if prior architectural decisions matter

Do not start major work before loading context.

---

### 2. Plan Before Action
For any non-trivial task, make a plan before changing code.

A task is non-trivial if it includes one or more of the following:
- multiple steps
- architectural decisions
- refactoring
- debugging with an unknown root cause
- interface or schema changes
- work spanning multiple files or modules

Write the plan as a checklist in:
- `tasks/todo.md`

Then sync the current plan into:
- `/docs/plan.md`

If the implementation changes direction, update the plan documents immediately.

---

### 3. Keep Session State Fresh
Use `/docs/session.md` as the working memory for the repository.

It should always contain:
- what was just completed
- what is currently in progress
- what remains next
- blockers or open questions
- important files touched in the current session

Update this file throughout the work, not only at the end.

---

### 4. Protect Architectural Integrity
If the task changes system structure, boundaries, responsibilities, or data flow, update:
- `/docs/architecture.md`

If a meaningful architectural decision is made, record the reason in:
- `/docs/adr.md`

ADR entries should briefly capture:
- context
- decision
- alternatives considered
- consequences

Prefer elegant, durable solutions over quick patches when the difference matters.

---

### 5. Preserve Domain Knowledge
Use `/docs/context.md` to maintain:
- project purpose
- business rules
- domain assumptions
- glossary
- hard constraints

If you discover an implicit rule during implementation, document it there.

---

### 6. Lock Interfaces
Use `/docs/api-contracts.md` to document and protect:
- request/response shapes
- JSON schemas
- DTOs
- message formats
- integration assumptions between components

If an interface changes, update this file in the same task.
Do not silently break contracts.

---

### 7. Verification Before Completion
Never consider a task complete until the result is verified.

Verification may include:
- running tests
- reproducing the bug and confirming the fix
- checking logs
- validating affected flows manually
- comparing behavior before and after the change

Document verification steps in:
- `/docs/testing.md`

Also add a short review section to:
- `tasks/todo.md`

The standard is: would a strong senior engineer accept this as done?

---

### 8. Debug Autonomously
When given a bug report:
- investigate directly
- identify likely root cause
- inspect relevant code, logs, and tests
- implement the smallest correct fix
- verify the result

Do not ask the user for hand-holding unless a required external fact is genuinely missing.

---

### 9. Prefer Minimal Impact
Change only what is necessary.

Rules:
- avoid broad rewrites unless justified
- do not rename or move things without a reason
- do not introduce extra abstractions unless they simplify the system
- keep fixes local when possible
- reduce risk of regressions

Simple and correct beats large and impressive.

---

### 10. Re-Plan When Reality Changes
If new evidence shows the current approach is wrong, stop and re-plan.

Examples:
- the root cause is different than expected
- the architecture blocks the original approach
- tests reveal a hidden dependency
- the initial plan is no longer the cleanest path

Update:
- `tasks/todo.md`
- `/docs/plan.md`
- `/docs/architecture.md` if needed

Do not continue blindly with a broken plan.

---

## Subagent Strategy
Use subagents to reduce context overload when the environment supports them.

Good use cases:
- codebase exploration
- root cause analysis
- log analysis
- parallel investigation of separate modules
- summarizing large files or long outputs
- validating alternative implementations

Rules for subagents:
- one focused task per subagent
- give clear scope and expected output
- return concise findings, not raw noise
- consolidate final decisions in the main thread
- reflect important findings back into the docs

Subagents should reduce context pressure, not create coordination chaos.

---

## Required Project Files

### `/docs/context.md`
Source of truth for domain and business context.

### `/docs/plan.md`
Current master plan for the active task.

### `/docs/architecture.md`
Current structural and design view of the system.

### `/docs/adr.md`
Why important decisions were made.

### `/docs/api-contracts.md`
Interface and payload contracts.

### `/docs/testing.md`
How to verify the system and where to inspect results.

### `/docs/session.md`
Current working state and handoff notes.

### `tasks/todo.md`
Task checklist and completion review.

### `tasks/lessons.md`
Patterns learned from corrections and mistakes.

---

## Lessons Loop
When corrected by the user, or when a mistake is discovered, update:
- `tasks/lessons.md`

Each entry should include:
- what went wrong
- why it happened
- the rule that should prevent it next time

Keep lessons short and actionable.
Do not write vague observations.
Write operational rules.

Example:
- Mistake: Changed API payload without updating contract docs.
- Rule: Any payload or schema change must update `/docs/api-contracts.md` in the same task.

Review relevant lessons before continuing similar work.

---

## Standard Workflow

### A. Start
1. Read `/docs/context.md`
2. Read `/docs/session.md`
3. Read any other relevant docs
4. Write or refresh the plan in `tasks/todo.md`
5. Sync plan to `/docs/plan.md`
6. Update `/docs/architecture.md` if structure is relevant

### B. Execute
1. Work through the checklist
2. Mark progress as items complete
3. Keep `/docs/session.md` current
4. Update contracts/docs as changes happen
5. Re-plan immediately if assumptions break

### C. Verify
1. Run relevant tests or checks
2. Validate the changed behavior
3. Record verification steps in `/docs/testing.md`
4. Add a short review note to `tasks/todo.md`

### D. Finish
1. Update `/docs/session.md` with current status
2. Make sure docs reflect reality
3. Record any reusable lesson in `tasks/lessons.md`

---

## Architecture

### Layered Architecture

```
React SPA (ui/)
     ↓ REST API (/api/*)
Express Server (server.js)
     ↓ SQLite reads
Cache Layer (cache.js) — ~/.agentlytics/cache.db
     ↓ dispatches to
Editor Adapters (editors/*.js) — 13 adapters
     ↓ reads from
Editor data files/DBs on the local filesystem
```

### Key Files

| File | Purpose |
|------|---------|
| `index.js` | CLI entry point; routes to normal, relay, or join mode |
| `server.js` | Express server with read-only REST API endpoints |
| `cache.js` | SQLite cache layer; aggregates and normalizes data from all adapters |
| `relay-server.js` | Multi-user relay server with its own SQLite DB (`relay.db`) |
| `relay-client.js` | Client that syncs local cache to a relay server every 30s |
| `mcp-server.js` | Model Context Protocol server exposing 4 tools for AI clients |
| `editors/index.js` | Dispatches to all editor adapters; returns unified data |
| `editors/base.js` | Shared utilities for path resolution, formatting, content extraction |

### Editor Adapters (`editors/*.js`)

Each adapter exports `{ name, getChats(), getMessages(chat), resetCache? }`. The adapter reads from editor-specific local files/databases and returns normalized data. Adding a new editor means creating a new file in `editors/` and registering it in `editors/index.js`.

### Cache Layer (`cache.js`)

Central SQLite database at `~/.agentlytics/cache.db`. Schema: `chats`, `chat_stats`, `messages`, `tool_calls`, `meta`. All analytics queries (`getCachedOverview()`, `getCachedChats()`, etc.) are served from here. The `refetch` flow rebuilds the cache by calling all adapters, with progress streamed to the frontend via SSE at `GET /api/refetch`.

### Relay Architecture

Relay enables multi-user cross-team analytics:
- Host runs `relay-server.js` which maintains `relay.db` and exposes `/relay/*` endpoints plus an MCP server at `/mcp`
- Each client runs `relay-client.js` which POSTs local cache data to `POST /relay/sync` every 30 seconds
- MCP tools (`list_users`, `search_sessions`, `get_user_activity`, `get_session_detail`) let AI clients query aggregated team data

### Frontend (`ui/`)

React 19 SPA built with Vite and Tailwind CSS 4. Routes and pages in `ui/src/pages/`, reusable components in `ui/src/components/`, API fetch wrappers and auth token management in `ui/src/lib/api.js`, editor colors/labels/tool icons in `ui/src/lib/constants.js`.

The frontend in dev mode proxies `/api/*` and `/relay/*` to `localhost:4637`. In production the built files are served directly by Express from `./public/`.

### API Endpoints (server.js)

All endpoints accept optional `?editor=` filter and date range params. Key routes: `/api/overview`, `/api/daily-activity`, `/api/chats`, `/api/chats/:id`, `/api/projects`, `/api/deep-analytics`, `/api/refetch` (SSE stream).

### Ports

- `4637` — Main analytics server (normal mode)
- `4638` — Relay server
- `5173` — Vite dev server (frontend only)

---

## Quality Bar
Before finishing, check:

- Is the solution correct?
- Is it as simple as it can reasonably be?
- Did I update the docs that changed?
- Did I verify behavior instead of assuming?
- Would this survive another engineer picking up the task cold?

If not, continue refining.
