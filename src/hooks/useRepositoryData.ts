import { useMutation, useQuery } from "@tanstack/react-query";
import apiService from "@/services/api.service";

/**
 * Hook for initiating repository analysis mutation.
 */
export function useAnalyzeRepository() {
  return useMutation({
    mutationFn: async (url: string) => {
      return apiService.analyzeRepository(url);
    },
  });
}

/**
 * Hook for fetching repository metadata and latest analysis status.
 */
export function useRepository(id: string | null | undefined) {
  return useQuery({
    queryKey: ["repository", id],
    queryFn: async () => {
      if (!id) throw new Error("Repository ID is required");
      const res = await apiService.getRepository(id);
      return res.repository;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/**
 * Hook for fetching repository file tree.
 */
export function useRepositoryFiles(id: string | null | undefined) {
  return useQuery({
    queryKey: ["repository-files", id],
    queryFn: async () => {
      if (!id) throw new Error("Repository ID is required");
      const res = await apiService.getRepositoryFiles(id);
      return res.tree;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

/**
 * Hook for fetching repository graph data.
 */
export function useRepositoryGraph(
  id: string | null | undefined,
  options?: { relationshipTypes?: string; nodeTypes?: string; nodeId?: string },
) {
  return useQuery({
    queryKey: ["repository-graph", id, options],
    queryFn: async () => {
      if (!id) throw new Error("Repository ID is required");
      const res = await apiService.getRepositoryGraph(id, options);
      return res.graph;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

/**
 * Hook for fetching single node details.
 */
export function useNodeDetails(id: string | null | undefined) {
  return useQuery({
    queryKey: ["node-details", id],
    queryFn: async () => {
      if (!id) throw new Error("Node ID is required");
      const res = await apiService.getNode(id);
      return res.node;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/**
 * Hook for fetching node relationships (incoming & outgoing).
 */
export function useNodeRelationships(id: string | null | undefined) {
  return useQuery({
    queryKey: ["node-relationships", id],
    queryFn: async () => {
      if (!id) throw new Error("Node ID is required");
      return apiService.getNodeRelationships(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
