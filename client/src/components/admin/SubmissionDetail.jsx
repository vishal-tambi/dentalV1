import React, { useState } from 'react';
import { submissionsAPI } from '../../services/api';
import AnnotationCanvas from './AnnotationCanvas';

const SubmissionDetail = ({ submission, onBack }) => {
  const [currentSubmission, setCurrentSubmission] = useState(submission);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAnnotationSave = async (annotationData, annotatedImageDataUrl) => {
    try {
      setLoading(true);
      setError('');

      const response = await submissionsAPI.annotate(currentSubmission._id, {
        annotationData,
        annotatedImagePath: `uploads/images/annotated-${currentSubmission._id}.jpg`
      });

      setCurrentSubmission(response.data.submission);
      setSuccess('Annotation saved successfully!');
    } catch (error) {
      setError('Failed to save annotation');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await submissionsAPI.generatePDF(currentSubmission._id);
      setCurrentSubmission(response.data.submission);
      setSuccess('PDF report generated successfully!');
    } catch (error) {
      setError('Failed to generate PDF');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-secondary">
          ← Back to Dashboard
        </button>

        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(currentSubmission.status)}`}>
          Status: {currentSubmission.status}
        </span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Patient Information */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Name:</strong> {currentSubmission.patientName}</p>
            <p><strong>Patient ID:</strong> {currentSubmission.patientId}</p>
            <p><strong>Email:</strong> {currentSubmission.email}</p>
          </div>
          <div>
            <p><strong>Uploaded:</strong> {new Date(currentSubmission.createdAt).toLocaleDateString()}</p>
            <p><strong>Last Updated:</strong> {new Date(currentSubmission.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
        {currentSubmission.note && (
          <div className="mt-4">
            <p><strong>Patient Notes:</strong></p>
            <p className="text-gray-700 bg-gray-50 p-3 rounded mt-1">{currentSubmission.note}</p>
          </div>
        )}
      </div>

      {/* Image Annotation Section */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Image Review & Annotation</h2>

        {currentSubmission.originalImageUrl && (
          // Update the AnnotationCanvas imageUrl prop
          // Pass Cloudinary URL directly
          <AnnotationCanvas
            imageUrl={currentSubmission.originalImageUrl}
            existingAnnotations={currentSubmission.annotationData}
            onSave={handleAnnotationSave}
            disabled={loading}
          />
        )}
      </div>

      {/* Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <div className="flex gap-4">
          {currentSubmission.status === 'annotated' && (
            <button
              onClick={handleGeneratePDF}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate PDF Report'}
            </button>
          )}

          {currentSubmission.status === 'reported' && (
            <div className="flex gap-2">
              <span className="text-green-600 font-medium">✓ Report Generated</span>
              <button
                onClick={handleGeneratePDF}
                disabled={loading}
                className="btn-secondary disabled:opacity-50"
              >
                Regenerate PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetail;