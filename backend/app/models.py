from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AlignRequest(BaseModel):
    reference_smiles: str = Field(
        ...,
        min_length=1,
        examples=["CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O"],
        description="SMILES string of the reference molecule",
    )
    probe_smiles: str = Field(
        ...,
        min_length=1,
        examples=["CC1(C)SC2C(NC(=O)C(N)c3ccc(O)cc3)C(=O)N2C1C(=O)O"],
        description="SMILES string of the probe molecule",
    )
    num_conformers: int = Field(
        default=50,
        ge=1,
        le=500,
        description="Number of conformers to generate per molecule",
    )

    @field_validator("reference_smiles", "probe_smiles")
    @classmethod
    def validate_smiles(cls, v: str) -> str:
        from rdkit import Chem

        mol = Chem.MolFromSmiles(v)
        if mol is None:
            raise ValueError(f"Invalid SMILES string: {v}")
        return v


class AlignmentResult(BaseModel):
    rank: int
    reference_molblock: str
    probe_molblock: str
    alignment_score: float
    shape_tanimoto: float
    rmsd: float
    conformer_energy: float
    ref_conformer_id: int
    probe_conformer_id: int


class AlignResponse(BaseModel):
    results: list[AlignmentResult]
    mcs_smarts: str
    num_mcs_atoms: int
    reference_smiles: str
    probe_smiles: str


class PropertyPrediction(BaseModel):
    smiles: str
    esol_log_solubility: Optional[float] = None
    tox21_predictions: Optional[dict[str, float]] = None


class PropertiesRequest(BaseModel):
    smiles_list: list[str] = Field(..., min_length=1, max_length=10)

    @field_validator("smiles_list")
    @classmethod
    def validate_smiles_list(cls, v: list[str]) -> list[str]:
        from rdkit import Chem

        for smi in v:
            if Chem.MolFromSmiles(smi) is None:
                raise ValueError(f"Invalid SMILES string: {smi}")
        return v


class PropertiesResponse(BaseModel):
    predictions: list[PropertyPrediction]


class FingerprintRequest(BaseModel):
    smiles: str
    radius: int = Field(default=2, ge=1, le=4)
    n_bits: int = Field(default=2048, ge=512, le=4096)


class FingerprintResponse(BaseModel):
    smiles: str
    bits_on: list[int]
    n_bits: int
    density: float
