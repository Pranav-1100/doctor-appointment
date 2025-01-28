const { Notification, User } = require('../models');
const { Op } = require('sequelize');

class NotificationService {
  static NOTIFICATION_TYPES = {
    MEDICATION_REMINDER: 'medication_reminder',
    EXERCISE_TIP: 'exercise_tip',
    SEASONAL_ADVICE: 'seasonal_advice',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    PROFILE_UPDATE: 'profile_update',
    HEALTH_TIP: 'health_tip'
  };

  static async createNotification(data) {
    const { userId, type, title, message, scheduledFor } = data;
    
    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    return await Notification.create({
      userId,
      type,
      title,
      message,
      scheduledFor: scheduledFor || new Date(),
      isRead: false
    });
  }

  static async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 10, type, isRead } = options;
    const offset = (page - 1) * limit;

    const whereClause = {
      userId,
      scheduledFor: {
        [Op.lte]: new Date()
      }
    };

    if (type) whereClause.type = type;
    if (typeof isRead === 'boolean') whereClause.isRead = isRead;

    return await Notification.findAndCountAll({
      where: whereClause,
      order: [['scheduledFor', 'DESC']],
      limit,
      offset
    });
  }

  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.update({ isRead: true });
    return notification;
  }

  static async markAllAsRead(userId) {
    await Notification.update(
      { isRead: true },
      { 
        where: { 
          userId,
          isRead: false,
          scheduledFor: {
            [Op.lte]: new Date()
          }
        } 
      }
    );
    return true;
  }

  static async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.destroy();
    return true;
  }

  static async scheduleHealthReminders(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    // Schedule different types of health reminders
    const reminders = [
      {
        type: this.NOTIFICATION_TYPES.EXERCISE_TIP,
        title: 'Daily Exercise Reminder',
        message: 'Time for your daily exercise routine!',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      },
      {
        type: this.NOTIFICATION_TYPES.HEALTH_TIP,
        title: 'Health Tip',
        message: 'Remember to stay hydrated throughout the day.',
        scheduledFor: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now
      }
    ];

    const notifications = await Promise.all(
      reminders.map(reminder => 
        this.createNotification({
          userId,
          ...reminder
        })
      )
    );

    return notifications;
  }

  static async getNotificationStats(userId) {
    const unreadCount = await Notification.count({
      where: {
        userId,
        isRead: false,
        scheduledFor: {
          [Op.lte]: new Date()
        }
      }
    });

    const typeStats = await Notification.findAll({
      where: { userId },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type']
    });

    return {
      unreadCount,
      typeStats
    };
  }
}