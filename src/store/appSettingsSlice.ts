import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getAppSettings, type AppSettings } from '../api/settings';

interface AppSettingsState {
  appName: string;
  logo: string | null;
  themeColor: string;
  loaded: boolean;
}

const initialState: AppSettingsState = {
  appName: 'Jobwork',
  logo: null,
  themeColor: 'indigo',
  loaded: false,
};

/** Load app branding (name + logo). Public — works before login. */
export const fetchAppSettings = createAsyncThunk('appSettings/fetch', async () => {
  return getAppSettings();
});

const appSettingsSlice = createSlice({
  name: 'appSettings',
  initialState,
  reducers: {
    /** Apply branding immediately after an admin saves it. */
    setAppSettings(state, action: PayloadAction<AppSettings>) {
      state.appName = action.payload.appName || 'Jobwork';
      state.logo = action.payload.logo;
      state.themeColor = action.payload.themeColor || 'indigo';
      state.loaded = true;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAppSettings.fulfilled, (state, action) => {
      state.appName = action.payload.appName || 'Jobwork';
      state.logo = action.payload.logo;
      state.themeColor = action.payload.themeColor || 'indigo';
      state.loaded = true;
    });
  },
});

export const { setAppSettings } = appSettingsSlice.actions;
export default appSettingsSlice.reducer;
