const router = require('express').Router();
const multer = require('multer');
const documentService = require('../services/document.service');
const prescriptionService = require('../services/prescription.service');
const { authenticateToken } = require('../middleware/auth.middleware');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

// Upload document
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { documentType, title, description, documentDate } = req.body;

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    const document = await documentService.uploadDocument(req.user.id, req.file, {
      documentType,
      title,
      description,
      documentDate
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all documents for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { documentType, startDate, endDate, tags } = req.query;

    const filters = {};
    if (documentType) filters.documentType = documentType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (tags) filters.tags = tags.split(',');

    const documents = await documentService.getUserDocuments(req.user.id, filters);
    res.json({ documents, total: documents.length });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await documentService.getDocumentById(req.params.id, req.user.id);
    res.json(document);
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(404).json({ error: error.message });
  }
});

// Download document file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { buffer, mimeType, fileName } = await documentService.getDocumentFile(
      req.params.id,
      req.user.id
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(404).json({ error: error.message });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await documentService.deleteDocument(req.params.id, req.user.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search documents
router.get('/search/:term', authenticateToken, async (req, res) => {
  try {
    const documents = await documentService.searchDocuments(req.user.id, req.params.term);
    res.json({ documents, total: documents.length });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create prescription from document
router.post('/:id/create-prescription', authenticateToken, async (req, res) => {
  try {
    const document = await documentService.getDocumentById(req.params.id, req.user.id);

    if (!document.extractedText) {
      return res.status(400).json({ error: 'Document has no extracted text data' });
    }

    const prescription = await prescriptionService.createPrescriptionFromDocument(
      req.user.id,
      req.params.id,
      document.extractedText
    );

    res.status(201).json({
      message: 'Prescription created from document',
      prescription
    });
  } catch (error) {
    console.error('Error creating prescription from document:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
