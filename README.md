# SPLASH - Maritime Chartering Platform

SPLASH is a voyage-centric communication and deal execution platform for maritime chartering. It replaces fragmented email, WhatsApp, and phone workflows with a unified workspace that captures discussions, extracts commercial terms with AI, generates fixture recaps, and creates auditable negotiation records.

## Core Features

- **Voyage Workspaces** - Structured deal containers with conversations, files, terms, and audit trails
- **Real-time Messaging** - Voyage-specific threads with internal/external/negotiation channels
- **AI Term Extraction** - Automatically extract freight rates, laycan, ports, cargo, and other fixture terms from messages
- **Term Review & Approval** - Accept, reject, or edit AI-proposed terms with full traceability
- **Fixture Recap Generation** - One-click recap generation from approved terms
- **Contract Drafting** - Generate charter party drafts from structured deal data
- **Audit Timeline** - Complete record of who said what and when
- **Email Integration** - Import email threads into voyage workspaces
- **File Management** - Upload and organize documents per voyage
- **Multi-tenant** - Company-based access control with role-based permissions

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- TanStack React Query
- Socket.io Client
- Framer Motion

### Backend
- NestJS (Node.js)
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis (caching, queues)
- Socket.io (WebSocket)
- Bull (job queues)
- Passport JWT

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Quick Start with Docker

```bash
# Clone the repository
git clone <repo-url> splash
cd splash

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Start all services
docker compose up -d

# Run database migrations
cd backend
npx prisma migrate dev

# Seed demo data
npx prisma db seed

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

### Local Development (without Docker)

```bash
# Start PostgreSQL and Redis (install separately or via Docker)
docker compose up -d postgres redis

# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Demo Accounts

After seeding, use these credentials (password: `password123` for all):

| Email | Role | Company |
|-------|------|---------|
| john@oceanic-shipping.com | Company Admin | Oceanic Shipping Ltd (Owner) |
| emily@globalchartering.com | Company Admin | Global Chartering Partners (Charterer) |
| james@maritimebrokerage.com | Company Admin | Maritime Brokerage International (Broker) |
| anna@maritimebrokerage.com | Broker | Maritime Brokerage International |
| sarah@oceanic-shipping.com | Owner | Oceanic Shipping Ltd |
| michael@globalchartering.com | Charterer | Global Chartering Partners |

## Project Structure

```
splash/
├── backend/
│   ├── src/
│   │   ├── auth/           # Authentication (JWT, Passport)
│   │   ├── users/          # User management
│   │   ├── companies/      # Company management
│   │   ├── voyages/        # Voyage CRUD & workspace
│   │   ├── conversations/  # Conversation management
│   │   ├── messages/       # Real-time messaging
│   │   ├── files/          # File uploads
│   │   ├── ai/             # AI service (term extraction, summaries)
│   │   ├── extracted-terms/ # Term management & approval
│   │   ├── recaps/         # Fixture recap generation
│   │   ├── contracts/      # Contract draft generation
│   │   ├── audit/          # Audit event logging
│   │   ├── search/         # Global search
│   │   ├── notifications/  # In-app notifications
│   │   ├── email-integrations/ # Email sync
│   │   ├── websocket/      # WebSocket gateway
│   │   └── common/         # Shared decorators, guards, filters
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Demo data seeder
│   └── test/               # E2E tests
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

## API Endpoints

### Authentication
- `POST /auth/register` - Register company + admin user
- `POST /auth/login` - Login
- `GET /auth/me` - Current user

### Voyages
- `POST /voyages` - Create voyage
- `GET /voyages` - List voyages (with filters)
- `GET /voyages/:id` - Voyage detail
- `PATCH /voyages/:id` - Update voyage
- `POST /voyages/:id/participants` - Add participant

### Conversations & Messages
- `POST /voyages/:voyageId/conversations` - Create conversation
- `GET /voyages/:voyageId/conversations` - List conversations
- `POST /conversations/:id/messages` - Send message
- `GET /conversations/:id/messages` - List messages

### AI & Terms
- `POST /voyages/:voyageId/ai/extract-terms` - Extract terms via AI
- `POST /voyages/:voyageId/ai/summarize` - Summarize conversations
- `GET /voyages/:voyageId/terms` - List extracted terms
- `PATCH /terms/:id/accept` - Accept term
- `PATCH /terms/:id/reject` - Reject term

### Recaps & Contracts
- `POST /voyages/:voyageId/recaps/generate` - Generate recap
- `GET /voyages/:voyageId/recaps` - List recaps
- `POST /voyages/:voyageId/contracts/generate` - Generate contract
- `GET /voyages/:voyageId/contracts` - List contracts

### Other
- `GET /search` - Global search
- `GET /voyages/:voyageId/audit` - Audit timeline
- `GET /notifications` - User notifications
- `POST /voyages/:voyageId/files` - Upload file

## Testing

```bash
cd backend

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Environment Variables

See `.env.example` files in root, backend, and frontend directories for all configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `AI_API_URL` - AI provider API URL (OpenAI-compatible)
- `AI_API_KEY` - AI provider API key
- `NEXT_PUBLIC_API_URL` - Backend API URL for frontend

## License

Proprietary - All rights reserved.
