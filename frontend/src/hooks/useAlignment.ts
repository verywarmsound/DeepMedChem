import { useState, useCallback } from "react";
import { postAlign } from "../api/client";
import type { AlignResponse, AlignRequest } from "../types/api";

export function useAlignment() {
  const [data, setData] = useState<AlignResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const runAlignment = useCallback(async (req: AlignRequest) => {
    setLoading(true);
    setError(null);
    setData(null);
    setSelectedIndex(0);
    try {
      const result = await postAlign(req);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    data,
    loading,
    error,
    clearError,
    selectedIndex,
    setSelectedIndex,
    selectedResult: data?.results[selectedIndex] ?? null,
    runAlignment,
  };
}
