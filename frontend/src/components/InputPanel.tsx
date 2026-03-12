import { useState } from "react";

interface InputPanelProps {
  onSubmit: (refSmiles: string, probeSmiles: string) => void;
  loading: boolean;
}

const DEFAULT_REF = "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O";
const DEFAULT_PROBE = "CC1(C)SC2C(NC(=O)C(N)c3ccc(O)cc3)C(=O)N2C1C(=O)O";

export default function InputPanel({ onSubmit, loading }: InputPanelProps) {
  const [refSmiles, setRefSmiles] = useState(DEFAULT_REF);
  const [probeSmiles, setProbeSmiles] = useState(DEFAULT_PROBE);

  const handleSubmit = () => {
    if (refSmiles.trim() && probeSmiles.trim()) {
      onSubmit(refSmiles.trim(), probeSmiles.trim());
    }
  };

  return (
    <div className="p-6 rounded-xl border border-primary/10 bg-white dark:bg-slate-900/50 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">science</span>
        <h3 className="font-bold text-lg">Input Molecules</h3>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Reference SMILES
          </label>
          <textarea
            className="w-full h-24 p-3 rounded-lg border border-primary/20 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none text-sm font-mono text-slate-900 dark:text-slate-100"
            placeholder="Enter Reference SMILES..."
            value={refSmiles}
            onChange={(e) => setRefSmiles(e.target.value)}
          />
          <p className="text-[10px] text-slate-500 italic">
            Commonly used: Ampicillin
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Probe SMILES
          </label>
          <textarea
            className="w-full h-24 p-3 rounded-lg border border-primary/20 bg-background-light dark:bg-background-dark focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none text-sm font-mono text-slate-900 dark:text-slate-100"
            placeholder="Enter Probe SMILES..."
            value={probeSmiles}
            onChange={(e) => setProbeSmiles(e.target.value)}
          />
          <p className="text-[10px] text-slate-500 italic">
            Commonly used: Amoxicillin
          </p>
        </div>
        <button
          className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={loading || !refSmiles.trim() || !probeSmiles.trim()}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Aligning...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">auto_fix_high</span>
              Run Alignment
            </>
          )}
        </button>
      </div>
    </div>
  );
}
