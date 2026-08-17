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
      setError("Only github.com repositories are supported right now.");
      return;
    }
    const match = input.match(GITHUB_RE) ?? input.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (!match) {
      setError("That doesn't look like a repository. Try github.com/owner/repo.");
      return;
    }
    setError(null);
    setPending(true);
    navigate({
      to: "/analyzing",
      search: { owner: match[1], repo: match[2] },
    });
  }

  return (
    <form
      className={cn("w-full", compact ? "max-w-xl" : "max-w-2xl")}
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      noValidate
    >
      <div
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border bg-surface px-3 py-2 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto]",
          error ? "border-destructive/60" : "border-border focus-within:border-primary/60",
        )}
      >
        <Github className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          aria-label="GitHub repository URL"
          aria-invalid={Boolean(error)}
          placeholder="github.com/owner/repo"
          spellCheck={false}
          className="min-w-0 bg-transparent py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <Button
          type="submit"
          disabled={pending}
          className="col-span-2 sm:col-span-1"
          size={compact ? "sm" : "default"}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Analyze
          {!pending ? <ArrowRight className="size-4" /> : null}
        </Button>
      </div>

      <div className="mt-2 min-h-5">
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Validation is shape-only in this build. No repository is fetched.
          </p>
        )}
      </div>

      {!compact ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            try
          </span>
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValue(`github.com/${s}`);
                setError(null);
              }}
              className="rounded-md border border-border bg-elevated px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
