import type { AlignmentResult } from "../types/api";

interface StatsPanelProps {
  result: AlignmentResult | null;
}

export default function StatsPanel({ result }: StatsPanelProps) {
  return (
    <div className="p-6 rounded-xl border border-primary/10 bg-primary/5 dark:bg-primary/10">
      <h3 className="text-sm font-bold text-primary uppercase mb-4 tracking-widest">
        Selected Result Stats
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-primary/5">
          <p className="text-xs text-slate-500">Shape Tanimoto</p>
          <p className="text-2xl font-bold">
            {result ? result.shape_tanimoto.toFixed(3) : "--"}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-primary/5">
          <p className="text-xs text-slate-500">RMSD (&Aring;)</p>
          <p className="text-2xl font-bold">
            {result ? result.rmsd.toFixed(2) : "--"}
          </p>
        </div>
      </div>
    </div>
  );
}
