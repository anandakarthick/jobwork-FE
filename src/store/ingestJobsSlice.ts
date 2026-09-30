import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { listIngestJobs, type IngestJob } from '../api/priceList';
import type { IngestStatus } from '../types';

/** A transient toast the ToastHost renders and auto-dismisses. */
export interface Toast {
  id: number;
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface IngestJobsState {
  /** Latest known status of every price-list document, keyed by doc id. */
  byId: Record<number, IngestJob>;
  /**
   * Doc ids we're actively watching — either because we started the ingest this
   * session or we saw them PROCESSING on a poll (so a refresh mid-ingest still
   * gets a completion notification). A watched doc that finishes fires a toast.
   */
  watching: number[];
  toasts: Toast[];
  nextToastId: number;
  /** True once at least one poll has resolved (avoids a flash before first load). */
  loaded: boolean;
}

const initialState: IngestJobsState = {
  byId: {},
  watching: [],
  toasts: [],
  nextToastId: 1,
  loaded: false,
};

const FINISHED: IngestStatus[] = ['COMPLETED', 'FAILED'];

/** Fetch the status of every price-list ingest. */
export const pollIngestJobs = createAsyncThunk('ingestJobs/poll', async () => {
  return listIngestJobs();
});

const ingestJobsSlice = createSlice({
  name: 'ingestJobs',
  initialState,
  reducers: {
    /** Called right after POST /ingest so the row flips to PROCESSING at once
     *  and the watcher notifies when this doc finishes. */
    registerIngest(state, action: PayloadAction<{ docId: number; categoryId: number | null; fileName: string }>) {
      const { docId, categoryId, fileName } = action.payload;
      const prev = state.byId[docId];
      state.byId[docId] = {
        id: docId,
        categoryId,
        fileName,
        brand: prev?.brand ?? null,
        ingestStatus: 'PROCESSING',
        ingestedItemCount: prev?.ingestedItemCount ?? null,
        ingestError: null,
        ingestedAt: null,
        textStatus: prev?.textStatus ?? 'NOT_STARTED',
        textChars: prev?.textChars ?? null,
        textSource: prev?.textSource ?? null,
        textError: prev?.textError ?? null,
      };
      if (!state.watching.includes(docId)) state.watching.push(docId);
    },
    pushToast(state, action: PayloadAction<{ tone: Toast['tone']; message: string }>) {
      state.toasts.push({ id: state.nextToastId++, ...action.payload });
    },
    dismissToast(state, action: PayloadAction<number>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(pollIngestJobs.fulfilled, (state, action) => {
      state.loaded = true;
      for (const job of action.payload) {
        const prev = state.byId[job.id];
        const wasWatched = state.watching.includes(job.id);

        // Resume-after-refresh: anything still PROCESSING becomes watched so we
        // notify when it finishes, even if this tab never started it.
        if (job.ingestStatus === 'PROCESSING' && !wasWatched) state.watching.push(job.id);

        // A watched job that transitioned from PROCESSING to a finished state
        // fires exactly one toast, then stops being watched.
        if (
          wasWatched &&
          prev?.ingestStatus === 'PROCESSING' &&
          FINISHED.includes(job.ingestStatus)
        ) {
          if (job.ingestStatus === 'COMPLETED') {
            state.toasts.push({
              id: state.nextToastId++,
              tone: 'success',
              message: `Ingest complete — “${job.fileName}” added ${job.ingestedItemCount ?? 0} items.`,
            });
          } else {
            state.toasts.push({
              id: state.nextToastId++,
              tone: 'error',
              message: `Ingest failed — “${job.fileName}”: ${job.ingestError || 'unknown error'}`,
            });
          }
          state.watching = state.watching.filter((id) => id !== job.id);
        }

        state.byId[job.id] = job;
      }
    });
  },
});

export const { registerIngest, pushToast, dismissToast } = ingestJobsSlice.actions;
export default ingestJobsSlice.reducer;

/** Selector: is any ingest or text extraction currently PROCESSING? (drives the poll cadence). */
export const selectHasProcessing = (jobs: Record<number, IngestJob>): boolean =>
  Object.values(jobs).some(
    (j) => j.ingestStatus === 'PROCESSING' || j.textStatus === 'PROCESSING',
  );
