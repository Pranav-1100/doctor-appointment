const router = require('express').Router();
const prescriptionService = require('../services/prescription.service');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validatePrescription = [
  body('prescriptionDate').isISO8601().withMessage('Valid prescription date is required'),
  body('doctorName').optional().trim(),
  body('diagnosis').optional().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Create prescription
router.post('/', authenticateToken, validatePrescription, async (req, res) => {
  try {
    const prescription = await prescriptionService.createPrescription(req.user.id, req.body);
    res.status(201).json({
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all prescriptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, doctorName, diagnosis } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (doctorName) filters.doctorName = doctorName;
    if (diagnosis) filters.diagnosis = diagnosis;

    const prescriptions = await prescriptionService.getUserPrescriptions(req.user.id, filters);
    res.json({ prescriptions, total: prescriptions.length });
  } catch (error) {
    console.error('Error getting prescriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent prescriptions
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const { months } = req.query;
    const prescriptions = await prescriptionService.getRecentPrescriptions(
      req.user.id,
      months ? parseInt(months) : 3
    );
    res.json({ prescriptions, total: prescriptions.length });
  } catch (error) {
    console.error('Error getting recent prescriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get prescription statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await prescriptionService.getPrescriptionStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error getting prescription stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get prescription by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prescription = await prescriptionService.getPrescriptionById(req.params.id, req.user.id);
    res.json(prescription);
  } catch (error) {
    console.error('Error getting prescription:', error);
    res.status(404).json({ error: error.message });
  }
});

// Update prescription
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const prescription = await prescriptionService.updatePrescription(
      req.params.id,
      req.user.id,
      req.body
    );

    res.json({
      message: 'Prescription updated successfully',
      prescription
    });
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete prescription
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prescriptionService.deletePrescription(req.params.id, req.user.id);
    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
