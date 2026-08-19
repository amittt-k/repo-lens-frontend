/**
 * Prompt & Context Construction Service for RepoLens AI.
 *
 * Constructs grounded, structured prompt payloads for repository, node, and flow
 * explanations with conservative secret sanitization and strict anti-hallucination rules.
 */

export const SYSTEM_PROMPT = `You are the RepoLens AI Architectural Assistant, an expert senior software architect.
Your purpose is to provide clear, accurate, developer-oriented technical explanations of codebases based exclusively on structured static analysis facts provided to you.

STRICT GROUNDING & ACCURACY RULES:
1. Base all explanations STRICTLY on the supplied structured facts (metadata, file trees, AST symbols, verified relationships, API routes, flow traces).
2. NEVER invent or hallucinate files, functions, classes, routes, databases, authentication mechanisms, or relationships that are not present in the supplied data.
3. Clearly distinguish CONFIRMED facts (directly observed in the analyzer data) from reasonable INFERRED architectural interpretations.
4. When information is unavailable or cannot be determined from the facts, explicitly state that it is unknown.
5. Do NOT include generic promotional or marketing filler.
6. Provide concise, clean GitHub-flavored Markdown with clear headings and bullet points.`;

const SENSITIVE_PATTERNS = [
  /(\b(?:api[_-]?key|secret|token|password|auth|bearer)\s*[:=]\s*['"]?)[^\s'"]{6,}(['"]?)/gi,
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /ghp_[a-zA-Z0-9]{20,}/g,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
];

const IGNORED_FILE_PATTERNS = [
  /^\.env/i,
  /\.pem$/i,
  /\.key$/i,
  /\.cert$/i,
  /id_rsa/i,
  /credentials\.json$/i,
];

/**
 * Sanitizes arbitrary text or strings against credential and secret patterns.
 */
export function sanitizeString(str) {
  if (typeof str !== "string") return str;
  let sanitized = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "$1[REDACTED_SECRET]$2");
  }
  return sanitized;
}

/**
 * Filters and sanitizes structured repository analysis data.
 */
export function sanitizeAnalysisContext(data) {
  if (!data || typeof data !== "object") return {};

  const clean = JSON.parse(JSON.stringify(data));

  // Filter file lists to exclude sensitive file names
  if (Array.isArray(clean.files)) {
    clean.files = clean.files
      .filter((file) => {
        const path = typeof file === "string" ? file : file?.path || file?.name || "";
        const baseName = path.split("/").pop() || "";
        return !IGNORED_FILE_PATTERNS.some((p) => p.test(baseName));
      })
      .slice(0, 100); // Bounded size
  }

  // Filter file tree root if present
  if (Array.isArray(clean.fileTree)) {
    clean.fileTree = filterFileTree(clean.fileTree);
  }

  return clean;
}

function filterFileTree(tree, depth = 0) {
  if (!Array.isArray(tree) || depth > 6) return [];
  return tree
    .filter((item) => {
      const name = item.name || item.path || "";
      return !IGNORED_FILE_PATTERNS.some((p) => p.test(name));
    })
    .slice(0, 50)
    .map((item) => {
      if (item.children && Array.isArray(item.children)) {
        return {
          ...item,
          children: filterFileTree(item.children, depth + 1),
        };
      }
      return item;
    });
}

/**
 * Constructs prompt messages for Repository-level architectural explanation.
 */
export function buildRepositoryPrompt(analysisData) {
  if (!analysisData || typeof analysisData !== "object" || Object.keys(analysisData).length === 0) {
    throw new Error("INVALID_AI_CONTEXT");
  }

  const cleanData = sanitizeAnalysisContext(analysisData);
  const repo = cleanData.repository || cleanData;

  const repoName = repo.fullName || `${repo.owner || "unknown"}/${repo.name || "repository"}`;
  const language = repo.language || cleanData.language || "JavaScript / TypeScript";
  const fileCount = cleanData.fileCount || (cleanData.files ? cleanData.files.length : "N/A");
  const routes = cleanData.apiRoutes || cleanData.routes || [];
  const symbols = cleanData.symbols || [];
  const metrics = cleanData.metrics || {};

  const userContent = `Please explain the architecture of repository "${repoName}".

STRUCTURED REPOSITORY FACTS:
- Repository Name: ${repoName}
- Description: ${repo.description || "No description provided"}
- Primary Language: ${language}
- Default Branch: ${repo.defaultBranch || "main"}
- Total Files Analyzed: ${fileCount}
- Discovered API Routes (${routes.length}):
${routes.length > 0 ? routes.slice(0, 20).map((r) => `  * ${r.method || "GET"} ${r.path} -> handler: ${r.handler || "anonymous"} (${r.filePath || ""})`).join("\n") : "  * None discovered"}
- Key Symbols & Modules (${symbols.length}):
${symbols.length > 0 ? symbols.slice(0, 25).map((s) => `  * [${s.kind || s.type || "symbol"}] ${s.name} (${s.filePath || ""})`).join("\n") : "  * None listed"}
- Metrics: ${JSON.stringify(metrics)}

REQUIRED SECTIONS IN YOUR EXPLANATION:
1. **Project Overview**: What the repository appears to do based on files and metadata.
2. **Architecture & Layers**: Identified layers (frontend, backend, utilities, data access).
3. **Key Modules & Entry Points**: Central files and controllers discovered.
4. **API Structure**: Summary of exposed endpoints and routes.
5. **Notable Observations & Limitations**: Any architectural patterns or unknown areas.

Remember: Do NOT invent unlisted databases, authentication systems, or external services.`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: sanitizeString(userContent),
  };
}

/**
 * Constructs prompt messages for Node-level entity explanation.
 */
export function buildNodePrompt(nodeData) {
  if (!nodeData || typeof nodeData !== "object" || (!nodeData.id && !nodeData.label && !nodeData.name)) {
    throw new Error("INVALID_AI_CONTEXT");
  }

  const cleanData = sanitizeAnalysisContext(nodeData);
  const label = cleanData.label || cleanData.name || cleanData.id;
  const kind = cleanData.kind || cleanData.type || "symbol";
  const filePath = cleanData.path || cleanData.filePath || "External / unknown";
  const loc = cleanData.loc || (cleanData.endLine && cleanData.startLine ? cleanData.endLine - cleanData.startLine + 1 : "N/A");
  const inbound = cleanData.inbound || cleanData.usedBy || [];
  const outbound = cleanData.outbound || cleanData.dependsOn || [];
  const contained = cleanData.containedSymbols || cleanData.functions || [];
  const apiRoute = cleanData.apiRoute;

  const userContent = `Please explain the selected code entity "${label}".

STRUCTURED ENTITY FACTS:
- Entity Name: ${label}
- Entity Kind: ${kind}
- Source File: ${filePath}${cleanData.startLine ? ` (Lines ${cleanData.startLine}–${cleanData.endLine || cleanData.startLine})` : ""}
- Size / LOC: ${loc} lines
- Contained Functions / Classes / Symbols (${contained.length}):
${contained.length > 0 ? contained.slice(0, 15).map((c) => `  * [${c.kind || "symbol"}] ${c.name || c.label}`).join("\n") : "  * None listed"}
- Outbound Dependencies / "Depends on" (${outbound.length}):
${outbound.length > 0 ? outbound.slice(0, 15).map((r) => `  * ${r.relationshipType || r.relation || "CONNECTS"} -> ${r.targetLabel || r.targetId || r.target}`).join("\n") : "  * None (leaf entity)"}
- Inbound Callers / "Used by" (${inbound.length}):
${inbound.length > 0 ? inbound.slice(0, 15).map((r) => `  * ${r.relationshipType || r.relation || "CONNECTS"} <- ${r.sourceLabel || r.sourceId || r.source}`).join("\n") : "  * None (entry point or unreferenced)"}
${apiRoute ? `- Associated API Route: ${apiRoute.method} ${apiRoute.path}` : ""}

REQUIRED SECTIONS IN YOUR EXPLANATION:
1. **Role & Responsibility**: What this entity does in the system.
2. **Dependency Interactions**: How it interacts with callers and downstream modules.
3. **Architectural Significance**: Criticality, potential change impact, or role in application flows.

Remember: Base your answer strictly on the above facts. Do not invent implementation code not shown.`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: sanitizeString(userContent),
  };
}

/**
 * Constructs prompt messages for Flow-level execution path explanation.
 */
export function buildFlowPrompt(flowData) {
  if (!flowData || typeof flowData !== "object" || !Array.isArray(flowData.steps) || flowData.steps.length === 0) {
    throw new Error("INVALID_AI_CONTEXT");
  }

  const cleanData = sanitizeAnalysisContext(flowData);
  const steps = cleanData.steps;
  const flowName = cleanData.name || `Flow: ${steps[0]?.label || "Root"}`;

  const formattedSteps = steps.map((s, i) => {
    const rel = s.relationshipType ? ` [${s.relationshipType}]` : "";
    return `  Step ${i + 1}: ${s.label} (${s.kind || "module"} in ${s.path || "unknown"})${rel} — ${s.detail || ""}`;
  });

  const userContent = `Please explain the following execution flow "${flowName}".

STRUCTURED EXECUTION PATH (${steps.length} Steps):
${formattedSteps.join("\n")}

REQUIRED SECTIONS IN YOUR EXPLANATION:
1. **Flow Summary**: Plain-language overview of what this application flow accomplishes.
2. **Step-by-Step Breakdown**: Explanation of the transitions, function calls, and module boundaries.
3. **Architectural Crossings**: Highlight any API routes, client/server boundaries, or persistence layers crossed.
4. **Terminal Action**: What the flow produces or finishes with.

Remember: Do NOT add steps or modify the sequence. Explain only what is shown.`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: sanitizeString(userContent),
  };
}
