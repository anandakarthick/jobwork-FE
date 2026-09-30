import { api } from '../lib/api';
import type { Paginated, ProductCategory } from '../types';

export interface CategoryInput {
  name: string;
  brands: string[];
  description?: string | null;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
}

/** Brands seen across the catalogue — offered as suggestions in the multi-select. */
export const KNOWN_BRANDS = [
  'LK',
  'Siemens',
  'Schneider',
  'ABB',
  'ELMeasure',
  'Secure',
  'Alstom / C&S',
  'EPCOS',
  'Neptune',
];

export const listCategories = (params: ListParams) =>
  api.get<Paginated<ProductCategory>>('/categories', { params }).then((r) => r.data);

export const getCategory = (id: number | string) =>
  api.get<ProductCategory>(`/categories/${id}`).then((r) => r.data);

export const createCategory = (data: CategoryInput) =>
  api.post<ProductCategory>('/categories', data).then((r) => r.data);

export const updateCategory = (id: number | string, data: CategoryInput) =>
  api.put<ProductCategory>(`/categories/${id}`, data).then((r) => r.data);

export const deleteCategory = (id: number | string) => api.delete(`/categories/${id}`);
