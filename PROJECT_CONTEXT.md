# RepoLens — Project Context

## 1. Project Identity

**Project Name:** RepoLens

**Project Type:** Full-stack developer tool / AI-powered codebase analysis platform

**Primary Purpose:**

RepoLens helps developers understand unfamiliar GitHub repositories by analyzing their structure and code relationships and presenting those relationships through an interactive visual interface with AI-generated explanations.

### Core Product Statement

> Give RepoLens a public GitHub repository URL and it will analyze the codebase, build an interactive representation of its structure and relationships, and explain how important parts of the application work.

---

# 2. Problem Statement

Understanding an unfamiliar software repository can be difficult.

A developer may need to manually inspect:

- folders
- files
- imports
- functions
- classes
- components
- services
- API routes
- controllers
- database-related code
- relationships between these pieces

RepoLens should reduce this effort by automatically analyzing the repository and presenting the important relationships in a way that is easier to understand.

The goal is not simply to display a graph.

The goal is:

> **Understand the codebase visually and through explanations.**

---

# 3. Target Users

Primary users:

- Developers
- Students learning software architecture
- Developers joining an unfamiliar project
- Developers reviewing an existing codebase
- Technical interview / portfolio users
- Anyone who wants a high-level understanding of a repository

The initial product should prioritize developers trying to understand unfamiliar codebases.

---

# 4. Core User Journey

The primary flow is:

```text
User
  ↓
Provides public GitHub repository URL
  ↓
Repository validation
  ↓
Repository ingestion
  ↓
File/folder analysis
  ↓
AST/code analysis
  ↓
Relationship extraction
  ↓
Graph generation
  ↓
Repository dashboard
  ↓
Interactive visualization
  ↓
User selects a node/file/function
  ↓
Relationship details
  ↓
AI explanation
```

---

# 5. Product Goals

RepoLens should allow a user to:

1. Enter a public GitHub repository URL.
2. Validate the repository.
3. Analyze its folder and file structure.
4. Identify supported code elements.
5. Identify imports and dependencies.
6. Identify functions, classes, methods and components where reliably detectable.
7. Identify API relationships where reliably detectable.
8. Build relationships between analyzed entities.
9. Visualize relationships interactively.
10. Search for files, symbols and important entities.
11. Select a node and inspect its relationships.
12. Trace important application flows.
13. Ask AI to explain the repository.
14. Ask AI to explain a selected node.
15. Ask AI to explain a selected flow.

---

# 6. MVP Scope

## 6.1 Must Have

### Repository Input

- Public GitHub repository URL
- URL validation
- Repository existence validation
- Useful validation errors

### Repository Ingestion

- Fetch/read public repository
- Identify repository metadata
- Read relevant files
- Ignore unnecessary/generated files

Initially ignore:

```text
.git/
node_modules/
dist/
build/
.next/
coverage/
.env
.env.*
```

The exact ignore list may be extended when required.

### Initial Language Support

The MVP focuses on:

- JavaScript
- TypeScript
- JSX
- TSX

The analyzer should be designed so additional languages can be added later.

---

# 7. Code Analysis

The system should analyze supported source files.

Initially detect, where reliably possible:

- imports
- exports
- functions
- classes
- methods
- React components
- interfaces/types where applicable
- basic function relationships
- basic API routes

The analyzer should use AST-based parsing rather than relying only on text matching.

The system should prioritize useful and reliable relationships over attempting to perfectly understand every possible language feature.

---

# 8. Relationship Model

The core relationship model should support relationships such as:

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

Not every relationship will be available for every repository.

The analyzer must not invent relationships.

If a relationship cannot be reliably determined, it should be omitted or marked as unresolved rather than fabricated.

---

# 9. Relationship Levels

RepoLens should progressively understand the repository at several levels.

## Level 1 — Folder Relationships

Example:

```text
src/
 ├── components/
 ├── pages/
 ├── hooks/
 ├── services/
 ├── utils/
 └── api/
```

## Level 2 — File Relationships

Example:

```text
Login.jsx
    ↓
auth.js
    ↓
api.js
```

## Level 3 — Symbol Relationships

Example:

```text
UserController
      ↓
getUser()
      ↓
UserService
      ↓
findUserById()
      ↓
UserRepository
```

## Level 4 — API Relationships

Example:

```text
React Component
      ↓
fetch("/api/users")
      ↓
Express Route
      ↓
Controller
      ↓
Service
      ↓
Repository
```

The deeper levels should only be shown when the analyzer has enough reliable information.

---

# 10. Interactive Visualization

The visualization is a core product feature.

Use a graph visualization library such as React Flow.

The graph should support:

- zoom
- pan
- node selection
- edge visualization
- node search
- filtering
- highlighting connected nodes
- focus on selected node
- readable layout
- collapsing/grouping where practical
- minimap where useful

The UI should avoid becoming unusable for moderately large repositories.

---

# 11. Node Types

The initial graph may contain:

```text
Repository
Folder
File
Function
Class
Method
Component
API Route
```

The actual graph should only include entities successfully detected by the analyzer.

---

# 12. Node Details

When the user selects a node, display useful metadata.

Example:

```text
UserService

Type:
Service

File:
src/services/UserService.js

Imports:
- UserModel
- AuthService
- Logger

Imported By:
- UserController
- AdminController

Functions:
- getUser()
- createUser()
- deleteUser()
```

The exact information depends on the node type.

---

# 13. Flow Tracing

RepoLens should support tracing important relationships.

Example:

```text
Login.jsx
   ↓
loginUser()
   ↓
authService.js
   ↓
POST /api/login
   ↓
authController.js
   ↓
UserService
   ↓
UserRepository
   ↓
PostgreSQL
```

The system should only display a flow when enough relationships can be established.

Flow tracing is intended to help users understand how logic travels through the application.

---

# 14. Repository Dashboard

After analysis, display a repository overview.

Possible metrics:

- repository name
- primary languages
- number of relevant files
- number of folders
- number of functions
- number of classes
- number of components
- number of API routes
- number of relationships
- major directories
- analysis status

Avoid meaningless metrics just to increase the dashboard size.

---

# 15. AI Features

AI is an explanation layer over the structured analysis.

The AI should not be responsible for discovering the repository structure from scratch.

The pipeline should be:

```text
Repository
    ↓
Analyzer
    ↓
Structured facts
    ↓
Relationships
    ↓
Graph
    ↓
AI explanation
```

## Feature A — Explain Repository

The AI should generate a useful overview containing, where available:

```text
Project Overview
Architecture
Frontend
Backend
Database-related components
Authentication-related components
Major Modules
Important Files
Important Relationships
Important Application Flows
```

The AI must distinguish between:

- facts discovered by the analyzer
- reasonable interpretation
- uncertain/inferred information

It must not present guesses as confirmed facts.

---

# 16. AI Feature B — Explain Selected Node

Example:

```text
Selected:
UserService
```

AI should explain:

- what it appears to do
- where it is located
- what it depends on
- what depends on it
- important functions
- its role in the application
- relevant flows

---

# 17. AI Feature C — Explain Selected Flow

Example:

```text
Login.jsx
 ↓
authService
 ↓
POST /api/login
 ↓
authController
 ↓
UserService
```

AI explains the flow in simple developer-friendly language.

---

# 18. AI Safety / Accuracy Rules

AI must not:

- invent files
- invent functions
- invent API routes
- invent relationships
- claim unsupported architecture
- claim a database exists when the analyzer cannot establish it
- expose secrets
- send `.env` contents to an AI provider

AI explanations should be generated from structured repository analysis whenever possible.

---

# 19. Technology Stack

The project intentionally uses common, maintainable technologies.

## Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- React Flow

## Backend

- Node.js
- Express.js

## Database

- PostgreSQL
- Prisma ORM

## Repository Integration

- GitHub API / public GitHub repository access

## Code Analysis

- AST-based JavaScript/TypeScript analysis
- Appropriate established parser/compiler APIs

## AI

- External LLM API through a backend-controlled AI service

## Testing

Use normal ecosystem testing tools appropriate for the selected implementation.

## Deployment

Preferred simple deployment model:

```text
Frontend → Vercel
Backend → Render / Railway
Database → Neon / Supabase PostgreSQL
```

The exact provider may change without changing the application architecture.

---

# 20. Architecture

```text
                     USER
                       │
                       ↓
              React + Vite Frontend
                       │
                       ↓
                  REST API
                       │
                       ↓
                Node + Express
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
 GitHub Service    Analyzer        AI Service
        │              │              │
        ↓              ↓              │
   GitHub API      AST Analysis       │
                       │              │
                ┌──────┴──────┐       │
                ↓             ↓       │
          File Analyzer  Relationship │
                            Engine     │
                │             │        │
                └──────┬──────┘        │
                       ↓               │
                  Graph Builder        │
                       │               │
                       ↓               │
                  PostgreSQL            │
                       │               │
                       ↓               │
                   Graph API            │
                       │               │
                       ↓               │
                  React Flow            │
                       │               │
                       └──────→ AI ←───┘
```

---

# 21. Repository Analysis Pipeline

```text
GitHub URL
    ↓
Validate URL
    ↓
Validate Repository
    ↓
Fetch Repository
    ↓
Filter Files
    ↓
Build File Tree
    ↓
Parse Supported Source Files
    ↓
Extract Symbols
    ↓
Extract Imports / Exports
    ↓
Resolve Dependencies
    ↓
Detect Relationships
    ↓
Detect API Routes
    ↓
Build Normalized Graph
    ↓
Persist/Cache Analysis
    ↓
Return Structured Result
```

---

# 22. Backend Architecture

Use a conventional layered architecture:

```text
routes
   ↓
controllers
   ↓
services
   ↓
repositories/data access
   ↓
PostgreSQL
```

Analysis-specific services:

```text
GitHub Service
Analyzer Service
AST Analyzer
Dependency Analyzer
Relationship Engine
Graph Service
AI Service
```

Avoid unnecessary microservices.

Everything should initially run as one backend application.

---

# 23. Frontend Architecture

Suggested structure:

```text
frontend/
└── src/
    ├── components/
    │   ├── common/
    │   ├── graph/
    │   ├── repository/
    │   └── layout/
    │
    ├── pages/
    │
    ├── hooks/
    │
    ├── services/
    │
    ├── utils/
    │
    ├── types/
    │
    ├── App.jsx
    └── main.jsx
```

Components should have clear responsibilities.

Avoid giant components.

---

# 24. Backend Structure

Suggested structure:

```text
backend/
└── src/
    ├── routes/
    ├── controllers/
    ├── services/
    │   ├── github/
    │   ├── analyzer/
    │   ├── graph/
    │   └── ai/
    │
    ├── analyzers/
    │   ├── javascript/
    │   └── typescript/
    │
    ├── models/
    ├── middleware/
    ├── utils/
    ├── config/
    └── app.js
```

---

# 25. Database

Initial conceptual entities:

```text
Repository
File
Symbol
Relationship
ApiRoute
Analysis
```

Potential schema:

```text
repositories
- id
- github_url
- owner
- name
- default_branch
- language
- created_at
- updated_at

files
- id
- repository_id
- path
- name
- extension
- type
- size

symbols
- id
- file_id
- name
- type
- start_line
- end_line

relationships
- id
- repository_id
- source_id
- target_id
- relationship_type

api_routes
- id
- repository_id
- method
- path
- file_id
- handler
```

The schema can be refined during implementation if the actual analyzer requirements justify it.

---

# 26. API Design

Use REST APIs.

Initial conceptual endpoints:

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

The exact API may be adjusted during architecture review.

---

# 27. Security Principles

- Never expose server-side API keys to the frontend.
- Validate all user inputs.
- Validate GitHub URLs.
- Restrict repository analysis resources.
- Do not process unnecessary files.
- Do not expose `.env` or secret files to AI.
- Never trust repository content.
- Sanitize data displayed in the UI.
- Apply sensible request limits.
- Handle GitHub API rate limits.
- Do not execute arbitrary repository code during analysis.

**Important:** RepoLens analyzes source code. It must not execute untrusted repository applications.

---

# 28. Performance Principles

Initial implementation should prioritize correctness.

For larger repositories:

- ignore generated files
- ignore dependencies
- analyze supported file types only
- avoid duplicate parsing
- cache analysis where appropriate
- avoid sending entire source code to the frontend
- send structured graph data
- avoid rendering unnecessarily huge graphs at once
- use search/filter/collapse for large graphs

Do not introduce Redis, queues, workers, or distributed systems unless real performance requirements justify them.

---

# 29. Error Handling

Expected cases include:

- invalid GitHub URL
- repository does not exist
- repository inaccessible
- GitHub API rate limit
- network failure
- empty repository
- very large repository
- unsupported file type
- malformed source file
- unresolved import
- circular dependency
- parser failure
- AI API failure
- database failure

A single malformed file should not necessarily cause the entire repository analysis to fail.

The analyzer should record recoverable errors and continue where possible.

---

# 30. Important Product Principle

RepoLens is an **analysis tool**, not a perfect compiler.

The goal is:

> Produce useful, understandable and reasonably accurate repository architecture information using standard technologies.

Do not pursue perfect language semantics in the MVP.

---

# 31. Initial Language Strategy

### V1

Support:

```text
JavaScript
TypeScript
JSX
TSX
```

### Future

Possible:

```text
Python
Java
C++
```

Additional languages should be implemented through separate analyzer modules rather than rewriting the whole system.

---

# 32. Out of Scope for MVP

Do not build these unless explicitly approved:

- payment system
- team collaboration
- social features
- enterprise permissions
- private repository support
- repository execution
- deployment automation
- custom AI model
- custom graph database
- microservice architecture
- Kubernetes
- Kafka
- complex distributed processing
- real-time collaboration
- advanced code refactoring
- automatic code modification

---

# 33. Source of Truth

The project should maintain:

```text
PROJECT_CONTEXT.md
DEVELOPMENT_PLAN.md
AGENTS.md
```

These files must remain synchronized.

When an important architecture decision changes:

1. update the relevant document
2. explain the change
3. ensure implementation follows the new decision

Do not silently change the architecture.

---

# 34. AI Coding Tool Responsibilities

## Lovable

Primary responsibility:

- frontend UI
- UX
- pages
- reusable components
- visual design
- dashboard
- graph workspace
- loading/error states

Lovable should not redesign the backend architecture.

## Codex

Primary responsibility:

- backend
- database
- APIs
- repository ingestion
- AST analysis
- dependency analysis
- relationship engine
- graph data
- AI integration
- tests
- debugging
- refactoring
- security
- final integration

## Bolt

Primary responsibility:

- rapid UI experiments
- alternative implementations
- isolated feature prototypes

Bolt should not independently become the source of truth.

---

# 35. GitHub Is the Source of Truth

The main repository is the canonical project.

All tools should work against the same project.

```text
Lovable
   ↓
GitHub
   ↑
Codex
   ↑
Bolt experiments
```

Do not maintain three separate versions of the application.

---

# 36. Golden Development Rule

Never ask an AI coding tool:

> "Build the whole application."

Instead:

```text
CONTEXT
What currently exists.

GOAL
What needs to be implemented.

REQUIREMENTS
Exact behavior.

CONSTRAINTS
What must not change.

EDGE CASES
What can go wrong.

SUCCESS CRITERIA
How we know it works.

STOP CONDITION
Where the task ends.
```

Each implementation task should be scoped.

---

# 37. Quality Standard

The finished project should be:

- understandable
- maintainable
- testable
- visually polished
- technically credible
- reasonably performant
- secure
- deployable
- documented

The project should demonstrate full-stack engineering rather than only AI-generated UI.

---

# 38. Definition of Done

RepoLens is considered MVP-complete when a user can:

```text
1. Open RepoLens
2. Enter a public GitHub repository URL
3. Submit it
4. Receive validation feedback
5. Analyze the repository
6. See repository statistics
7. See its file/folder structure
8. See detected relationships
9. Open the interactive graph
10. Search for a file/symbol
11. Select a node
12. See its details
13. See connected relationships
14. Trace supported flows
15. Ask AI to explain the repository
16. Ask AI to explain a node
17. Ask AI to explain a flow
18. Handle errors gracefully
```

The application must work with real repositories, not only mock data.