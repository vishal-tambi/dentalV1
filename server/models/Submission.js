const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  email: { type: String, required: true },
  note: { type: String },
  
  // Store Cloudinary URLs (much simpler!)
  originalImageUrl: { type: String },
  originalImagePublicId: { type: String },
  
  annotatedImageUrl: { type: String },
  annotatedImagePublicId: { type: String },
  
  reportPdfUrl: { type: String },
  reportPdfPublicId: { type: String },
  
  annotationData: { type: Object },
  status: { 
    type: String, 
    enum: ['uploaded', 'annotated', 'reported'], 
    default: 'uploaded' 
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);