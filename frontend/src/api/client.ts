import type {
  AlignRequest,
  AlignResponse,
  FingerprintResponse,
  PropertiesResponse,
} from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail || `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function postAlign(data: AlignRequest): Promise<AlignResponse> {
  return request<AlignResponse>("/align", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function postProperties(
  smilesList: string[],
): Promise<PropertiesResponse> {
  return request<PropertiesResponse>("/properties", {
    method: "POST",
    body: JSON.stringify({ smiles_list: smilesList }),
  });
}

export async function postFingerprint(
  smiles: string,
): Promise<FingerprintResponse> {
  return request<FingerprintResponse>("/fingerprint", {
    method: "POST",
    body: JSON.stringify({ smiles }),
  });
}
