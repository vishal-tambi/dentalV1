import React, { useState, useEffect } from 'react';
import { submissionsAPI } from '../../services/api';

const SubmissionList = ({ refreshTrigger }) => {
  const [submissions, setSubmissions] = useState([]);
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
  }, [refreshTrigger]);

  const handleDownloadPDF = async (submissionId, patientId) => {
    try {
      const response = await submissionsAPI.downloadPDF(submissionId);

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${patientId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download PDF');
    }
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
      uploaded: 'Uploaded',
      annotated: 'Under Review',
      reported: 'Report Ready',
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-4">Loading your submissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-red-600 text-center py-4">{error}</div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">
          <p>No submissions yet.</p>
          <p className="text-sm">Upload your first dental image to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => {
        console.log('Submission in SubmissionList:', submission); // Add this line
        return (
          <div key={submission._id} className="card">
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

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Uploaded:</strong> {new Date(submission.createdAt).toLocaleDateString()}</p>
              {submission.note && (
                <p><strong>Notes:</strong> {submission.note}</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {/* Replace image display with direct Cloudinary URLs */}
              {submission.originalImageUrl && (
                <img
                  src={submission.originalImageUrl}
                  alt="Uploaded dental image"
                  className="w-20 h-20 object-cover rounded border"
                />
              )}

              {submission.annotatedImageUrl && (
                <img
                  src={submission.annotatedImageUrl}
                  alt="Annotated dental image"
                  className="w-20 h-20 object-cover rounded border"
                />
              )}
            </div>

            {submission.status === 'reported' && (
              <div className="mt-4">
                <button
                  onClick={() => handleDownloadPDF(submission._id, submission.patientId)}
                  className="btn-primary"
                >
                  Download Report PDF
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SubmissionList;