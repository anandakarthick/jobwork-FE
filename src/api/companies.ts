import { api } from '../lib/api';
import type { BrandPrompt, Company, CompanyStatus, Paginated, ProductDocument } from '../types';

export interface CompanyInput {
  name: string;
  status: CompanyStatus;
  description?: string | null;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CompanyStatus;
}

export const listCompanies = (params: ListParams) =>
  api.get<Paginated<Company>>('/companies', { params }).then((r) => r.data);

export const getCompany = (id: number | string) =>
  api.get<Company>(`/companies/${id}`).then((r) => r.data);

export const createCompany = (data: CompanyInput) =>
  api.post<Company>('/companies', data).then((r) => r.data);

export const updateCompany = (id: number | string, data: CompanyInput) =>
  api.put<Company>(`/companies/${id}`, data).then((r) => r.data);

export const setCompanyStatus = (id: number | string, status: CompanyStatus) =>
  api.patch<Company>(`/companies/${id}/status`, { status }).then((r) => r.data);

export const deleteCompany = (id: number | string) => api.delete(`/companies/${id}`);

// ---------- Brand keyword prompts ----------

/** One row of the prompt list as saved: `id` present = existing, absent = new. */
export interface BrandPromptInput {
  id?: number;
  name: string;
  content: string;
  train: boolean;
}

export const listBrandPrompts = (companyId: number | string) =>
  api.get<BrandPrompt[]>(`/companies/${companyId}/prompts`).then((r) => r.data);

/** Save the brand's whole prompt list (rows left out are deleted). */
export const saveBrandPrompts = (companyId: number | string, prompts: BrandPromptInput[]) =>
  api.put<BrandPrompt[]>(`/companies/${companyId}/prompts`, { prompts }).then((r) => r.data);

// ---------- Brand price-list documents ----------

export const listBrandPriceLists = (companyId: number | string) =>
  api.get<ProductDocument[]>(`/companies/${companyId}/price-lists`).then((r) => r.data);

/**
 * Upload files for a brand. `train[i]` says whether file `i` should be trained
 * and `names[i]` is the label the user gave it.
 */
export const uploadBrandPriceLists = (
  companyId: number | string,
  files: File[],
  train: boolean[],
  names: string[],
) => {
  const form = new FormData();
  form.append('train', JSON.stringify(train));
  form.append('names', JSON.stringify(names));
  files.forEach((f) => form.append('documents', f));
  return api
    .post<ProductDocument[]>(`/companies/${companyId}/price-lists`, form)
    .then((r) => r.data);
};

/** Rename one of a brand's files and/or switch its training on/off. */
export const updateBrandPriceList = (
  companyId: number | string,
  docId: number,
  changes: { name?: string; train?: boolean },
) =>
  api
    .patch<ProductDocument>(`/companies/${companyId}/price-lists/${docId}`, changes)
    .then((r) => r.data);

export const deleteBrandPriceList = (companyId: number | string, docId: number) =>
  api.delete(`/companies/${companyId}/price-lists/${docId}`);

/** Save a blob the API returned as a file download. */
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download the text extracted from one of a brand's files, as a .txt. */
export async function downloadBrandPriceListText(
  companyId: number | string,
  docId: number,
  fileName: string,
) {
  const res = await api.get(`/companies/${companyId}/price-lists/${docId}/text`, {
    responseType: 'blob',
  });
  saveBlob(res.data as Blob, `${fileName}.txt`);
}

export async function downloadBrandPriceList(
  companyId: number | string,
  docId: number,
  fileName: string,
) {
  const res = await api.get(`/companies/${companyId}/price-lists/${docId}/download`, {
    responseType: 'blob',
  });
  saveBlob(res.data as Blob, fileName);
}
