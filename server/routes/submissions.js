const express = require('express');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Submission = require('../models/Submission');
const { auth, adminOnly } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Configuration constants
const PDF_CONFIG = {
  PAGE_WIDTH: 595,
  PAGE_HEIGHT: 842,
  MARGIN: 30,
  IMAGE_WIDTH: 150,
  IMAGE_HEIGHT: 120,
  COLORS: {
    HEADER_BG: '#8B5AD6',
    LABEL_BG: '#EF4444',
    BORDER: '#E5E7EB',
    SECTION_BG: '#F3F4F6',
    TEXT_PRIMARY: '#1F2937',
    TEXT_SECONDARY: '#6b7280',
    FOOTER_BG: '#4A5568'
  }
};

// Treatment and legend items
const LEGEND_ITEMS = [
  { color: '#8B4513', text: 'Inflamed / Red gums' },
  { color: '#FFD700', text: 'Misaligned' },
  { color: '#808080', text: 'Receded gums' },
  { color: '#FF0000', text: 'Stains' },
  { color: '#00FFFF', text: 'Attrition' },
  { color: '#FF1493', text: 'Crowns' }
];

const TREATMENTS = [
  { color: '#8B4513', condition: 'Inflamed or Red gums', treatment: 'Scaling.' },
  { color: '#FFD700', condition: 'Misaligned', treatment: 'Braces or Clear Aligner' },
  { color: '#808080', condition: 'Receded gums', treatment: 'Gum Surgery.' },
  { color: '#FF0000', condition: 'Stains', treatment: 'Teeth cleaning and polishing.' },
  { color: '#00FFFF', condition: 'Attrition', treatment: 'Filling/ Night Guard.' },
  { color: '#FF1493', condition: 'Crowns', treatment: 'If the crown is loose or broken, better get it checked. Teeth coloured caps are the best ones.' }
];

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

// Multer error handling middleware
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
router.use(uploadErrorHandler);

// Rate limiter for PDF generation
const pdfGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many PDF generation requests, please try again later.'
});

// Helper function to validate Cloudinary URLs
const isValidCloudinaryUrl = (url) => {
  return url && url.startsWith('https://res.cloudinary.com/');
};

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

// Helper function to check for page breaks
const checkPageBreak = (doc, y, margin = PDF_CONFIG.MARGIN) => {
  if (y > PDF_CONFIG.PAGE_HEIGHT - margin) {
    doc.addPage();
    return PDF_CONFIG.MARGIN;
  }
  return y;
};

// Helper function to format dates consistently
const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

// Helper function to add image to PDF
const addImageToPdf = async (doc, imageUrl, label, x, y, options) => {
  if (imageUrl && isValidCloudinaryUrl(imageUrl)) {
    try {
      const response = await fetch(imageUrl);
      const imageBuffer = await response.arrayBuffer();
      doc.fontSize(12).fillColor(PDF_CONFIG.COLORS.TEXT_PRIMARY).text(label, x, y);
      doc.image(Buffer.from(imageBuffer), x, y + 15, {
        width: options.width,
        height: options.height,
        fit: [options.width, options.height]
      });
      return y + options.height + 30;
    } catch (error) {
      console.error(`[PDF Generation] Error adding image ${label}:`, error);
      doc.rect(x, y + 15, options.width, options.height).stroke(PDF_CONFIG.COLORS.BORDER);
      doc.fillColor(PDF_CONFIG.COLORS.TEXT_SECONDARY).fontSize(10);
      doc.text(`${label} could not be loaded`, x + 50, y + 75);
      return y + options.height + 30;
    }
  }
  return y;
};

// Generate PDF report (Admin only)
router.post('/:id/generate-pdf', auth, adminOnly, pdfGenerationLimiter, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    console.log(`[PDF Generation] Generating Professional Dental Report for submission ${submission._id}`);

    // Create PDF
    const doc = new PDFDocument({ margin: PDF_CONFIG.MARGIN, size: 'A4' });
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'oralvis/reports',
        public_id: `dental-report-${submission._id}-${Date.now()}`,
        resource_type: 'auto'
      },
      async (error, result) => {
        if (error) {
          console.error(`[PDF Generation] Error uploading PDF for submission ${submission._id}:`, error);
          return res.status(500).json({ message: 'Failed to upload PDF', error: error.message });
        }

        // Update submission
        submission.reportPdfUrl = result.secure_url;
        submission.reportPdfPublicId = result.public_id;
        submission.status = 'reported';
        await submission.save();

        console.log(`[PDF Generation] Success for submission ${submission._id}`);
        res.json({ message: 'Professional Dental Report generated successfully', submission });
      }
    );

    doc.pipe(uploadStream);

    // Header
    doc.rect(0, 0, PDF_CONFIG.PAGE_WIDTH, 100).fill(PDF_CONFIG.COLORS.HEADER_BG);
    doc.fontSize(28).fillColor('white').font('Helvetica-Bold');
    doc.text('Oral Health Screening', 50, 25);
    doc.fontSize(24);
    doc.text('Report', 50, 55);

    // Patient information
    doc.fillColor('black').fontSize(12).font('Helvetica');
    const currentDate = formatDate(new Date());
    doc.text(`Name: ${submission.patientName}`, 50, 120);
    doc.text(`Phone: ${submission.patientId}`, 200, 120);
    doc.text(`Date: ${currentDate}`, 450, 120);

    // Screening Report Section
    let y = 160;
    doc.rect(30, y, 535, 300).stroke(PDF_CONFIG.COLORS.BORDER);
    doc.rect(30, y, 535, 30).fill(PDF_CONFIG.COLORS.SECTION_BG);
    doc.fillColor('black').fontSize(14).font('Helvetica-Bold');
    doc.text('SCREENING REPORT:', 40, y + 12);
    y += 50;

    // Images
    let imageX = 50;
    if (submission.originalImageUrl) {
      y = await addImageToPdf(doc, submission.originalImageUrl, 'Upper Teeth', imageX, y, {
        width: PDF_CONFIG.IMAGE_WIDTH,
        height: PDF_CONFIG.IMAGE_HEIGHT
      });
      doc.rect(imageX + 25, y - 15, 100, 25).fill(PDF_CONFIG.COLORS.LABEL_BG);
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
      doc.text('Upper Teeth', imageX + 45, y - 7);
    }

    if (submission.annotatedImageUrl) {
      imageX += PDF_CONFIG.IMAGE_WIDTH + 30;
      y = await addImageToPdf(doc, submission.annotatedImageUrl, 'Front Teeth', imageX, y - PDF_CONFIG.IMAGE_HEIGHT - 15, {
        width: PDF_CONFIG.IMAGE_WIDTH,
        height: PDF_CONFIG.IMAGE_HEIGHT
      });
      doc.rect(imageX + 25, y - 15, 100, 25).fill(PDF_CONFIG.COLORS.LABEL_BG);
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
      doc.text('Front Teeth', imageX + 45, y - 7);
    }

    imageX += PDF_CONFIG.IMAGE_WIDTH + 30;
    if (imageX + PDF_CONFIG.IMAGE_WIDTH <= 545) {
      doc.rect(imageX, y - PDF_CONFIG.IMAGE_HEIGHT - 15, PDF_CONFIG.IMAGE_WIDTH, PDF_CONFIG.IMAGE_HEIGHT).stroke(PDF_CONFIG.COLORS.BORDER);
      doc.fillColor(PDF_CONFIG.COLORS.TEXT_SECONDARY).fontSize(10);
      doc.text('Lower Teeth', imageX + 50, y - 75);
      doc.rect(imageX + 25, y - 15, 100, 25).fill(PDF_CONFIG.COLORS.LABEL_BG);
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
      doc.text('Lower Teeth', imageX + 45, y - 7);
    }

    // Legend section
    y = checkPageBreak(doc, y + 50);
    doc.fillColor('black').fontSize(10).font('Helvetica');
    LEGEND_ITEMS.forEach((item, index) => {
      const x = 50 + (index % 3) * 170;
      const itemY = y + Math.floor(index / 3) * 20;
      doc.rect(x, itemY, 12, 12).fill(item.color);
      doc.fillColor('black').text(item.text, x + 20, itemY + 2);
    });

    // Treatment Recommendations
    y = checkPageBreak(doc, y + 80);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(PDF_CONFIG.COLORS.TEXT_PRIMARY);
    doc.text('TREATMENT RECOMMENDATIONS:', 50, y);
    y += 30;

    TREATMENTS.forEach((item) => {
      y = checkPageBreak(doc, y);
      doc.rect(50, y, 12, 12).fill(item.color);
      doc.fillColor('black').fontSize(11).font('Helvetica-Bold');
      doc.text(item.condition, 70, y + 1);
      doc.fontSize(11).font('Helvetica');
      doc.text(`: ${item.treatment}`, 70 + doc.widthOfString(item.condition), y + 1);
      y += 20;
    });

    // Patient notes
    if (submission.note) {
      y = checkPageBreak(doc, y + 20);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(PDF_CONFIG.COLORS.TEXT_PRIMARY);
      doc.text('PATIENT NOTES:', 50, y);
      doc.fontSize(11).font('Helvetica').fillColor('black');
      y = checkPageBreak(doc, y + 20);
      doc.text(submission.note, 50, y, { width: 500 });
      y += 40;
    }

    // Annotation details
    if (submission.annotationData?.shapes?.length > 0) {
      y = checkPageBreak(doc, y + 20);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(PDF_CONFIG.COLORS.TEXT_PRIMARY);
      doc.text('DOCTOR\'S ANNOTATIONS:', 50, y);
      doc.fontSize(10).font('Helvetica').fillColor('black');
      submission.annotationData.shapes.forEach((shape, index) => {
        y = checkPageBreak(doc, y + 15);
        const annotationText = `${index + 1}. ${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} marking highlighted in ${shape.color}`;
        doc.text(annotationText, 70, y);
      });
      y = checkPageBreak(doc, y + 20);
      doc.text(`Total annotations: ${submission.annotationData.shapes.length}`, 70, y);
      doc.text(`Examined on: ${formatDate(submission.annotationData.timestamp || submission.updatedAt)}`, 70, y + 15);
    }

    // Footer
    y = checkPageBreak(doc, y + 20);
    doc.rect(250, PDF_CONFIG.PAGE_HEIGHT - 50, 95, 30).fill(PDF_CONFIG.COLORS.FOOTER_BG);
    doc.fillColor('white').fontSize(12).font('Helvetica');
    doc.text('Page   1   /   1', 268, PDF_CONFIG.PAGE_HEIGHT - 40);
    doc.fillColor('gray').fontSize(8);
    doc.text(`Report ID: ${submission._id}`, 50, PDF_CONFIG.PAGE_HEIGHT - 30);
    doc.text('Generated by OralVis Healthcare System', 50, PDF_CONFIG.PAGE_HEIGHT - 20);

    doc.end();
  } catch (error) {
    console.error(`[PDF Generation] Error for submission ${req.params.id}:`, error);
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
    console.error('[Submissions] Error fetching submissions:', error);
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
    if (req.user.role !== 'admin' && submission.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ submission });
  } catch (error) {
    console.error(`[Submissions] Error fetching submission ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save annotation (Admin only)
router.put('/:id/annotate', auth, adminOnly, async (req, res) => {
  try {
    const { annotationData, annotatedImageDataUrl } = req.body;

    console.log('[Annotation] Received annotation request:', {
      hasAnnotationData: !!annotationData,
      hasImageData: !!annotatedImageDataUrl,
      shapesCount: annotationData?.shapes?.length || 0
    });

    // Validate annotation data
    if (!annotationData || !Array.isArray(annotationData.shapes) || !annotationData.shapes.every(shape => shape.type && shape.color)) {
      return res.status(400).json({ message: 'Invalid annotation data' });
    }

    let annotatedImageUrl = null;
    let annotatedImagePublicId = null;

    // Upload annotated image to Cloudinary
    if (annotatedImageDataUrl) {
      try {
        const base64Data = annotatedImageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `annotated-${req.params.id}-${Date.now()}`;
        const uploadResult = await uploadBufferToCloudinary(buffer, 'annotated', filename);
        annotatedImageUrl = uploadResult.secure_url;
        annotatedImagePublicId = uploadResult.public_id;
        console.log(`[Annotation] Annotated image uploaded to Cloudinary: ${uploadResult.secure_url}`);
      } catch (error) {
        console.error('[Annotation] Error uploading annotated image:', error);
        return res.status(500).json({ message: 'Failed to upload annotated image', error: error.message });
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

    res.json({ message: 'Annotation saved successfully', submission });
  } catch (error) {
    console.error(`[Annotation] Error for submission ${req.params.id}:`, error);
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
    if (req.user.role !== 'admin' && submission.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!submission.reportPdfUrl) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    res.redirect(submission.reportPdfUrl);
  } catch (error) {
    console.error(`[PDF Download] Error for submission ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;