import { useCallback, useEffect, useRef, useState } from "react";
import type { Result } from "@/admin/lib/db";

export type AsyncState<T> = {
  data: T | null;
  error: string;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (next: T | null | ((current: T | null) => T | null)) => void;
};

/**
 * Load something once (and again when deps change), with a reload() the
 * screen can call after a save. A stale response from an earlier dep set is
 * dropped so fast typing in a search box can't show the wrong results.
 */
export function useAsync<T>(load: () => Promise<Result<T>>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    const result = await load();
    if (mine !== seq.current) return;
    if (result.ok) {
      setData(result.value);
      setError("");
    } else {
      setError(result.error);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

/** Polls while the tab is visible. */
export function useInterval(fn: () => void, ms: number, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") saved.current();
    }, ms);
    const onVisible = () => {
      if (document.visibilityState === "visible") saved.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ms, enabled]);
}

/** Warn before leaving the page with unsaved edits. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
