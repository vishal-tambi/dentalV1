const express = require('express');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const Submission = require('../models/Submission');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage (not disk)
const storage = multer.memoryStorage();
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

// Helper function to convert buffer to base64
const bufferToBase64 = (buffer) => {
  return buffer.toString('base64');
};

// Helper function to convert base64 to buffer
const base64ToBuffer = (base64String) => {
  return Buffer.from(base64String, 'base64');
};

// Create submission (Patient)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { patientName, patientId, email, note } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // Convert uploaded image to base64 and store in MongoDB
    const originalImageBase64 = bufferToBase64(req.file.buffer);

    const submission = new Submission({
      patientId,
      patientName,
      email,
      note,
      originalImage: {
        data: originalImageBase64,
        contentType: req.file.mimetype,
        filename: req.file.originalname
      },
      userId: req.user._id
    });

    await submission.save();

    // Return submission without the large base64 data for response
    const submissionResponse = {
      ...submission.toObject(),
      originalImage: {
        contentType: submission.originalImage.contentType,
        filename: submission.originalImage.filename,
        hasData: !!submission.originalImage.data
      }
    };

    res.status(201).json({
      message: 'Submission created successfully',
      submission: submissionResponse
    });
  } catch (error) {
    console.error('Submission creation error:', error);
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

    // Remove base64 data from response (too large)
    const submissionsResponse = submissions.map(submission => ({
      ...submission.toObject(),
      originalImage: submission.originalImage ? {
        contentType: submission.originalImage.contentType,
        filename: submission.originalImage.filename,
        hasData: !!submission.originalImage.data
      } : null,
      annotatedImage: submission.annotatedImage ? {
        contentType: submission.annotatedImage.contentType,
        filename: submission.annotatedImage.filename,
        hasData: !!submission.annotatedImage.data
      } : null,
      reportPDF: submission.reportPDF ? {
        contentType: submission.reportPDF.contentType,
        filename: submission.reportPDF.filename,
        hasData: !!submission.reportPDF.data
      } : null
    }));

    res.json({ submissions: submissionsResponse });
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

    // Return submission without full base64 data
    const submissionResponse = {
      ...submission.toObject(),
      originalImage: submission.originalImage ? {
        contentType: submission.originalImage.contentType,
        filename: submission.originalImage.filename,
        hasData: !!submission.originalImage.data
      } : null,
      annotatedImage: submission.annotatedImage ? {
        contentType: submission.annotatedImage.contentType,
        filename: submission.annotatedImage.filename,
        hasData: !!submission.annotatedImage.data
      } : null
    };

    res.json({ submission: submissionResponse });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get image data (for displaying images)
router.get('/:id/image/:type', auth, async (req, res) => {
  try {
    const { id, type } = req.params; // type: 'original' or 'annotated'
    
    const submission = await Submission.findById(id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check access rights
    if (req.user.role !== 'admin' && submission.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let imageData;
    if (type === 'original' && submission.originalImage) {
      imageData = submission.originalImage;
    } else if (type === 'annotated' && submission.annotatedImage) {
      imageData = submission.annotatedImage;
    } else {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Convert base64 back to buffer and send as image
    const imageBuffer = base64ToBuffer(imageData.data);
    
    res.set({
      'Content-Type': imageData.contentType,
      'Content-Length': imageBuffer.length
    });
    
    res.send(imageBuffer);
  } catch (error) {
    console.error('Image retrieval error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save annotation (Admin only)
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

    let annotatedImageData = null;
    
    // Save the annotated image from canvas to MongoDB
    if (annotatedImageDataUrl) {
      try {
        // Remove data URL prefix and convert to base64
        const base64Data = annotatedImageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        const contentType = annotatedImageDataUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        
        annotatedImageData = {
          data: base64Data,
          contentType: contentType ? contentType[1] : 'image/jpeg',
          filename: `annotated-${req.params.id}-${Date.now()}.jpg`
        };
        
        console.log('Annotated image prepared for MongoDB storage');
        
      } catch (error) {
        console.error('Error preparing annotated image:', error);
        return res.status(500).json({ message: 'Failed to process annotated image' });
      }
    }

    // Update submission in MongoDB
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        annotationData,
        annotatedImage: annotatedImageData,
        status: 'annotated'
      },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Return response without large base64 data
    const submissionResponse = {
      ...submission.toObject(),
      annotatedImage: submission.annotatedImage ? {
        contentType: submission.annotatedImage.contentType,
        filename: submission.annotatedImage.filename,
        hasData: !!submission.annotatedImage.data
      } : null
    };

    res.json({ 
      message: 'Annotation saved successfully', 
      submission: submissionResponse
    });
  } catch (error) {
    console.error('Annotation save error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate PDF report (Admin only)
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

      // Patient Information Section
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

      // Add original image if exists
      if (submission.originalImage && submission.originalImage.data) {
        try {
          const originalBuffer = base64ToBuffer(submission.originalImage.data);
          doc.fontSize(12).fillColor('#374151').text('Original Image:', 50, imageY);
          doc.image(originalBuffer, 50, imageY + 15, { 
            width: 200, 
            height: 150,
            fit: [200, 150]
          });
          console.log('Original image added to PDF');
        } catch (error) {
          console.error('Error adding original image to PDF:', error);
          doc.text('Original image could not be loaded', 50, imageY + 15);
        }
      }

      // Add annotated image if exists
      if (submission.annotatedImage && submission.annotatedImage.data) {
        try {
          const annotatedBuffer = base64ToBuffer(submission.annotatedImage.data);
          doc.fontSize(12).fillColor('#374151').text('Annotated Image (with Doctor\'s Notes):', 300, imageY);
          doc.image(annotatedBuffer, 300, imageY + 15, { 
            width: 200, 
            height: 150,
            fit: [200, 150]
          });
          console.log('Annotated image added to PDF');
          
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
        } catch (error) {
          console.error('Error adding annotated image to PDF:', error);
          doc.text('Annotated image could not be loaded', 300, imageY + 15);
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

    // Convert PDF buffer to base64 and store in MongoDB
    const pdfBase64 = bufferToBase64(pdfBuffer);
    const pdfFilename = `report-${submission._id}-${Date.now()}.pdf`;

    // Update submission with PDF data
    submission.reportPDF = {
      data: pdfBase64,
      contentType: 'application/pdf',
      filename: pdfFilename
    };
    submission.status = 'reported';
    await submission.save();

    console.log('PDF generated and saved to MongoDB successfully');

    res.json({ 
      message: 'PDF generated successfully', 
      submission: {
        ...submission.toObject(),
        reportPDF: {
          contentType: submission.reportPDF.contentType,
          filename: submission.reportPDF.filename,
          hasData: !!submission.reportPDF.data
        }
      }
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

    if (!submission.reportPDF || !submission.reportPDF.data) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Convert base64 back to buffer and send as PDF
    const pdfBuffer = base64ToBuffer(submission.reportPDF.data);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${submission.reportPDF.filename}"`,
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;