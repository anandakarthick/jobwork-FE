import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getLlmStatus, type LlmStatus } from '../api/settings';

interface LlmStatusState {
  status: LlmStatus | null;
  loading: boolean;
}

const initialState: LlmStatusState = {
  status: null,
  loading: false,
};

/**
 * Re-fetch the active provider / model / balance status. Dispatch this whenever
 * something changes the balance or spends tokens (saving settings, generating a
 * quote, sending a chat) so the header updates without a page reload.
 */
export const fetchLlmStatus = createAsyncThunk('llmStatus/fetch', async () => {
  return getLlmStatus();
});

const llmStatusSlice = createSlice({
  name: 'llmStatus',
  initialState,
  reducers: {
    /** Optimistically set the status (e.g. right after saving settings). */
    setLlmStatus(state, action: { payload: LlmStatus }) {
      state.status = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLlmStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLlmStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(fetchLlmStatus.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setLlmStatus } = llmStatusSlice.actions;
export default llmStatusSlice.reducer;
