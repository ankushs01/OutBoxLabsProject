import { useCallback, useEffect, useRef, useState } from "react";

/** Fetches on mount and whenever `deps` change; optionally polls silently every `pollMs`. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], pollMs?: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const latest = useRef(0);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent: boolean) => {
    const id = ++latest.current;
    if (!silent) setLoading(true);
    try {
      const result = await fnRef.current();
      if (id !== latest.current) return; // stale response (deps changed meanwhile)
      setData(result);
      setError(null);
    } catch (e) {
      if (id === latest.current) setError((e as Error).message);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    if (!pollMs) return;
    const t = setInterval(() => load(true), pollMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, pollMs]);

  return { data, loading, error, reload: () => load(true) };
}
