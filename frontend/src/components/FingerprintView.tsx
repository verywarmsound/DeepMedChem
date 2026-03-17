import { useCallback, useEffect, useMemo, useState } from "react";
import { postFingerprint } from "../api/client";
import type { FingerprintResponse } from "../types/api";

interface FingerprintViewProps {
  smiles: string | null;
}

function FingerprintGrid({ data }: { data: FingerprintResponse }) {
  const bitsOnSet = useMemo(() => new Set(data.bits_on), [data.bits_on]);

  return (
    <>
      <div className="flex gap-4 mb-3 text-xs text-slate-500">
        <span>
          Bits ON: <strong className="text-slate-200">{data.bits_on.length}</strong>
        </span>
        <span>
          Density: <strong className="text-slate-200">{(data.density * 100).toFixed(1)}%</strong>
        </span>
      </div>
      <div className="flex flex-wrap gap-px">
        {Array.from({ length: Math.min(256, data.n_bits) }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-sm ${
              bitsOnSet.has(i) ? "bg-primary" : "bg-slate-800"
            }`}
            title={`Bit ${i}: ${bitsOnSet.has(i) ? "ON" : "OFF"}`}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-2">
        Showing first 256 of {data.n_bits} bits
      </p>
    </>
  );
}

export default function FingerprintView({ smiles }: FingerprintViewProps) {
  const [data, setData] = useState<FingerprintResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFingerprint = useCallback(async (s: string, signal: AbortSignal) => {
    setLoading(true);
    try {
      const result = await postFingerprint(s);
      if (!signal.aborted) setData(result);
    } catch {
      if (!signal.aborted) setData(null);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!smiles) return;
    const ac = new AbortController();
    fetchFingerprint(smiles, ac.signal);
    return () => ac.abort();
  }, [smiles, fetchFingerprint]);

  if (!smiles) return null;

  return (
    <div className="p-6 rounded-xl border border-primary/10 bg-white dark:bg-slate-900/50 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary text-sm">
          fingerprint
        </span>
        <h3 className="text-sm font-bold text-primary uppercase tracking-widest">
          ECFP Fingerprint
        </h3>
      </div>
      {loading && (
        <p className="text-xs text-slate-500 animate-pulse">Computing...</p>
      )}
      {data && <FingerprintGrid data={data} />}
    </div>
  );
}
