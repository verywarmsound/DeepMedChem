import type { AlignmentResult } from "../types/api";

interface ResultsTableProps {
  results: AlignmentResult[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
}

function downloadCSV(results: AlignmentResult[]) {
  const header = "Rank,Alignment Score,Shape Tanimoto,RMSD (A),Energy (kcal/mol)\n";
  const rows = results
    .map(
      (r) =>
        `${r.rank},${r.alignment_score.toFixed(4)},${r.shape_tanimoto.toFixed(4)},${r.rmsd.toFixed(2)},${r.conformer_energy.toFixed(1)}`,
    )
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "alignment_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultsTable({
  results,
  selectedIndex,
  onSelectIndex,
}: ResultsTableProps) {
  return (
    <div className="rounded-xl border border-primary/10 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-primary/10 flex items-center justify-between">
        <h3 className="font-bold text-lg">Top Alignment Results</h3>
        <button
          className="text-primary text-sm font-semibold flex items-center gap-1 hover:underline"
          onClick={() => downloadCSV(results)}
        >
          <span className="material-symbols-outlined text-sm">download</span>{" "}
          CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Rank
              </th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Alignment Score
              </th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Shape Tanimoto
              </th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                RMSD (&Aring;)
              </th>
              <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Energy (kcal/mol)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {results.map((r, i) => (
              <tr
                key={r.rank}
                className={
                  i === selectedIndex
                    ? "bg-primary/5 border-l-4 border-l-primary"
                    : "hover:bg-primary/5 transition-colors cursor-pointer"
                }
                onClick={() => onSelectIndex(i)}
              >
                <td className="px-6 py-4 font-bold">{r.rank}</td>
                <td className="px-6 py-4">
                  {r.alignment_score.toFixed(3)}
                </td>
                <td className="px-6 py-4">{r.shape_tanimoto.toFixed(3)}</td>
                <td className="px-6 py-4">{r.rmsd.toFixed(2)}</td>
                <td className="px-6 py-4 font-mono text-slate-500">
                  {r.conformer_energy.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
