import React, { useState } from 'react';
import { submissionsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const UploadForm = ({ onUploadSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    patientName: user?.name || '',
    patientId: user?.patientId || '',
    email: user?.email || '',
    note: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!image) {
      setError('Please select an image to upload');
      setLoading(false);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('patientName', formData.patientName);
    formDataToSend.append('patientId', formData.patientId);
    formDataToSend.append('email', formData.email);
    formDataToSend.append('note', formData.note);
    formDataToSend.append('image', image);

    try {
      await submissionsAPI.create(formDataToSend);
      setSuccess('Image uploaded successfully!');
      
      // Reset form
      setFormData({
        patientName: user?.name || '',
        patientId: user?.patientId || '',
        email: user?.email || '',
        note: '',
      });
      setImage(null);
      setImagePreview(null);
      
      // Reset file input
      const fileInput = document.getElementById('image-upload');
      if (fileInput) fileInput.value = '';

      // Notify parent component to refresh submissions list
      if (onUploadSuccess) onUploadSuccess();

    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed');
    }

    setLoading(false);
  };

  return (
    <div className="card">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient Name
          </label>
          <input
            type="text"
            name="patientName"
            value={formData.patientName}
            onChange={handleInputChange}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient ID
          </label>
          <input
            type="text"
            name="patientId"
            value={formData.patientId}
            onChange={handleInputChange}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleInputChange}
            className="input-field"
            rows="3"
            placeholder="Any additional notes about your dental concern..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Dental Image
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="input-field"
            required
          />
        </div>

        {imagePreview && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Image Preview:</p>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full h-48 object-contain border rounded-lg"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload Image'}
        </button>
      </form>
    </div>
  );
};

export default UploadForm;