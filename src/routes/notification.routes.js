const router = require('express').Router();
const NotificationService = require('../services/notification.service');
const { authenticateToken } = require('../middleware/auth.middleware');

// Get notifications with pagination and filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit, type, isRead } = req.query;
    const notifications = await NotificationService.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      isRead: isRead === 'true'
    });
    res.json(notifications);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await NotificationService.deleteNotification(req.params.id, req.user.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await NotificationService.getNotificationStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Schedule health reminders
router.post('/schedule-reminders', authenticateToken, async (req, res) => {
  try {
    const reminders = await NotificationService.scheduleHealthReminders(req.user.id);
    res.json(reminders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;