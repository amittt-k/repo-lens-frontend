import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Github, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Client-side shape validation only. There is no GitHub request here — the
 * backend will later own existence / visibility / rate-limit checks.
 */
const GITHUB_RE = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;

const SAMPLES = ["vercel/commerce-kit", "facebook/react", "tanstack/router"];

export function RepoUrlForm({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function submit(raw: string) {
    const input = raw.trim();
    if (!input) {
      setError("Enter a GitHub repository URL to continue.");
      return;
    }
    if (/^https?:\/\//i.test(input) && !/github\.com/i.test(input)) {
      setError("Only public github.com repositories are supported.");
      return;
    }
    const match = input.match(GITHUB_RE) ?? input.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (!match) {
      setError("Please enter a valid format, e.g. github.com/owner/repo");
      return;
    }
    setError(null);
    setPending(true);
    const fullUrl = `https://github.com/${match[1]}/${match[2]}`;
    navigate({
      to: "/analyzing",
      search: { owner: match[1], repo: match[2], url: fullUrl },
    });
  }

  return (
    <form
      className={cn("w-full", compact ? "max-w-md" : "max-w-2xl")}
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      noValidate
    >
      <div
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-lg border bg-surface px-3 py-1.5 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto]",
          error ? "border-destructive/60" : "border-border focus-within:border-primary/70 focus-within:ring-1 focus-within:ring-primary/40",
          compact && "py-1 px-2.5",
        )}
      >
        <Github className={cn("shrink-0 text-muted-foreground", compact ? "size-3.5" : "size-4")} aria-hidden />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          aria-label="GitHub repository URL"
          aria-invalid={Boolean(error)}
          placeholder={compact ? "github.com/owner/repo" : "Enter repository URL (e.g. github.com/facebook/react)"}
          spellCheck={false}
          className={cn(
            "min-w-0 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/50",
            compact ? "py-1" : "py-1.5 text-sm",
          )}
        />
        <Button
          type="submit"
          disabled={pending}
          size={compact ? "sm" : "default"}
          className={cn(
            "col-span-2 sm:col-span-1 font-mono font-medium gap-1.5",
            compact ? "h-7 text-xs px-2.5" : "h-9 text-xs px-3.5",
          )}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Analyze
          {!pending ? <ArrowRight className="size-3.5" /> : null}
        </Button>
      </div>

      {!compact ? (
        <div className="mt-2 min-h-5 flex items-center justify-between gap-2">
          {error ? (
            <p className="font-mono text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <p className="font-mono text-[11px] text-muted-foreground/80">
              Statically inspects files, AST symbols, dependencies, and API routes.
            </p>
          )}
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 mr-1">
            Samples:
          </span>
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValue(`github.com/${s}`);
                setError(null);
              }}
              className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
