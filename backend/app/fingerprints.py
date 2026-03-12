from rdkit import Chem
from rdkit.Chem import rdFingerprintGenerator


def compute_ecfp(
    smiles: str, radius: int = 2, n_bits: int = 2048
) -> dict:
    """Compute ECFP (Morgan) fingerprint for a SMILES string."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")
    gen = rdFingerprintGenerator.GetMorganGenerator(radius=radius, fpSize=n_bits)
    fp = gen.GetFingerprint(mol)
    bits_on = list(fp.GetOnBits())
    return {
        "smiles": smiles,
        "bits_on": bits_on,
        "n_bits": n_bits,
        "density": round(len(bits_on) / n_bits, 4),
    }
