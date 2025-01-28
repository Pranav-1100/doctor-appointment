const { User, Chat } = require('../models');
const { Op } = require('sequelize');
const OpenAI = require('openai');
const config = require('../config/config');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY
});

class HealthMonitorService {
  static async analyzeHealthTrends(userId) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
  
    const healthChats = await Chat.findAll({
      where: {
        userId,
        messageType: {
          [Op.in]: ['symptom_check', 'medication_advice']
        },
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      order: [['createdAt', 'ASC']]
    });
  
    const analysis = await this.analyzeHealthPatterns(healthChats, user);
  
    return {
      timeframe: '30 days',
      totalInteractions: healthChats.length,
      analysis,
      recentSymptoms: await this.extractRecentSymptoms(healthChats),
      recommendedActions: await this.generateRecommendations(analysis, user)
    };
  }
    

  static async analyzeHealthPatterns(healthChats, user) {
    if (healthChats.length === 0) {
      return "No recent health-related interactions to analyze.";
    }

    const chatHistory = healthChats.map(chat => ({
      date: chat.createdAt,
      message: chat.message,
      type: chat.messageType
    }));

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Analyze health patterns from chat history for a user with the following profile:
              Age: ${user.age}
              Gender: ${user.gender}
              Medical Conditions: ${user.medical_conditions || 'None'}
              Provide insights on patterns, concerns, and improvements.`
          },
          {
            role: "user",
            content: JSON.stringify(chatHistory)
          }
        ]
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error analyzing health patterns:', error);
      return "Unable to analyze health patterns at this time.";
    }
  }

  static async extractRecentSymptoms(healthChats) {
    const symptoms = [];
    const symptomChats = healthChats.filter(chat => 
      chat.messageType === 'symptom_check'
    );

    for (const chat of symptomChats) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "Extract mentioned symptoms from the following health-related message. Return as JSON array."
            },
            {
              role: "user",
              content: chat.message
            }
          ]
        });

        const extractedSymptoms = JSON.parse(completion.choices[0].message.content);
        symptoms.push(...extractedSymptoms);
      } catch (error) {
        console.error('Error extracting symptoms:', error);
      }
    }

    // Return unique symptoms
    return [...new Set(symptoms)];
  }

  static async generateRecommendations(analysis, user) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Based on the health analysis and user profile below, provide specific recommendations.
              Profile:
              Age: ${user.age}
              Gender: ${user.gender}
              Medical Conditions: ${user.medical_conditions || 'None'}
              Allergies: ${user.allergies || 'None'}`
          },
          {
            role: "user",
            content: analysis
          }
        ]
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return ["Unable to generate personalized recommendations at this time."];
    }
  }

  static async createHealthReport(userId) {
    const trends = await this.analyzeHealthTrends(userId);
    const user = await User.findByPk(userId);

    // Calculate health metrics
    const healthMetrics = await this.calculateHealthMetrics(user);

    return {
      userId,
      generatedAt: new Date(),
      healthMetrics,
      trends,
      recommendations: trends.recommendedActions
    };
  }

  static async calculateHealthMetrics(user) {
    const heightInMeters = user.height / 100;
    const bmi = user.weight / (heightInMeters * heightInMeters);

    return {
      bmi: parseFloat(bmi.toFixed(2)),
      bmiCategory: this.getBMICategory(bmi),
      generalHealth: await this.assessGeneralHealth(user),
      riskFactors: await this.identifyRiskFactors(user)
    };
  }

  static getBMICategory(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  static async assessGeneralHealth(user) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Assess general health status based on the following user profile:
              Age: ${user.age}
              Gender: ${user.gender}
              Height: ${user.height}cm
              Weight: ${user.weight}kg
              Medical Conditions: ${user.medical_conditions || 'None'}
              Allergies: ${user.allergies || 'None'}
              
              Provide a brief status and key recommendations.`
          }
        ]
      });

      const assessment = completion.choices[0].message.content;
      return {
        status: 'Generated',
        assessment,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error assessing general health:', error);
      return {
        status: 'Default',
        notes: ['Regular check-ups recommended', 'Maintain healthy lifestyle']
      };
    }
  }

  static async identifyRiskFactors(user) {
    const riskFactors = [];

    // Age-related risks
    if (user.age > 60) {
      riskFactors.push('Age-related health considerations');
    }

    // BMI-related risks
    const heightInMeters = user.height / 100;
    const bmi = user.weight / (heightInMeters * heightInMeters);
    if (bmi > 30) {
      riskFactors.push('BMI indicates increased health risks');
    }

    // Medical condition risks
    if (user.medical_conditions) {
      riskFactors.push('Existing medical conditions require attention');
    }

    // Additional AI-powered risk analysis
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Identify potential health risk factors based on this profile:
              Age: ${user.age}
              Gender: ${user.gender}
              Height: ${user.height}cm
              Weight: ${user.weight}kg
              Medical Conditions: ${user.medical_conditions || 'None'}
              Allergies: ${user.allergies || 'None'}
              
              Return as JSON array of risk factors.`
          }
        ]
      });

      const aiRiskFactors = JSON.parse(completion.choices[0].message.content);
      riskFactors.push(...aiRiskFactors);
    } catch (error) {
      console.error('Error identifying AI risk factors:', error);
    }

    // Return unique risk factors
    return [...new Set(riskFactors)];
  }

  static async getMetricHistory(userId, metric, startDate) {
    // Implementation for tracking metrics over time
    const data = await Chat.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: startDate }
      },
      order: [['createdAt', 'ASC']]
    });

    return data.map(item => ({
      date: item.createdAt,
      value: item[metric]
    }));
  }

  static async analyzeTrend(metrics) {
    // Implement trend analysis logic
    const trend = metrics.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return acc;
      const diff = curr.value - arr[idx - 1].value;
      return {
        ...acc,
        changes: [...acc.changes, diff],
        total_change: acc.total_change + diff
      };
    }, { changes: [], total_change: 0 });

    return {
      direction: trend.total_change > 0 ? 'increasing' : trend.total_change < 0 ? 'decreasing' : 'stable',
      magnitude: Math.abs(trend.total_change),
      volatility: Math.std(trend.changes) || 0
    };
  }
}

module.exports = HealthMonitorService;