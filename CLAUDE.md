# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
