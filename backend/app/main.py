import asyncio
import logging
import traceback
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import (
    AlignRequest,
    AlignResponse,
    FingerprintRequest,
    FingerprintResponse,
    PropertiesRequest,
    PropertiesResponse,
)

logger = logging.getLogger(__name__)

executor = ThreadPoolExecutor(max_workers=2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    executor.shutdown(wait=False)


app = FastAPI(
    title="Deep MedChem - Molecular Alignment API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/align", response_model=AlignResponse)
async def align_molecules(request: AlignRequest):
    from .alignment import run_alignment

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            run_alignment,
            request.reference_smiles,
            request.probe_smiles,
            request.num_conformers,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alignment failed: {str(e)}")


@app.post("/properties", response_model=PropertiesResponse)
async def predict_properties(request: PropertiesRequest):
    from .properties import predict_solubility, predict_toxicity

    loop = asyncio.get_event_loop()

    errors = []

    try:
        solubilities = await loop.run_in_executor(
            executor, predict_solubility, request.smiles_list
        )
    except Exception:
        logger.error(f"Solubility prediction failed: {traceback.format_exc()}")
        errors.append("solubility")
        solubilities = None

    try:
        toxicities = await loop.run_in_executor(
            executor, predict_toxicity, request.smiles_list
        )
    except Exception:
        logger.error(f"Toxicity prediction failed: {traceback.format_exc()}")
        errors.append("toxicity")
        toxicities = None

    if solubilities is None and toxicities is None:
        raise HTTPException(
            status_code=503,
            detail=f"Property prediction models unavailable: {', '.join(errors)}",
        )

    predictions = []
    for i, smiles in enumerate(request.smiles_list):
        predictions.append(
            {
                "smiles": smiles,
                "esol_log_solubility": solubilities[i] if solubilities else None,
                "tox21_predictions": toxicities[i] if toxicities else None,
            }
        )
    return PropertiesResponse(predictions=predictions)


@app.post("/fingerprint", response_model=FingerprintResponse)
async def get_fingerprint(request: FingerprintRequest):
    from .fingerprints import compute_ecfp

    try:
        return compute_ecfp(request.smiles, request.radius, request.n_bits)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
