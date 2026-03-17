# Deep MedChem — Molecular Alignment Viewer

A full-stack web application for 3D molecular alignment and analysis. Enter two molecules as SMILES strings, generate conformers, align them by their Maximum Common Substructure, and explore the results in an interactive 3D viewer with opacity controls and translation tools.

Made by **Olga Korpacheva**.

**Live demo:** [deepmedchem.vercel.app](https://deepmedchem.vercel.app/)

![Stack](https://img.shields.io/badge/Backend-FastAPI%20%2B%20RDKit-blue)
![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue)
![Stack](https://img.shields.io/badge/3D-3Dmol.js-green)
![Stack](https://img.shields.io/badge/ML-DeepChem%20%2B%20PyTorch-orange)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

---

## What This App Does

You give it two molecules. It finds what they have in common, aligns them in 3D space, and shows you how well they overlap. It also predicts solubility, toxicity, and shows molecular fingerprints.

This is useful in **drug discovery**: medicinal chemists take a known active drug (the **reference**) and compare it to a new candidate compound (the **probe**) to see if the candidate preserves the key structural features needed for biological activity.

---

## Key Concepts

### Reference Molecule vs Probe Molecule

- **Reference** — the known molecule, the "template". Typically a drug or compound with known activity. It stays fixed in 3D space. Displayed in **cyan** in the viewer.
- **Probe** — the new candidate molecule being evaluated. It gets aligned (moved and rotated) to overlap with the reference as much as possible. Displayed in **pink** in the viewer.

The alignment answers the question: *"How similar is my new molecule to this known drug in 3D space?"*

### SMILES

SMILES (Simplified Molecular Input Line Entry System) is a text notation for describing molecular structures. For example:
- `c1ccccc1` = benzene
- `CC(=O)O` = acetic acid
- `CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O` = Penicillin G (benzylpenicillin)

### Maximum Common Substructure (MCS)

The largest fragment of atoms and bonds that exists in both molecules. The app finds this automatically and uses it to decide which atoms in the probe should be mapped to which atoms in the reference for alignment.

### Conformers

A molecule's SMILES only describes connectivity (which atoms are bonded). In reality, a molecule can adopt many 3D shapes (conformations) due to rotatable bonds. The app generates up to 50 conformers per molecule, optimizes their geometry, and picks the best ones for alignment.

---

## Architecture

```
┌───────────────────────────────┐      ┌─────────────────────────────────┐
│          Frontend             │      │           Backend               │
│   React 19 + TypeScript       │      │   FastAPI + RDKit + DeepChem    │
│   Tailwind CSS + 3Dmol.js     │─────>│                                 │
│   Nginx (prod) / Vite (dev)   │ /api │   POST /align                   │
│                               │      │   POST /properties              │
│   Port 3000 (prod)            │      │   POST /fingerprint             │
│   Port 5173 (dev)             │      │   GET  /health                  │
└───────────────────────────────┘      │   Port 8000                     │
                                       └─────────────────────────────────┘
```

The backend handles all chemistry computations (RDKit) and ML predictions (DeepChem). The frontend renders the 3D viewer and UI. In production, Nginx serves the built frontend and reverse-proxies API calls to the backend. In development, Vite provides instant hot-reload.

---

## Running the App

### Development (with hot-reload)

```bash
docker compose --profile dev up --build
```

Open [http://localhost:5173](http://localhost:5173). Any changes to frontend or backend source files will auto-reload.

### Production

```bash
docker compose --profile prod up --build
```

Open [http://localhost:3000](http://localhost:3000). Frontend is built as static files and served via Nginx.

### Without Docker (local development)

**Backend** (Python 3.11+ required; Docker uses 3.11, local venv uses 3.13):
```bash
# Option A: using uv (recommended, from repo root)
uv sync
.venv/bin/python3 -m uvicorn app.main:app --app-dir backend --reload --port 8000

# Option B: using pip (Python 3.11 recommended for torch compatibility)
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

The Vite dev server proxies `/api/*` to `localhost:8000` automatically.

---

## Running Tests

### Backend tests (pytest)

```bash
cd backend
python3 -m pytest tests/ -v
```

**30 tests** covering:
- **Alignment correctness** — MCS atom mapping, RMSD thresholds, shape Tanimoto scores
- **Self-alignment** — aligning a molecule to itself produces near-zero RMSD (validates the atom mapping is correct)
- **Molblock output** — valid SDF format, 3D coordinates present, no hydrogen atoms in output
- **API endpoints** — /health, /align, /fingerprint, /properties with success and error cases
- **Properties validation** — invalid SMILES rejected (422), model failures return 503, partial failure degrades gracefully
- **Edge cases** — invalid SMILES, single conformer, scoring invariants

### Frontend E2E tests (Playwright)

```bash
cd frontend
npx playwright test
```

**10 tests** covering:
- Viewer renders after alignment, pager navigation works
- Opacity sliders appear and change values
- Translation controls update offset display, reset works
- Results table shows columns, row clicks update the viewer

Note: E2E tests require both backend and frontend running. Playwright config auto-starts both servers using the project venv (`.venv/bin/python3`). Run `uv sync` from the repo root first to ensure backend dependencies are installed.

---

## How the Alignment Works

The core pipeline lives in `backend/app/alignment.py`:

### Step 1: Parse SMILES
Both SMILES strings are parsed with RDKit. Explicit hydrogens are added for accurate 3D geometry generation.

### Step 2: Generate Conformers
ETKDGv3 (Experimental Torsion Knowledge Distance Geometry, version 3) generates up to 50 3D conformations per molecule. Parameters:
- `randomSeed=42` for reproducibility
- `pruneRmsThresh=0.5` to remove near-duplicate conformers

### Step 3: Energy Minimization
All conformers are optimized with the MMFF (Merck Molecular Force Field) force field, up to 500 iterations. The energy of each conformer is recorded.

### Step 4: Select Reference Conformer
The lowest-energy reference conformer is chosen as the fixed alignment target.

### Step 5: Find MCS
`rdFMCS.FindMCS` identifies the Maximum Common Substructure between the two molecules with constraints:
- `completeRingsOnly=True` — partial ring matches are not allowed
- `ringMatchesRingOnly=True` — ring atoms only match other ring atoms
- `matchValences=True` — atom valences must match

The MCS atom indices are found on hydrogen-free molecules, then mapped back to the hydrogen-containing molecules for correct 3D alignment.

### Step 6: Align
Each probe conformer is aligned to the reference using `AllChem.AlignMol` with the MCS atom map. This minimizes the RMSD (Root Mean Square Deviation) over the mapped atoms.

### Step 7: Score
Each alignment is scored as:

```
score = overlap_fraction / (1 + rmsd)
```

Where `overlap_fraction = num_mcs_atoms / max(ref_heavy_atoms, probe_heavy_atoms)`.

This rewards high structural overlap and penalizes geometric deviation.

### Step 8: Top 5
Results are sorted by score (descending), then RMSD (ascending) as tiebreaker. The top 5 are re-aligned on fresh molecule copies and exported as SDF molblocks (with hydrogens removed for clean rendering).

Shape Tanimoto similarity (0 to 1) is also computed for each result using `rdShapeHelpers.ShapeTanimotoDist`.

---

## Results Table & CSV Export

The results table shows five columns for each of the top 5 alignments:

| Column | What it means |
|---|---|
| **Rank** | Position in the ranking (1 = best alignment) |
| **Alignment Score** | Combined score: `overlap_fraction / (1 + rmsd)`. Higher is better. Range: 0 to 1. |
| **Shape Tanimoto** | 3D shape similarity between the two molecules. 1.0 = identical shapes, 0.0 = completely different. Computed from the volume overlap of van der Waals surfaces. |
| **RMSD** | Root Mean Square Deviation of the aligned MCS atoms, in Angstroms. Lower is better. Measures how closely the common atoms overlap in 3D. |
| **Energy** | Conformer energy from MMFF optimization, in kcal/mol. Lower energy = more stable conformation. |

Click **CSV** to download these values as a spreadsheet-compatible file.

---

## Predicted Properties

### ESOL Log Solubility

Predicts aqueous solubility on a log scale (log mol/L) using a neural network trained on the Delaney (ESOL) dataset.

- **Model**: DeepChem `MultitaskRegressor` with layers [1000, 500], dropout 0.25
- **Features**: Morgan fingerprints (radius 2, 1024 bits)
- **Training**: 50 epochs on the Delaney dataset (~1,100 molecules)
- **Interpretation**: more negative = less soluble. Typical drug-like range: -1 to -6

Solubility is one of the most critical ADMET properties. A drug candidate that can't dissolve in water won't be absorbed effectively.

### Tox21 Toxicity Alerts

Predicts the probability of activity across 12 Tox21 toxicity assays (nuclear receptor signaling and stress response pathways).

- **Model**: DeepChem `MultitaskClassifier` with layers [1000, 500], dropout 0.25
- **Features**: Morgan fingerprints (radius 2, 1024 bits)
- **Training**: 30 epochs on the Tox21 dataset (~8,000 molecules, 12 tasks)
- **Interpretation**: shows count of assays where predicted probability > 0.5 (e.g., "3 / 12" means 3 toxicity alerts). Fewer alerts = safer compound.

Both models are trained on first request and cached in memory with thread-safe double-checked locking.

> **First-use latency:** The very first `/properties` request triggers model training *and* downloads the training datasets (Delaney ESOL ~1 MB, Tox21 ~10 MB) from MoleculeNet. This requires network access and typically takes 30-60 seconds. Subsequent requests use the cached models and respond in under a second. On the live demo, the Railway backend may also cold-start after periods of inactivity, adding additional delay.

### ECFP Fingerprint

Displays the Extended-Connectivity Fingerprint (Morgan fingerprint) of the probe molecule as a visual bit-grid.

- **Parameters**: radius 2, 2048 bits
- **Visualization**: shows the first 256 bits as a grid of dots (blue = ON, gray = OFF)
- **Bit density**: percentage of bits that are ON. Higher density = more complex molecule with more substructural features.

Fingerprints are the foundation of molecular similarity searching. Each ON bit represents a circular substructure pattern found in the molecule.

---

## 3D Viewer Controls

### Opacity Sliders
Click **Show Controls** in the viewer to adjust:
- **Reference Opacity** (default 100%) — make the reference more or less transparent
- **Probe Opacity** (default 100%) — make the probe more or less transparent

Use these to fade one molecule and see the other more clearly.

### Translation Controls
Move the reference molecule along X, Y, and Z axes (0.3 Angstrom per click) to manually separate or overlay the molecules. Click **Reset Position** to snap back to the original alignment.

### Navigation
Use the numbered buttons (1-5) or arrow keys at the bottom of the viewer to switch between the top 5 alignment results. Clicking a row in the results table also switches the viewer.

---

## Project Structure

```
DeepMedChem/
├── docker-compose.yml          # Docker orchestration (dev + prod profiles)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI endpoints
│       ├── models.py           # Pydantic request/response models
│       ├── alignment.py        # MCS-based 3D alignment pipeline
│       ├── properties.py       # ESOL + Tox21 predictions (DeepChem)
│       ├── fingerprints.py     # ECFP fingerprint computation
│       └── config.py           # App settings
├── backend/tests/
│   ├── test_alignment.py       # 17 alignment correctness tests
│   └── test_api.py             # 13 API endpoint tests
├── frontend/
│   ├── Dockerfile              # Multi-stage build (deps -> build -> nginx)
│   ├── playwright.config.ts    # E2E test configuration
│   ├── nginx.conf              # Reverse proxy for /api -> backend
│   ├── e2e/
│   │   └── viewer.spec.ts      # 10 Playwright E2E tests
│   └── src/
│       ├── App.tsx              # Main layout and state management
│       ├── api/client.ts        # Typed API client
│       ├── hooks/
│       │   ├── useAlignment.ts  # Alignment state hook
│       │   └── useProperties.ts # Properties state hook
│       ├── components/
│       │   ├── Viewer3D.tsx     # 3Dmol.js viewer with controls
│       │   ├── InputPanel.tsx   # SMILES input fields
│       │   ├── ResultsTable.tsx # Results table with CSV export
│       │   ├── StatsPanel.tsx   # Shape Tanimoto + RMSD display
│       │   ├── PropertiesPanel.tsx  # Solubility + toxicity display
│       │   ├── FingerprintView.tsx  # ECFP bit-grid visualization
│       │   ├── Header.tsx       # App header with GitHub link
│       │   ├── HeroSection.tsx  # Title section
│       │   ├── Footer.tsx       # Footer with credits
│       │   └── ErrorBanner.tsx  # Dismissible error display
│       └── types/
│           ├── api.ts           # TypeScript API types
│           └── 3dmol.d.ts       # 3Dmol.js type declarations
```

---

## API Reference

### `POST /align`

Align two molecules and return top 5 results.

**Request:**
```json
{
  "reference_smiles": "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O",
  "probe_smiles": "CC1(C)SC2C(NC(=O)C(N)c3ccc(O)cc3)C(=O)N2C1C(=O)O",
  "num_conformers": 50
}
```

**Response:** top 5 alignment results with SDF molblocks, scores, RMSD, energy, Shape Tanimoto, MCS SMARTS pattern, and MCS atom count.

### `POST /properties`

Predict solubility and toxicity for a list of molecules.

**Request:**
```json
{
  "smiles_list": ["CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O"]
}
```

**Response:** ESOL log-solubility and Tox21 toxicity predictions per molecule.

### `POST /fingerprint`

Compute ECFP fingerprint for a molecule.

**Request:**
```json
{
  "smiles": "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O",
  "radius": 2,
  "n_bits": 2048
}
```

**Response:** list of ON-bit indices, total bits, and density.

### `GET /health`

Returns `{"status": "ok"}`.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend Framework | FastAPI | Async API with automatic OpenAPI docs |
| Chemistry | RDKit | Conformer generation, MCS, MMFF optimization, 3D alignment |
| Machine Learning | DeepChem 2.8 + PyTorch | ESOL solubility and Tox21 toxicity prediction |
| Frontend | React 19 + TypeScript | UI components and state management |
| Styling | Tailwind CSS 4 | Utility-first responsive design |
| 3D Visualization | 3Dmol.js | WebGL molecular rendering |
| Build Tool | Vite 7 | Fast dev server with hot-reload |
| Containerization | Docker Compose | Single-command deployment |
| Reverse Proxy | Nginx | Static file serving + API proxying in production |
| Backend Testing | pytest | 30 unit and integration tests |
| E2E Testing | Playwright | 10 browser-based tests with Chromium |

---

## Deployment

### Railway / Cloud

The project includes `Dockerfile.railway` for Railway deployment. For other platforms:

1. Build and push both Docker images
2. Set the `DMC_CORS_ORIGINS` environment variable on the backend to include your frontend domain
3. Configure the frontend's `VITE_API_URL` to point to the backend URL
4. Ensure the backend has enough memory for DeepChem models (~2GB recommended)

### Environment Variables

| Variable | Service | Default | Description |
|---|---|---|---|
| `DMC_CORS_ORIGINS` | Backend | `["*"]` | Allowed CORS origins (JSON array) |
| `VITE_API_URL` | Frontend | `/api` | Backend API URL (only needed outside Docker) |
