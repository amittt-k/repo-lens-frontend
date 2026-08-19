/**
 * RepoLens — Centralized Frontend API Service
 *
 * Connects frontend views to backend REST APIs (Phase 14).
 */

import type { TracedFlow } from "@/utils/flowTracing";

const API_BASE_URL =
  typeof window !== "undefined" && import.meta.env?.["VITE_API_URL"]
    ? import.meta.env["VITE_API_URL"]
    : "http://localhost:5000/api";


export interface RepositoryRecord {
  id: string;
  owner: string;
  name: string;
  description?: string;
  defaultBranch?: string;
  language?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  size?: number;
  url?: string;
  createdAt: string;
  updatedAt: string;
  analyses?: Array<{
    id: string;
    status: string;
    error?: string;
    metadata?: Record<string, any>;
    startedAt: string;
    completedAt?: string;
  }>;
  _count?: {
    files: number;
    relationships: number;
    apiRoutes: number;
  };
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: "dir" | "file";
  extension?: string;
  isSupported?: boolean;
  size?: number;
  loc?: number;
  children?: FileTreeNode[];
}

export interface BackendGraphNode {
  id: string;
  label: string;
  type: string;
  data: {
    name?: string;
    filePath?: string;
    kind?: string;
    isSupported?: boolean;
    isExported?: boolean;
    startLine?: number;
    endLine?: number;
    metadata?: Record<string, any>;
    [key: string]: any;
  };
}

export interface BackendGraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  data?: Record<string, any>;
}

export interface GraphResponseData {
  nodes: BackendGraphNode[];
  edges: BackendGraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
  };
}

export interface NodeDetailsResponse {
  id: string;
  label: string;
  type: string;
  entityType: string;
  data: {
    name?: string;
    filePath?: string;
    kind?: string;
    isExported?: boolean;
    startLine?: number;
    endLine?: number;
    fileId?: string;
    repositoryId?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
  };
}

export interface NodeRelationshipItem {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface NodeRelationshipsResponse {
  success: boolean;
  node: NodeDetailsResponse;
  outgoing: NodeRelationshipItem[];
  incoming: NodeRelationshipItem[];
  totalIncoming: number;
  totalOutgoing: number;
}

export interface AiExplanationResponse {
  success: boolean;
  repositoryId?: string;
  nodeId?: string;
  flowId?: string;
  explanation: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const message = data?.message || `Request failed with status ${res.status}`;
      throw new ApiError(message, res.status, data);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      err?.message || "Failed to connect to backend server. Make sure the server is running.",
      503,
      err,
    );
  }
}

export const apiService = {
  /**
   * Triggers full repository ingestion and static analysis pipeline.
   */
  async analyzeRepository(url: string): Promise<{
    success: boolean;
    repository: RepositoryRecord;
    analysis: {
      id: string;
      status: string;
      startedAt: string;
      completedAt?: string;
      stats?: Record<string, any>;
    };
  }> {
    return request("/repositories/analyze", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },

  /**
   * Retrieves repository metadata, latest analysis status, and entity counts.
   */
  async getRepository(id: string): Promise<{
    success: boolean;
    repository: RepositoryRecord;
  }> {
    return request(`/repositories/${encodeURIComponent(id)}`);
  },

  /**
   * Retrieves repository file tree hierarchy.
   */
  async getRepositoryFiles(id: string): Promise<{
    success: boolean;
    repositoryId: string;
    totalFiles: number;
    tree: FileTreeNode[];
  }> {
    return request(`/repositories/${encodeURIComponent(id)}/files`);
  },

  /**
   * Retrieves normalized graph representation (nodes, edges, stats).
   */
  async getRepositoryGraph(
    id: string,
    options?: { relationshipTypes?: string; nodeTypes?: string; nodeId?: string },
  ): Promise<{
    success: boolean;
    graph: GraphResponseData;
    repository: { id: string; owner: string; name: string };
  }> {
    const params = new URLSearchParams();
    if (options?.relationshipTypes) params.set("relationshipTypes", options.relationshipTypes);
    if (options?.nodeTypes) params.set("nodeTypes", options.nodeTypes);
    if (options?.nodeId) params.set("nodeId", options.nodeId);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    return request(`/repositories/${encodeURIComponent(id)}/graph${queryStr}`);
  },

  /**
   * Retrieves persisted relationships for a repository.
   */
  async getRepositoryRelationships(
    id: string,
    type?: string,
  ): Promise<{
    success: boolean;
    repositoryId: string;
    total: number;
    relationships: NodeRelationshipItem[];
  }> {
    const queryStr = type ? `?type=${encodeURIComponent(type)}` : "";
    return request(`/repositories/${encodeURIComponent(id)}/relationships${queryStr}`);
  },

  /**
   * Retrieves discovered API routes for a repository.
   */
  async getRepositoryRoutes(id: string): Promise<{
    success: boolean;
    repositoryId: string;
    total: number;
    routes: Array<{
      id: string;
      method: string;
      path: string;
      handler?: string;
      fileId?: string;
    }>;
  }> {
    return request(`/repositories/${encodeURIComponent(id)}/routes`);
  },

  /**
   * Resolves a single node by ID (File, Symbol, or ApiRoute).
   */
  async getNode(id: string): Promise<{
    success: boolean;
    node: NodeDetailsResponse;
  }> {
    return request(`/nodes/${encodeURIComponent(id)}`);
  },

  /**
   * Retrieves direct incoming and outgoing relationships for a specific node ID.
   */
  async getNodeRelationships(id: string): Promise<NodeRelationshipsResponse> {
    return request(`/nodes/${encodeURIComponent(id)}/relationships`);
  },

  /**
   * Requests an AI-generated architectural explanation for a repository.
   */
  async explainRepository(repositoryId: string): Promise<AiExplanationResponse> {
    return request("/ai/explain/repository", {
      method: "POST",
      body: JSON.stringify({ repositoryId }),
    });
  },

  /**
   * Requests an AI-generated technical explanation for a specific graph node / AST symbol.
   */
  async explainNode(nodeId: string): Promise<AiExplanationResponse> {
    return request("/ai/explain/node", {
      method: "POST",
      body: JSON.stringify({ nodeId }),
    });
  },

  /**
   * Requests an AI-generated explanation for an active deterministic flow trace.
   */
  async explainFlow(flow: TracedFlow): Promise<AiExplanationResponse> {
    return request("/ai/explain/flow", {
      method: "POST",
      body: JSON.stringify({ flow }),
    });
  },
};

export default apiService;

