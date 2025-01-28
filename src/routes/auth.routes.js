const router = require('express').Router();
const authService = require('../services/auth.service');
const { 
  validateRegistration, 
  validateLogin, 
  validatePasswordChange 
} = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

// Register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Refresh token
router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    const token = await authService.refreshToken(req.user.id);
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const resetToken = await authService.forgotPassword(email);
    res.json({ 
      message: 'Password reset instructions sent to email',
      resetToken // In production, this would be sent via email
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change password (authenticated)
router.post('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;