import { useMemo } from "react";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import InputPanel from "./components/InputPanel";
import StatsPanel from "./components/StatsPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import Viewer3D from "./components/Viewer3D";
import ResultsTable from "./components/ResultsTable";
import FingerprintView from "./components/FingerprintView";
import Footer from "./components/Footer";
import ErrorBanner from "./components/ErrorBanner";
import { useAlignment } from "./hooks/useAlignment";

function App() {
  const {
    data,
    loading,
    error,
    clearError,
    selectedIndex,
    setSelectedIndex,
    selectedResult,
    runAlignment,
  } = useAlignment();

  const propertiesSmiles = useMemo(
    () => (data ? [data.reference_smiles, data.probe_smiles] : null),
    [data?.reference_smiles, data?.probe_smiles],
  );

  const handleSubmit = (refSmiles: string, probeSmiles: string) => {
    runAlignment({
      reference_smiles: refSmiles,
      probe_smiles: probeSmiles,
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 mol-gradient">
        <HeroSection />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column: Inputs & Controls */}
          <div className="lg:col-span-4 space-y-6">
            <InputPanel onSubmit={handleSubmit} loading={loading} />
            <StatsPanel result={selectedResult} />
            <PropertiesPanel smiles={propertiesSmiles} />
            <FingerprintView
              smiles={data ? data.probe_smiles : null}
            />
          </div>

          {/* Right column: 3D Viewer & Results */}
          <div className="lg:col-span-8 space-y-6">
            {error && <ErrorBanner message={error} onDismiss={clearError} />}
            <Viewer3D
              result={selectedResult}
              loading={loading}
              selectedIndex={selectedIndex}
              totalResults={data?.results.length ?? 0}
              onSelectIndex={setSelectedIndex}
            />
            {data && (
              <ResultsTable
                results={data.results}
                selectedIndex={selectedIndex}
                onSelectIndex={setSelectedIndex}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
