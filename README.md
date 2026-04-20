# SPLASH - Maritime Chartering Platform

SPLASH is a maritime chartering frontend built on top of the **Quint API**
(Flask + Matrix/Synapse). It provides phone-based login, Matrix-backed chat,
fixture/document workspaces, and a dashboard for brokers, owners, and charterers.

## Architecture

```
+-------------------+            +------------------------+
|  Next.js (Splash) |  HTTPS  -> |  Quint API (Flask)     |
|  frontend         |            |  + Synapse (Matrix)    |
|  :3010            |            |  :8888 / :8008         |
+-------------------+            +------------------------+
```

All API calls go through Next.js rewrites (`frontend/next.config.mjs`):

| Browser path    | Rewritten to                       |
| --------------- | ---------------------------------- |
| `/quint-api/*`  | `${NEXT_PUBLIC_QUINT_HOST}/api/*`  |
| `/quint-v1/*`   | `${NEXT_PUBLIC_QUINT_HOST}/v1/*`   |
| `/quint-v2/*`   | `${NEXT_PUBLIC_QUINT_HOST}/v2/*`   |
| `/_matrix/*`    | `${NEXT_PUBLIC_QUINT_HOST}/_matrix/*` |

There is no Nest/Prisma backend in this project anymore &mdash; all persistence
lives in Quint / Synapse.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (auth store)
- TanStack React Query + react-hot-toast (wired at the root for future use)

## Getting Started

### Prerequisites

- Node.js 20+
- A running Quint API (see `quint-api/` in the parent repo) reachable at
  some `NEXT_PUBLIC_QUINT_HOST` URL.

### Local Development

```bash
cd frontend
cp .env.example .env           # set NEXT_PUBLIC_QUINT_HOST
npm install
npm run dev                    # http://localhost:3010
```

### With Docker

```bash
cp .env.example .env           # set NEXT_PUBLIC_QUINT_HOST
docker compose up -d           # http://localhost:3010
```

The compose file only runs the Next.js frontend; bring up Quint separately.

## Project Structure

```
splash/
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages (App Router)
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities, API client
│   │   ├── hooks/          # Custom hooks
│   │   ├── store/          # Zustand stores
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
├── docker-compose.yml
└── README.md
```

## Environment Variables

See `.env.example` files in the repo root and `frontend/` for all configuration
options. Key variables:

- `NEXT_PUBLIC_QUINT_HOST` &mdash; base URL of the Quint API used by Next.js
  rewrites (defaults to `http://localhost:8888`).

## License

Proprietary - All rights reserved.
