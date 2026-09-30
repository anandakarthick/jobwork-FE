import { api } from '../lib/api';
import type { CompanyStatus, Customer, Paginated } from '../types';

export interface CustomerInput {
  name: string;
  status: CompanyStatus;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CompanyStatus;
}

export const listCustomers = (params: ListParams) =>
  api.get<Paginated<Customer>>('/customers', { params }).then((r) => r.data);

export const getCustomer = (id: number | string) =>
  api.get<Customer>(`/customers/${id}`).then((r) => r.data);

export const createCustomer = (data: CustomerInput) =>
  api.post<Customer>('/customers', data).then((r) => r.data);

export const updateCustomer = (id: number | string, data: CustomerInput) =>
  api.put<Customer>(`/customers/${id}`, data).then((r) => r.data);

export const deleteCustomer = (id: number | string) => api.delete(`/customers/${id}`);
