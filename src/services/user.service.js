const { User, Chat, Notification } = require('../models');
const { Op } = require('sequelize');

class UserService {
  static async getUserProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) throw new Error('User not found');
    return user;
  }

  static async updateUserProfile(userId, updates) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    // Filter out sensitive fields that shouldn't be updated directly
    const { password, email, ...safeUpdates } = updates;

    await user.update(safeUpdates);
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  static async updateUserPassword(userId, oldPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid current password');
    }

    await user.update({ password: newPassword });
    return true;
  }

  static async getUserStats(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    // Get chat statistics
    const chatStats = await Chat.findAll({
      where: { userId },
      attributes: [
        'messageType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['messageType']
    });

    // Get notification statistics
    const notificationStats = await Notification.findAll({
      where: { userId },
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type']
    });

    // Get recent activity
    const recentActivity = await Chat.findAll({
      where: { userId },
      limit: 5,
      order: [['createdAt', 'DESC']],
      attributes: ['messageType', 'message', 'createdAt']
    });

    return {
      chatStats,
      notificationStats,
      recentActivity
    };
  }

  static async deleteUserAccount(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    // This will cascade delete all related records due to our model associations
    await user.destroy();
    return true;
  }

  static async getUserHealthSummary(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    // Calculate BMI
    const heightInMeters = user.height / 100;
    const bmi = user.weight / (heightInMeters * heightInMeters);

    // Get recent health-related chats
    const recentHealthChats = await Chat.findAll({
      where: {
        userId,
        messageType: {
          [Op.in]: ['symptom_check', 'medication_advice']
        }
      },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    return {
      bmi: parseFloat(bmi.toFixed(2)),
      bmiCategory: this.getBMICategory(bmi),
      basicInfo: {
        age: user.age,
        gender: user.gender,
        weight: user.weight,
        height: user.height
      },
      medicalConditions: user.medical_conditions,
      allergies: user.allergies,
      recentHealthChats
    };
  }

  static getBMICategory(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }
}

module.exports = UserService;