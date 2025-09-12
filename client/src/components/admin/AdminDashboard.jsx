import React, { useState, useEffect } from 'react';
import { submissionsAPI } from '../../services/api';
import SubmissionDetail from './SubmissionDetail';

const AdminDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await submissionsAPI.getAll();
      setSubmissions(response.data.submissions);
    } catch (error) {
      setError('Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleRefresh = () => {
    fetchSubmissions();
  };

  const getStatusBadge = (status) => {
    const badges = {
      uploaded: 'bg-blue-100 text-blue-800',
      annotated: 'bg-yellow-100 text-yellow-800',
      reported: 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      uploaded: 'New Upload',
      annotated: 'Annotated',
      reported: 'Report Generated',
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading submissions...</div>
      </div>
    );
  }

  if (selectedSubmission) {
    return (
      <SubmissionDetail
        submission={selectedSubmission}
        onBack={() => {
          setSelectedSubmission(null);
          handleRefresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Review and annotate patient submissions</p>
        </div>
        <button onClick={handleRefresh} className="btn-secondary">
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {submissions.map((submission) => (
          <div key={submission._id} className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {submission.patientName}
                </h3>
                <p className="text-sm text-gray-600">ID: {submission.patientId}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(submission.status)}`}>
                {getStatusText(submission.status)}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>Email:</strong> {submission.email}</p>
              <p><strong>Uploaded:</strong> {new Date(submission.createdAt).toLocaleDateString()}</p>
              {submission.note && (
                <p><strong>Notes:</strong> {submission.note}</p>
              )}
            </div>

            {submission.originalImage && submission.originalImage.hasData && (
              <img
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/api/submissions/${submission._id}/image/original`}
                alt="Patient dental image"
                className="w-full h-32 object-cover rounded border"
              />
            )}

            <button
              onClick={() => setSelectedSubmission(submission)}
              className="w-full btn-primary"
            >
              {submission.status === 'uploaded' ? 'Review & Annotate' : 'View Details'}
            </button>
          </div>
        ))}
      </div>

      {submissions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No submissions to review yet.</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;