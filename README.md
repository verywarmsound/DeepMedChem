# Deep MedChem — Molecular Alignment Viewer

A full-stack web application for aligning two molecules in 3D and visualizing the result. Enter two SMILES strings, generate conformers, align them via Maximum Common Substructure (MCS), and explore the top-ranked poses in an interactive 3D viewer.

![Stack](https://img.shields.io/badge/Backend-FastAPI%20%2B%20RDKit-blue)
![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue)
![Stack](https://img.shields.io/badge/3D-3Dmol.js-green)
![Stack](https://img.shields.io/badge/ML-DeepChem%20%2B%20PyTorch-orange)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

---

## Quick Start

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser. That's it.

The default inputs (Ampicillin vs Amoxicillin) are pre-filled. Click **Run Alignment** and wait for the results.

---

## Architecture

```
┌──────────────────────────────┐      ┌────────────────────────────────┐
│         Frontend             │      │           Backend              │
│  React 19 + TypeScript       │      │   FastAPI + RDKit + DeepChem   │
│  Tailwind CSS + 3Dmol.js     │─────>│                                │
│  Nginx (production)          │ /api │   POST /align                  │
│  Vite  (development)         │      │   POST /properties             │
│  Port 3000                   │      │   POST /fingerprint            │
└──────────────────────────────┘      │   GET  /health                 │
                                      │   Port 8000                    │
                                      └────────────────────────────────┘
```

**Docker Compose** orchestrates both services. Nginx reverse-proxies `/api/*` requests to the backend container over the internal Docker network. The frontend waits for the backend health check to pass before starting.

---

## Required Features (per assignment spec)

### Backend — `POST /align`

| Requirement | Implementation | File |
|---|---|---|
| Accept two SMILES + num_conformers with defaults | `AlignRequest` Pydantic model, `num_conformers` defaults to 50 | `backend/app/models.py:5-23` |
| Generate 3D conformers with `EmbedMultipleConfs` | ETKDGv3 with `pruneRmsThresh=0.5`, random seed 42 | `backend/app/alignment.py:27-46` |
| Optimize with MMFF force field | `MMFFOptimizeMoleculeConfs` with 500 max iterations | `backend/app/alignment.py:49-62` |
| MCS-based alignment | `rdFMCS.FindMCS` with ring-matching constraints, atom map extracted and used for `AlignMol` | `backend/app/alignment.py:68-128` |
| Return top 5 results with molblocks, score, RMSD, energy | Sorted by score descending, re-aligned on deep copies for correct molblock output | `backend/app/alignment.py:134-170` |
| Input validation with HTTP status codes | Pydantic `field_validator` for SMILES validity, `HTTPException(422)` for bad input, `HTTPException(500)` for runtime errors | `backend/app/models.py:25-33`, `backend/app/main.py:65-68` |

### Frontend — React + TypeScript + 3Dmol.js

| Requirement | Implementation | File |
|---|---|---|
| Two SMILES text fields + submit button | `InputPanel` component with textareas, pre-filled with Ampicillin/Amoxicillin | `frontend/src/components/InputPanel.tsx` |
| 3D viewer with two-color display | 3Dmol.js viewer: reference in cyan, probe in pink, stick+sphere style | `frontend/src/components/Viewer3D.tsx:52-68` |
| Switch between top 5 results | Numbered pagination buttons + prev/next arrows in the viewer overlay | `frontend/src/components/Viewer3D.tsx:152-184` |
| Results table with score, RMSD, energy | Interactive table with row selection, highlights active result | `frontend/src/components/ResultsTable.tsx` |
| Loading and error states | Spinner overlay on viewer during alignment, `ErrorBanner` component with dismiss button | `frontend/src/components/Viewer3D.tsx:100-128`, `frontend/src/components/ErrorBanner.tsx` |

### Integration

| Requirement | Implementation | File |
|---|---|---|
| Frontend calls backend API | Centralized API client with typed request/response | `frontend/src/api/client.ts` |
| `docker-compose.yml` — single command launch | Two services, health check dependency, nginx reverse proxy | `docker-compose.yml`, `frontend/nginx.conf` |
| Default test molecules | Ampicillin and Amoxicillin SMILES pre-filled | `frontend/src/components/InputPanel.tsx:8-9` |

---

## Beyond-Scope Features

These features were **not required** by the assignment but add significant value:

### 1. ESOL Solubility Prediction

**What:** Predicts aqueous log-solubility for both molecules using a DeepChem `MultitaskRegressor` trained on the Delaney (ESOL) dataset.

**Why it matters:** Solubility is one of the most critical ADMET properties in drug discovery. Showing it alongside the alignment gives immediate context about whether the aligned molecules are druglike. A medicinal chemist reviewing alignment results can instantly see if a probe molecule trades off solubility for shape similarity.

**Files:** `backend/app/properties.py:72-85` (prediction), `frontend/src/components/PropertiesPanel.tsx` (display)

### 2. Tox21 Toxicity Prediction

**What:** Predicts toxicity probabilities across 12 Tox21 assays (nuclear receptor signaling, stress response pathways) using a DeepChem `MultitaskClassifier`.

**Why it matters:** Early toxicity flagging saves enormous cost in drug development. Displaying the number of toxicity alerts (probability > 0.5) for both reference and probe molecules lets users quickly assess whether the probe introduces new safety liabilities compared to the reference.

**Files:** `backend/app/properties.py:88-112` (prediction), `frontend/src/components/PropertiesPanel.tsx:55-65` (alert count display)

### 3. ECFP Fingerprint Visualization

**What:** Computes Morgan/ECFP fingerprints (2048-bit, radius 2) and renders a visual bit-grid showing which structural features are present.

**Why it matters:** Fingerprints are the foundation of molecular similarity. The visual grid lets users see at a glance how structurally complex the probe molecule is (bit density) and which positional bits are active — useful for understanding why two molecules align well or poorly.

**Files:** `backend/app/fingerprints.py` (computation using `rdFingerprintGenerator.MorganGenerator`), `frontend/src/components/FingerprintView.tsx` (grid visualization with Set-based O(1) lookups)

### 4. CSV Export

**What:** One-click download of alignment results as a CSV file with rank, alignment score, RMSD, and conformer energy columns.

**Why it matters:** Scientists need to record and share results. The CSV export lets users bring alignment data into Excel, Jupyter notebooks, or other analysis tools without manual transcription.

**File:** `frontend/src/components/ResultsTable.tsx:9-24`

### 5. Fullscreen 3D Viewer

**What:** A button in the viewer overlay triggers the browser Fullscreen API for immersive molecular inspection.

**Why it matters:** 3D molecular visualization benefits greatly from screen real estate. Fullscreen mode makes it practical to examine alignment quality on large monitors or during presentations.

**File:** `frontend/src/components/Viewer3D.tsx:143-148`

### 6. Thread-Safe Model Caching with Double-Checked Locking

**What:** DeepChem models (ESOL, Tox21) are trained on first request and cached globally with `threading.Lock` double-checked locking to prevent race conditions.

**Why it matters:** The backend uses `ThreadPoolExecutor` for async offloading. Without locking, concurrent requests could both trigger model training simultaneously — doubling memory usage and potentially corrupting shared state. The double-checked pattern avoids lock contention after initialization.

**File:** `backend/app/properties.py:18-68`

### 7. Graceful Partial Failure for Properties

**What:** The `/properties` endpoint independently try/excepts solubility and toxicity predictions. If one model fails, the other's results still return with `null` for the failed predictions.

**Why it matters:** Tox21 model training is heavy and can fail under memory pressure. Rather than returning a 500 error and showing nothing, the frontend gracefully displays "N/A" for the failed prediction while still showing the successful one.

**File:** `backend/app/main.py:75-103`

### 8. Health Check with Dependency Ordering

**What:** The backend exposes `GET /health`, Docker Compose defines a health check, and the frontend service uses `condition: service_healthy` to wait for the backend.

**Why it matters:** Without this, `docker compose up` can start nginx before uvicorn is ready, causing the first API requests to fail with 502 errors. The health check ensures reliable cold-start behavior.

**Files:** `backend/app/main.py:46-48`, `docker-compose.yml:11-14,22-23`

### 9. MCS Metadata in API Response

**What:** The `/align` response includes `mcs_smarts` (the SMARTS pattern of the common substructure) and `num_mcs_atoms` (how many atoms overlap).

**Why it matters:** This gives transparency into the alignment. Users can see exactly which substructure was used for alignment and how extensive the overlap is — crucial for evaluating whether the alignment is chemically meaningful.

**File:** `backend/app/models.py:47-52`, `backend/app/alignment.py:164-169`

### 10. Polished UI Design

**What:** Custom theme (Space Grotesk font, primary blue palette), dark mode support via Tailwind `dark:` variants, gradient backgrounds, Material Symbols icons, responsive 12-column grid layout, animated loading states.

**Why it matters:** A polished UI demonstrates attention to the end-user experience and shows front-end competence beyond basic functionality. The responsive grid ensures the app works on tablets and smaller screens.

**Files:** `frontend/src/index.css` (theme), `frontend/index.html` (fonts), all components (dark mode classes)

---

## Alignment Algorithm Details

The core alignment pipeline (`backend/app/alignment.py`):

1. **Parse & Hydrogenate** — SMILES parsed with RDKit, explicit hydrogens added for accurate 3D geometry.
2. **Conformer Generation** — ETKDGv3 with `pruneRmsThresh=0.5` generates diverse low-energy conformers. Random seed (42) ensures reproducibility.
3. **MMFF Optimization** — All conformers optimized with the Merck Molecular Force Field (500 max iterations). Energies recorded for ranking.
4. **Reference Selection** — The lowest-energy reference conformer is chosen as the alignment target.
5. **MCS Discovery** — `rdFMCS.FindMCS` with `completeRingsOnly=True` and `ringMatchesRingOnly=True` finds the largest common substructure, ensuring chemically meaningful ring-aware matching.
6. **Atom-Mapped Alignment** — Each probe conformer is aligned to the reference via the MCS atom map using `AllChem.AlignMol`, which minimizes RMSD over the mapped atoms.
7. **Scoring** — `overlap_fraction / (1 + rmsd)` rewards high substructure overlap and penalizes geometric deviation.
8. **Top-5 Selection** — Results sorted by score (descending), then RMSD (ascending). Top 5 re-aligned on deep copies for correct SDF molblock output.

---

## API Reference

### `POST /align`

```json
{
  "reference_smiles": "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O",
  "probe_smiles": "CC1(C)SC2C(NC(=O)C(N)c3ccc(O)cc3)C(=O)N2C1C(=O)O",
  "num_conformers": 50
}
```

Returns top 5 alignment results with molblocks, scores, RMSD, energy, and MCS metadata.

### `POST /properties`

```json
{
  "smiles_list": ["CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O"]
}
```

Returns ESOL solubility and Tox21 toxicity predictions.

### `POST /fingerprint`

```json
{
  "smiles": "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O",
  "radius": 2,
  "n_bits": 2048
}
```

Returns ECFP bit positions, count, and density.

### `GET /health`

Returns `{"status": "ok"}`.

---

## Development

### Run locally without Docker

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `localhost:8000`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | FastAPI |
| Chemistry | RDKit (conformers, MCS, MMFF, alignment) |
| Machine Learning | DeepChem 2.8.0 + PyTorch |
| Frontend Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| 3D Visualization | 3Dmol.js |
| Build Tool | Vite 7 |
| Containerization | Docker Compose |
| Reverse Proxy | Nginx |
