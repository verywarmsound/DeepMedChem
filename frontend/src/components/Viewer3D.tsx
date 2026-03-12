import { useRef, useEffect, useCallback } from "react";
import type { AlignmentResult } from "../types/api";

interface Viewer3DProps {
  result: AlignmentResult | null;
  loading: boolean;
  selectedIndex: number;
  totalResults: number;
  onSelectIndex: (i: number) => void;
}

export default function Viewer3D({
  result,
  loading,
  selectedIndex,
  totalResults,
  onSelectIndex,
}: Viewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<$3Dmol.GLViewer | null>(null);
  const scriptLoaded = useRef(false);

  const initViewer = useCallback(() => {
    if (!containerRef.current || viewerRef.current) return;
    if (window.$3Dmol) {
      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "0x0f172a",
      });
    }
  }, []);

  useEffect(() => {
    if (window.$3Dmol) {
      initViewer();
      return;
    }
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    const script = document.createElement("script");
    script.src = "https://3Dmol.org/build/3Dmol-min.js";
    script.onload = () => initViewer();
    document.head.appendChild(script);
  }, [initViewer]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !result) return;

    viewer.removeAllModels();

    const refModel = viewer.addModel(result.reference_molblock, "sdf");
    refModel.setStyle(
      {},
      {
        stick: { colorscheme: "cyanCarbon", radius: 0.15 },
        sphere: { colorscheme: "cyanCarbon", scale: 0.25 },
      },
    );

    const probeModel = viewer.addModel(result.probe_molblock, "sdf");
    probeModel.setStyle(
      {},
      {
        stick: { color: "0xec4899", radius: 0.15 },
        sphere: { color: "0xec4899", scale: 0.25 },
      },
    );

    viewer.zoomTo();
    viewer.render();
  }, [result]);

  const handlePrev = () => {
    if (selectedIndex > 0) onSelectIndex(selectedIndex - 1);
  };
  const handleNext = () => {
    if (selectedIndex < totalResults - 1) onSelectIndex(selectedIndex + 1);
  };

  return (
    <div className="relative w-full aspect-video rounded-xl border border-primary/20 bg-slate-950 overflow-hidden shadow-2xl group">
      <div ref={containerRef} className="absolute inset-0" />

      {!result && !loading && (
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="relative">
            <div className="w-64 h-64 border-2 border-cyan-500/30 rounded-full flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-pink-500/30 rounded-full rotate-45 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-6xl opacity-20">
                  biotech
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-10 w-10 text-primary"
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
            <p className="text-sm text-slate-400">
              Generating conformers & aligning...
            </p>
          </div>
        </div>
      )}

      {/* Legend overlays */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" /> Reference
          Molecule
        </div>
        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500" /> Probe Molecule
        </div>
      </div>

      {/* Fullscreen / settings */}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        <button
          className="size-8 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center text-white hover:bg-primary transition-colors"
          onClick={() => containerRef.current?.requestFullscreen?.()}
        >
          <span className="material-symbols-outlined text-sm">fullscreen</span>
        </button>
      </div>

      {/* Pager */}
      {totalResults > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl z-20">
          <button
            className="p-2 hover:text-primary transition-colors text-white/50 disabled:opacity-30"
            onClick={handlePrev}
            disabled={selectedIndex === 0}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalResults }, (_, i) => (
              <button
                key={i}
                className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${
                  i === selectedIndex
                    ? "bg-primary text-white"
                    : "hover:bg-white/10 text-white"
                }`}
                onClick={() => onSelectIndex(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            className="p-2 hover:text-primary transition-colors text-white/50 disabled:opacity-30"
            onClick={handleNext}
            disabled={selectedIndex === totalResults - 1}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
