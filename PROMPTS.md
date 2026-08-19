# RepoLens — Master Development Prompts

## Purpose

This file contains the exact sequence of prompts to use while building RepoLens with:

- Lovable
- Codex
- Bolt
- GitHub

The prompts are intentionally sequential.

**Do not skip ahead unless the previous milestone is working.**

---

# 0. MASTER RULES

Before using any prompt:

1. The GitHub repository is the source of truth.
2. `PROJECT_CONTEXT.md` is the product/architecture source of truth.
3. `DEVELOPMENT_PLAN.md` is the development sequence.
4. `AGENTS.md` contains coding-agent rules.
5. Codex is the primary engineering agent.
6. Lovable is primarily responsible for frontend/UI.
7. Bolt is primarily for isolated experiments.
8. Do not let multiple tools independently redesign the project.
9. Do not build the entire application in one prompt.
10. After every major milestone, test and commit working code.

---

# PHASE 0 — PROJECT INITIALIZATION

## Prompt 1 — Lovable: Build the Frontend Foundation

### Tool

Lovable

### Goal

Create the initial frontend experience without implementing the real backend.

### Prompt

```text
You are working on the RepoLens project.

Before making changes, understand the project requirements provided in the project context.

RepoLens is a developer tool that helps users understand unfamiliar GitHub repositories.

The core product flow is:

GitHub repository URL
→ repository analysis
→ file/folder structure
→ code relationships
→ interactive graph
→ node details
→ flow tracing
→ AI explanation

Your task is ONLY to create the frontend foundation and UI experience.

Technology requirements:

- React
- Vite
- Tailwind CSS
- React Router
- React Flow for graph visualization

Create a professional developer-tool interface.

Required screens/components:

1. Landing/Home page
2. GitHub repository URL input
3. Repository validation/error states
4. Analysis loading state
5. Repository overview/dashboard
6. File/folder explorer
7. Interactive graph workspace
8. Graph toolbar
9. Node details panel
10. Search UI
11. Relationship filters
12. Flow tracing area
13. AI explanation panel
14. Empty states
15. Error states
16. Responsive layout

The visual design should feel like a serious developer/code-analysis product, not a generic SaaS landing page.

Use reusable components.

Keep graph data mocked only where necessary for UI development.

IMPORTANT:

- Do NOT implement the real GitHub integration.
- Do NOT implement repository analysis.
- Do NOT implement AST parsing.
- Do NOT implement the backend.
- Do NOT create fake APIs pretending to be functional.
- Do NOT introduce another frontend framework.
- Do NOT change the planned architecture.

Use mock/static data only to demonstrate the UI.

After implementation, explain:

1. What files were created or changed.
2. The frontend folder structure.
3. How the major components are organized.
4. Which parts are currently mock data.
5. How the real backend will later connect.

STOP after the frontend foundation is complete.
```

### Success Criteria

- UI works
- routes work
- responsive layout works
- graph workspace exists
- no fake backend behavior
- no backend architecture introduced

---

# PHASE 0B — FRONTEND REVIEW

## Prompt 2 — Lovable: Review Frontend Without Expanding Scope

```text
Review the current RepoLens frontend as a senior frontend engineer.

Do NOT add new product features.

Check:

1. Component structure
2. Reusability
3. Routing
4. State organization
5. Loading states
6. Error states
7. Empty states
8. Responsive behavior
9. Accessibility basics
10. Graph workspace usability
11. Naming consistency
12. Unnecessary duplication
13. Components that are too large

Do not rewrite the application.

Only identify actual issues.

Categorize findings:

CRITICAL
HIGH
MEDIUM
LOW

For each issue provide:

- file
- problem
- why it matters
- recommended fix

Do not implement fixes yet.

STOP after the review.
```

---

# PHASE 1 — GITHUB

## Prompt 3 — Commit and Establish GitHub Source of Truth

### Action

Do this manually after Lovable's frontend is acceptable.

```text
Lovable
↓
GitHub repository
↓
main branch
```

Make sure the repository contains:

```text
PROJECT_CONTEXT.md
DEVELOPMENT_PLAN.md
AGENTS.md
frontend/
```

Do not begin backend implementation until these files exist in the repository.

---

# PHASE 2 — CODEX PROJECT ORIENTATION

## Prompt 4 — Codex: Inspect Before Coding

### Tool

Codex

### Mode

Planning/analysis first.

### Prompt

```text
You are now the primary engineering agent for RepoLens.

Do NOT modify code yet.

First inspect the entire repository.

Read:

- PROJECT_CONTEXT.md
- DEVELOPMENT_PLAN.md
- AGENTS.md
- README.md if present
- frontend structure
- package files
- configuration files

Understand the existing frontend before proposing backend changes.

Produce a detailed implementation plan for the backend and repository-analysis engine.

Analyze:

1. Current frontend architecture
2. Required backend architecture
3. Database architecture
4. REST API design
5. GitHub repository ingestion
6. File/folder analysis
7. JavaScript/TypeScript AST analysis
8. Dependency resolution
9. Relationship model
10. API route analysis
11. Graph data model
12. Frontend/backend integration
13. AI integration
14. Error handling
15. Security
16. Testing
17. Performance considerations

Important constraints:

- Keep the existing technology stack.
- Prefer a modular monolith.
- Do not introduce microservices.
- Do not introduce Kafka.
- Do not introduce Kubernetes.
- Do not introduce Neo4j.
- Do not introduce Redis unless a real requirement appears.
- Do not add authentication yet.
- Do not add payments.
- Do not add team features.
- Initial source-language support is JavaScript/TypeScript/JSX/TSX.
- The analyzer must not execute arbitrary repository code.

If anything conflicts with PROJECT_CONTEXT.md, identify the conflict rather than silently changing the architecture.

At the end provide:

A. Proposed architecture
B. Database schema
C. API list
D. Repository-analysis pipeline
E. Development sequence
F. Risks and limitations

Do not write implementation code.

STOP after the plan.
```

---

# PHASE 3 — BACKEND FOUNDATION

## Prompt 5 — Codex: Backend Skeleton

```text
Context:

RepoLens frontend exists.

The project architecture is defined in:

- PROJECT_CONTEXT.md
- DEVELOPMENT_PLAN.md
- AGENTS.md

Goal:

Create only the backend foundation.

Implement:

1. Node.js backend
2. Express application
3. Environment configuration
4. Basic route structure
5. Controller structure
6. Service structure
7. Middleware structure
8. Central error handling
9. Health endpoint
10. Basic logging
11. CORS configuration appropriate for local development
12. Basic request validation structure
13. Prisma setup
14. PostgreSQL configuration
15. Database connection structure

Suggested structure:

backend/
└── src/
    ├── routes/
    ├── controllers/
    ├── services/
    ├── analyzers/
    ├── middleware/
    ├── utils/
    ├── config/
    └── app.js

Also create/update:

.env.example

Do NOT implement:

- GitHub repository ingestion
- AST analysis
- dependency analysis
- graph generation
- AI
- authentication

The backend must start successfully.

Add a health endpoint such as:

GET /api/health

Success response should clearly indicate the backend is running.

Run appropriate checks/tests.

After implementation explain:

1. Files changed
2. Backend architecture
3. How to start the backend
4. Environment variables
5. How to test the health endpoint

STOP after the backend foundation works.
```

---

# PHASE 4 — DATABASE

## Prompt 6 — Codex: Database Schema

```text
Context:

The backend foundation is working.

Goal:

Create the initial PostgreSQL/Prisma data model for repository analysis.

Use the architecture defined in PROJECT_CONTEXT.md.

Initial conceptual entities:

1. Repository
2. File
3. Symbol
4. Relationship
5. ApiRoute
6. Analysis

Requirements:

Repository should support:

- GitHub URL
- owner
- repository name
- branch
- language
- timestamps

File should support:

- repository
- path
- name
- extension
- type
- size

Symbol should support:

- file
- name
- type
- start line
- end line

Relationship should support:

- repository
- source
- target
- relationship type
- useful metadata

ApiRoute should support:

- repository
- HTTP method
- route path
- source file
- handler information

Analysis should support:

- repository
- status
- timestamps
- useful error/status information

Requirements:

- use Prisma
- create migrations
- create sensible indexes
- use foreign keys appropriately
- avoid unnecessary tables
- avoid premature complexity

Do NOT implement repository analysis.

Do NOT implement APIs beyond what is needed to verify database connectivity.

After implementation:

1. Run migration.
2. Verify database connection.
3. Verify Prisma client.
4. Explain schema decisions.
5. Identify any assumptions.

STOP after the database foundation works.
```

---

# PHASE 5 — GITHUB VALIDATION

## Prompt 7 — Codex: GitHub Repository Validation

```text
Context:

Backend and database foundations are working.

Goal:

Implement public GitHub repository validation only.

Create:

POST /api/repositories/validate

Input:

{
  "url": "https://github.com/owner/repository"
}

Requirements:

1. Validate URL format.
2. Extract owner and repository.
3. Reject unsupported GitHub URLs.
4. Check whether the repository exists.
5. Retrieve basic repository metadata.
6. Handle repository-not-found.
7. Handle malformed URL.
8. Handle GitHub API errors.
9. Handle rate-limit errors.
10. Return clear API responses.

Use a service layer.

Keep controller logic thin.

Do NOT:

- download repository contents
- parse source code
- analyze files
- create graph data
- add AI
- add authentication

Add appropriate tests.

Success criteria:

A valid public repository returns useful metadata.

An invalid/nonexistent repository returns a clean error.

STOP after validation is working and tested.
```

---

# PHASE 6 — REPOSITORY INGESTION

## Prompt 8 — Codex: Repository Ingestion

```text
Context:

GitHub repository validation is working.

Goal:

Implement repository ingestion.

The backend should:

1. Receive a validated public GitHub repository.
2. Retrieve the repository file tree/content.
3. Identify relevant files.
4. Exclude unnecessary/generated files.
5. Identify supported source files.
6. Store repository metadata.
7. Store file metadata.
8. Return analysis status.

Initially ignore:

- .git
- node_modules
- dist
- build
- .next
- coverage
- .env
- .env.*

Supported initial source types:

- .js
- .jsx
- .ts
- .tsx

Handle:

- empty repository
- large repository
- unsupported files
- network errors
- GitHub rate limits
- inaccessible content

IMPORTANT:

Do NOT parse AST yet.

Do NOT detect imports yet.

Do NOT generate graph relationships yet.

Do NOT execute repository code.

The system must only read source files.

After implementation:

- add tests
- test with at least one small public repository
- test invalid/empty/error cases where practical
- explain the ingestion flow

STOP after repository ingestion works.
```

---

# PHASE 7 — FILE TREE

## Prompt 9 — Codex: File/Folder Analysis

```text
Context:

Repository ingestion is working.

Goal:

Build the repository file/folder structure.

Requirements:

Represent:

Repository
→ folders
→ files

For each relevant file capture:

- path
- filename
- extension
- type
- size
- repository

Build a structure that the frontend can later use for a file explorer.

Do NOT implement AST parsing.

Do NOT detect functions.

Do NOT detect imports.

Do NOT implement graph visualization.

Do NOT implement AI.

Add tests for:

- nested folders
- root files
- ignored folders
- supported/unsupported extensions
- duplicate paths

Return a clean structured representation.

STOP after file/folder analysis is tested.
```

---

# PHASE 8 — AST ANALYSIS

## Prompt 10 — Codex: JavaScript/TypeScript AST Analyzer

```text
Context:

Repository file/folder analysis is working.

Goal:

Implement AST-based analysis for:

- JavaScript
- TypeScript
- JSX
- TSX

Use established parser/compiler tooling.

Do not create a custom parser.

Extract, where reliably possible:

1. Imports
2. Exports
3. Functions
4. Classes
5. Methods
6. React components
7. Interfaces/types where applicable
8. Source locations

For each symbol capture:

- name
- type
- file
- start line
- end line

Handle syntax errors gracefully.

A malformed file should not automatically terminate the complete repository analysis.

Do not implement graph visualization.

Do not implement AI.

Do not execute source code.

Add unit tests using small representative source snippets.

Test:

- imports
- named exports
- default exports
- functions
- classes
- methods
- JSX components
- TypeScript constructs
- malformed source

At the end provide:

1. Analyzer architecture
2. Parser choice and reason
3. Extracted data model
4. Test results
5. Known limitations

STOP after AST analysis is working.
```

---

# PHASE 9 — DEPENDENCY ANALYSIS

## Prompt 11 — Codex: Import/Dependency Analyzer

```text
Context:

The AST analyzer is working.

Goal:

Implement file-to-file dependency analysis.

Detect common JavaScript/TypeScript import relationships.

Examples:

Login.jsx
→ imports → auth.js

auth.js
→ imports → api.js

Requirements:

1. Parse import information from AST results.
2. Resolve relative file paths.
3. Resolve supported common extensions.
4. Handle index files where practical.
5. Preserve unresolved imports.
6. Detect circular dependencies.
7. Handle duplicate relationships.
8. Support common aliases only where configuration can be safely understood.

Do not attempt to support every bundler.

Do not implement graph UI.

Do not implement AI.

Do not redesign the database unless necessary.

Relationship type:

IMPORTS

Add tests for:

- relative imports
- nested imports
- extension resolution
- index files
- unresolved imports
- circular dependencies
- aliases where supported

Success criteria:

Given a normal JS/TS repository, the analyzer produces a useful file dependency graph.

STOP after dependency analysis is tested.
```

---

# PHASE 10 — SYMBOL RELATIONSHIPS

## Prompt 12 — Codex: Symbol Relationship Engine

```text
Context:

The repository now has:

- files
- AST symbols
- imports
- dependencies

Goal:

Build a normalized relationship engine.

Initial relationship types:

CONTAINS
IMPORTS
EXPORTS
CALLS
USES
EXTENDS
IMPLEMENTS

Requirements:

1. Connect files to contained symbols.
2. Connect classes to methods.
3. Connect imports to source files.
4. Detect useful local symbol references where reliably possible.
5. Preserve relationship metadata.
6. Remove duplicate relationships.
7. Never invent relationships.
8. Mark unresolved references appropriately if useful.

Do not attempt perfect static call-graph analysis.

Prefer reliable relationships over aggressive guessing.

Do not implement frontend graph visualization.

Do not implement AI.

Add unit tests.

Success criteria:

The same normalized relationship model can represent:

File → File
File → Function
File → Class
Class → Method
Function → Function

STOP after the relationship engine works.
```

---

# PHASE 11 — API ANALYSIS

## Prompt 13 — Codex: Express API Relationship Detection

```text
Context:

The relationship engine is working.

Goal:

Detect common Express-style API routes.

Initially support common patterns such as:

router.get("/users", getUsers)

app.get("/users", getUsers)

router.post("/users", createUser)

Requirements:

Extract where reliably possible:

- HTTP method
- route path
- source file
- handler name
- route declaration

Create API route entities.

Create relationships such as:

HANDLES_ROUTE
CALLS_API

Where the relationship can be reliably determined.

Do not attempt to support every framework.

Do not claim a route exists when the analyzer cannot establish it.

Do not implement frontend visualization.

Do not implement AI.

Add tests for common Express patterns.

STOP after API route analysis is tested.
```

---

# PHASE 12 — COMPLETE ANALYSIS PIPELINE

## Prompt 14 — Codex: Build the Analysis Orchestrator

```text
Context:

The following subsystems now exist:

- GitHub validation
- repository ingestion
- file/folder analysis
- AST analysis
- dependency analysis
- symbol relationship engine
- API route analysis

Goal:

Create the analysis orchestrator.

The pipeline should be:

GitHub repository
→ ingestion
→ file filtering
→ AST parsing
→ symbol extraction
→ dependency extraction
→ relationship generation
→ API route detection
→ graph construction
→ persistence

Requirements:

1. Keep stages modular.
2. Avoid one giant service.
3. Track analysis status.
4. Handle recoverable file-level failures.
5. Record useful errors.
6. Do not execute repository code.
7. Avoid duplicate parsing.
8. Avoid duplicate relationships.
9. Make the pipeline testable.

Analysis status should distinguish at least:

PENDING
RUNNING
COMPLETED
FAILED
PARTIAL

Do not build AI yet.

Do not build the final graph UI yet.

Add integration tests for the complete analyzer pipeline.

STOP after a complete repository can be analyzed into structured data.
```

---

# PHASE 13 — GRAPH BUILDER

## Prompt 15 — Codex: Build Graph Data

```text
Context:

The analysis pipeline now produces structured repository information.

Goal:

Convert analysis information into frontend-friendly graph data.

Use:

{
  "nodes": [],
  "edges": []
}

Node types may include:

Repository
Folder
File
Function
Class
Method
Component
API Route

Each node should contain only useful metadata.

Edges should contain:

source
target
relationshipType
metadata

Requirements:

1. Generate deterministic node IDs.
2. Generate deterministic relationship IDs where appropriate.
3. Remove duplicates.
4. Preserve relationship types.
5. Support filtering by relationship type.
6. Support retrieving connections for a selected node.
7. Keep graph generation independent from React.
8. Keep graph generation testable.

Do not implement React Flow yet.

Do not implement AI.

Add tests for:

- simple file dependency
- multi-level dependencies
- symbol relationships
- API relationships
- duplicate relationships
- disconnected nodes

STOP after backend graph generation is tested.
```

---

# PHASE 14 — GRAPH API

## Prompt 16 — Codex: Expose Analysis APIs

```text
Context:

The analysis engine and graph builder are working.

Goal:

Expose the analysis data through REST APIs.

Implement:

POST /api/repositories/analyze

GET /api/repositories/:id

GET /api/repositories/:id/files

GET /api/repositories/:id/graph

GET /api/repositories/:id/relationships

GET /api/repositories/:id/routes

GET /api/nodes/:id

GET /api/nodes/:id/relationships

Requirements:

- consistent response structure
- validation
- useful error messages
- thin controllers
- service-layer business logic
- correct HTTP status codes
- no secrets in responses

The graph endpoint should return data suitable for React Flow.

Do not implement AI yet.

Do not redesign the frontend.

Add API tests.

STOP after all required endpoints work.
```

---

# PHASE 15 — FRONTEND/BACKEND CONNECTION

## Prompt 17 — Codex: Integrate the Real Backend

```text
Context:

The frontend exists.

The backend analysis APIs now work.

Goal:

Replace frontend mock repository/graph data with real API data.

Connect:

1. GitHub URL input
2. Repository validation
3. Repository analysis
4. Analysis status
5. Repository overview
6. File explorer
7. Graph
8. Node details

Requirements:

- preserve the existing frontend design
- use the existing API service layer
- handle loading states
- handle errors
- handle empty results
- handle partial analysis
- do not duplicate API logic inside components

Do NOT add AI yet.

Do NOT redesign the entire UI.

Do NOT modify analyzer architecture.

After implementation:

1. Run frontend checks.
2. Run backend tests.
3. Test with a real public repository.
4. Explain the complete frontend → backend data flow.

STOP after real repository data is displayed successfully.
```

---

# PHASE 16 — REACT FLOW

## Prompt 18 — Codex: Interactive Graph

```text
Context:

The frontend now receives real graph data from the backend.

Goal:

Implement the interactive graph using React Flow.

Required features:

1. Zoom
2. Pan
3. Node selection
4. Edge display
5. Search
6. Relationship filters
7. Connected-node highlighting
8. Focus selected node
9. Useful graph controls
10. Minimap if it improves usability

Node appearance should reflect node type.

Edge appearance should reflect relationship type without becoming visually confusing.

Requirements:

- graph data must remain backend-driven
- do not move analysis logic into React
- do not hardcode repository relationships
- support empty graphs gracefully
- support moderately large graphs

Do not add AI yet.

Do not change backend relationship logic.

Test the graph with multiple repository sizes.

STOP after the interactive graph is stable.
```

---

# PHASE 17 — NODE DETAILS

## Prompt 19 — Codex: Node Details and Relationship Inspector

```text
Context:

Interactive graph is working.

Goal:

Make node selection useful.

When the user selects a node, show a details panel.

Depending on node type display:

- name
- type
- file path
- source location
- imports
- imported by
- contained functions
- contained classes
- related symbols
- API route information
- connected relationships

Requirements:

1. Selecting a node updates the details panel.
2. Connected nodes can be highlighted.
3. Relationships can be inspected.
4. Missing metadata is handled gracefully.
5. The UI remains responsive.

Do not add AI yet.

Do not modify the analyzer unless a genuine missing data requirement is discovered.

If backend data is insufficient, identify exactly what is missing before changing backend architecture.

STOP after node inspection works.
```

---

# PHASE 18 — FLOW TRACING

## Prompt 20 — Codex: Flow Tracing

```text
Context:

RepoLens can display relationships and node details.

Goal:

Allow the user to trace supported application flows.

Example:

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
↓
UserRepository

Requirements:

1. User can choose a starting node.
2. System identifies connected relationships.
3. Display a readable relationship path.
4. Highlight the path in the graph.
5. Show relationship types.
6. Avoid infinite traversal.
7. Handle cycles.
8. Limit traversal depth sensibly.
9. Do not claim a path if relationships are uncertain.

Implement this using existing graph/relationship data.

Do not use AI to invent the flow.

AI will explain the flow later.

Add tests for:

- linear flow
- branching flow
- circular graph
- disconnected node

STOP after deterministic flow tracing works.
```

---

# PHASE 19 — AI FOUNDATION

## Prompt 21 — Codex: AI Service

```text
Context:

RepoLens now has structured repository analysis, graph data, node details and flow tracing.

Goal:

Add an AI service as an explanation layer.

IMPORTANT:

AI must not be responsible for discovering repository facts.

The analyzer is the source of facts.

Pipeline:

Repository analysis
→ structured facts
→ selected context
→ AI
→ explanation

Create a backend AI service.

Requirements:

1. Keep AI API credentials server-side.
2. Use environment variables.
3. Do not expose API keys to frontend.
4. Create clear prompt templates.
5. Send only relevant structured information.
6. Avoid sending secrets.
7. Handle AI API failures.
8. Handle timeouts.
9. Return useful errors.
10. Keep AI provider logic isolated from controllers.

Do not implement the UI yet.

Do not build a general chatbot.

Create service methods for:

- explainRepository
- explainNode
- explainFlow

The AI must be instructed:

- do not invent repository facts
- distinguish confirmed facts from inference
- say when information is unavailable
- explain technical concepts clearly
- base explanations on supplied structured data

Add tests for prompt construction and service error handling.

STOP after the AI backend service is working.
```

---

# PHASE 20 — AI REPOSITORY EXPLANATION

## Prompt 22 — Codex: Explain Repository

```text
Context:

The AI service is working.

Goal:

Implement repository-level AI explanation.

Endpoint:

POST /api/ai/explain/repository

Input should identify the repository/analysis.

The backend should collect relevant structured information such as:

- repository metadata
- file structure summary
- major directories
- languages
- important files
- symbols
- relationships
- API routes
- important graph information

Do not send unnecessary raw source code.

The AI response should explain, where supported:

1. Project overview
2. Architecture
3. Frontend
4. Backend
5. Important modules
6. API structure
7. Important application flows
8. Key relationships

The explanation must clearly avoid unsupported claims.

Add error handling and tests.

Do not implement node-specific explanation yet.

STOP after repository explanation works.
```

---

# PHASE 21 — AI NODE EXPLANATION

## Prompt 23 — Codex: Explain Selected Node

```text
Context:

RepoLens can select any analyzed graph node.

Goal:

Implement:

POST /api/ai/explain/node

Input:

- repository/analysis ID
- node ID

The backend should retrieve relevant structured information for the selected node.

Provide AI with:

- node metadata
- source file information
- relationships
- imports
- imported-by relationships
- contained symbols
- related API information where applicable

The AI should explain:

1. What this node appears to do.
2. Its role in the application.
3. What it depends on.
4. What depends on it.
5. Important functions/classes.
6. Relevant application flows.
7. Any uncertainty.

Do not provide unrelated repository information unless needed for context.

Do not invent missing relationships.

Add tests.

STOP after selected-node explanation works.
```

---

# PHASE 22 — AI FLOW EXPLANATION

## Prompt 24 — Codex: Explain Selected Flow

```text
Context:

RepoLens now supports deterministic flow tracing.

Goal:

Implement:

POST /api/ai/explain/flow

Input:

- repository/analysis ID
- selected flow/path

The flow itself must come from the relationship engine.

AI must NOT construct the path.

Provide AI with:

- ordered nodes
- relationship types
- relevant metadata
- API information
- relevant source locations

The AI should explain:

1. Where the flow begins.
2. What each major step does.
3. Why the steps are connected.
4. Where API boundaries exist.
5. Where data moves between layers.
6. What the final operation appears to accomplish.
7. Any uncertain step.

If a relationship is not established, do not present it as confirmed.

STOP after flow explanation works.
```

---

# PHASE 23 — FULL END-TO-END INTEGRATION

## Prompt 25 — Codex: Connect Everything

```text
RepoLens now contains:

- frontend
- backend
- PostgreSQL
- GitHub integration
- repository ingestion
- file/folder analysis
- AST analysis
- dependency analysis
- relationship engine
- API analysis
- graph builder
- graph APIs
- React Flow
- node details
- flow tracing
- AI explanation

Goal:

Test and integrate the complete user journey.

Required flow:

User opens RepoLens
→ enters public GitHub URL
→ validates repository
→ starts analysis
→ sees analysis progress/status
→ receives repository result
→ sees dashboard
→ opens file explorer
→ opens interactive graph
→ searches for a node
→ selects node
→ sees relationships
→ traces a supported flow
→ asks AI to explain repository
→ asks AI to explain selected node
→ asks AI to explain selected flow

Do not add new product features.

Find integration problems.

Fix only issues necessary for the complete flow.

After fixing:

- run frontend checks
- run backend tests
- run integration tests
- test with real repositories
- inspect git diff

Report:

1. What works
2. What does not work
3. Known limitations
4. Remaining technical debt

STOP after the end-to-end flow works.
```

---

# PHASE 24 — SECURITY REVIEW

## Prompt 26 — Codex: Security Audit

```text
Perform a security review of the entire RepoLens application.

Do NOT rewrite the application.

Check:

1. GitHub URL validation
2. Request validation
3. API authentication assumptions
4. CORS
5. environment variables
6. AI API key exposure
7. secret-file handling
8. repository content handling
9. arbitrary code execution risks
10. path traversal risks
11. unsafe file handling
12. malicious repository content
13. XSS risks from repository-derived data
14. oversized repository attacks
15. oversized request attacks
16. rate limiting
17. error message leakage
18. database query safety
19. AI prompt/data leakage

Important:

RepoLens must analyze repository source code without executing the repository.

Classify findings:

CRITICAL
HIGH
MEDIUM
LOW

For each finding provide:

- location
- issue
- impact
- recommended fix

Do not implement fixes yet.

STOP after the audit.
```

---

# PHASE 25 — PERFORMANCE REVIEW

## Prompt 27 — Codex: Performance Audit

```text
Review RepoLens for performance problems.

Do not introduce complex infrastructure unless measurements justify it.

Check:

1. Repository ingestion
2. File filtering
3. AST parsing
4. duplicate parsing
5. dependency resolution
6. relationship generation
7. database queries
8. graph generation
9. graph payload size
10. frontend graph rendering
11. node selection
12. search/filter performance
13. AI context size

Pay particular attention to repositories with:

- 100 files
- 500 files
- 1000+ files

Identify bottlenecks.

Categorize:

CRITICAL
HIGH
MEDIUM
LOW

Recommend simple solutions first.

Do not implement fixes yet.

STOP after the audit.
```

---

# PHASE 26 — TESTING

## Prompt 28 — Codex: Complete Test Pass

```text
Perform a complete test pass of RepoLens.

Test:

## Repository

- valid GitHub URL
- invalid URL
- missing repository
- empty repository
- large repository

## Analyzer

- JavaScript
- TypeScript
- JSX
- TSX
- imports
- exports
- functions
- classes
- methods
- components
- malformed source
- unresolved imports
- circular dependencies

## Relationships

- CONTAINS
- IMPORTS
- EXPORTS
- CALLS where supported
- USES
- API relationships

## Graph

- nodes
- edges
- selection
- filtering
- search
- connected highlighting
- flow tracing

## AI

- repository explanation
- node explanation
- flow explanation
- AI failure
- timeout
- malformed response

## Frontend

- loading
- errors
- empty states
- responsive behavior

## Backend

- API validation
- errors
- database failures

Fix actual failures.

Do not add new product features.

After completion provide:

1. Tests run
2. Tests passed
3. Tests failed
4. Fixes made
5. Remaining limitations

STOP after the test pass.
```

---

# PHASE 27 — CODE QUALITY REVIEW

## Prompt 29 — Codex: Senior Engineer Review

```text
Review the entire RepoLens codebase as a senior full-stack engineer.

Do NOT rewrite the project.

Check:

1. Architecture
2. Folder structure
3. Separation of concerns
4. Duplicate code
5. Large components
6. Large services
7. API consistency
8. Database design
9. Analyzer architecture
10. Relationship engine
11. Error handling
12. Security
13. Performance
14. Testing
15. Documentation
16. Maintainability
17. Naming
18. Unnecessary dependencies
19. Unnecessary complexity
20. Dead code

Classify issues:

CRITICAL
HIGH
MEDIUM
LOW

For each issue provide:

- file/location
- problem
- why it matters
- recommended solution

Do not implement fixes yet.

STOP after the review.
```

---

# PHASE 28 — FIX REVIEW FINDINGS

## Prompt 30 — Codex: Fix Approved Issues

```text
Use the senior engineering review from the previous step.

Only fix issues that are:

- CRITICAL
- HIGH

Do not automatically fix every MEDIUM/LOW issue.

Before each major fix:

1. Explain what will change.
2. Explain why.
3. Identify affected files.

Implement fixes while preserving the existing architecture.

After fixes:

- run tests
- run lint/type checks
- inspect git diff
- verify existing functionality

Do not add new features.

STOP after approved critical/high issues are fixed.
```

---

# PHASE 29 — DOCUMENTATION

## Prompt 31 — Codex: Final Documentation

```text
Update the documentation so it accurately describes the current RepoLens implementation.

Create/update:

README.md
docs/ARCHITECTURE.md
docs/API.md
docs/ANALYSIS.md

README should include:

1. Project overview
2. Problem statement
3. Features
4. Architecture
5. Technology stack
6. Repository analysis pipeline
7. Supported languages
8. Local setup
9. Environment variables
10. Running frontend
11. Running backend
12. Database setup
13. Testing
14. Limitations
15. Future improvements

ARCHITECTURE.md should describe the actual implementation.

API.md should describe actual endpoints.

ANALYSIS.md should describe:

- file analysis
- AST analysis
- dependency analysis
- relationship types
- API analysis
- graph generation
- known limitations

Do not document features that do not exist.

STOP after documentation accurately reflects the codebase.
```

---

# PHASE 30 — UI POLISH

## Prompt 32 — Lovable: Final UI Polish

### Tool

Lovable

### Important

Do this only after backend functionality is stable.

```text
RepoLens is now functionally implemented.

Improve the frontend UI/UX only.

Do NOT change:

- backend architecture
- API contracts
- database schema
- analyzer logic
- relationship model
- graph data format

Improve:

1. visual hierarchy
2. spacing
3. typography
4. navigation
5. loading experience
6. graph controls
7. node details
8. search
9. filters
10. empty states
11. error states
12. responsive behavior
13. accessibility
14. subtle animations where useful

The application should feel like a professional developer tool.

Avoid excessive animations.

Do not add unrelated product features.

Do not replace the existing technology stack.

After changes:

1. Explain what changed.
2. List affected frontend files.
3. Confirm that API contracts were not changed.

STOP after UI polish.
```

---

# PHASE 31 — OPTIONAL BOLT EXPERIMENT

## Prompt 33 — Bolt: Isolated UI Experiment

### Tool

Bolt

### Important

This is OPTIONAL.

Use Bolt only when a specific UI interaction needs experimentation.

```text
This is an isolated UI experiment for RepoLens.

Do NOT redesign the complete application.

Experiment with the following specific interaction:

[INSERT ONE SPECIFIC UI PROBLEM]

Current behavior:

[DESCRIBE CURRENT BEHAVIOR]

Desired behavior:

[DESCRIBE DESIRED BEHAVIOR]

Constraints:

- React
- existing RepoLens visual direction
- do not change backend APIs
- do not change database
- do not change graph data model
- do not introduce unnecessary dependencies

Produce only the isolated frontend implementation.

At the end explain:

1. Files changed
2. Dependencies added
3. How this differs from the current implementation
4. Whether it is safe to integrate

STOP after the experiment.
```

---

# PHASE 32 — CODEX INTEGRATES BOLT EXPERIMENT

## Prompt 34 — Codex: Review and Integrate Experiment

```text
A separate UI experiment was created for RepoLens.

Do not blindly copy it into the project.

First compare the experiment with the current implementation.

Evaluate:

1. Does it solve the intended problem?
2. Does it follow the existing architecture?
3. Does it introduce unnecessary dependencies?
4. Does it break existing behavior?
5. Does it affect API contracts?
6. Does it affect graph data?
7. Is it maintainable?
8. Does it improve the user experience?

If the experiment is not clearly better, do not integrate it.

If it is better:

- integrate only the necessary parts
- preserve existing architecture
- remove unnecessary code
- run tests
- inspect git diff

Do not redesign unrelated parts.

STOP after the decision/integration.
```

---

# PHASE 33 — DEPLOYMENT PREPARATION

## Prompt 35 — Codex: Production Readiness

```text
Prepare RepoLens for deployment.

Do not change product scope.

Check:

Frontend:

- production build
- environment variables
- API base URL
- routing
- error handling

Backend:

- production configuration
- CORS
- environment variables
- logging
- health endpoint
- error handling
- database connection

Database:

- production migration
- connection configuration

AI:

- server-side API key
- production configuration
- failure handling

Security:

- no secrets in repository
- .env ignored
- .env.example complete

Create a production readiness checklist.

Do not deploy yet.

STOP after preparation and verification.
```

---

# PHASE 34 — FINAL DEPLOYMENT

## Prompt 36 — Codex: Deployment

```text
Deploy RepoLens using the simple deployment architecture defined in PROJECT_CONTEXT.md.

Preferred:

Frontend:
Vercel

Backend:
Render or Railway

Database:
Neon or Supabase PostgreSQL

Before deployment verify:

1. production environment variables
2. database connection
3. migrations
4. backend health endpoint
5. CORS
6. frontend API URL
7. AI configuration
8. production build

Deploy the backend first.

Verify backend health.

Then deploy frontend.

Verify:

GitHub URL
→ validation
→ analysis
→ graph
→ node details
→ flow tracing
→ AI explanation

Do not introduce new infrastructure.

Report:

- deployed frontend
- deployed backend
- database status
- environment variables required
- known limitations
- verification results

STOP after deployment verification.
```

---

# PHASE 35 — FINAL PROJECT AUDIT

## Prompt 37 — Codex: Final Audit

```text
This is the final RepoLens audit.

Do not add features.

Review the complete production-ready project.

Verify:

PRODUCT

- core user journey works
- repository analysis works
- graph works
- node inspection works
- flow tracing works
- AI explanation works

FRONTEND

- responsive
- usable
- loading states
- error states
- empty states
- graph usability

BACKEND

- API consistency
- error handling
- validation
- security
- logging

ANALYZER

- repository ingestion
- file analysis
- AST analysis
- dependency analysis
- relationship engine
- API analysis

DATABASE

- schema
- relationships
- indexes
- migrations

AI

- grounded explanations
- no secret leakage
- error handling

TESTING

- unit
- integration
- end-to-end

DEPLOYMENT

- frontend
- backend
- database
- environment variables

DOCUMENTATION

- README
- architecture
- API
- analysis

Categorize remaining problems:

CRITICAL
HIGH
MEDIUM
LOW

For each remaining problem provide:

- location
- issue
- impact
- recommended action

Do not fix anything automatically.

STOP after the audit.
```

---

# PHASE 36 — FINAL PORTFOLIO CHECK

## Prompt 38 — Codex: Portfolio Quality Review

```text
Review RepoLens specifically as a portfolio project.

Do not change functionality.

Evaluate whether the project demonstrates:

1. Full-stack development
2. REST API design
3. PostgreSQL/database knowledge
4. GitHub API integration
5. AST/code analysis
6. Dependency analysis
7. Graph/data visualization
8. React architecture
9. Backend architecture
10. AI integration
11. Testing
12. Security
13. Deployment
14. Documentation

Identify:

A. Strongest technical aspects
B. Weakest aspects
C. What should be demonstrated in the README
D. What should be shown in a project demo
E. What an interviewer may ask
F. Technical limitations we should openly document
G. Three strongest features to highlight on a resume

Do not add features.

STOP after the portfolio review.
```

---

# FINAL DEVELOPMENT ORDER

The prompts must be executed in this order:

```text
1.  Lovable — Frontend Foundation
2.  Lovable — Frontend Review
3.  GitHub — Establish Source of Truth

4.  Codex — Repository Inspection
5.  Codex — Backend Foundation
6.  Codex — Database
7.  Codex — GitHub Validation
8.  Codex — Repository Ingestion
9.  Codex — File/Folder Analysis
10. Codex — AST Analysis
11. Codex — Dependency Analysis
12. Codex — Symbol Relationships
13. Codex — API Analysis
14. Codex — Analysis Orchestrator
15. Codex — Graph Builder
16. Codex — Graph APIs
17. Codex — Frontend Integration
18. Codex — React Flow
19. Codex — Node Details
20. Codex — Flow Tracing
21. Codex — AI Service
22. Codex — AI Repository Explanation
23. Codex — AI Node Explanation
24. Codex — AI Flow Explanation
25. Codex — Full Integration
26. Codex — Security Audit
27. Codex — Performance Audit
28. Codex — Testing
29. Codex — Code Quality Review
30. Codex — Fix Approved Issues
31. Codex — Documentation
32. Lovable — UI Polish
33. Bolt — Optional Experiment
34. Codex — Integrate Bolt Experiment
35. Codex — Production Preparation
36. Codex — Deployment
37. Codex — Final Audit
38. Codex — Portfolio Review
```

---

# CRITICAL CHECKPOINTS

Do NOT proceed if these milestones are broken.

## Checkpoint 1

```text
Lovable UI
      ↓
GitHub
```

Frontend works.

---

## Checkpoint 2

```text
GitHub URL
      ↓
Backend
      ↓
Repository validation
```

Validation works.

---

## Checkpoint 3

```text
GitHub Repository
      ↓
Ingestion
      ↓
File Tree
```

Real repository structure works.

---

## Checkpoint 4

```text
Source Files
      ↓
AST
      ↓
Symbols + Imports
```

Analysis works.

---

## Checkpoint 5

```text
Files
 ↓
Relationships
 ↓
Graph JSON
```

Graph data works.

---

## Checkpoint 6

```text
Graph JSON
 ↓
React Flow
```

Visualization works.

---

## Checkpoint 7

```text
Node
 ↓
Relationships
 ↓
Flow
```

Code understanding works.

---

## Checkpoint 8

```text
Structured Facts
 ↓
AI
 ↓
Explanation
```

AI works.

---

## Checkpoint 9

```text
GitHub URL
 ↓
Complete Analysis
 ↓
Graph
 ↓
Node
 ↓
Flow
 ↓
AI
```

The whole product works.

---

# ABSOLUTE RULES FOR ALL CODING AGENTS

```text
RULE 1
Read project context before major changes.

RULE 2
Never build the entire application in one prompt.

RULE 3
Never silently change the architecture.

RULE 4
Never invent analyzer relationships.

RULE 5
Never execute an untrusted repository.

RULE 6
Never expose secrets.

RULE 7
Never add unnecessary technologies.

RULE 8
Do not let AI become the source of repository facts.

RULE 9
Test before moving to the next major phase.

RULE 10
Do not modify unrelated features.

RULE 11
GitHub is the source of truth.

RULE 12
Codex is the primary engineering agent.

RULE 13
Lovable is primarily the UI/frontend agent.

RULE 14
Bolt is primarily for isolated experiments.

RULE 15
If something is uncertain, inspect the existing code and project documents before guessing.
```

# END STATE

The final RepoLens experience should be:

```text
                    REPO LENS

                GitHub Repository
                       │
                       ↓
                 Analyze Codebase
                       │
                       ↓
              ┌──────────────────┐
              │ Repository        │
              │ Overview          │
              └────────┬─────────┘
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        File Explorer       Architecture Graph
                                 │
                         ┌───────┴────────┐
                         ↓                ↓
                     Select Node      Search/Filter
                         │
                         ↓
                   Node Details
                         │
                         ↓
                   Trace Flow
                         │
                         ↓
                 AI Explanation

The core promise:

"Give me a GitHub repository and help me understand how its codebase works."
```

This is the complete development prompt sequence for the current RepoLens scope.