import { api } from '../lib/api';
import type { Paginated, PermissionGroup, Role } from '../types';

export interface RoleInput {
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const listRoles = (params: ListParams = {}) =>
  api.get<Paginated<Role>>('/roles', { params }).then((r) => r.data);

export const getRole = (id: number | string) =>
  api.get<Role>(`/roles/${id}`).then((r) => r.data);

export const createRole = (data: RoleInput) =>
  api.post<Role>('/roles', data).then((r) => r.data);

export const updateRole = (id: number | string, data: RoleInput) =>
  api.put<Role>(`/roles/${id}`, data).then((r) => r.data);

export const deleteRole = (id: number | string) => api.delete(`/roles/${id}`);

/** The permission catalogue for building the role editor. */
export const getPermissionCatalogue = () =>
  api.get<PermissionGroup[]>('/roles/permissions').then((r) => r.data);
