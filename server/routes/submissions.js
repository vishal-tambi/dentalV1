const express = require('express');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Submission = require('../models/Submission');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'oralvis/images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }]
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `oralvis/${folder}`,
        public_id: filename,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// Generate PDF report (Admin only) - Professional Dental Report
router.post('/:id/generate-pdf', auth, adminOnly, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    console.log('Generating Professional Dental Report for:', submission._id);

    // Create PDF with professional layout
    const doc = new PDFDocument({ 
      margin: 30,
      size: 'A4'
    });
    
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfBuffer = await new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with purple background
      doc.rect(0, 0, 595, 100).fill('#8B5AD6');
      
      // Header text
      doc.fontSize(28).fillColor('white').font('Helvetica-Bold');
      doc.text('Oral Health Screening', 50, 25);
      doc.fontSize(24);
      doc.text('Report', 50, 55);

      // Patient information section
      doc.fillColor('black').fontSize(12).font('Helvetica');
      
      const currentDate = new Date().toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      });
      
      // Patient info row
      doc.text(`Name: ${submission.patientName}`, 50, 120);
      doc.text(`Phone: ${submission.patientId}`, 200, 120);
      doc.text(`Date: ${currentDate}`, 450, 120);

      // Screening Report Section
      doc.rect(30, 160, 535, 300).stroke('#E5E7EB');
      doc.rect(30, 160, 535, 30).fill('#F3F4F6');
      
      doc.fillColor('black').fontSize(14).font('Helvetica-Bold');
      doc.text('SCREENING REPORT:', 40, 172);

      let imageY = 210;
      let imageX = 50;
      const imageWidth = 150;
      const imageHeight = 120;

      // Add original image (Upper Teeth)
      if (submission.originalImageUrl) {
        try {
          doc.image(submission.originalImageUrl, imageX, imageY, { 
            width: imageWidth, 
            height: imageHeight,
            fit: [imageWidth, imageHeight]
          });
          
          // Upper Teeth label with red background
          doc.rect(imageX + 25, imageY + imageHeight + 10, 100, 25).fill('#EF4444');
          doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
          doc.text('Upper Teeth', imageX + 45, imageY + imageHeight + 18);
          
        } catch (error) {
          console.error('Error adding original image:', error);
          doc.rect(imageX, imageY, imageWidth, imageHeight).stroke();
          doc.fillColor('gray').fontSize(10);
          doc.text('Original Image', imageX + 50, imageY + 60);
        }
      }

      // Add annotated image (Front Teeth)
      if (submission.annotatedImageUrl) {
        try {
          const frontImageX = imageX + imageWidth + 30;
          doc.image(submission.annotatedImageUrl, frontImageX, imageY, { 
            width: imageWidth, 
            height: imageHeight,
            fit: [imageWidth, imageHeight]
          });
          
          // Front Teeth label with red background
          doc.rect(frontImageX + 25, imageY + imageHeight + 10, 100, 25).fill('#EF4444');
          doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
          doc.text('Front Teeth', frontImageX + 45, imageY + imageHeight + 18);
          
        } catch (error) {
          console.error('Error adding annotated image:', error);
          const frontImageX = imageX + imageWidth + 30;
          doc.rect(frontImageX, imageY, imageWidth, imageHeight).stroke();
          doc.fillColor('gray').fontSize(10);
          doc.text('Annotated Image', frontImageX + 50, imageY + 60);
        }
      }

      // Add third image placeholder (Lower Teeth)
      const lowerImageX = imageX + (imageWidth + 30) * 2;
      if (lowerImageX + imageWidth <= 545) {
        doc.rect(lowerImageX, imageY, imageWidth, imageHeight).stroke('#E5E7EB');
        doc.fillColor('gray').fontSize(10);
        doc.text('Lower Teeth', lowerImageX + 50, imageY + 60);
        
        // Lower Teeth label with red background
        doc.rect(lowerImageX + 25, imageY + imageHeight + 10, 100, 25).fill('#EF4444');
        doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
        doc.text('Lower Teeth', lowerImageX + 45, imageY + imageHeight + 18);
      }

      // Legend section
      const legendY = imageY + imageHeight + 50;
      doc.fillColor('black').fontSize(10).font('Helvetica');
      
      const legendItems = [
        { color: '#8B4513', text: 'Inflamed / Red gums' },
        { color: '#FFD700', text: 'Misaligned' },
        { color: '#808080', text: 'Receded gums' },
        { color: '#FF0000', text: 'Stains' },
        { color: '#00FFFF', text: 'Attrition' },
        { color: '#FF1493', text: 'Crowns' }
      ];

      legendItems.forEach((item, index) => {
        const x = 50 + (index % 3) * 170;
        const y = legendY + Math.floor(index / 3) * 20;
        
        // Color square
        doc.rect(x, y, 12, 12).fill(item.color);
        
        // Text
        doc.fillColor('black').text(item.text, x + 20, y + 2);
      });

      // Treatment Recommendations Section
      const treatmentY = legendY + 80;
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1F2937');
      doc.text('TREATMENT RECOMMENDATIONS:', 50, treatmentY);

      // Treatment list
      const treatments = [
        { color: '#8B4513', condition: 'Inflamed or Red gums', treatment: 'Scaling.' },
        { color: '#FFD700', condition: 'Misaligned', treatment: 'Braces or Clear Aligner' },
        { color: '#808080', condition: 'Receded gums', treatment: 'Gum Surgery.' },
        { color: '#FF0000', condition: 'Stains', treatment: 'Teeth cleaning and polishing.' },
        { color: '#00FFFF', condition: 'Attrition', treatment: 'Filling/ Night Guard.' },
        { color: '#FF1493', condition: 'Crowns', treatment: 'If the crown is loose or broken, better get it checked. Teeth coloured caps are the best ones.' }
      ];

      let treatmentItemY = treatmentY + 30;
      treatments.forEach((item, index) => {
        // Color square
        doc.rect(50, treatmentItemY, 12, 12).fill(item.color);
        
        // Condition name
        doc.fillColor('black').fontSize(11).font('Helvetica-Bold');
        doc.text(item.condition, 70, treatmentItemY + 1);
        
        // Treatment description
        doc.fontSize(11).font('Helvetica');
        doc.text(`: ${item.treatment}`, 70 + doc.widthOfString(item.condition), treatmentItemY + 1);
        
        treatmentItemY += 20;
      });

      // Add patient notes if available
      if (submission.note) {
        treatmentItemY += 20;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1F2937');
        doc.text('PATIENT NOTES:', 50, treatmentItemY);
        
        doc.fontSize(11).font('Helvetica').fillColor('black');
        doc.text(submission.note, 50, treatmentItemY + 20, { width: 500 });
      }

      // Add annotation details if available
      if (submission.annotationData && submission.annotationData.shapes && submission.annotationData.shapes.length > 0) {
        treatmentItemY += (submission.note ? 60 : 40);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1F2937');
        doc.text('DOCTOR\'S ANNOTATIONS:', 50, treatmentItemY);
        
        doc.fontSize(10).font('Helvetica').fillColor('black');
        submission.annotationData.shapes.forEach((shape, index) => {
          const annotationText = `${index + 1}. ${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} marking highlighted in ${shape.color}`;
          doc.text(annotationText, 70, treatmentItemY + 20 + (index * 15));
        });
        
        treatmentItemY += 20 + (submission.annotationData.shapes.length * 15) + 10;
        doc.text(`Total annotations: ${submission.annotationData.shapes.length}`, 70, treatmentItemY);
        doc.text(`Examined on: ${new Date(submission.annotationData.timestamp || submission.updatedAt).toLocaleDateString()}`, 70, treatmentItemY + 15);
      }

      // Footer - Page number
      const pageHeight = 842; // A4 height in points
      doc.rect(250, pageHeight - 50, 95, 30).fill('#4A5568');
      doc.fillColor('white').fontSize(12).font('Helvetica');
      doc.text('Page   1   /   1', 268, pageHeight - 40);
      
      // Add small icons (simplified)
      doc.fillColor('white').fontSize(10);
      doc.text('—', 350, pageHeight - 40);
      doc.text('🔍', 365, pageHeight - 42);
      doc.text('+', 380, pageHeight - 40);

      // Footer info
      doc.fillColor('gray').fontSize(8);
      doc.text(`Report ID: ${submission._id}`, 50, pageHeight - 30);
      doc.text('Generated by OralVis Healthcare System', 50, pageHeight - 20);

      doc.end();
    });

    // Upload PDF to Cloudinary
    const pdfFilename = `dental-report-${submission._id}-${Date.now()}`;
    const pdfUploadResult = await uploadBufferToCloudinary(pdfBuffer, 'reports', pdfFilename);

    // Update submission
    submission.reportPdfUrl = pdfUploadResult.secure_url;
    submission.reportPdfPublicId = pdfUploadResult.public_id;
    submission.status = 'reported';
    await submission.save();

    console.log('Professional Dental Report generated successfully');

    res.json({ 
      message: 'Professional Dental Report generated successfully', 
      submission
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get submissions (Role-based access)
router.get('/', auth, async (req, res) => {
  try {
    let submissions;
    
    if (req.user.role === 'admin') {
      submissions = await Submission.find().sort({ createdAt: -1 });
    } else {
      submissions = await Submission.find({ userId: req.user._id }).sort({ createdAt: -1 });
    }

    res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single submission
router.get('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check access rights
    if (req.user.role !== 'admin' && submission.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ submission });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save annotation (Admin only) - Upload annotated image to Cloudinary
router.put('/:id/annotate', auth, adminOnly, async (req, res) => {
  try {
    const { annotationData, annotatedImageDataUrl } = req.body;
    
    console.log('Received annotation request:', {
      hasAnnotationData: !!annotationData,
      hasImageData: !!annotatedImageDataUrl,
      shapesCount: annotationData?.shapes?.length || 0
    });

    if (!annotationData) {
      return res.status(400).json({ message: 'Annotation data is required' });
    }

    let annotatedImageUrl = null;
    let annotatedImagePublicId = null;
    
    // Upload annotated image to Cloudinary
    if (annotatedImageDataUrl) {
      try {
        // Convert base64 to buffer
        const base64Data = annotatedImageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload to Cloudinary
        const filename = `annotated-${req.params.id}-${Date.now()}`;
        const uploadResult = await uploadBufferToCloudinary(buffer, 'annotated', filename);
        
        annotatedImageUrl = uploadResult.secure_url;
        annotatedImagePublicId = uploadResult.public_id;
        
        console.log('Annotated image uploaded to Cloudinary:', uploadResult.secure_url);
        
      } catch (error) {
        console.error('Error uploading annotated image:', error);
        return res.status(500).json({ message: 'Failed to upload annotated image' });
      }
    }

    // Update submission
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        annotationData,
        annotatedImageUrl,
        annotatedImagePublicId,
        status: 'annotated'
      },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({ 
      message: 'Annotation saved successfully', 
      submission
    });
  } catch (error) {
    console.error('Annotation save error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate PDF report (Admin only) - Upload PDF to Cloudinary
router.post('/:id/generate-pdf', auth, adminOnly, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    console.log('Generating PDF for submission:', submission._id);

    // Create PDF in memory
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    const chunks = [];
    
    // Collect PDF data in memory
    doc.on('data', (chunk) => chunks.push(chunk));
    
    // Generate PDF content
    const pdfBuffer = await new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor('#2563eb').text('OralVis Healthcare Report', 50, 50);
      doc.moveDown(0.5);
      
      // Add horizontal line
      doc.strokeColor('#e5e7eb').lineWidth(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Patient Information
      doc.fontSize(16).fillColor('#374151').text('Patient Information', 50, doc.y);
      doc.fontSize(12).fillColor('#6b7280');
      
      const infoY = doc.y + 10;
      doc.text(`Patient Name: ${submission.patientName}`, 50, infoY);
      doc.text(`Patient ID: ${submission.patientId}`, 50, infoY + 15);
      doc.text(`Email: ${submission.email}`, 50, infoY + 30);
      doc.text(`Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 50, infoY + 45);
      doc.text(`Original Submission: ${new Date(submission.createdAt).toLocaleDateString()}`, 50, infoY + 60);
      
      if (submission.note) {
        doc.moveDown(4);
        doc.fontSize(14).fillColor('#374151').text('Patient Notes:', 50, doc.y);
        doc.fontSize(12).fillColor('#6b7280').text(submission.note, 50, doc.y + 5, { width: 500 });
      }

      doc.moveDown(2);

      // Images Section
      doc.fontSize(16).fillColor('#374151').text('Medical Images', 50, doc.y);
      doc.moveDown(0.5);

      let imageY = doc.y;

      // Add images from Cloudinary URLs
      const addImage = async (imageUrl, label, x, y) => {
        if (imageUrl) {
          try {
            doc.fontSize(12).fillColor('#374151').text(label, x, y);
            doc.image(imageUrl, x, y + 15, { 
              width: 200, 
              height: 150,
              fit: [200, 150]
            });
            console.log(`${label} added to PDF from Cloudinary`);
          } catch (error) {
            console.error(`Error adding ${label} to PDF:`, error);
            doc.text(`${label} could not be loaded`, x, y + 15);
          }
        }
      };

      // Add original image
      if (submission.originalImageUrl) {
        addImage(submission.originalImageUrl, 'Original Image:', 50, imageY);
      }

      // Add annotated image  
      if (submission.annotatedImageUrl) {
        addImage(submission.annotatedImageUrl, 'Annotated Image (with Doctor\'s Notes):', 300, imageY);
        
        // Add annotation summary
        if (submission.annotationData && submission.annotationData.shapes) {
          doc.moveDown(10);
          doc.fontSize(12).fillColor('#374151').text('Annotation Summary:', 50, doc.y);
          doc.fontSize(10).fillColor('#6b7280');
          
          submission.annotationData.shapes.forEach((shape, index) => {
            const shapeText = `${index + 1}. ${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} marking (${shape.color})`;
            doc.text(shapeText, 70, doc.y + 5);
          });
          
          doc.text(`Total annotations: ${submission.annotationData.shapes.length}`, 70, doc.y + 5);
          doc.text(`Annotated on: ${new Date(submission.annotationData.timestamp || submission.updatedAt).toLocaleDateString()}`, 70, doc.y + 5);
        }
      }

      // Footer
      doc.moveDown(3);
      doc.strokeColor('#e5e7eb').lineWidth(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor('#9ca3af');
      doc.text('This report was generated by OralVis Healthcare System', 50, doc.y);
      doc.text(`Report ID: ${submission._id}`, 50, doc.y + 10);
      doc.text(`Status: ${submission.status.toUpperCase()}`, 50, doc.y + 10);

      // Finalize PDF
      doc.end();
    });

    // Upload PDF to Cloudinary
    const pdfFilename = `report-${submission._id}-${Date.now()}`;
    const pdfUploadResult = await uploadBufferToCloudinary(pdfBuffer, 'reports', pdfFilename);

    // Update submission with PDF data
    submission.reportPdfUrl = pdfUploadResult.secure_url;
    submission.reportPdfPublicId = pdfUploadResult.public_id;
    submission.status = 'reported';
    await submission.save();

    console.log('PDF generated and uploaded to Cloudinary successfully');

    res.json({ 
      message: 'PDF generated successfully', 
      submission
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download PDF report
router.get('/:id/download-pdf', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check access rights
    if (req.user.role !== 'admin' && submission.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!submission.reportPdfUrl) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Redirect to Cloudinary URL for download
    res.redirect(submission.reportPdfUrl);
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;