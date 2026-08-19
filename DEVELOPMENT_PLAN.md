# RepoLens — Development Plan

## 1. Development Philosophy

RepoLens will be developed incrementally.

Do not build the entire system in one AI coding prompt.

Development order:

```text
Product
  ↓
Requirements
  ↓
Architecture
  ↓
Technology Lock
  ↓
Project Foundation
  ↓
Frontend Foundation
  ↓
Backend Foundation
  ↓
Repository Ingestion
  ↓
File Analysis
  ↓
AST Analysis
  ↓
Dependency Analysis
  ↓
Relationship Engine
  ↓
Graph API
  ↓
Interactive Visualization
  ↓
Node Details
  ↓
Flow Tracing
  ↓
AI Explanation
  ↓
Testing
  ↓
Security
  ↓
Performance
  ↓
UI Polish
  ↓
Deployment
  ↓
Final Review
```

---

# 2. PHASE 0 — Project Planning

## Objective

Lock the product before implementation.

### Tasks

- [ ] Finalize project name: RepoLens
- [ ] Finalize product statement
- [ ] Finalize target user
- [ ] Finalize MVP
- [ ] Define out-of-scope features
- [ ] Finalize initial language support
- [ ] Finalize technology stack
- [ ] Create PROJECT_CONTEXT.md
- [ ] Create DEVELOPMENT_PLAN.md
- [ ] Create AGENTS.md

### Deliverable

A stable project specification.

### Do Not

- write application code
- add unnecessary features
- change technologies without discussion

---

# 3. PHASE 1 — Technical Architecture

## Objective

Create the implementation blueprint.

### Define

- frontend architecture
- backend architecture
- database
- API structure
- repository ingestion
- AST parsing
- dependency resolution
- relationship model
- graph format
- AI integration
- security
- testing strategy

### Deliverables

```text
Architecture diagram
Database design
API specification
Repository analysis pipeline
Relationship model
```

### Completion Criteria

No major architectural ambiguity remains.

---

# 4. PHASE 2 — Git Repository Foundation

## Objective

Create the actual project repository.

### Structure

```text
repolens/
├── frontend/
├── backend/
├── prisma/
├── docs/
├── PROJECT_CONTEXT.md
├── DEVELOPMENT_PLAN.md
├── AGENTS.md
├── README.md
└── .gitignore
```

### Tasks

- [ ] Initialize Git
- [ ] Initialize frontend
- [ ] Initialize backend
- [ ] Configure environment variables
- [ ] Configure PostgreSQL
- [ ] Configure Prisma
- [ ] Configure basic routing
- [ ] Add health endpoint
- [ ] Add basic error handling
- [ ] Add README
- [ ] Verify project starts

### Completion Criteria

Frontend and backend run independently.

---

# 5. PHASE 3 — Lovable Frontend Foundation

## Objective

Create the visual foundation before backend functionality exists.

### Build

- [ ] Home page
- [ ] Navigation/layout
- [ ] GitHub URL input
- [ ] Validation UI
- [ ] Loading state
- [ ] Repository dashboard shell
- [ ] Graph workspace
- [ ] File explorer
- [ ] Node details panel
- [ ] Search
- [ ] Filters
- [ ] AI explanation panel
- [ ] Empty states
- [ ] Error states
- [ ] Responsive layout

### Important

Mock data may be used temporarily.

The UI must not pretend that mock analysis is real analysis.

### Completion Criteria

The application looks like a real developer tool even before the backend is connected.

---

# 6. PHASE 4 — GitHub Integration

## Objective

Allow the backend to validate and access public GitHub repositories.

### Build

```text
POST /api/repositories/validate
```

### Tasks

- [ ] Validate GitHub URL
- [ ] Extract owner/repository
- [ ] Check repository existence
- [ ] Retrieve basic metadata
- [ ] Handle invalid URLs
- [ ] Handle missing repositories
- [ ] Handle rate limits
- [ ] Handle network errors

### Completion Criteria

A real GitHub URL can be validated without analyzing the repository yet.

---

# 7. PHASE 5 — Repository Ingestion

## Objective

Read the repository safely.

### Pipeline

```text
GitHub Repository
       ↓
Fetch
       ↓
File tree
       ↓
Filter
       ↓
Relevant source files
```

### Ignore

```text
.git
node_modules
dist
build
.next
coverage
.env
.env.*
```

### Tasks

- [ ] Fetch repository
- [ ] Identify branch
- [ ] Build file list
- [ ] Filter unnecessary files
- [ ] Identify supported extensions
- [ ] Handle large repositories
- [ ] Handle empty repositories
- [ ] Handle inaccessible repositories

### Completion Criteria

Backend can produce a clean list of analyzable files.

---

# 8. PHASE 6 — File and Folder Analysis

## Objective

Build repository structure.

### Detect

```text
Repository
 ├── Folder
 │    └── File
```

### Tasks

- [ ] Build directory tree
- [ ] Store file metadata
- [ ] Identify file type
- [ ] Identify extension
- [ ] Track file path
- [ ] Create repository/file records

### Completion Criteria

A repository can be represented as a structured file tree.

---

# 9. PHASE 7 — AST Analysis

## Objective

Extract code-level information.

### Initial Languages

```text
JavaScript
TypeScript
JSX
TSX
```

### Detect

- [ ] imports
- [ ] exports
- [ ] functions
- [ ] classes
- [ ] methods
- [ ] components
- [ ] interfaces/types where appropriate

### Tasks

- [ ] Select established parser/compiler approach
- [ ] Parse files
- [ ] Extract symbols
- [ ] Record source locations
- [ ] Handle syntax errors
- [ ] Continue analysis when individual files fail

### Completion Criteria

A sample repository produces meaningful structured symbol information.

---

# 10. PHASE 8 — Dependency Analysis

## Objective

Determine file-to-file relationships.

### Example

```text
Login.jsx
   ↓ IMPORTS
auth.js
   ↓ IMPORTS
api.js
```

### Detect

- [ ] relative imports
- [ ] package imports
- [ ] exports
- [ ] resolved file paths
- [ ] unresolved imports
- [ ] circular dependencies
- [ ] common aliases where practical

### Important

Do not attempt to support every possible bundler/configuration in V1.

Support common project structures first.

### Completion Criteria

The analyzer produces accurate dependency relationships for normal JS/TS projects.

---

# 11. PHASE 9 — Symbol Relationships

## Objective

Connect files with their symbols.

### Example

```text
UserService.js
      ↓
getUser()
```

### Detect where practical

- file contains function
- file contains class
- class contains method
- function references another local symbol
- component uses imported module

### Completion Criteria

The graph can represent meaningful symbol-level relationships.

---

# 12. PHASE 10 — API Relationship Analysis

## Objective

Detect common API relationships.

### Initial target

Common Express-style APIs.

Example:

```text
router.get("/users", getUsers)
```

Result:

```text
GET /users
    ↓
getUsers()
```

### Tasks

- [ ] Detect common route declarations
- [ ] Detect HTTP method
- [ ] Detect route path
- [ ] Detect handler
- [ ] Link route to handler
- [ ] Link handler to related services when reliably detectable

### Completion Criteria

Common Express repositories produce useful API flow information.

---

# 13. PHASE 11 — Relationship Engine

## Objective

Create a unified graph relationship model.

### Relationship format

```text
source
target
type
metadata
```

### Initial types

```text
CONTAINS
IMPORTS
EXPORTS
CALLS
USES
EXTENDS
IMPLEMENTS
CALLS_API
HANDLES_ROUTE
```

### Rules

- relationships must originate from analyzer evidence
- don't invent relationships
- unresolved relationships should be represented appropriately
- duplicate relationships should be removed

### Completion Criteria

All analysis modules produce a consistent graph representation.

---

# 14. PHASE 12 — Graph Builder

## Objective

Convert analysis results into frontend-friendly graph data.

### Format

```json
{
  "nodes": [],
  "edges": []
}
```

### Node metadata may include

```text
id
label
type
filePath
symbolType
metadata
```

### Edge metadata may include

```text
source
target
relationshipType
metadata
```

### Completion Criteria

Backend returns a graph that can be consumed directly by React Flow.

---

# 15. PHASE 13 — Database Integration

## Objective

Persist useful analysis data.

### Initial entities

```text
Repository
File
Symbol
Relationship
ApiRoute
Analysis
```

### Tasks

- [ ] Prisma schema
- [ ] migrations
- [ ] repository persistence
- [ ] file persistence
- [ ] symbol persistence
- [ ] relationship persistence
- [ ] API route persistence
- [ ] analysis status

### Completion Criteria

An analysis can be stored and retrieved.

---

# 16. PHASE 14 — Backend API

## Objective

Expose analysis data through REST APIs.

### Initial APIs

```text
GET    /api/health

POST   /api/repositories/validate
POST   /api/repositories/analyze

GET    /api/repositories/:id
GET    /api/repositories/:id/files
GET    /api/repositories/:id/graph
GET    /api/repositories/:id/relationships
GET    /api/repositories/:id/routes

GET    /api/nodes/:id
GET    /api/nodes/:id/relationships

POST   /api/ai/explain/repository
POST   /api/ai/explain/node
POST   /api/ai/explain/flow
```

### Completion Criteria

Frontend can retrieve real repository analysis.

---

# 17. PHASE 15 — Frontend/Backend Integration

## Objective

Replace frontend mock data with real API data.

### Flow

```text
GitHub URL
 ↓
Frontend
 ↓
Backend
 ↓
GitHub
 ↓
Analyzer
 ↓
Database
 ↓
Graph API
 ↓
Frontend
```

### Tasks

- [ ] connect repository input
- [ ] connect validation
- [ ] connect analysis
- [ ] display real repository information
- [ ] display real file tree
- [ ] display real graph
- [ ] display real relationships

### Completion Criteria

A real repository can be analyzed from the browser.

---

# 18. PHASE 16 — Interactive Graph

## Objective

Make the graph genuinely useful.

### Features

- [ ] zoom
- [ ] pan
- [ ] drag nodes
- [ ] search
- [ ] filter relationship types
- [ ] select node
- [ ] highlight connections
- [ ] focus selected node
- [ ] minimap if useful
- [ ] collapse/group folders if practical

### Completion Criteria

The graph remains usable for moderately sized repositories.

---

# 19. PHASE 17 — Node Details

## Objective

Allow users to understand any selected entity.

### Display

- type
- file
- location
- imports
- imported by
- functions
- classes
- relationships
- API information when applicable

### Completion Criteria

Clicking a node provides meaningful information without requiring the user to inspect raw source code.

---

# 20. PHASE 18 — Flow Tracing

## Objective

Allow users to follow application logic.

Example:

```text
Login.jsx
 ↓
loginUser()
 ↓
authService
 ↓
POST /api/login
 ↓
authController
 ↓
UserService
```

### Features

- [ ] select starting node
- [ ] identify connected path
- [ ] display relationship chain
- [ ] highlight path on graph
- [ ] show flow explanation

### Completion Criteria

Supported flows can be visually traced.

---

# 21. PHASE 19 — AI Integration

## Objective

Add AI as an explanation layer.

### Feature 1

**Explain Repository**

### Feature 2

**Explain Selected Node**

### Feature 3

**Explain Selected Flow**

### AI input should contain

- repository metadata
- file structure
- symbols
- relationships
- API routes
- relevant graph information

### AI must not receive unnecessary secrets or sensitive configuration.

### Completion Criteria

AI explanations are grounded in analyzed repository data.

---

# 22. PHASE 20 — Error Handling

## Objective

Make the application robust.

### Test

- [ ] invalid URL
- [ ] missing repository
- [ ] rate limit
- [ ] network failure
- [ ] empty repository
- [ ] large repository
- [ ] unsupported files
- [ ] malformed source
- [ ] unresolved imports
- [ ] circular dependencies
- [ ] database failure
- [ ] AI failure

### Completion Criteria

Failures produce understandable messages and do not unnecessarily crash the application.

---

# 23. PHASE 21 — Testing

## Backend

- [ ] unit tests
- [ ] analyzer tests
- [ ] dependency tests
- [ ] relationship tests
- [ ] API tests

## Frontend

- [ ] component tests
- [ ] graph tests
- [ ] search tests
- [ ] filter tests
- [ ] API integration tests

## End-to-End

Test:

```text
GitHub URL
 ↓
Validation
 ↓
Analysis
 ↓
Graph
 ↓
Node selection
 ↓
AI explanation
```

---

# 24. PHASE 22 — Security Review

### Check

- [ ] API keys remain server-side
- [ ] GitHub input validation
- [ ] request validation
- [ ] rate limiting where needed
- [ ] repository size restrictions
- [ ] secret-file exclusion
- [ ] safe source-code handling
- [ ] no repository execution
- [ ] safe AI input
- [ ] safe rendering of repository-derived text

---

# 25. PHASE 23 — Performance Review

### Check

- [ ] unnecessary files excluded
- [ ] duplicate parsing avoided
- [ ] analysis cached where appropriate
- [ ] database queries optimized
- [ ] graph payload reasonable
- [ ] frontend does not render unnecessary nodes
- [ ] large graph usability

Do not add complex infrastructure unless actual measurements justify it.

---

# 26. PHASE 24 — UI/UX Polish

Use Lovable/Bolt selectively.

### Improve

- [ ] typography
- [ ] spacing
- [ ] navigation
- [ ] loading experience
- [ ] graph controls
- [ ] empty states
- [ ] error states
- [ ] animations
- [ ] responsive behavior
- [ ] dashboard clarity

### Rule

UI changes must not silently modify backend architecture.

---

# 27. PHASE 25 — Documentation

Create:

```text
README.md
ARCHITECTURE.md
API.md
ANALYSIS.md
```

README should contain:

- project overview
- features
- architecture
- technology stack
- setup
- environment variables
- running locally
- screenshots
- limitations
- future improvements

---

# 28. PHASE 26 — Deployment

## Frontend

Deploy to:

```text
Vercel
```

## Backend

Deploy to:

```text
Render / Railway
```

## Database

Use:

```text
Neon / Supabase PostgreSQL
```

### Tasks

- [ ] production environment variables
- [ ] CORS
- [ ] database migration
- [ ] production build
- [ ] health check
- [ ] frontend API URL
- [ ] deployment test

---

# 29. PHASE 27 — Final Codex Audit

Codex should review:

### Architecture

- [ ] clean separation
- [ ] no unnecessary complexity
- [ ] maintainability

### Backend

- [ ] API consistency
- [ ] error handling
- [ ] validation
- [ ] security

### Analyzer

- [ ] parser reliability
- [ ] dependency resolution
- [ ] relationship correctness
- [ ] graceful failures

### Frontend

- [ ] component structure
- [ ] graph usability
- [ ] state handling
- [ ] responsive UI

### Database

- [ ] schema correctness
- [ ] indexes where useful
- [ ] relationships
- [ ] query efficiency

### AI

- [ ] grounded explanations
- [ ] no secret leakage
- [ ] proper error handling

---

# 30. Development Checkpoint Rule

After every major phase:

1. Run tests.
2. Run lint/type checks where applicable.
3. Inspect changed files.
4. Review architecture.
5. Commit working code.
6. Update documentation if decisions changed.

Do not continue building on top of a known broken foundation.

---

# 31. Commit Strategy

Use meaningful commits.

Examples:

```text
feat: initialize frontend
feat: initialize backend
feat: add github repository validation
feat: add repository ingestion
feat: add file tree analyzer
feat: add javascript ast analyzer
feat: add dependency analyzer
feat: add relationship engine
feat: add graph api
feat: add interactive graph
feat: add node details
feat: add flow tracing
feat: add ai repository explanation
test: add analyzer coverage
fix: handle unresolved imports
fix: handle large repositories
```

Avoid:

```text
update
changes
final
final2
new
fix stuff
```

---

# 32. AI Tool Sequence

## Lovable

1. UI foundation
2. Repository input
3. Dashboard
4. Graph workspace
5. Node details
6. AI explanation UI
7. UX polish

## Codex

1. Repository inspection
2. Architecture
3. Backend foundation
4. Database
5. GitHub integration
6. Repository ingestion
7. File analyzer
8. AST analyzer
9. Dependency engine
10. Relationship engine
11. API
12. Integration
13. Testing
14. Security
15. Performance
16. Deployment
17. Final audit

## Bolt

Use only for isolated experiments or alternative UI implementations.

---

# 33. Stop Conditions

Every AI coding task must have a stop condition.

Example:

```text
Implement repository validation only.

Do not implement repository analysis.
Do not modify the graph.
Do not add authentication.

Stop after tests pass.
```

This prevents scope creep.

---

# 34. Major Milestones

## Milestone 1

Frontend shell works.

## Milestone 2

GitHub repository validation works.

## Milestone 3

Repository ingestion works.

## Milestone 4

File tree analysis works.

## Milestone 5

AST analysis works.

## Milestone 6

Dependency graph works.

## Milestone 7

Interactive graph works.

## Milestone 8

Node details work.

## Milestone 9

Flow tracing works.

## Milestone 10

AI explanation works.

## Milestone 11

Full application works end-to-end.

## Milestone 12

Testing/security/performance complete.

## Milestone 13

Production deployment complete.

---

# 35. Final MVP Definition

The MVP is complete when:

```text
Public GitHub URL
       ↓
Repository Analysis
       ↓
File/Folder Structure
       ↓
AST Information
       ↓
Dependencies
       ↓
Relationships
       ↓
Interactive Graph
       ↓
Node Details
       ↓
Flow Tracing
       ↓
AI Explanation
```

works against real repositories.

---

# 36. Future Version Ideas

Only after MVP is stable:

- private repositories
- GitHub authentication
- additional programming languages
- architecture comparison between commits
- codebase change visualization
- pull request impact analysis
- dependency risk analysis
- architecture recommendations
- team features
- saved analyses
- repository history
- advanced AI conversations

These are future ideas, not MVP requirements.