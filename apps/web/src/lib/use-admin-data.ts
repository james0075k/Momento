"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export interface AdminData<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads something for an admin screen. A 401 (the session ended, even after the silent refresh) sends
 * the person to the login page; any other failure becomes a message the screen can show.
 */
export function useAdminData<T>(load: () => Promise<T>, deps: unknown[] = []): AdminData<T> {
  const router = useRouter();
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({
    loading: true,
  });
  const [tick, setTick] = useState(0);
  const loader = useRef(load);
  loader.current = load;

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));
    loader
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          const next = encodeURIComponent(window.location.pathname);
          router.replace(`/admin/login?next=${next}`);
          return;
        }
        setState({
          error: error instanceof ApiError ? error.message : "Something went wrong.",
          loading: false,
        });
      });
    return () => {
      cancelled = true;
    };
    // The caller lists what the request depends on; `tick` re-runs it on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, router, ...deps]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { data: state.data, error: state.error, loading: state.loading, reload };
}
