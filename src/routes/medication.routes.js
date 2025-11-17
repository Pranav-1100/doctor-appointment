const router = require('express').Router();
const medicationService = require('../services/medication.service');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateMedication = [
  body('medicationName').trim().notEmpty().withMessage('Medication name is required'),
  body('dosage').optional().trim(),
  body('frequency').optional().trim(),
  body('duration').optional().trim(),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Add medication
router.post('/', authenticateToken, validateMedication, async (req, res) => {
  try {
    const medication = await medicationService.addMedication(req.user.id, req.body);
    res.status(201).json({
      message: 'Medication added successfully',
      medication
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all medications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const medications = await medicationService.getUserMedications(
      req.user.id,
      activeOnly === 'true'
    );
    res.json({ medications, total: medications.length });
  } catch (error) {
    console.error('Error getting medications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get medication suggestions
router.post('/suggest', authenticateToken, async (req, res) => {
  try {
    const { symptoms, condition } = req.body;

    if (!symptoms || !condition) {
      return res.status(400).json({ error: 'Symptoms and condition are required' });
    }

    const suggestions = await medicationService.suggestMedications(
      req.user.id,
      symptoms,
      condition
    );

    res.json(suggestions);
  } catch (error) {
    console.error('Error suggesting medications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze medication patterns
router.get('/patterns', authenticateToken, async (req, res) => {
  try {
    const analysis = await medicationService.analyzeMedicationPatterns(req.user.id);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check drug interactions
router.post('/check-interactions', authenticateToken, async (req, res) => {
  try {
    const { medication } = req.body;

    if (!medication) {
      return res.status(400).json({ error: 'Medication name is required' });
    }

    const interactions = await medicationService.checkDrugInteractions(
      req.user.id,
      medication
    );

    res.json(interactions);
  } catch (error) {
    console.error('Error checking interactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update medication
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const medication = await medicationService.updateMedication(
      req.params.id,
      req.user.id,
      req.body
    );

    res.json({
      message: 'Medication updated successfully',
      medication
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete medication
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await medicationService.deleteMedication(req.params.id, req.user.id);
    res.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
