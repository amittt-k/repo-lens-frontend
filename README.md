# RepoLens

RepoLens is a full-stack developer tool designed to help engineers quickly understand unfamiliar GitHub repositories through static analysis, architectural relationship extraction, interactive graph visualization, deterministic flow tracing, and grounded AI explanations.

## Live Demo

**Production Deployment:** [https://repo-lens-frontend-theta.vercel.app](https://repo-lens-frontend-theta.vercel.app)

---

## Overview

Exploring an unfamiliar codebase usually requires manual, fragmented effort: jumping across directory trees, tracing nested imports, locating route handlers, and mentally reconstructing call hierarchies. 

RepoLens replaces manual file hunting with an interactive architectural workspace. By analyzing public JavaScript and TypeScript repositories statically, RepoLens extracts high-level module topologies, symbol-level dependency graphs, Express route bindings, and end-to-end execution flows—pairing every structural fact with contextual AI explanations.

---

## Key Features

- **GitHub Repository Ingestion:** Validates public GitHub repository URLs and fetches source files via raw CDN streams or shallow archives.
- **Static AST Analysis:** Traverses JavaScript, TypeScript, JSX, and TSX files using Babel parser tooling without executing untrusted code.
- **Symbol & Entity Extraction:** Identifies files, functions, methods, classes, React components, and higher-order wrappers.
- **Higher-Order Unwrapping:** Detects symbols wrapped inside `React.memo`, `React.forwardRef`, `connect`, or custom wrappers.
- **Dependency & Import Resolution:** Resolves relative paths, directory index files, and common import aliases deterministically.
- **Symbol Relationship Engine:** Computes exact code relationships including calls, usages, inheritance, and exports.
- **Express API Route Analysis:** Extracts HTTP methods, route paths, and handler function associations.
- **Interactive Graph Canvas:** Zoomable, pannable React Flow interface featuring non-overlapping layout, node badges, and relationship edges.
- **Hierarchical File Explorer:** Nested directory viewer reflecting repository structure alongside source metadata and line counts.
- **Node Inspector Panel:** Deep-dive panel displaying incoming/outgoing dependencies, code definitions, and route mappings for any selected entity.
- **Relationship Filters & Search:** Dynamic filtering by relationship type, entity kind, and real-time fuzzy search across graph nodes.
- **Deterministic Flow Tracing:** Identifies entry points and traces linear and branching execution pathways with circular dependency protection.
- **Grounded AI Explanations:** Context-aware architectural summaries generated server-side for repositories, individual nodes, and execution flows.
- **Secret & Credential Redaction:** Automatic redaction of sensitive tokens and environment variables before AI prompt construction or error emission.
- **Production Deployment:** Deployed across Vercel (frontend), Railway (backend API), and Neon (managed PostgreSQL).

---

## How It Works

The RepoLens analysis pipeline operates in sequential stages:

```text
GitHub Repository
       │
       ▼
1. Ingestion           ── Fetch repository metadata and source files safely
       │
       ▼
2. AST Parsing         ── Parse JS/TS/JSX/TSX files into abstract syntax trees
       │
       ▼
3. Dependency Mapping  ── Resolve relative imports, exports, and file references
       │
       ▼
4. Symbol Extraction   ── Identify functions, classes, components, and methods
       │
       ▼
5. Relationship Engine ── Establish structural and call connections across symbols
       │
       ▼
6. API Route Analysis  ── Map Express routes and HTTP methods to handler symbols
       │
       ▼
7. Graph Construction  ── Build normalized node and edge sets for visualization
       │
       ▼
8. Flow Tracing        ── Deterministically trace execution paths from entry points
       │
       ▼
9. AI Explanation      ── Grounded LLM summaries based strictly on analyzed facts
```

1. **Ingestion:** Validates the target GitHub repository and streams source files while ignoring build artifacts and generated files (`node_modules`, `dist`, `.git`, etc.).
2. **AST Parsing:** Traverses source code using `@babel/parser` to catalog declarations, imports, exports, and calls without executing arbitrary code.
3. **Dependency Resolution:** Resolves module imports across local file paths and tracks external dependencies.
4. **Symbol & Relationship Engine:** Establishes granular relationships between files, classes, methods, and functions based on AST evidence.
5. **API Route Mapping:** Analyzes Express route registrations (`router.get`, `app.post`, etc.) and links endpoints to controller functions.
6. **Graph Construction:** Normalizes entities and relationships into structured graph nodes and edges optimized for interactive rendering.
7. **Flow Tracing:** Computes deterministic execution paths starting from API routes or top-level components.
8. **AI Explanation:** Feeds structured analysis facts into the AI layer to generate grounded, contextual explanations.

---

## Architecture

RepoLens is built as a clean, modular monolith with explicit boundaries between visualization, static analysis, persistence, and AI explanation.

```text
┌─────────────────────────────────────────────────────────────┐
│                       Frontend Client                       │
│           React 19 • TanStack Start • TanStack Router       │
│           React Flow Canvas • Radix UI • Tailwind CSS       │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express Backend                        │
│            Repository Controller • Ingestion Service        │
│          AST Analyzer • Flow Engine • AI Context Layer      │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐┌──────────────────────────────┐
│       Neon PostgreSQL       ││       External Services      │
│   Prisma ORM • Data Models  ││   GitHub API • Google Gemini │
└─────────────────────────────┘└──────────────────────────────┘
```

- **Frontend:** Server-rendered and client-hydrated using TanStack Start, TanStack Router, React 19, and React Flow (`@xyflow/react`).
- **Backend:** Node.js with Express providing REST endpoints for repository ingestion, analysis orchestration, graph retrieval, and AI explanation.
- **Database:** PostgreSQL managed via Prisma ORM, deployed on Neon Serverless Postgres.
- **AI Integration:** Server-side LLM provider integration powered by Google Gemini.
- **Hosting:** Vercel (Frontend), Railway (Backend API), Neon (PostgreSQL).

---

## Relationship Model

RepoLens derives structural facts and connects entities using explicit relationship types:

| Relationship Type | Description |
| ----------------- | ----------- |
| `CONTAINS`        | File contains a function, class, component, or sub-entity |
| `IMPORTS`         | File or module imports another file or external package |
| `CALLS`           | Function or method invokes another function or method |
| `USES`            | Component or class instantiates or references another symbol |
| `EXTENDS`         | Class inherits from another class |
| `IMPLEMENTS`      | Class implements an interface or contract |
| `HANDLES_ROUTE`   | Express endpoint routes execution to a handler function |
| `CALLS_API`       | Client-side service or component issues a request to an API endpoint |

---

## AI Explanation Layer

The AI explanation engine acts as an architectural interpreter grounded in verified analysis facts:

- **Facts as Ground Truth:** The LLM receives structured entity definitions, dependency lists, and relationship paths extracted by the AST parser—never raw guesses.
- **Untrusted Context Isolation:** Repository code and symbol names are encapsulated within untrusted data boundaries in prompts to prevent prompt injection.
- **Credential Redaction:** API keys, tokens, and sensitive credential patterns are stripped before prompt creation.
- **Server-Side Security:** External AI API keys remain strictly server-side and are never exposed to the client.

---

## Production Architecture

```text
User Browser
    │
    ▼
Vercel (TanStack Start / React 19 Frontend)
    │
    ▼ [HTTPS REST API]
Railway (Node.js / Express Backend)
    │
    ├─► Neon (PostgreSQL Database via Prisma)
    ├─► GitHub API / Raw Content Stream
    └─► Google Gemini API (Architectural Explanations)
```

- **Vercel:** Delivers SSR pages, static assets, and client-side graph interaction.
- **Railway:** Executes static analysis pipelines, dependency resolution, graph generation, and AI prompt orchestration.
- **Neon:** Stores repositories, file records, symbol indexes, relationships, and analysis job states.
- **GitHub / Gemini:** Source data provider and AI inference backend.

---

## Tech Stack

| Layer | Technologies |
| ----- | ------------ |
| **Frontend** | React 19, TanStack Start, TanStack Router, TanStack Query, React Flow (`@xyflow/react`), Tailwind CSS v4, Lucide Icons, Radix UI |
| **Backend** | Node.js, Express, `@babel/parser`, CORS, Dotenv |
| **Database** | PostgreSQL, Prisma ORM, Neon Serverless |
| **AI** | Google Gemini (via server-side integration) |
| **Testing** | Node.js Test Runner (`node --test`), `tsx`, JSDOM |
| **Deployment** | Vercel, Railway, Neon |

---

## Local Development

### Prerequisites

- Node.js (v20+ recommended)
- npm or bun
- PostgreSQL database instance (local or hosted)

### 1. Clone the Repository

```bash
git clone https://github.com/amittt-k/repo-lens-frontend.git
cd repo-lens-frontend
```

### 2. Frontend Setup

Install root dependencies and start the frontend dev server:

```bash
npm install
npm run dev
```

The frontend application will be running at `http://localhost:3000`.

### 3. Backend Setup

Open a separate terminal window to configure and start the backend service:

```bash
cd backend
npm install
```

Configure environment variables in `backend/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/repolens?schema=public"
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-gemini-api-key"
GITHUB_TOKEN="" # Optional: increases GitHub API rate limits
```

Run database migrations and start the backend server:

```bash
npx prisma generate
npx prisma db push
npm run dev
```

The backend API will be running at `http://localhost:5000`.

---

## Testing

The project includes unit, integration, and end-to-end regression suites across both frontend and backend modules:

```bash
# Run all frontend tests
npm test

# Run backend tests
npm --prefix backend test
```

### Verified Test Results

- **Frontend Component & DOM Tests:** 25 passing
- **Deterministic Flow Tracing Tests:** 9 passing
- **Frontend AI Integration Tests:** 10 passing
- **Backend Pipeline & Security Tests:** 199 passing
- **Total Test Suite:** 243 passing (0 failing)
- **TypeScript Type Check (`tsc --noEmit`):** Passing (0 errors)
- **Production Build (`vite build`):** Passing

---

## Project Structure

```text
repo-lens-frontend/
├── src/                     # Frontend application source
│   ├── components/          # React components (GraphCanvas, FileExplorer, Panels)
│   ├── hooks/               # Workspace, analysis, and flow tracing hooks
│   ├── lib/                 # Graph utilities, layout tokens, and API client
│   └── routes/              # TanStack Start file-based routing
├── backend/                 # Backend application source
│   ├── prisma/              # Prisma schema definition and migrations
│   ├── src/
│   │   ├── controllers/     # Route controllers (Repository, Node, AI)
│   │   ├── middleware/      # Rate limiting, validation, error handler
│   │   ├── routes/          # Express API route declarations
│   │   ├── services/        # AST analysis, file tree, graph, flow, AI services
│   │   └── utils/           # GitHub URL parser, sanitizers, logger
│   └── tests/               # Backend test suites
├── docs/                    # Architectural and API specifications
├── public/                  # Static assets and favicons
├── package.json             # Frontend dependencies and scripts
└── LICENSE                  # Project license
```

---

## Security Notes

- **Static Analysis Only:** RepoLens strictly analyzes source text and AST structures without running `npm install`, `npm start`, or executing repository code.
- **Server-Side Secrets:** AI API keys and database credentials are held strictly on the server and are never sent to the browser.
- **Credential Redaction:** Error handlers and AI prompt builders automatically sanitize sensitive tokens and file system paths.
- **Path Traversal Protection:** File path resolution normalizes inputs to prevent directory traversal outside repository bounds.
- **Abuse Prevention:** Backend endpoints implement rate limiting and request validation schemas.
- **Safe HTML Escaping:** All AI responses and repository content are sanitized and escaped before DOM rendering.

---

## Status

RepoLens is currently deployed and operational as a portfolio-grade developer tool for repository exploration and static analysis visualization.

---

## License

MIT License

Copyright (c) 2026 Amit Kumar
