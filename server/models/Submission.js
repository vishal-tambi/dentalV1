const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  email: { type: String, required: true },
  note: { type: String },
  
  // Store images as Base64 strings in MongoDB
  originalImage: {
    data: { type: String }, // Base64 image data
    contentType: { type: String }, // image/jpeg, image/png, etc.
    filename: { type: String }
  },
  
  annotatedImage: {
    data: { type: String }, // Base64 annotated image
    contentType: { type: String },
    filename: { type: String }
  },
  
  // Store PDF as Base64 string in MongoDB
  reportPDF: {
    data: { type: String }, // Base64 PDF data
    contentType: { type: String, default: 'application/pdf' },
    filename: { type: String }
  },
  
  annotationData: { type: Object },
  status: { 
    type: String, 
    enum: ['uploaded', 'annotated', 'reported'], 
    default: 'uploaded' 
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);