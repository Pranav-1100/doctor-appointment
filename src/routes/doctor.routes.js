const router = require('express').Router();
const doctorSearchService = require('../services/doctor-search.service');
const { authenticateToken } = require('../middleware/auth.middleware');

// Find doctors based on symptoms
router.post('/search-by-symptoms', authenticateToken, async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({ error: 'Symptoms are required' });
    }

    const results = await doctorSearchService.findDoctorForSymptoms(symptoms, req.user.id);
    res.json(results);
  } catch (error) {
    console.error('Error in doctor search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search doctors by specialty and location
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { specialty, location, radius } = req.body;

    if (!specialty) {
      return res.status(400).json({ error: 'Specialty is required' });
    }

    const doctors = await doctorSearchService.searchDoctors(
      specialty,
      location || req.user.location || 'Mumbai',
      radius || 5000
    );

    res.json({
      specialty,
      location: location || req.user.location || 'Mumbai',
      doctors,
      totalResults: doctors.length
    });
  } catch (error) {
    console.error('Error searching doctors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get directions to doctor
router.post('/directions', authenticateToken, async (req, res) => {
  try {
    const { userLocation, doctorLocation } = req.body;

    if (!userLocation || !doctorLocation) {
      return res.status(400).json({ error: 'Both user location and doctor location are required' });
    }

    const directions = await doctorSearchService.getDirections(userLocation, doctorLocation);
    res.json({ directions });
  } catch (error) {
    console.error('Error getting directions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check Practo availability
router.post('/check-practo', authenticateToken, async (req, res) => {
  try {
    const { doctorName, city, specialty } = req.body;

    if (!doctorName || !city) {
      return res.status(400).json({ error: 'Doctor name and city are required' });
    }

    const availability = await doctorSearchService.checkPractoAvailability(
      doctorName,
      city,
      specialty
    );

    res.json(availability);
  } catch (error) {
    console.error('Error checking Practo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
