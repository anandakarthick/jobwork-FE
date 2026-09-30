import { api } from '../lib/api';

export type QuoteStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** Decimal columns arrive as strings over JSON; coerce with Number() at render. */
export interface QuoteLine {
  id: number;
  lineNo: number;
  requirement: string;
  isAccessory: boolean;
  family: string | null;
  make: string | null;
  catalogNo: string | null;
  description: string | null;
  quantity: number;
  listPrice: string | null;
  discountPct: string;
  rate: string | null;
  amount: string | null;
  confidence: string | null;
  matchNote: string | null;
}

export type MessageRole = 'SYSTEM' | 'USER' | 'ASSISTANT';

export interface ChatAttachment {
  name: string;
  path: string;
  mimeType: string;
}
export interface QuoteMessage {
  id: number;
  role: MessageRole;
  content: string;
  attachments?: ChatAttachment[] | null;
  createdAt: string;
  /** Set on the assistant reply when the chat edited the quote (FE should refetch). */
  quoteChanged?: boolean;
}

export interface Quote {
  id: number;
  title: string | null;
  status: QuoteStatus;
  brand: string | null;
  provider: string | null;
  summary: string | null;
  error: string | null;
  customer: { id: number; name: string };
  category?: { id: number; name: string; brands?: string[] } | null;
  documents: { id: number; fileName: string; sizeBytes: number }[];
  lines: QuoteLine[];
  messages: QuoteMessage[];
  /** Custom download name set from the chat ("rename the file to …"). */
  downloadName?: string | null;
  /** Feeder-grouped BOM (present for BOM-style quotes); the download is built
   *  from this, so the chat edits it. Loosely typed — only counted for display. */
  bomJson?: { feeders?: { items?: unknown[] }[] }[] | null;
  createdAt: string;
}

export interface CreateQuoteInput {
  customerId: number;
  categoryId?: number;
  brand?: string;
  title?: string;
  defaultDiscountPct?: number;
  /** The user's first chat message, sent along with the BOQ. */
  message?: string;
  files: File[];
}

export const createQuote = (input: CreateQuoteInput) => {
  const form = new FormData();
  form.append('customerId', String(input.customerId));
  if (input.categoryId) form.append('categoryId', String(input.categoryId));
  if (input.brand) form.append('brand', input.brand);
  if (input.title) form.append('title', input.title);
  if (input.defaultDiscountPct != null)
    form.append('defaultDiscountPct', String(input.defaultDiscountPct));
  if (input.message) form.append('message', input.message);
  input.files.forEach((f) => form.append('documents', f));
  return api.post<Quote>('/quotes', form).then((r) => r.data);
};

/** Rename a chat. */
export const renameQuote = (id: number, title: string) =>
  api.patch<Quote>(`/quotes/${id}`, { title }).then((r) => r.data);

export const deleteQuote = (id: number) => api.delete(`/quotes/${id}`);

/** Row shape returned by the list endpoint (lighter than the full Quote). */
export interface QuoteListItem {
  id: number;
  title: string | null;
  status: QuoteStatus;
  brand: string | null;
  createdAt: string;
  customer: { id: number; name: string };
  category: { id: number; name: string } | null;
  _count: { lines: number };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const listQuotes = (params: { customerId?: number; page?: number; limit?: number } = {}) =>
  api
    .get<Paginated<QuoteListItem>>('/quotes', { params })
    .then((r) => r.data);

export const getQuote = (id: number) => api.get<Quote>(`/quotes/${id}`).then((r) => r.data);

export const sendQuoteMessage = (id: number, content: string, files: File[] = []) => {
  const form = new FormData();
  form.append('content', content);
  files.forEach((f) => form.append('files', f));
  return api.post<QuoteMessage>(`/quotes/${id}/messages`, form).then((r) => r.data);
};

/** Pull the server-chosen filename (customer-product-date.xlsx) from the header. */
function filenameFromDisposition(header: unknown, fallback: string): string {
  if (typeof header !== 'string') return fallback;
  const m = /filename="?([^"]+)"?/.exec(header);
  return m?.[1] ?? fallback;
}

/**
 * Fetch the .xlsx as a blob (auth header attached by the axios client) and save
 * it. The server names the file customer-product-date.xlsx via Content-Disposition.
 */
export const downloadQuote = async (id: number, fallbackName = `quote-${id}.xlsx`) => {
  const res = await api.get(`/quotes/${id}/download`, { responseType: 'blob' });
  const fileName = filenameFromDisposition(res.headers['content-disposition'], fallbackName);
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
