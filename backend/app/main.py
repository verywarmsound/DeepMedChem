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

    solubilities: list = [None] * len(request.smiles_list)
    toxicities: list = [None] * len(request.smiles_list)

    try:
        solubilities = await loop.run_in_executor(
            executor, predict_solubility, request.smiles_list
        )
    except Exception as e:
        logger.error(f"Solubility prediction failed: {traceback.format_exc()}")

    try:
        toxicities = await loop.run_in_executor(
            executor, predict_toxicity, request.smiles_list
        )
    except Exception as e:
        logger.error(f"Toxicity prediction failed: {traceback.format_exc()}")

    predictions = []
    for smiles, sol, tox in zip(request.smiles_list, solubilities, toxicities):
        predictions.append(
            {
                "smiles": smiles,
                "esol_log_solubility": sol,
                "tox21_predictions": tox,
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
