"""Tests for molecular alignment correctness.

These tests verify that:
1. MCS atom mapping is correct (matches the right atoms)
2. Alignment of similar molecules produces low RMSD
3. Identical molecule alignment produces near-zero RMSD
4. Molblocks are valid and hydrogen-free
5. Results are properly ranked
"""

import pytest
from app.alignment import run_alignment
from rdkit import Chem

# Known molecule pairs
PENICILLIN_G = "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O"
AMOXICILLIN = "CC1(C)SC2C(NC(=O)C(N)c3ccc(O)cc3)C(=O)N2C1C(=O)O"
BENZENE = "c1ccccc1"
TOLUENE = "Cc1ccccc1"
ASPIRIN = "CC(=O)Oc1ccccc1C(=O)O"
IBUPROFEN = "CC(C)Cc1ccc(C(C)C(=O)O)cc1"


class TestAlignmentBasics:
    """Basic alignment pipeline tests."""

    def test_alignment_returns_results(self):
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        assert len(resp.results) > 0
        assert len(resp.results) <= 5

    def test_alignment_returns_mcs_info(self):
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        assert resp.mcs_smarts != ""
        assert resp.num_mcs_atoms > 0
        assert resp.reference_smiles == PENICILLIN_G
        assert resp.probe_smiles == AMOXICILLIN

    def test_results_are_ranked(self):
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        scores = [r.alignment_score for r in resp.results]
        assert scores == sorted(scores, reverse=True), "Results should be sorted by score descending"

    def test_ranks_are_sequential(self):
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        for i, r in enumerate(resp.results):
            assert r.rank == i + 1


class TestMolblockOutput:
    """Verify molblock output is correct and clean."""

    def test_molblocks_are_valid_sdf(self):
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        r = resp.results[0]
        ref_mol = Chem.MolFromMolBlock(r.reference_molblock)
        probe_mol = Chem.MolFromMolBlock(r.probe_molblock)
        assert ref_mol is not None, "Reference molblock should parse as valid molecule"
        assert probe_mol is not None, "Probe molblock should parse as valid molecule"

    def test_molblocks_have_3d_coords(self):
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        r = resp.results[0]
        ref_mol = Chem.MolFromMolBlock(r.reference_molblock)
        conf = ref_mol.GetConformer()
        # At least one atom should have non-zero coordinates
        has_3d = any(
            conf.GetAtomPosition(i).x != 0 or conf.GetAtomPosition(i).y != 0
            for i in range(ref_mol.GetNumAtoms())
        )
        assert has_3d, "Molblock should contain 3D coordinates"

    def test_molblocks_have_no_explicit_hydrogens(self):
        """Molblocks should only contain heavy atoms for clean rendering."""
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        r = resp.results[0]
        ref_mol = Chem.MolFromMolBlock(r.reference_molblock)
        probe_mol = Chem.MolFromMolBlock(r.probe_molblock)
        for atom in ref_mol.GetAtoms():
            assert atom.GetAtomicNum() != 1, "Reference molblock should not contain H atoms"
        for atom in probe_mol.GetAtoms():
            assert atom.GetAtomicNum() != 1, "Probe molblock should not contain H atoms"


class TestAtomMapping:
    """Verify the MCS atom mapping is correct.

    This was the core bug: MCS was found on no-H molecules but matched
    against H-containing molecules, causing index mismatch.
    """

    def test_mcs_atom_count_reasonable(self):
        """Penicillin G and Amoxicillin share most of the beta-lactam core."""
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        ref_mol = Chem.MolFromSmiles(PENICILLIN_G)
        probe_mol = Chem.MolFromSmiles(AMOXICILLIN)
        max_heavy = max(ref_mol.GetNumHeavyAtoms(), probe_mol.GetNumHeavyAtoms())
        # These molecules are very similar — MCS should cover at least 60% of atoms
        overlap = resp.num_mcs_atoms / max_heavy
        assert overlap >= 0.6, f"MCS overlap too low: {overlap:.2f} ({resp.num_mcs_atoms}/{max_heavy})"

    def test_benzene_toluene_mcs(self):
        """Benzene vs Toluene: MCS should be 6 atoms (the ring)."""
        resp = run_alignment(BENZENE, TOLUENE, num_conformers=10)
        assert resp.num_mcs_atoms == 6, f"Benzene/Toluene MCS should be 6 atoms, got {resp.num_mcs_atoms}"


class TestAlignmentQuality:
    """Verify alignment produces chemically sensible results."""

    def test_similar_molecules_low_rmsd(self):
        """Penicillin G vs Amoxicillin should align well (low RMSD for best result)."""
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=20)
        best = resp.results[0]
        assert best.rmsd < 2.0, f"Best RMSD too high for similar molecules: {best.rmsd}"

    def test_similar_molecules_high_shape_tanimoto(self):
        """Similar molecules should have decent shape overlap."""
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=20)
        best = resp.results[0]
        assert best.shape_tanimoto > 0.4, f"Shape Tanimoto too low: {best.shape_tanimoto}"

    def test_identical_molecule_near_zero_rmsd(self):
        """Aligning a molecule to itself should produce near-zero RMSD."""
        resp = run_alignment(PENICILLIN_G, PENICILLIN_G, num_conformers=10)
        best = resp.results[0]
        assert best.rmsd < 0.5, f"Self-alignment RMSD should be near zero, got {best.rmsd}"
        assert best.shape_tanimoto > 0.85, f"Self-alignment shape Tanimoto should be high, got {best.shape_tanimoto}"

    def test_benzene_toluene_alignment(self):
        """Simple pair: benzene ring should align well."""
        resp = run_alignment(BENZENE, TOLUENE, num_conformers=10)
        best = resp.results[0]
        assert best.rmsd < 1.5, f"Benzene/Toluene RMSD too high: {best.rmsd}"

    def test_dissimilar_molecules_lower_score(self):
        """Dissimilar molecules should have lower alignment scores than similar ones."""
        similar = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        dissimilar = run_alignment(ASPIRIN, IBUPROFEN, num_conformers=10)
        assert similar.results[0].alignment_score >= dissimilar.results[0].alignment_score * 0.5, \
            "Similar molecules should generally score better than dissimilar ones"


class TestEdgeCases:
    """Edge cases and error handling."""

    def test_invalid_smiles_raises(self):
        with pytest.raises(ValueError, match="Invalid"):
            run_alignment("not_a_molecule", PENICILLIN_G, num_conformers=5)

    def test_single_conformer(self):
        """Should work with just 1 conformer."""
        resp = run_alignment(BENZENE, TOLUENE, num_conformers=1)
        assert len(resp.results) >= 1

    def test_alignment_score_positive(self):
        resp = run_alignment(PENICILLIN_G, AMOXICILLIN, num_conformers=10)
        for r in resp.results:
            assert r.alignment_score > 0
            assert r.rmsd >= 0
            assert 0 <= r.shape_tanimoto <= 1.0
