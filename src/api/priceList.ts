import { api } from '../lib/api';
import type { IngestStatus } from '../types';

/** One price-list document's ingest status (across all categories). */
export interface IngestJob {
  id: number;
  categoryId: number | null;
  fileName: string;
  brand: string | null;
  ingestStatus: IngestStatus;
  ingestedItemCount: number | null;
  ingestError: string | null;
  ingestedAt: string | null;
  textStatus: IngestStatus;
  textChars: number | null;
  textSource: string | null;
  textError: string | null;
}

/** Poll the status of every price-list ingest (background-job watcher). */
export const listIngestJobs = () =>
  api.get<IngestJob[]>('/price-list/ingest-jobs').then((r) => r.data);

/** Parse the price-list PDF into structured rows (one-time per uploaded list). */
export const ingestPriceListDocument = (docId: number) =>
  api
    .post<{ documentId: number; itemCount: number }>(`/price-list/documents/${docId}/ingest`)
    .then((r) => r.data);
