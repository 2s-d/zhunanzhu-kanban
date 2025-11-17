import { createSlice } from '@reduxjs/toolkit';
const initialState = {
    data: null,
    loading: false,
    error: null,
    timeRange: 'all',
};
const appDataSlice = createSlice({
    name: 'appData',
    initialState,
    reducers: {
        setAppData: (state, action) => {
            state.data = action.payload;
            state.loading = false;
            state.error = null;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        setTimeRange: (state, action) => {
            state.timeRange = action.payload;
        },
    },
});
export const { setAppData, setLoading, setError, setTimeRange } = appDataSlice.actions;
export default appDataSlice.reducer;
