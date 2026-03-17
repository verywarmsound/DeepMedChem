import { useRef, useEffect, useCallback, useState } from "react";
import type { AlignmentResult } from "../types/api";

interface Viewer3DProps {
  result: AlignmentResult | null;
  loading: boolean;
  selectedIndex: number;
  totalResults: number;
  onSelectIndex: (i: number) => void;
}

const REF_COLOR = "0x00FFFF"; // pure vivid cyan
const PROBE_COLOR = "0xec4899"; // pink-500
const TRANSLATE_STEP = 0.3; // Angstrom per click

// Style builders — both use thin sticks for clean overlap reading
function refStyle(opacity: number) {
  return {
    stick: { color: REF_COLOR, radius: 0.08, opacity },
  };
}
function probeStyle(opacity: number) {
  return {
    stick: { color: PROBE_COLOR, radius: 0.08, opacity },
  };
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
  const refModelRef = useRef<$3Dmol.GLModel | null>(null);
  const probeModelRef = useRef<$3Dmol.GLModel | null>(null);
  const scriptLoaded = useRef(false);

  const [refOpacity, setRefOpacity] = useState(1.0);
  const [probeOpacity, setProbeOpacity] = useState(1.0);
  const [showControls, setShowControls] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0, z: 0 });
  const [viewerReady, setViewerReady] = useState(false);
  // Store original atom positions so we can translate from baseline
  const refBaseCoords = useRef<{ x: number; y: number; z: number }[]>([]);

  const initViewer = useCallback(() => {
    if (!containerRef.current || viewerRef.current) return;
    if (window.$3Dmol) {
      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "0x0f172a",
      });
      setViewerReady(true);
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
    script.src = "/3Dmol-min.js";
    script.onload = () => initViewer();
    document.head.appendChild(script);
  }, [initViewer]);

  // Apply styles helper — used both on initial render and when opacity changes
  const applyStyles = useCallback(() => {
    const refModel = refModelRef.current;
    const probeModel = probeModelRef.current;
    const viewer = viewerRef.current;
    if (!refModel || !probeModel || !viewer) return;

    refModel.setStyle({}, refStyle(refOpacity));
    probeModel.setStyle({}, probeStyle(probeOpacity));
    viewer.render();
  }, [refOpacity, probeOpacity]);

  // Load models when result changes or viewer becomes ready
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !result) return;

    viewer.removeAllModels();

    const refModel = viewer.addModel(result.reference_molblock, "sdf");
    const probeModel = viewer.addModel(result.probe_molblock, "sdf");

    refModelRef.current = refModel;
    probeModelRef.current = probeModel;

    // Store original reference coordinates for translation
    const atoms = refModel.selectedAtoms({});
    refBaseCoords.current = atoms.map((a) => ({ x: a.x, y: a.y, z: a.z }));

    // Reset translation offset on new result
    setOffset({ x: 0, y: 0, z: 0 });

    refModel.setStyle({}, refStyle(refOpacity));
    probeModel.setStyle({}, probeStyle(probeOpacity));

    viewer.zoomTo();
    viewer.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, viewerReady]);

  // Re-apply styles when opacity changes (without reloading models)
  useEffect(() => {
    applyStyles();
  }, [applyStyles]);

  // Apply translation to reference atoms
  const translateRef = useCallback(
    (dx: number, dy: number, dz: number) => {
      setOffset((prev) => {
        const next = { x: prev.x + dx, y: prev.y + dy, z: prev.z + dz };
        const refModel = refModelRef.current;
        const viewer = viewerRef.current;
        if (!refModel || !viewer || refBaseCoords.current.length === 0) return next;

        const atoms = refModel.selectedAtoms({});
        for (let i = 0; i < atoms.length; i++) {
          const base = refBaseCoords.current[i];
          if (!base) continue;
          atoms[i].x = base.x + next.x;
          atoms[i].y = base.y + next.y;
          atoms[i].z = base.z + next.z;
        }
        // Re-apply style to force geometry rebuild, then render
        refModel.setStyle({}, refStyle(refOpacity));
        viewer.render();
        return next;
      });
    },
    [refOpacity],
  );

  const resetTranslation = useCallback(() => {
    setOffset({ x: 0, y: 0, z: 0 });

    const refModel = refModelRef.current;
    const viewer = viewerRef.current;
    if (!refModel || !viewer || refBaseCoords.current.length === 0) return;

    const atoms = refModel.selectedAtoms({});
    for (let i = 0; i < atoms.length; i++) {
      const base = refBaseCoords.current[i];
      if (!base) continue;
      atoms[i].x = base.x;
      atoms[i].y = base.y;
      atoms[i].z = base.z;
    }
    refModel.setStyle({}, refStyle(refOpacity));
    viewer.render();
  }, [refOpacity]);

  const handlePrev = () => {
    if (selectedIndex > 0) onSelectIndex(selectedIndex - 1);
  };
  const handleNext = () => {
    if (selectedIndex < totalResults - 1) onSelectIndex(selectedIndex + 1);
  };

  const hasResult = !!result;

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

      {/* Legend + Controls panel */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
        {/* Legend labels */}
        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" /> Reference
          Molecule
        </div>
        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500" /> Probe Molecule
        </div>

        {/* Controls toggle */}
        {hasResult && (
          <button
            className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer"
            onClick={() => setShowControls((v) => !v)}
          >
            <span className="material-symbols-outlined text-xs">tune</span>
            {showControls ? "Hide Controls" : "Show Controls"}
          </button>
        )}

        {/* Expanded controls */}
        {hasResult && showControls && (
          <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-3 flex flex-col gap-3 min-w-[200px]">
            {/* Opacity sliders */}
            <div>
              <label className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider block mb-1">
                Reference Opacity
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(refOpacity * 100)}
                  onChange={(e) =>
                    setRefOpacity(Number(e.target.value) / 100)
                  }
                  className="flex-1 h-1 accent-cyan-400"
                />
                <span className="text-[10px] text-slate-400 w-8 text-right">
                  {Math.round(refOpacity * 100)}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-pink-400 tracking-wider block mb-1">
                Probe Opacity
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(probeOpacity * 100)}
                  onChange={(e) =>
                    setProbeOpacity(Number(e.target.value) / 100)
                  }
                  className="flex-1 h-1 accent-pink-400"
                />
                <span className="text-[10px] text-slate-400 w-8 text-right">
                  {Math.round(probeOpacity * 100)}%
                </span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-white/10" />

            {/* Translation controls */}
            <div>
              <label className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider block mb-2">
                Move Reference
              </label>
              <div className="grid grid-cols-3 gap-1">
                {/* X axis */}
                <button
                  onClick={() => translateRef(-TRANSLATE_STEP, 0, 0)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded text-[10px] font-mono text-white transition-colors"
                >
                  X-
                </button>
                <span className="text-[10px] text-slate-500 flex items-center justify-center font-mono">
                  {offset.x.toFixed(1)}
                </span>
                <button
                  onClick={() => translateRef(TRANSLATE_STEP, 0, 0)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded text-[10px] font-mono text-white transition-colors"
                >
                  X+
                </button>
                {/* Y axis */}
                <button
                  onClick={() => translateRef(0, -TRANSLATE_STEP, 0)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded text-[10px] font-mono text-white transition-colors"
                >
                  Y-
                </button>
                <span className="text-[10px] text-slate-500 flex items-center justify-center font-mono">
                  {offset.y.toFixed(1)}
                </span>
                <button
                  onClick={() => translateRef(0, TRANSLATE_STEP, 0)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded text-[10px] font-mono text-white transition-colors"
                >
                  Y+
                </button>
                {/* Z axis */}
                <button
                  onClick={() => translateRef(0, 0, -TRANSLATE_STEP)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded text-[10px] font-mono text-white transition-colors"
                >
                  Z-
                </button>
                <span className="text-[10px] text-slate-500 flex items-center justify-center font-mono">
                  {offset.z.toFixed(1)}
                </span>
                <button
                  onClick={() => translateRef(0, 0, TRANSLATE_STEP)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded text-[10px] font-mono text-white transition-colors"
                >
                  Z+
                </button>
              </div>
              <button
                onClick={resetTranslation}
                className="mt-2 w-full px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded text-[10px] font-bold uppercase text-cyan-400 transition-colors"
              >
                Reset Position
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen */}
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
