import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { GraphNodeData } from "@/data/mock-repo";
import { genericExplanation, mockExplanations } from "@/data/mock-repo";
import { EmptyState, MockBadge, PanelHeading } from "./primitives";

/**
 * UI shell for AI explanations. The text comes from a static fixture — no model
 * is called. Later this reads from the analysis/AI endpoint.
 */
export function AiExplanationPanel({
  node,
  embedded = false,
  className,
}: {
  node: GraphNodeData | null;
  embedded?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    clearTimer();
    setState("idle");
    return () => {
      clearTimer();
    };
  }, [node?.id]);

  function explain() {
    clearTimer();
    setState("loading");
    timerRef.current = setTimeout(() => {
      setState("ready");
      timerRef.current = null;
    }, 700);
  }

  const body = (
    <div className={cn("space-y-3", embedded ? "" : "p-4")}>
      {!node ? (
        <EmptyState
          icon={<Sparkles className="size-4" />}
          title="Nothing to explain yet"
          description="Select a node to generate a plain-language walkthrough of its role in the codebase."
        />
      ) : state === "idle" ? (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Generate a plain-language explanation of{" "}
            <code className="font-mono text-primary">{node.label}</code> — its responsibility,
            inbound dependencies and risk of change.
          </p>
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={explain}>
            <Sparkles className="size-3.5" />
            Explain this node
          </Button>
        </>
      ) : state === "loading" ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[92%]" />
          <Skeleton className="h-3 w-[78%]" />
          <Skeleton className="h-3 w-[85%]" />
        </div>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-foreground/90">
            {mockExplanations[node.id] ?? genericExplanation}
          </p>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <MockBadge />
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={explain}>
              Regenerate
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (embedded) return <div className={className}>{body}</div>;

  return (
    <section className={cn("panel-surface overflow-hidden rounded-lg", className)}>
      <PanelHeading title="AI explanation" hint="Plain-language read of the selection" />
      {body}
    </section>
  );
}
