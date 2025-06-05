import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

interface Citation {
  id: number;
  domain_id: number;
  query: string;
  citation_text: string;
  source_url: string;
  position: number;
  ai_mode_type: string;
  created_at: string;
}

interface CitationState {
  citations: Citation[];
  patterns: any;
  loading: boolean;
  error: string | null;
  total: number;
}

const initialState: CitationState = {
  citations: [],
  patterns: null,
  loading: false,
  error: null,
  total: 0,
};

export const fetchCitations = createAsyncThunk(
  'citations/fetchCitations',
  async ({ domainId, limit = 50, offset = 0 }: { domainId: number; limit?: number; offset?: number }) => {
    const response = await api.get(`/citations/domain/${domainId}`, {
      params: { limit, offset }
    });
    return response.data;
  }
);

export const fetchCitationPatterns = createAsyncThunk(
  'citations/fetchPatterns',
  async (domainId: number) => {
    const response = await api.get(`/citations/domain/${domainId}/patterns`);
    return response.data;
  }
);

export const trackCitation = createAsyncThunk(
  'citations/trackCitation',
  async (citation: Omit<Citation, 'id' | 'created_at'>) => {
    const response = await api.post('/citations', citation);
    return response.data;
  }
);

const citationSlice = createSlice({
  name: 'citations',
  initialState,
  reducers: {
    clearCitations: (state) => {
      state.citations = [];
      state.total = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch citations
      .addCase(fetchCitations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCitations.fulfilled, (state, action) => {
        state.loading = false;
        state.citations = action.payload.citations;
        state.total = action.payload.total;
      })
      .addCase(fetchCitations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch citations';
      })
      // Fetch patterns
      .addCase(fetchCitationPatterns.fulfilled, (state, action) => {
        state.patterns = action.payload;
      })
      // Track citation
      .addCase(trackCitation.fulfilled, (state, action) => {
        state.citations.unshift(action.payload);
        state.total += 1;
      });
  },
});

export const { clearCitations } = citationSlice.actions;
export default citationSlice.reducer;