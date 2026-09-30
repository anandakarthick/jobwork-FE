import { api } from '../lib/api';
import type { ManagedUser, Paginated } from '../types';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleId?: number | null;
  isActive?: boolean;
  /** Email the new user their login credentials (default true). */
  sendCredentials?: boolean;
}

/** Create response includes the best-effort credentials-email outcome. */
export type CreatedUser = ManagedUser & {
  credentialsEmail?: { sent: boolean; error: string | null } | null;
};

export interface UpdateUserInput {
  name?: string;
  password?: string;
  roleId?: number | null;
  isActive?: boolean;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const listUsers = (params: ListParams = {}) =>
  api.get<Paginated<ManagedUser>>('/users', { params }).then((r) => r.data);

export const getUser = (id: number | string) =>
  api.get<ManagedUser>(`/users/${id}`).then((r) => r.data);

export const createUser = (data: CreateUserInput) =>
  api.post<CreatedUser>('/users', data).then((r) => r.data);

export const updateUser = (id: number | string, data: UpdateUserInput) =>
  api.put<ManagedUser>(`/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id: number | string) => api.delete(`/users/${id}`);
