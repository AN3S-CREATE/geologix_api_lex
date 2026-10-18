import { useState, useEffect, useCallback, useRef } from 'react';

interface QueryResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function emptyFallback<T>(): T {
  return [] as unknown as T;
}

export function useQuery<T>(fetcher: () => Promise<T>): QueryResult<T> {
  const [data, setData] = useState<T>(emptyFallback<T>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);

  // Stable ref to the latest fetcher so the effect doesn't need it as a dep
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; });

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcherRef.current()
      .then((result) => {
        if (!cancelled) {
          // Guard: ensure result is never null/undefined
          const safe = result != null ? result : emptyFallback<T>();
          setData(safe);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          // On error keep previous data — don't reset to null
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [trigger]);

  return { data, loading, error, refetch };
}
