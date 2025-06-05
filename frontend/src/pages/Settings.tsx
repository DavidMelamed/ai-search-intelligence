import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchDomains, addDomain, updateDomain, deleteDomain } from '../store/domainSlice';
import { useForm } from 'react-hook-form';

const Settings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { domains } = useSelector((state: RootState) => state.domains);
  const { user } = useSelector((state: RootState) => state.auth);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmitDomain = async (data: any) => {
    try {
      await dispatch(addDomain(data.domain));
      reset();
      setShowAddDomain(false);
    } catch (error) {
      alert('Failed to add domain');
    }
  };

  const handleToggleTracking = async (domainId: number, currentStatus: boolean) => {
    try {
      await dispatch(updateDomain({ id: domainId, trackingEnabled: !currentStatus }));
    } catch (error) {
      alert('Failed to update domain');
    }
  };

  const handleDeleteDomain = async (domainId: number) => {
    if (window.confirm('Are you sure you want to delete this domain? All associated data will be lost.')) {
      try {
        await dispatch(deleteDomain(domainId));
      } catch (error) {
        alert('Failed to delete domain');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Manage your account and domains</p>
      </div>

      {/* Account Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600">Name</label>
            <p className="mt-1 text-gray-900">{user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Email</label>
            <p className="mt-1 text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Role</label>
            <p className="mt-1 text-gray-900 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Domain Management */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Domains</h3>
          <button
            onClick={() => setShowAddDomain(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add Domain
          </button>
        </div>

        {showAddDomain && (
          <form onSubmit={handleSubmit(onSubmitDomain)} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4">
              <input
                {...register('domain', { 
                  required: 'Domain is required',
                  pattern: {
                    value: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
                    message: 'Invalid domain format'
                  }
                })}
                type="text"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="example.com"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddDomain(false);
                  reset();
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
            {errors.domain && (
              <p className="mt-2 text-sm text-red-600">{errors.domain.message as string}</p>
            )}
          </form>
        )}

        <div className="space-y-3">
          {domains.map((domain) => (
            <div key={domain.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="font-medium text-gray-900">{domain.domain}</p>
                  <p className="text-sm text-gray-500">
                    Added on {new Date(domain.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleToggleTracking(domain.id, domain.tracking_enabled)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    domain.tracking_enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {domain.tracking_enabled ? 'Tracking Active' : 'Tracking Paused'}
                </button>
                <button
                  onClick={() => handleDeleteDomain(domain.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Configuration</h3>
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              API keys and external service configurations should be set in environment variables.
              Contact your administrator to update these settings.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600">OpenAI API</label>
              <p className="mt-1 text-sm text-gray-900">
                {process.env.REACT_APP_OPENAI_CONFIGURED ? '✅ Configured' : '❌ Not configured'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">SERP API</label>
              <p className="mt-1 text-sm text-gray-900">
                {process.env.REACT_APP_SERP_CONFIGURED ? '✅ Configured' : '❌ Not configured'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Astra DB</label>
              <p className="mt-1 text-sm text-gray-900">
                {process.env.REACT_APP_ASTRA_CONFIGURED ? '✅ Configured' : '❌ Not configured'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Cohere</label>
              <p className="mt-1 text-sm text-gray-900">
                {process.env.REACT_APP_COHERE_CONFIGURED ? '✅ Configured' : '❌ Not configured'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;