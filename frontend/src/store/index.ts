import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import domainReducer from './domainSlice';
import citationReducer from './citationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    domains: domainReducer,
    citations: citationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;