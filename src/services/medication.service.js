const { Medication, Prescription, User, Notification } = require('../models');
const { Op } = require('sequelize');
const gptService = require('./gpt.service');

class MedicationService {
  /**
   * Add medication to user's record
   */
  async addMedication(userId, medicationData) {
    try {
      const medication = await Medication.create({
        userId,
        ...medicationData
      });

      // Create reminders if enabled
      if (medicationData.reminderEnabled && medicationData.reminderTimes) {
        await this.createMedicationReminders(medication);
      }

      return medication;
    } catch (error) {
      console.error('Error adding medication:', error);
      throw new Error('Failed to add medication');
    }
  }

  /**
   * Get all medications for user
   */
  async getUserMedications(userId, activeOnly = false) {
    try {
      const where = { userId };

      if (activeOnly) {
        where.isActive = true;
        where.endDate = {
          [Op.or]: [
            { [Op.gte]: new Date() },
            { [Op.is]: null }
          ]
        };
      }

      const medications = await Medication.findAll({
        where,
        include: [{
          model: Prescription,
          attributes: ['diagnosis', 'doctorName', 'prescriptionDate']
        }],
        order: [['startDate', 'DESC']]
      });

      return medications;
    } catch (error) {
      console.error('Error getting medications:', error);
      throw new Error('Failed to retrieve medications');
    }
  }

  /**
   * Get smart medication suggestions based on symptoms and history
   */
  async suggestMedications(userId, symptoms, condition) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's medication history for this condition
      const pastMedications = await Medication.findAll({
        where: {
          userId,
          condition: {
            [Op.like]: `%${condition}%`
          }
        },
        order: [['startDate', 'DESC']],
        limit: 10
      });

      // Analyze which medications worked before
      const effectiveMedications = pastMedications.filter(med =>
        med.wasEffective === true
      );

      // Use AI to suggest medications
      const messages = [
        {
          role: 'system',
          content: `You are a medical advisor AI. Based on the user's history and symptoms, suggest medications.
          User profile: Age: ${user.age}, Gender: ${user.gender}, Allergies: ${user.allergies || 'None'}, Medical conditions: ${user.medical_conditions || 'None'}

          IMPORTANT:
          1. Only suggest over-the-counter medications or remind them of what worked before
          2. Always recommend consulting a doctor for prescription medications
          3. Check for drug interactions with their allergies and conditions

          Return JSON:
          {
            "suggestions": [
              {
                "medicationName": "name",
                "reason": "why suggesting this",
                "isPreviouslyUsed": true/false,
                "wasEffectiveBefore": true/false/null,
                "dosageGuidance": "suggested dosage",
                "precautions": "any warnings"
              }
            ],
            "doctorConsultationRecommended": true/false,
            "urgency": "low/medium/high"
          }`
        },
        {
          role: 'user',
          content: `Symptoms: ${symptoms}
          Condition: ${condition}
          Past effective medications: ${effectiveMedications.map(m => m.medicationName).join(', ') || 'None'}
          All past medications: ${pastMedications.map(m => `${m.medicationName} (effective: ${m.wasEffective})`).join(', ')}`
        }
      ];

      const response = await gptService.generateResponse(messages);
      const suggestions = JSON.parse(response);

      // Enhance with user's actual history
      suggestions.suggestions = suggestions.suggestions.map(suggestion => {
        const pastMed = pastMedications.find(m =>
          m.medicationName.toLowerCase() === suggestion.medicationName.toLowerCase()
        );

        if (pastMed) {
          return {
            ...suggestion,
            isPreviouslyUsed: true,
            wasEffectiveBefore: pastMed.wasEffective,
            lastUsedDate: pastMed.startDate,
            previousDosage: pastMed.dosage,
            previousInstructions: pastMed.instructions
          };
        }

        return suggestion;
      });

      return suggestions;
    } catch (error) {
      console.error('Error suggesting medications:', error);
      throw new Error('Failed to generate medication suggestions');
    }
  }

  /**
   * Analyze medication patterns for a user
   */
  async analyzeMedicationPatterns(userId) {
    try {
      const medications = await Medication.findAll({
        where: { userId },
        include: [{
          model: Prescription,
          attributes: ['diagnosis', 'symptoms']
        }]
      });

      if (medications.length === 0) {
        return {
          message: 'No medication history found'
        };
      }

      // Use AI to analyze patterns
      const messages = [
        {
          role: 'system',
          content: 'Analyze medication patterns and provide insights. Identify recurring conditions, frequently used medications, and any concerning patterns.'
        },
        {
          role: 'user',
          content: JSON.stringify(medications.map(m => ({
            name: m.medicationName,
            condition: m.condition,
            date: m.startDate,
            effective: m.wasEffective,
            sideEffects: m.sideEffects
          })))
        }
      ];

      const analysis = await gptService.generateResponse(messages);

      // Get statistics
      const stats = {
        totalMedications: medications.length,
        activeMedications: medications.filter(m => m.isActive).length,
        effectiveRate: medications.filter(m => m.wasEffective === true).length / medications.filter(m => m.wasEffective !== null).length * 100 || 0,
        commonConditions: this.getCommonConditions(medications),
        frequentMedications: this.getFrequentMedications(medications),
        recentSideEffects: medications.filter(m => m.sideEffects).slice(0, 5).map(m => ({
          medication: m.medicationName,
          sideEffects: m.sideEffects
        }))
      };

      return {
        analysis,
        stats
      };
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      throw new Error('Failed to analyze medication patterns');
    }
  }

  /**
   * Update medication (e.g., mark as completed, add effectiveness feedback)
   */
  async updateMedication(medicationId, userId, updates) {
    try {
      const medication = await Medication.findOne({
        where: { id: medicationId, userId }
      });

      if (!medication) {
        throw new Error('Medication not found');
      }

      await medication.update(updates);

      return medication;
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  }

  /**
   * Create medication reminders as notifications
   */
  async createMedicationReminders(medication) {
    try {
      if (!medication.reminderTimes || medication.reminderTimes.length === 0) {
        return [];
      }

      const reminders = [];

      // Create daily reminders for each time
      for (const time of medication.reminderTimes) {
        const [hours, minutes] = time.split(':');
        const scheduledTime = new Date();
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduledTime < new Date()) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const reminder = await Notification.create({
          userId: medication.userId,
          type: 'medication_reminder',
          title: `Medication Reminder: ${medication.medicationName}`,
          message: `Time to take ${medication.medicationName} - ${medication.dosage}. ${medication.instructions || ''}`,
          scheduledFor: scheduledTime,
          isRead: false
        });

        reminders.push(reminder);
      }

      return reminders;
    } catch (error) {
      console.error('Error creating reminders:', error);
      throw new Error('Failed to create medication reminders');
    }
  }

  /**
   * Check for potential drug interactions
   */
  async checkDrugInteractions(userId, newMedication) {
    try {
      const user = await User.findByPk(userId);
      const activeMedications = await this.getUserMedications(userId, true);

      const messages = [
        {
          role: 'system',
          content: `You are a pharmaceutical AI. Check for potential drug interactions.
          User allergies: ${user.allergies || 'None'}
          User medical conditions: ${user.medical_conditions || 'None'}

          Return JSON:
          {
            "hasInteractions": true/false,
            "interactions": ["description of interactions"],
            "allergyWarnings": ["allergy-related warnings"],
            "recommendations": ["safety recommendations"],
            "severity": "low/medium/high"
          }`
        },
        {
          role: 'user',
          content: `New medication: ${newMedication}
          Current medications: ${activeMedications.map(m => m.medicationName).join(', ')}`
        }
      ];

      const response = await gptService.generateResponse(messages);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error checking interactions:', error);
      return {
        hasInteractions: false,
        recommendations: ['Consult with a doctor or pharmacist about potential interactions']
      };
    }
  }

  /**
   * Helper: Get common conditions
   */
  getCommonConditions(medications) {
    const conditionCount = {};
    medications.forEach(m => {
      if (m.condition) {
        conditionCount[m.condition] = (conditionCount[m.condition] || 0) + 1;
      }
    });

    return Object.entries(conditionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([condition, count]) => ({ condition, count }));
  }

  /**
   * Helper: Get frequent medications
   */
  getFrequentMedications(medications) {
    const medCount = {};
    medications.forEach(m => {
      medCount[m.medicationName] = (medCount[m.medicationName] || 0) + 1;
    });

    return Object.entries(medCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([medication, count]) => ({ medication, count }));
  }

  /**
   * Delete medication
   */
  async deleteMedication(medicationId, userId) {
    try {
      const medication = await Medication.findOne({
        where: { id: medicationId, userId }
      });

      if (!medication) {
        throw new Error('Medication not found');
      }

      await medication.destroy();
      return true;
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }
}

module.exports = new MedicationService();
