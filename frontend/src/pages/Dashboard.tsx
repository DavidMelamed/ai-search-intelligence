import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchDomains } from '../store/domainSlice';
import { fetchCitations, fetchCitationPatterns } from '../store/citationSlice';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedDomain } = useSelector((state: RootState) => state.domains);
  const { patterns, total } = useSelector((state: RootState) => state.citations);

  useEffect(() => {
    dispatch(fetchDomains());
  }, [dispatch]);

  useEffect(() => {
    if (selectedDomain) {
      dispatch(fetchCitations({ domainId: selectedDomain.id, limit: 10 }));
      dispatch(fetchCitationPatterns(selectedDomain.id));
    }
  }, [dispatch, selectedDomain]);

  // Prepare chart data
  const temporalData = {
    labels: patterns?.temporalPatterns?.map((p: any) => 
      new Date(p.date).toLocaleDateString()
    ) || [],
    datasets: [
      {
        label: 'Citations per Day',
        data: patterns?.temporalPatterns?.map((p: any) => p.count) || [],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const typeData = {
    labels: patterns?.typeFrequency?.map((t: any) => t.ai_mode_type || 'Unknown') || [],
    datasets: [
      {
        data: patterns?.typeFrequency?.map((t: any) => t.count) || [],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">
          Overview of your AI search intelligence for {selectedDomain?.domain}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Citations</p>
              <p className="text-2xl font-bold text-gray-900">{total || 0}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <span className="text-2xl">📑</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Queries</p>
              <p className="text-2xl font-bold text-gray-900">
                {patterns?.queryFrequency?.length || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">🔍</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Position</p>
              <p className="text-2xl font-bold text-gray-900">
                {patterns?.positionDistribution?.[0]?.position || '-'}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Mode Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {patterns?.typeFrequency?.length || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-2xl">🤖</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Citation Trends (Last 30 Days)
          </h3>
          <div className="h-64">
            <Line 
              data={temporalData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Citation Types Distribution
          </h3>
          <div className="h-64">
            <Doughnut 
              data={typeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Queries */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Queries</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Query
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Citations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patterns?.queryFrequency?.slice(0, 5).map((query: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {query.query}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {query.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {total ? ((query.count / total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;