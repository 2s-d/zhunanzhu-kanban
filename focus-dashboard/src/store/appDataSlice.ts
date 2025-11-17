import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppData, TimeRange } from '../types';

interface AppDataState {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
}

const initialState: AppDataState = {
  data: null,
  loading: false,
  error: null,
  timeRange: 'all',
};

const appDataSlice = createSlice({
  name: 'appData',
  initialState,
  reducers: {
    setAppData: (state, action: PayloadAction<AppData>) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setTimeRange: (state, action: PayloadAction<TimeRange>) => {
      state.timeRange = action.payload;
    },
  },
});

export const { setAppData, setLoading, setError, setTimeRange } = appDataSlice.actions;
export default appDataSlice.reducer;
