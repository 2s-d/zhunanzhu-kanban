import { configureStore } from '@reduxjs/toolkit';
import appDataReducer from './appDataSlice';
export const store = configureStore({
    reducer: {
        appData: appDataReducer,
    },
});
