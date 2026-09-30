import { configureStore } from '@reduxjs/toolkit';
import llmStatusReducer from './llmStatusSlice';
import appSettingsReducer from './appSettingsSlice';
import ingestJobsReducer from './ingestJobsSlice';

export const store = configureStore({
  reducer: {
    llmStatus: llmStatusReducer,
    appSettings: appSettingsReducer,
    ingestJobs: ingestJobsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
