import { useState, useCallback } from "react";
import { postProperties } from "../api/client";
import type { PropertiesResponse } from "../types/api";

export function useProperties() {
  const [data, setData] = useState<PropertiesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async (smilesList: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await postProperties(smilesList);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchProperties };
}
