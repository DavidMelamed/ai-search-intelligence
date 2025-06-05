import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from 'react-query';
import { RootState } from '../store';
import api from '../services/api';

const Keywords: React.FC = () => {
  const { selectedDomain } = useSelector((state: RootState) => state.domains);
  const [trackKeyword, setTrackKeyword] = useState('');
  const [syntheticQuery, setSyntheticQuery] = useState('');
  const [syntheticResults, setSyntheticResults] = useState<any>(null);

  const { data: opportunities, refetch: refetchOpportunities } = useQuery(
    ['keyword-opportunities', selectedDomain?.id],
    async () => {
      if (!selectedDomain) return null;
      const response = await api.get(`/keywords/opportunities/${selectedDomain.id}`);
      return response.data;
    },
    { enabled: !!selectedDomain }
  );

  const handleTrackKeyword = async () => {
    try {
      await api.post('/keywords/track', { keyword: trackKeyword });
      setTrackKeyword('');
      alert('Keyword tracking started');
      refetchOpportunities();
    } catch (error) {
      alert('Failed to track keyword');
    }
  };

  const handleDiscoverSynthetic = async () => {
    try {
      const response = await api.post('/keywords/synthetic', { baseQuery: syntheticQuery });
      setSyntheticResults(response.data);
    } catch (error) {
      alert('Failed to discover synthetic queries');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Keywords</h2>
        <p className="text-gray-600">
          Keyword opportunities and synthetic query discovery
        </p>
      </div>

      {/* Track New Keyword */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Track New Keyword</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={trackKeyword}
            onChange={(e) => setTrackKeyword(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter keyword to track..."
          />
          <button
            onClick={handleTrackKeyword}
            disabled={!trackKeyword}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Track Keyword
          </button>
        </div>
      </div>

      {/* Keyword Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citation Opportunities */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Citation Opportunities
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Keywords where you have citations but don't rank
          </p>
          <div className="space-y-2">
            {opportunities?.citationOpportunities?.map((opp: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{opp.keyword}</span>
                <span className="text-sm text-gray-600">{opp.citation_count} citations</span>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Gaps */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Competitor Gaps
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Keywords where competitors rank but you don't
          </p>
          <div className="space-y-2">
            {opportunities?.competitorGaps?.slice(0, 5).map((gap: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium">{gap.keyword}</span>
                  <span className="text-sm text-gray-600">Vol: {gap.search_volume}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {gap.competitor_count} competitors rank
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Mode Analysis */}
      {opportunities?.aiModeAnalysis && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Mode Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {opportunities.aiModeAnalysis.total_keywords || 0}
              </p>
              <p className="text-sm text-gray-600">Total Keywords</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {opportunities.aiModeAnalysis.keywords_with_ai_mode || 0}
              </p>
              <p className="text-sm text-gray-600">With AI Mode</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {Math.round(opportunities.aiModeAnalysis.avg_position_with_ai_mode || 0)}
              </p>
              <p className="text-sm text-gray-600">Avg Position (AI Mode)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(opportunities.aiModeAnalysis.avg_position_without_ai_mode || 0)}
              </p>
              <p className="text-sm text-gray-600">Avg Position (No AI)</p>
            </div>
          </div>
        </div>
      )}

      {/* Synthetic Query Discovery */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Synthetic Query Discovery
        </h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={syntheticQuery}
              onChange={(e) => setSyntheticQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter base query..."
            />
            <button
              onClick={handleDiscoverSynthetic}
              disabled={!syntheticQuery}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Discover Variations
            </button>
          </div>

          {syntheticResults && (
            <div className="space-y-4">
              {/* Related Searches */}
              {syntheticResults.relatedSearches?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Related Searches</h4>
                  <div className="flex flex-wrap gap-2">
                    {syntheticResults.relatedSearches.map((search: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {search}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* People Also Ask */}
              {syntheticResults.peopleAlsoAsk?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">People Also Ask</h4>
                  <ul className="space-y-2">
                    {syntheticResults.peopleAlsoAsk.map((question: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Patterns */}
              {syntheticResults.patterns && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Query Patterns</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Common Prefixes:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {syntheticResults.patterns.prefixes?.map((prefix: string, index: number) => (
                          <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {prefix}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Common Suffixes:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {syntheticResults.patterns.suffixes?.map((suffix: string, index: number) => (
                          <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {suffix}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Citation Data */}
              {syntheticResults.citationData?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Citation Data</h4>
                  <div className="space-y-1">
                    {syntheticResults.citationData.map((data: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{data.query}</span>
                        <span className="font-medium">{data.citation_count} citations</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Keywords;