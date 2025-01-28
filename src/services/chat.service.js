const { Chat, User } = require('../models');
const gptService = require('./gpt.service');

class ChatService {
  // Chat categories
  static CHAT_CATEGORIES = {
    GENERAL: 'general',
    SYMPTOM_CHECK: 'symptom_check',
    MEDICATION_ADVICE: 'medication_advice',
    DIET_RECOMMENDATION: 'diet_recommendation',
    DOCTOR_RECOMMENDATION: 'doctor_recommendation',
    MYTH_BUSTING: 'myth_busting'
  };

  static async getUserContext(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    return {
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      medical_conditions: user.medical_conditions,
      allergies: user.allergies
    };
  }

  static async processChatMessage(userId, message, category) {
    try {
      // Get user context for personalized responses
      const userContext = await this.getUserContext(userId);
      
      // Check if message contains profile update request using GPT service
      const profileUpdate = await gptService.detectProfileUpdates(message, userContext);
      if (profileUpdate.shouldUpdate) {
        await User.update(profileUpdate.updates, { where: { id: userId } });
        return this.createChat(
          userId, 
          message, 
          'Profile updated successfully. Updated information: ' + 
          Object.entries(profileUpdate.updates)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', '), 
          category
        );
      }

      // Get category-specific response using GPT service
      const response = await gptService.generateHealthResponse(message, userContext, category);
      return this.createChat(userId, message, response, category);
    } catch (error) {
      console.error('Error processing chat message:', error);
      throw new Error('Failed to process chat message');
    }
  }

  static async createChat(userId, message, response, category) {
    try {
      return await Chat.create({
        userId,
        message,
        response,
        messageType: category || this.CHAT_CATEGORIES.GENERAL
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      throw new Error('Failed to save chat message');
    }
  }

  static async getChatHistory(userId, options = {}) {
    try {
      const { category, limit = 10, offset = 0 } = options;
      
      const query = {
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        include: [
          {
            model: User,
            attributes: ['name', 'age', 'gender']
          }
        ]
      };

      if (category) {
        query.where.messageType = category;
      }

      const { rows, count } = await Chat.findAndCountAll(query);

      // Format the response
      return {
        chats: rows,
        total: count,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(count / limit),
        hasMore: offset + rows.length < count
      };
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw new Error('Failed to fetch chat history');
    }
  }

  static async getChatThread(threadId, userId) {
    try {
      const chat = await Chat.findOne({
        where: { id: threadId, userId },
        include: [
          {
            model: User,
            attributes: ['name', 'age', 'gender']
          }
        ]
      });

      if (!chat) throw new Error('Chat not found');
      return chat;
    } catch (error) {
      console.error('Error fetching chat thread:', error);
      throw new Error('Failed to fetch chat thread');
    }
  }

  static async deleteChatHistory(userId, options = {}) {
    try {
      const { category, before } = options;
      const where = { userId };

      if (category) {
        where.messageType = category;
      }
      if (before) {
        where.createdAt = {
          [Op.lt]: before
        };
      }

      await Chat.destroy({ where });
      return true;
    } catch (error) {
      console.error('Error deleting chat history:', error);
      throw new Error('Failed to delete chat history');
    }
  }

  static async searchChats(userId, searchTerm, options = {}) {
    try {
      const { category, limit = 10, offset = 0 } = options;
      
      const where = {
        userId,
        [Op.or]: [
          { message: { [Op.like]: `%${searchTerm}%` } },
          { response: { [Op.like]: `%${searchTerm}%` } }
        ]
      };

      if (category) {
        where.messageType = category;
      }

      return await Chat.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        include: [
          {
            model: User,
            attributes: ['name', 'age', 'gender']
          }
        ]
      });
    } catch (error) {
      console.error('Error searching chats:', error);
      throw new Error('Failed to search chats');
    }
  }

  static isCategoryValid(category) {
    return Object.values(this.CHAT_CATEGORIES).includes(category);
  }
}

module.exports = ChatService;