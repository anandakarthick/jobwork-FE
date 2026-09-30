import { api } from '../lib/api';

export interface QuotePrefill {
  to: string;
  subject: string;
  message: string;
}

export interface SendQuoteEmailPayload {
  quoteId: number;
  to: string[];
  subject: string;
  message: string;
  attachQuote?: boolean;
  documentIds?: number[];
}

export interface EmailLog {
  id: number;
  quoteId: number | null;
  toEmail: string;
  ccEmail: string | null;
  subject: string;
  body: string;
  hasAttachment: boolean;
  status: string;
  error: string | null;
  createdAt: string;
  sentBy: { id: number; name: string } | null;
  quote: { id: number; title: string | null } | null;
}

export const sendTestEmail = (to?: string) =>
  api.post<{ sent: boolean; to: string }>('/email/test', to ? { to } : {}).then((r) => r.data);

export const getQuotePrefill = (quoteId: number) =>
  api.get<QuotePrefill>(`/email/quote/${quoteId}/prefill`).then((r) => r.data);

export const sendQuoteEmail = (payload: SendQuoteEmailPayload) =>
  api.post<EmailLog>('/email/send', payload).then((r) => r.data);

export const listEmailLogs = (params: { quoteId?: number; page?: number; limit?: number } = {}) =>
  api.get<{ data: EmailLog[]; meta: unknown }>('/email/logs', { params }).then((r) => r.data);
