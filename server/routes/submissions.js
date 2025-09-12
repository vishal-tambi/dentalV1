const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const PDFDocument = require('pdfkit');
const Submission = require('../models/Submission');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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

// Create submission (Patient)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { patientName, patientId, email, note } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const submission = new Submission({
      patientId,
      patientName,
      email,
      note,
      originalImagePath: req.file.path,
      userId: req.user._id
    });

    await submission.save();

    res.status(201).json({
      message: 'Submission created successfully',
      submission
    });
  } catch (error) {
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

// Save annotation (Admin only) - COMPLETE FIX
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

    let annotatedImagePath = null;
    
    // Save the annotated image from canvas
    if (annotatedImageDataUrl) {
      try {
        // Remove data URL prefix
        const base64Data = annotatedImageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create unique filename
        const filename = `annotated-${req.params.id}-${Date.now()}.jpg`;
        annotatedImagePath = path.join('uploads', 'images', filename);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(annotatedImagePath), { recursive: true });
        
        // Save the file
        await fs.writeFile(annotatedImagePath, buffer);
        
        console.log('Annotated image saved:', annotatedImagePath);
        console.log('File size:', buffer.length, 'bytes');
        
        // Verify file was created
        const fileExists = await fs.access(annotatedImagePath).then(() => true).catch(() => false);
        console.log('File verification:', fileExists);
        
      } catch (error) {
        console.error('Error saving annotated image:', error);
        return res.status(500).json({ message: 'Failed to save annotated image' });
      }
    }

    // Update submission
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        annotationData,
        annotatedImagePath,
        status: 'annotated'
      },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({ 
      message: 'Annotation saved successfully', 
      submission,
      debug: {
        annotatedImagePath,
        annotationShapes: annotationData?.shapes?.length || 0
      }
    });
  } catch (error) {
    console.error('Annotation save error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Generate PDF report (Admin only) - COMPLETE FIX
router.post('/:id/generate-pdf', auth, adminOnly, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    console.log('Generating PDF for submission:', submission._id);
    console.log('Original image path:', submission.originalImagePath);
    console.log('Annotated image path:', submission.annotatedImagePath);

    const pdfFilename = `report-${submission._id}-${Date.now()}.pdf`;
    const pdfPath = path.join('uploads', 'pdfs', pdfFilename);
    
    // Ensure PDF directory exists
    await fs.mkdir(path.dirname(pdfPath), { recursive: true });

    // Create PDF
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    const stream = require('fs').createWriteStream(pdfPath);
    doc.pipe(stream);

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
    let hasImages = false;

    // Check and add original image
    if (submission.originalImagePath) {
      const originalPath = path.resolve(submission.originalImagePath);
      console.log('Checking original image at:', originalPath);
      
      try {
        await fs.access(originalPath);
        doc.fontSize(12).fillColor('#374151').text('Original Image:', 50, imageY);
        doc.image(originalPath, 50, imageY + 15, { 
          width: 200, 
          height: 150,
          fit: [200, 150]
        });
        hasImages = true;
        console.log('Original image added to PDF');
      } catch (error) {
        console.error('Original image not accessible:', error.message);
        doc.text('Original image not available', 50, imageY + 15);
      }
    }

    // Check and add annotated image  
    if (submission.annotatedImagePath) {
      const annotatedPath = path.resolve(submission.annotatedImagePath);
      console.log('Checking annotated image at:', annotatedPath);
      
      try {
        await fs.access(annotatedPath);
        doc.fontSize(12).fillColor('#374151').text('Annotated Image (with Doctor\'s Notes):', 300, imageY);
        doc.image(annotatedPath, 300, imageY + 15, { 
          width: 200, 
          height: 150,
          fit: [200, 150]
        });
        hasImages = true;
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
        console.error('Annotated image not accessible:', error.message);
        doc.text('Annotated image not available', 300, imageY + 15);
      }
    }

    if (!hasImages) {
      doc.text('No images available for this submission', 50, imageY + 15);
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

    // Wait for PDF to be written
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    console.log('PDF generated successfully:', pdfPath);

    // Update submission with PDF path
    submission.reportPath = pdfPath;
    submission.status = 'reported';
    await submission.save();

    res.json({ 
      message: 'PDF generated successfully', 
      submission,
      pdfPath: pdfPath,
      debug: {
        originalImageExists: submission.originalImagePath ? await fs.access(path.resolve(submission.originalImagePath)).then(() => true).catch(() => false) : false,
        annotatedImageExists: submission.annotatedImagePath ? await fs.access(path.resolve(submission.annotatedImagePath)).then(() => true).catch(() => false) : false
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

    if (!submission.reportPath || !require('fs').existsSync(submission.reportPath)) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    res.download(submission.reportPath, `report-${submission.patientId}.pdf`);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;