import copy

from rdkit import Chem
from rdkit.Chem import AllChem, rdFMCS, rdShapeHelpers

from .models import AlignmentResult, AlignResponse


def run_alignment(
    reference_smiles: str,
    probe_smiles: str,
    num_conformers: int = 50,
) -> AlignResponse:
    """Run full MCS-based 3D alignment pipeline and return top 5 results."""

    # Step 1: Parse SMILES and add hydrogens
    ref_mol = Chem.MolFromSmiles(reference_smiles)
    probe_mol = Chem.MolFromSmiles(probe_smiles)
    if ref_mol is None:
        raise ValueError(f"Invalid reference SMILES: {reference_smiles}")
    if probe_mol is None:
        raise ValueError(f"Invalid probe SMILES: {probe_smiles}")

    ref_mol = Chem.AddHs(ref_mol)
    probe_mol = Chem.AddHs(probe_mol)

    # Step 2: Generate 3D conformers with ETKDG
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    params.numThreads = 0
    params.pruneRmsThresh = 0.5

    ref_conf_ids = list(
        AllChem.EmbedMultipleConfs(ref_mol, numConfs=num_conformers, params=params)
    )
    if not ref_conf_ids:
        raise ValueError(
            f"Could not generate 3D conformers for reference molecule: {reference_smiles}"
        )

    probe_conf_ids = list(
        AllChem.EmbedMultipleConfs(probe_mol, numConfs=num_conformers, params=params)
    )
    if not probe_conf_ids:
        raise ValueError(
            f"Could not generate 3D conformers for probe molecule: {probe_smiles}"
        )

    # Step 3: MMFF optimization
    ref_opt_results = AllChem.MMFFOptimizeMoleculeConfs(
        ref_mol, numThreads=0, maxIters=500
    )
    probe_opt_results = AllChem.MMFFOptimizeMoleculeConfs(
        probe_mol, numThreads=0, maxIters=500
    )

    ref_energies = {}
    for cid, (converged, energy) in zip(ref_conf_ids, ref_opt_results):
        ref_energies[cid] = energy if converged != -1 else float("inf")

    probe_energies = {}
    for cid, (converged, energy) in zip(probe_conf_ids, probe_opt_results):
        probe_energies[cid] = energy if converged != -1 else float("inf")

    # Step 4: Pick lowest-energy reference conformer
    best_ref_cid = min(ref_energies, key=ref_energies.get)

    # Step 5: Find Maximum Common Substructure
    ref_noH = Chem.RemoveHs(ref_mol)
    probe_noH = Chem.RemoveHs(probe_mol)

    mcs_result = rdFMCS.FindMCS(
        [ref_noH, probe_noH],
        threshold=1.0,
        completeRingsOnly=True,
        ringMatchesRingOnly=True,
        matchValences=True,
        timeout=60,
    )

    if mcs_result.numAtoms == 0:
        raise ValueError(
            "No common substructure found between the two molecules."
        )

    mcs_smarts = mcs_result.smartsString
    mcs_pattern = Chem.MolFromSmarts(mcs_smarts)
    if mcs_pattern is None:
        raise ValueError(f"Could not parse MCS SMARTS pattern: {mcs_smarts}")

    # Step 6: Get atom mappings
    # MCS pattern was found on noH molecules, so match against noH first,
    # then map indices back to the H-containing molecules for 3D alignment.
    ref_noH_match = ref_noH.GetSubstructMatch(mcs_pattern)
    probe_noH_match = probe_noH.GetSubstructMatch(mcs_pattern)

    if not ref_noH_match or not probe_noH_match:
        raise ValueError("Could not map MCS atoms to molecules.")

    # Build heavy-atom-index → H-mol-index mapping
    # RDKit preserves heavy atom order: heavy atom i in noH mol corresponds
    # to the i-th non-H atom in the H-containing mol.
    def heavy_to_full_idx(mol_with_h):
        """Return list where result[heavy_idx] = full_mol_idx."""
        mapping = []
        for atom in mol_with_h.GetAtoms():
            if atom.GetAtomicNum() != 1:
                mapping.append(atom.GetIdx())
        return mapping

    ref_h2f = heavy_to_full_idx(ref_mol)
    probe_h2f = heavy_to_full_idx(probe_mol)

    # Convert noH indices to full-mol indices
    ref_match = tuple(ref_h2f[i] for i in ref_noH_match)
    probe_match = tuple(probe_h2f[i] for i in probe_noH_match)

    atom_map = list(zip(probe_match, ref_match))
    num_mcs_atoms = len(atom_map)

    # For scoring, use heavy atom counts
    ref_heavy = ref_noH.GetNumAtoms()
    probe_heavy = probe_noH.GetNumAtoms()
    max_atoms = max(ref_heavy, probe_heavy)
    overlap_fraction = num_mcs_atoms / max_atoms if max_atoms > 0 else 0.0

    # Step 7: Align each probe conformer to the best reference conformer
    scored_results = []
    for probe_cid in probe_conf_ids:
        try:
            rms = AllChem.AlignMol(
                probe_mol,
                ref_mol,
                prbCid=int(probe_cid),
                refCid=int(best_ref_cid),
                atomMap=atom_map,
            )
            combined_score = overlap_fraction / (1.0 + rms)
            scored_results.append(
                {
                    "ref_conformer_id": int(best_ref_cid),
                    "probe_conformer_id": int(probe_cid),
                    "rmsd": round(rms, 4),
                    "conformer_energy": round(probe_energies[probe_cid], 2),
                    "alignment_score": round(combined_score, 4),
                }
            )
        except Exception:
            continue

    if not scored_results:
        raise ValueError("Alignment failed for all conformers.")

    # Step 8: Rank and take top 5
    scored_results.sort(key=lambda r: (-r["alignment_score"], r["rmsd"]))
    top_5 = scored_results[:5]

    # Step 9: Re-align top 5 on fresh copies and generate molblocks
    final_results = []
    for rank, r in enumerate(top_5, 1):
        probe_copy = copy.deepcopy(probe_mol)
        AllChem.AlignMol(
            probe_copy,
            ref_mol,
            prbCid=r["probe_conformer_id"],
            refCid=r["ref_conformer_id"],
            atomMap=atom_map,
        )
        # Remove explicit hydrogens for cleaner 3D rendering
        ref_noH_copy = Chem.RemoveHs(ref_mol)
        probe_noH_copy = Chem.RemoveHs(probe_copy)
        ref_molblock = Chem.MolToMolBlock(ref_noH_copy, confId=r["ref_conformer_id"])
        probe_molblock = Chem.MolToMolBlock(probe_noH_copy, confId=r["probe_conformer_id"])

        shape_tani_dist = rdShapeHelpers.ShapeTanimotoDist(
            ref_mol, probe_copy,
            confId1=r["ref_conformer_id"],
            confId2=r["probe_conformer_id"],
        )
        shape_tanimoto = round(1.0 - shape_tani_dist, 4)

        final_results.append(
            AlignmentResult(
                rank=rank,
                reference_molblock=ref_molblock,
                probe_molblock=probe_molblock,
                alignment_score=r["alignment_score"],
                shape_tanimoto=shape_tanimoto,
                rmsd=r["rmsd"],
                conformer_energy=r["conformer_energy"],
                ref_conformer_id=r["ref_conformer_id"],
                probe_conformer_id=r["probe_conformer_id"],
            )
        )

    return AlignResponse(
        results=final_results,
        mcs_smarts=mcs_smarts,
        num_mcs_atoms=num_mcs_atoms,
        reference_smiles=reference_smiles,
        probe_smiles=probe_smiles,
    )
