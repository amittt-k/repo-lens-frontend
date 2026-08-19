# RepoLens — AI Coding Agent Instructions

## 1. Project Overview

RepoLens is a full-stack developer tool that analyzes public GitHub repositories and helps users understand their architecture, code relationships and application flows through interactive visualization and AI-generated explanations.

The primary product flow is:

```text
GitHub URL
    ↓
Repository ingestion
    ↓
File/folder analysis
    ↓
AST analysis
    ↓
Dependency analysis
    ↓
Relationship engine
    ↓
Graph
    ↓
Interactive visualization
    ↓
AI explanation
```

---

# 2. Source of Truth

Before making significant changes, read:

```text
PROJECT_CONTEXT.md
DEVELOPMENT_PLAN.md
AGENTS.md
```

These files define the current project direction.

If implementation conflicts with them:

1. Do not silently change the architecture.
2. Explain the conflict.
3. Recommend the smallest reasonable change.
4. Wait for approval when the change affects architecture, stack or product scope.

---

# 3. Technology Rules

The intended stack is:

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
- Prisma

## Repository

- GitHub public repositories initially

## Analysis

- AST-based JavaScript/TypeScript analysis

## AI

- External LLM API through backend

Do not replace these technologies with unrelated alternatives without a strong technical reason.

---

# 4. Architecture Rules

Use a conventional full-stack architecture.

Frontend:

```text
Pages
 ↓
Components
 ↓
Hooks / State
 ↓
Services
 ↓
API
```

Backend:

```text
Routes
 ↓
Controllers
 ↓
Services
 ↓
Data Access
 ↓
PostgreSQL
```

Analysis:

```text
Repository
 ↓
File Analyzer
 ↓
AST Analyzer
 ↓
Dependency Analyzer
 ↓
Relationship Engine
 ↓
Graph Builder
```

AI:

```text
Structured Analysis
 ↓
AI Service
 ↓
Explanation
```

Avoid unnecessary architectural complexity.

---

# 5. No Unnecessary Infrastructure

Do NOT introduce:

- microservices
- Kubernetes
- Kafka
- Neo4j
- Redis
- message queues
- event-driven architecture
- distributed processing

unless an actual project requirement demonstrates that the existing architecture cannot handle the problem.

The initial project should be a modular monolith.

---

# 6. Coding Philosophy

Prefer:

- simple code
- clear names
- small functions
- reusable components
- predictable data flow
- explicit error handling
- maintainable abstractions
- standard libraries
- established packages

Avoid:

- clever but difficult code
- unnecessary abstraction
- duplicated logic
- giant components
- giant service files
- premature optimization
- unnecessary dependencies

---

# 7. Scope Discipline

Never silently add unrelated features.

Do not add:

- payments
- teams
- social features
- private repositories
- advanced permissions
- unnecessary authentication
- deployment automation
- repository execution
- custom AI models

unless explicitly requested.

---

# 8. Repository Analysis Rules

RepoLens analyzes repository source code.

It must NOT execute arbitrary repository code.

Never run:

```text
npm install
npm run
npm start
npm test
```

inside an untrusted analyzed repository merely to understand it.

The analyzer should inspect source files statically.

---

# 9. File Filtering

Do not analyze unnecessary/generated directories.

Initially ignore:

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

Additional exclusions can be added when justified.

---

# 10. Supported Languages

Initial support:

```text
JavaScript
TypeScript
JSX
TSX
```

Do not attempt to add many languages during the initial implementation.

Design analyzers so future languages can be added independently.

---

# 11. AST Analysis Rules

Use AST-based analysis for JavaScript/TypeScript whenever possible.

Extract, where reliably supported:

- imports
- exports
- functions
- classes
- methods
- components
- interfaces/types
- source locations

Do not rely on fragile regular expressions when an AST-based approach is appropriate.

Do not attempt to implement a custom compiler.

---

# 12. Relationship Rules

Relationships must be based on analyzer evidence.

Possible relationships include:

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

Never invent relationships.

If a relationship cannot be confidently established:

- omit it, or
- mark it as unresolved when useful.

Do not convert AI guesses into graph facts.

---

# 13. Dependency Analysis

Support common JavaScript/TypeScript project structures first.

Handle where practical:

- relative imports
- exports
- common aliases
- unresolved imports
- circular dependencies

Do not promise perfect support for every bundler, compiler configuration or metaprogramming pattern.

Correctness is more important than maximum coverage.

---

# 14. API Analysis

Initially support common Express-style patterns.

Example:

```javascript
router.get("/users", getUsers)
```

should be represented approximately as:

```text
GET /users
    ↓
getUsers
```

Only connect a route to deeper services when the relationship can be reliably established.

---

# 15. Graph Rules

The graph should use structured data.

Conceptually:

```json
{
  "nodes": [],
  "edges": []
}
```

Nodes should contain enough metadata for the frontend to display useful information.

Edges should identify the relationship type.

The frontend should not reconstruct the entire code-analysis logic.

The backend/analyzer is responsible for generating graph facts.

---

# 16. Frontend Rules

Use reusable components.

Avoid putting:

- API calls
- graph algorithms
- repository parsing
- AI prompt construction

directly inside large React components.

Keep responsibilities separated.

Example:

```text
components/
services/
hooks/
utils/
```

should have clear roles.

---

# 17. Graph UI Rules

The graph must remain useful rather than merely decorative.

Prioritize:

- zoom
- pan
- search
- selection
- filtering
- highlighting
- node details
- readable layouts

Do not add unnecessary visual effects that reduce usability.

---

# 18. Node Details

A selected node should expose useful information.

Depending on node type:

```text
Name
Type
File
Path
Imports
Imported By
Functions
Classes
Relationships
API information
```

Do not display information that was not discovered.

---

# 19. AI Rules

AI is an explanation layer, not the source of repository facts.

Preferred pipeline:

```text
Repository
 ↓
Analyzer
 ↓
Structured facts
 ↓
Relationship graph
 ↓
AI
 ↓
Explanation
```

AI should receive relevant structured information.

Avoid sending entire repositories unnecessarily.

---

# 20. AI Accuracy

AI must clearly distinguish:

### Confirmed

Information directly supported by analyzer results.

### Inferred

Reasonable interpretation based on available evidence.

### Unknown

Information that cannot be determined.

The AI must not confidently invent:

- files
- functions
- routes
- databases
- relationships
- architecture
- authentication systems

---

# 21. AI Security

Never send to an external AI provider:

```text
.env
.env.*
private keys
API keys
credentials
tokens
secrets
```

The backend owns AI credentials.

Never expose AI API keys in frontend code.

---

# 22. Error Handling

Errors should be explicit and useful.

Handle:

- invalid input
- GitHub failures
- rate limits
- network failures
- repository size issues
- parser failures
- unsupported files
- unresolved imports
- database errors
- AI failures

A single bad source file should not necessarily terminate the entire analysis.

Use partial results when appropriate.

---

# 23. Security Rules

Never trust repository content.

Validate:

- URLs
- request bodies
- parameters
- repository metadata

Do not execute repository code.

Do not expose secrets.

Do not trust filenames or repository text as safe HTML.

Sanitize repository-derived content before rendering where necessary.

---

# 24. Performance Rules

First prioritize correctness.

Optimize only when justified.

Preferred optimizations:

- ignore unnecessary files
- avoid duplicate parsing
- cache reusable analysis
- batch database operations where appropriate
- limit graph payload
- search/filter large graphs
- avoid unnecessary frontend rendering

Do not add complex infrastructure prematurely.

---

# 25. Database Rules

Use Prisma for database access.

Keep schema normalized enough to avoid unnecessary duplication.

Initial conceptual entities:

```text
Repository
File
Symbol
Relationship
ApiRoute
Analysis
```

Use appropriate indexes when query patterns justify them.

Do not create dozens of tables without a clear requirement.

---

# 26. API Rules

Use REST APIs.

Use predictable naming.

Return consistent response structures.

Validate input at API boundaries.

Do not allow frontend clients to bypass validation.

Keep controller logic thin.

Business logic belongs in services.

---

# 27. Environment Variables

Secrets must be stored in environment variables.

Maintain:

```text
.env
.env.example
```

Never commit real secrets.

`.env.example` should document required variables without containing real credentials.

---

# 28. Testing Rules

When implementing a feature, add appropriate tests.

Prioritize tests for:

- analyzers
- dependency resolution
- relationship generation
- API behavior
- critical frontend interactions
- graph transformations

Do not claim a feature is complete without testing it.

---

# 29. Change Discipline

When asked to implement a feature:

1. Inspect existing implementation.
2. Identify affected files.
3. Understand dependencies.
4. Make the smallest appropriate change.
5. Avoid unrelated refactoring.
6. Run relevant tests.
7. Run lint/type checks where applicable.
8. Explain what changed.

Do not rewrite working systems unnecessarily.

---

# 30. Task Structure

Every significant task should be understood using:

```text
CONTEXT
GOAL
REQUIREMENTS
CONSTRAINTS
EDGE CASES
SUCCESS CRITERIA
STOP CONDITION
```

If a request is ambiguous and could materially change architecture, ask for clarification or explain the ambiguity before implementing.

---

# 31. Implementation Boundaries

When working on one feature, do not automatically modify unrelated features.

Example:

If implementing dependency analysis:

Allowed:

```text
dependency analyzer
relationship engine
relevant tests
```

Not automatically allowed:

```text
authentication
UI redesign
AI chatbot
deployment
database redesign unrelated to the feature
```

---

# 32. Documentation Rules

When an important architecture decision changes, update:

```text
PROJECT_CONTEXT.md
DEVELOPMENT_PLAN.md
```

If implementation behavior changes, update relevant documentation.

Documentation should describe the actual current system, not an imagined future system.

---

# 33. Git Rules

Use small, meaningful commits.

Preferred:

```text
feat: add github repository validation
feat: add repository ingestion
feat: add javascript ast analyzer
feat: add dependency analysis
feat: add relationship engine
feat: add graph api
fix: handle unresolved imports
test: add analyzer tests
```

Avoid vague commits:

```text
update
changes
final
fix
stuff
```

---

# 34. AI Coding Tool Coordination

## Lovable

Use for:

- frontend foundation
- UI
- UX
- dashboard
- graph interface
- component styling
- visual polish

Do not let Lovable silently redesign backend architecture.

## Codex

Use for:

- architecture implementation
- backend
- database
- APIs
- analyzer
- relationship engine
- AI integration
- testing
- debugging
- security
- performance

Codex is the primary engineering agent.

## Bolt

Use for:

- isolated prototypes
- alternative UI ideas
- feature experiments

Bolt output must be reviewed before integrating into the main repository.

---

# 35. GitHub Source of Truth

The main GitHub repository is the canonical project.

Do not maintain independent Lovable/Bolt/Codex versions.

Any experiment should ultimately be:

```text
Experiment
   ↓
Review
   ↓
Integrate
   ↓
Test
   ↓
Commit
```

---

# 36. Before Major Changes

Before making a major change:

1. Read `PROJECT_CONTEXT.md`.
2. Read relevant section of `DEVELOPMENT_PLAN.md`.
3. Inspect the existing code.
4. Identify affected architecture.
5. Plan the change.
6. Implement only after the plan is clear.

---

# 37. After Major Changes

After a major feature:

1. Run tests.
2. Run lint/type checks.
3. Check API behavior.
4. Check frontend behavior.
5. Inspect git diff.
6. Check for accidental unrelated changes.
7. Update documentation if necessary.
8. Commit the working state.

---

# 38. Do Not Overengineer

This project should demonstrate strong engineering using common technologies.

Do not add a technology merely because it sounds impressive.

Before adding a dependency or infrastructure component, ask:

1. Is it required?
2. Can the existing stack solve the problem?
3. Does it materially improve the product?
4. Will it increase maintenance complexity?

If the answer is mostly no, do not add it.

---

# 39. Core Product Principle

RepoLens is not simply a graph generator.

The intended experience is:

```text
Give me a repository
        ↓
Show me its architecture
        ↓
Show me how the pieces connect
        ↓
Let me inspect any important part
        ↓
Let me trace its flow
        ↓
Explain it to me
```

The implementation should always serve this experience.

---

# 40. Definition of Done

A feature is not complete merely because code exists.

It is complete when:

- required behavior works
- errors are handled
- relevant tests pass
- existing functionality still works
- architecture remains consistent
- no unrelated changes were introduced
- documentation is updated when necessary

---

# 41. Final Instruction

Act as a careful senior engineer working inside an existing project.

Do not blindly generate large amounts of code.

Understand first.

Plan second.

Implement third.

Test fourth.

Review fifth.

Preserve the existing architecture unless there is a strong reason to change it.

When uncertain, prefer the simplest maintainable solution that satisfies the actual RepoLens requirements.