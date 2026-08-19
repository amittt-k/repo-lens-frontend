import { useEffect } from "react";

export function useGraphShortcuts({ onOpenSearch }: { onOpenSearch: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing =
        e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (typing) return;
      if (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        onOpenSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenSearch]);
}
