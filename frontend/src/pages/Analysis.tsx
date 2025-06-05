import React, { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';

const Analysis: React.FC = () => {
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [contentInput, setContentInput] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [prediction, setPrediction] = useState<any>(null);

  const { data: analyses, isLoading } = useQuery('analyses', async () => {
    const response = await api.get('/analysis/recent');
    return response.data;
  });

  const handlePredict = async () => {
    try {
      const response = await api.post('/analysis/predict', {
        content: contentInput,
        targetQuery: queryInput
      });
      setPrediction(response.data);
    } catch (error) {
      alert('Failed to predict performance');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analysis</h2>
        <p className="text-gray-600">
          Analyze citations and predict content performance
        </p>
      </div>

      {/* Content Performance Predictor */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Content Performance Predictor
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Query
            </label>
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter the query you're targeting..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={6}
              placeholder="Paste your content here..."
            />
          </div>
          <button
            onClick={handlePredict}
            disabled={!contentInput || !queryInput}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Predict Performance
          </button>
        </div>

        {prediction && (
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900">Prediction Results</h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Citation Probability:</span>
                  <span className="font-semibold text-lg">
                    {prediction.citationProbability.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Similar Content Analyzed:</span>
                  <span>{prediction.similarContentAnalyzed}</span>
                </div>
              </div>
            </div>

            {prediction.gaps && prediction.gaps.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Content Gaps</h4>
                <ul className="space-y-2">
                  {prediction.gaps.map((gap: any, index: number) => (
                    <li key={index} className="bg-yellow-50 p-3 rounded-lg">
                      <p className="font-medium text-gray-900">{gap.what}</p>
                      <p className="text-sm text-gray-600 mt-1">{gap.why}</p>
                      <p className="text-sm text-indigo-600 mt-1">→ {gap.how}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.suggestions && prediction.suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Optimization Suggestions</h4>
                <ul className="space-y-2">
                  {prediction.suggestions.map((suggestion: any, index: number) => (
                    <li key={index} className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{suggestion.suggestion}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Impact: {suggestion.impact}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          suggestion.priority === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : suggestion.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {suggestion.priority}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Analyses */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Analyses
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses?.map((analysis: any) => (
              <div
                key={analysis.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedAnalysis(analysis)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{analysis.citation.query}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {analysis.citation.citation_text.substring(0, 100)}...
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Details Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Analysis Details</h3>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Reasoning Hypothesis</h4>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {selectedAnalysis.reasoning_hypothesis}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  {selectedAnalysis.recommendations?.map((rec: any, index: number) => (
                    <li key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{rec.action}</p>
                      <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-indigo-600">
                          Impact: {rec.impact}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          rec.priority === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;