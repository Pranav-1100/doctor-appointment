const router = require('express').Router();
const UserService = require('../services/user.service');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateUserUpdate } = require('../middleware/validate.middleware');
// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await UserService.getUserProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticateToken, validateUserUpdate, async (req, res) => {
  try {
    const updatedProfile = await UserService.updateUserProfile(req.user.id, req.body);
    res.json(updatedProfile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await UserService.updateUserPassword(req.user.id, oldPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await UserService.getUserStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get health summary
router.get('/health-summary', authenticateToken, async (req, res) => {
  try {
    const summary = await UserService.getUserHealthSummary(req.user.id);
    res.json(summary);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    await UserService.deleteUserAccount(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;