export interface AlignRequest {
  reference_smiles: string;
  probe_smiles: string;
  num_conformers?: number;
}

export interface AlignmentResult {
  rank: number;
  reference_molblock: string;
  probe_molblock: string;
  alignment_score: number;
  shape_tanimoto: number;
  rmsd: number;
  conformer_energy: number;
  ref_conformer_id: number;
  probe_conformer_id: number;
}

export interface AlignResponse {
  results: AlignmentResult[];
  mcs_smarts: string;
  num_mcs_atoms: number;
  reference_smiles: string;
  probe_smiles: string;
}

export interface PropertyPrediction {
  smiles: string;
  esol_log_solubility: number | null;
  tox21_predictions: Record<string, number> | null;
}

export interface PropertiesResponse {
  predictions: PropertyPrediction[];
}

export interface FingerprintResponse {
  smiles: string;
  bits_on: number[];
  n_bits: number;
  density: number;
}
