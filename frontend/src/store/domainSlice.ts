import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

interface Domain {
  id: number;
  domain: string;
  tracking_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface DomainState {
  domains: Domain[];
  selectedDomain: Domain | null;
  loading: boolean;
  error: string | null;
}

const initialState: DomainState = {
  domains: [],
  selectedDomain: null,
  loading: false,
  error: null,
};

export const fetchDomains = createAsyncThunk(
  'domains/fetchDomains',
  async () => {
    const response = await api.get('/domains');
    return response.data;
  }
);

export const addDomain = createAsyncThunk(
  'domains/addDomain',
  async (domain: string) => {
    const response = await api.post('/domains', { domain });
    return response.data;
  }
);

export const updateDomain = createAsyncThunk(
  'domains/updateDomain',
  async ({ id, trackingEnabled }: { id: number; trackingEnabled: boolean }) => {
    const response = await api.put(`/domains/${id}`, { trackingEnabled });
    return response.data;
  }
);

export const deleteDomain = createAsyncThunk(
  'domains/deleteDomain',
  async (id: number) => {
    await api.delete(`/domains/${id}`);
    return id;
  }
);

const domainSlice = createSlice({
  name: 'domains',
  initialState,
  reducers: {
    selectDomain: (state, action) => {
      state.selectedDomain = state.domains.find(d => d.id === action.payload) || null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch domains
      .addCase(fetchDomains.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDomains.fulfilled, (state, action) => {
        state.loading = false;
        state.domains = action.payload;
        if (state.domains.length > 0 && !state.selectedDomain) {
          state.selectedDomain = state.domains[0];
        }
      })
      .addCase(fetchDomains.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch domains';
      })
      // Add domain
      .addCase(addDomain.fulfilled, (state, action) => {
        state.domains.push(action.payload);
      })
      // Update domain
      .addCase(updateDomain.fulfilled, (state, action) => {
        const index = state.domains.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.domains[index] = action.payload;
        }
      })
      // Delete domain
      .addCase(deleteDomain.fulfilled, (state, action) => {
        state.domains = state.domains.filter(d => d.id !== action.payload);
        if (state.selectedDomain?.id === action.payload) {
          state.selectedDomain = state.domains[0] || null;
        }
      });
  },
});

export const { selectDomain } = domainSlice.actions;
export default domainSlice.reducer;