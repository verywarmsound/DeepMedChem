import { useEffect } from "react";
import { useProperties } from "../hooks/useProperties";

interface PropertiesPanelProps {
  smiles: string[] | null;
}

export default function PropertiesPanel({ smiles }: PropertiesPanelProps) {
  const { data, loading, error, fetchProperties } = useProperties();

  useEffect(() => {
    if (smiles && smiles.length > 0) {
      fetchProperties(smiles);
    }
  }, [smiles, fetchProperties]);

  if (!smiles) return null;

  return (
    <div className="p-6 rounded-xl border border-primary/10 bg-white dark:bg-slate-900/50 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary text-sm">
          psychology
        </span>
        <h3 className="text-sm font-bold text-primary uppercase tracking-widest">
          Predicted Properties
        </h3>
      </div>
      {loading && (
        <p className="text-xs text-slate-500 animate-pulse">
          Computing predictions...
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400">Properties unavailable</p>
      )}
      {data &&
        data.predictions.map((pred, i) => (
          <div key={pred.smiles} className="mb-3 last:mb-0">
            <p className="text-xs text-slate-500 mb-1">
              {i === 0 ? "Reference" : "Probe"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background-light dark:bg-background-dark p-2 rounded-lg">
                <p className="text-[10px] text-slate-500">ESOL Solubility</p>
                <p className="text-sm font-bold">
                  {pred.esol_log_solubility != null
                    ? `${pred.esol_log_solubility.toFixed(2)} log mol/L`
                    : "N/A"}
                </p>
              </div>
              <div className="bg-background-light dark:bg-background-dark p-2 rounded-lg">
                <p className="text-[10px] text-slate-500">Tox21 Alerts</p>
                <p className="text-sm font-bold">
                  {pred.tox21_predictions
                    ? Object.values(pred.tox21_predictions).filter(
                        (v) => v > 0.5,
                      ).length
                    : "N/A"}
                  {pred.tox21_predictions && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      {" "}
                      / {Object.keys(pred.tox21_predictions).length}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
