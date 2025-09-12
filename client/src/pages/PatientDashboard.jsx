import React, { useState } from 'react';
import UploadForm from '../components/patient/UploadForm';
import SubmissionList from '../components/patient/SubmissionList';

const PatientDashboard = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    // Trigger refresh of submissions list
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Dashboard</h1>
        <p className="text-gray-600">Upload your dental images and track your submissions</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Upload New Image</h2>
          <UploadForm onUploadSuccess={handleUploadSuccess} />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Submissions</h2>
          <SubmissionList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;