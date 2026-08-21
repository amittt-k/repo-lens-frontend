import { AlertCircle, Bot, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TracedFlow } from "@/utils/flowTracing";
import apiService, { ApiError } from "@/services/api.service";
import { EmptyState, PanelHeading } from "./primitives";

export type AiExplanationMode = "node" | "repository" | "flow";

export interface AiExplanationPanelProps {
  mode?: AiExplanationMode;
  nodeId?: string | null | undefined;
  node?: { id: string; label: string; kind?: string; path?: string } | null | undefined;
  repositoryId?: string | null | undefined;
  repoName?: string | undefined;
  flow?: TracedFlow | null | undefined;
  embedded?: boolean;
  className?: string;
  autoLoad?: boolean;
  onClose?: () => void;
}

/**
 * Safe markdown parser that converts text without dangerous HTML injection.
 */
function SafeMarkdownProse({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  function flushList(keyPrefix: string) {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list`} className="my-1.5 space-y-1 pl-4 text-xs text-foreground/90 font-sans">
          {currentList.map((item, idx) => (
            <li key={idx} className="list-disc leading-relaxed">
              {formatInlineSpans(item)}
            </li>
          ))}
        </ul>,
      );
      currentList = [];
    }
  }

  function formatInlineSpans(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="break-all rounded border border-border bg-surface px-1 py-0.5 font-mono text-[11px] text-primary"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      currentList.push(trimmed.slice(2));
      return;
    }

    flushList(`flush-${i}`);

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="mt-3.5 mb-1 break-words font-mono text-xs font-semibold uppercase tracking-wider text-primary">
          {trimmed.slice(4)}
        </h4>,
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="mt-4 mb-1.5 break-words font-sans text-xs font-semibold tracking-tight text-foreground">
          {trimmed.slice(3)}
        </h3>,
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="mt-4 mb-2 break-words font-sans text-sm font-semibold text-foreground">
          {trimmed.slice(2)}
        </h2>,
      );
    } else if (trimmed.length > 0) {
      elements.push(
        <p key={i} className="my-1.5 break-words text-xs leading-relaxed text-foreground/90 font-sans">
          {formatInlineSpans(trimmed)}
        </p>,
      );
    }
  });

  flushList("final");

  return <div className="min-w-0 space-y-1 overflow-hidden break-words">{elements}</div>;
}

export function AiExplanationPanel({
  mode = "node",
  nodeId,
  node,
  repositoryId,
  repoName,
  flow,
  embedded = false,
  className,
  autoLoad = false,
}: AiExplanationPanelProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  const targetKey =
    mode === "node" ? nodeId || node?.id : mode === "repository" ? repositoryId : flow?.id || flow?.startNodeId;

  // Reset state on target change
  useEffect(() => {
    setStatus("idle");
    setExplanation(null);
    setErrorMessage(null);
    setModel(null);

    if (autoLoad && targetKey) {
      void fetchExplanation();
    }
  }, [targetKey, mode]);

  async function fetchExplanation() {
    setStatus("loading");
    setErrorMessage(null);

    try {
      if (mode === "node") {
        const id = nodeId || node?.id;
        if (!id) {
          throw new Error("No node selected to explain.");
        }
        const res = await apiService.explainNode(id);
        setExplanation(res.explanation);
        setModel(res.model || null);
        setStatus("success");
      } else if (mode === "repository") {
        if (!repositoryId) {
          throw new Error("No repository ID available to explain.");
        }
        const res = await apiService.explainRepository(repositoryId);
        setExplanation(res.explanation);
        setModel(res.model || null);
        setStatus("success");
      } else if (mode === "flow") {
        if (!flow || !Array.isArray(flow.steps) || flow.steps.length === 0) {
          throw new Error("No active flow trace selected to explain.");
        }
        const res = await apiService.explainFlow(flow);
        setExplanation(res.explanation);
        setModel(res.model || null);
        setStatus("success");
      }
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || "Failed to generate AI explanation. Please check backend connection.";
      setErrorMessage(msg);
      setStatus("error");
    }
  }

  const hasTarget = Boolean(
    (mode === "node" && (nodeId || node?.id)) ||
      (mode === "repository" && repositoryId) ||
      (mode === "flow" && flow && flow.steps?.length > 0),
  );

  const title =
    mode === "repository"
      ? "Architectural Overview"
      : mode === "flow"
        ? `Flow: ${flow?.name || "Execution Trace"}`
        : `Entity: ${node?.label || nodeId || "Node"}`;

  const body = (
    <div className={cn("space-y-3", embedded ? "" : "p-3.5")}>
      {!hasTarget ? (
        <EmptyState
          icon={<Sparkles className="size-3.5" />}
          title={
            mode === "flow"
              ? "No active flow trace"
              : mode === "repository"
                ? "Repository unavailable"
                : "No entity selected"
          }
          description={
            mode === "flow"
              ? "Select an execution flow from the panel above to generate an AI walkthrough."
              : mode === "repository"
                ? "Repository analysis facts are required to generate an architectural overview."
                : "Pick a node in the graph or file explorer to explain its role and dependencies."
          }
        />
      ) : status === "idle" ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {mode === "repository"
              ? `Generate an AI architectural walkthrough for ${repoName || "this repository"} based on verified static code facts.`
              : mode === "flow"
                ? `Generate a plain-language explanation of this ${flow?.steps?.length || 0}-step execution path and its boundary transitions.`
                : `Generate a plain-language explanation of ${node?.label || "this entity"} — its responsibility, dependencies, and architectural role.`}
          </p>
          <Button size="sm" variant="outline" className="w-full gap-2 font-mono text-xs h-8" onClick={fetchExplanation}>
            <Sparkles className="size-3.5 text-primary" />
            {mode === "repository"
              ? "Explain architecture"
              : mode === "flow"
                ? "Explain this flow"
                : "Explain this node"}
          </Button>
        </div>
      ) : status === "loading" ? (
        <div className="space-y-2 py-1">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Analyzing verified static facts…</span>
          </div>
          <Skeleton className="h-3 w-full bg-elevated" />
          <Skeleton className="h-3 w-[92%] bg-elevated" />
          <Skeleton className="h-3 w-[78%] bg-elevated" />
          <Skeleton className="h-3 w-[85%] bg-elevated" />
        </div>
      ) : status === "error" ? (
        <div className="space-y-2.5 rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <span className="font-semibold block">Explanation Unavailable</span>
              <p className="leading-relaxed font-mono text-[11px] opacity-90">{errorMessage}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full gap-1.5 font-mono text-xs text-foreground hover:bg-background/80"
            onClick={fetchExplanation}
          >
            <RefreshCw className="size-3" />
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="prose prose-invert max-w-none text-xs">
            <SafeMarkdownProse content={explanation || "No explanation text returned."} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <Bot className="size-3 text-primary" />
              <span>Grounded in RepoLens analysis {model ? `(${model})` : ""}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              onClick={fetchExplanation}
            >
              <RefreshCw className="size-2.5" />
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return <div className={className}>{body}</div>;

  return (
    <section className={cn("panel-surface overflow-hidden rounded-md", className)}>
      <PanelHeading
        title={title}
        hint={
          mode === "repository"
            ? "Repository Architecture"
            : mode === "flow"
              ? "Flow Trace"
              : "AST Entity"
        }
      />
      {body}
    </section>
  );
}

export default AiExplanationPanel;
