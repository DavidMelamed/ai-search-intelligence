import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from 'react-query';
import { RootState } from '../store';
import api from '../services/api';
import socketService from '../services/socket';

const Citations: React.FC = () => {
  const { selectedDomain } = useSelector((state: RootState) => state.domains);
  const [page, setPage] = useState(0);
  const [citations, setCitations] = useState<any[]>([]);

  const { data, isLoading, refetch } = useQuery(
    ['citations', selectedDomain?.id, page],
    async () => {
      if (!selectedDomain) return null;
      const response = await api.get(`/citations/domain/${selectedDomain.id}`, {
        params: { limit: 20, offset: page * 20 }
      });
      return response.data;
    },
    { enabled: !!selectedDomain }
  );

  useEffect(() => {
    if (data) {
      setCitations(data.citations);
    }
  }, [data]);

  useEffect(() => {
    if (selectedDomain) {
      socketService.subscribeToDomain(selectedDomain.domain);
      
      const handleNewCitation = (citation: any) => {
        setCitations(prev => [citation, ...prev]);
      };

      socketService.onCitationUpdate(handleNewCitation);

      return () => {
        socketService.unsubscribeFromDomain(selectedDomain.domain);
        socketService.offCitationUpdate(handleNewCitation);
      };
    }
  }, [selectedDomain]);

  const handleAnalyze = async (citationId: number) => {
    try {
      await api.post(`/analysis/citation/${citationId}`);
      alert('Analysis started! Check the Analysis page for results.');
    } catch (error) {
      alert('Failed to start analysis');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Citations</h2>
          <p className="text-gray-600">
            AI Mode citations for {selectedDomain?.domain}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Query
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Citation Text
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {citations.map((citation) => (
                <tr key={citation.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {citation.query}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">{citation.citation_text}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {citation.ai_mode_type || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {citation.position || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(citation.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleAnalyze(citation.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data || data.citations.length < 20}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{page * 20 + 1}</span> to{' '}
                <span className="font-medium">{Math.min((page + 1) * 20, data?.total || 0)}</span> of{' '}
                <span className="font-medium">{data?.total || 0}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!data || data.citations.length < 20}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Citations;