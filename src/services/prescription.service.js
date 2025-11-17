const { Prescription, Medication, HealthDocument, User } = require('../models');
const { Op } = require('sequelize');
const medicationService = require('./medication.service');

class PrescriptionService {
  /**
   * Create new prescription
   */
  async createPrescription(userId, prescriptionData) {
    try {
      const { medications, ...prescriptionInfo } = prescriptionData;

      // Create prescription
      const prescription = await Prescription.create({
        userId,
        ...prescriptionInfo
      });

      // Add medications if provided
      if (medications && medications.length > 0) {
        for (const med of medications) {
          await medicationService.addMedication(userId, {
            ...med,
            prescriptionId: prescription.id
          });
        }
      }

      // Load prescription with medications
      return await this.getPrescriptionById(prescription.id, userId);
    } catch (error) {
      console.error('Error creating prescription:', error);
      throw new Error('Failed to create prescription');
    }
  }

  /**
   * Create prescription from uploaded document
   */
  async createPrescriptionFromDocument(userId, documentId, extractedData) {
    try {
      const document = await HealthDocument.findOne({
        where: { id: documentId, userId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Parse extracted data to create prescription
      const prescriptionData = {
        userId,
        documentId,
        doctorName: extractedData.doctorName || 'Unknown',
        doctorSpecialty: extractedData.specialty || null,
        clinicName: extractedData.clinicName || null,
        prescriptionDate: extractedData.date ? new Date(extractedData.date) : new Date(),
        diagnosis: extractedData.diagnosis || null,
        symptoms: extractedData.symptoms || [],
        notes: extractedData.instructions || null
      };

      const prescription = await Prescription.create(prescriptionData);

      // Add medications from extracted data
      if (extractedData.medications && extractedData.medications.length > 0) {
        for (const med of extractedData.medications) {
          await medicationService.addMedication(userId, {
            prescriptionId: prescription.id,
            medicationName: med.name || med.medicationName,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            startDate: prescriptionData.prescriptionDate,
            condition: prescriptionData.diagnosis
          });
        }
      }

      return await this.getPrescriptionById(prescription.id, userId);
    } catch (error) {
      console.error('Error creating prescription from document:', error);
      throw new Error('Failed to create prescription from document');
    }
  }

  /**
   * Get all prescriptions for user
   */
  async getUserPrescriptions(userId, filters = {}) {
    try {
      const { startDate, endDate, doctorName, diagnosis } = filters;

      const where = { userId };

      if (startDate || endDate) {
        where.prescriptionDate = {};
        if (startDate) where.prescriptionDate[Op.gte] = new Date(startDate);
        if (endDate) where.prescriptionDate[Op.lte] = new Date(endDate);
      }

      if (doctorName) {
        where.doctorName = { [Op.like]: `%${doctorName}%` };
      }

      if (diagnosis) {
        where.diagnosis = { [Op.like]: `%${diagnosis}%` };
      }

      const prescriptions = await Prescription.findAll({
        where,
        include: [
          {
            model: Medication,
            attributes: ['id', 'medicationName', 'dosage', 'frequency', 'isActive']
          },
          {
            model: HealthDocument,
            attributes: ['id', 'title', 'fileName', 'uploadDate']
          }
        ],
        order: [['prescriptionDate', 'DESC']]
      });

      return prescriptions;
    } catch (error) {
      console.error('Error getting prescriptions:', error);
      throw new Error('Failed to retrieve prescriptions');
    }
  }

  /**
   * Get prescription by ID
   */
  async getPrescriptionById(prescriptionId, userId) {
    try {
      const prescription = await Prescription.findOne({
        where: { id: prescriptionId, userId },
        include: [
          {
            model: Medication,
            attributes: ['id', 'medicationName', 'dosage', 'frequency', 'duration', 'instructions', 'isActive', 'wasEffective']
          },
          {
            model: HealthDocument,
            attributes: ['id', 'title', 'fileName', 'filePath', 'uploadDate']
          }
        ]
      });

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      return prescription;
    } catch (error) {
      console.error('Error getting prescription:', error);
      throw error;
    }
  }

  /**
   * Update prescription
   */
  async updatePrescription(prescriptionId, userId, updates) {
    try {
      const prescription = await Prescription.findOne({
        where: { id: prescriptionId, userId }
      });

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      await prescription.update(updates);

      return await this.getPrescriptionById(prescriptionId, userId);
    } catch (error) {
      console.error('Error updating prescription:', error);
      throw error;
    }
  }

  /**
   * Delete prescription
   */
  async deletePrescription(prescriptionId, userId) {
    try {
      const prescription = await Prescription.findOne({
        where: { id: prescriptionId, userId }
      });

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      // Medications will be cascade deleted
      await prescription.destroy();

      return true;
    } catch (error) {
      console.error('Error deleting prescription:', error);
      throw error;
    }
  }

  /**
   * Get prescription statistics
   */
  async getPrescriptionStats(userId) {
    try {
      const prescriptions = await Prescription.findAll({
        where: { userId },
        include: [{ model: Medication }]
      });

      const totalPrescriptions = prescriptions.length;
      const totalMedications = prescriptions.reduce((sum, p) => sum + p.Medications.length, 0);

      // Group by doctor
      const doctorStats = {};
      prescriptions.forEach(p => {
        if (p.doctorName) {
          doctorStats[p.doctorName] = (doctorStats[p.doctorName] || 0) + 1;
        }
      });

      // Group by diagnosis
      const diagnosisStats = {};
      prescriptions.forEach(p => {
        if (p.diagnosis) {
          diagnosisStats[p.diagnosis] = (diagnosisStats[p.diagnosis] || 0) + 1;
        }
      });

      // Upcoming follow-ups
      const upcomingFollowUps = prescriptions.filter(p =>
        p.followUpDate &&
        p.followUpDate > new Date() &&
        !p.isFollowUpCompleted
      );

      return {
        totalPrescriptions,
        totalMedications,
        uniqueDoctors: Object.keys(doctorStats).length,
        topDoctors: Object.entries(doctorStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count })),
        commonDiagnoses: Object.entries(diagnosisStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([diagnosis, count]) => ({ diagnosis, count })),
        upcomingFollowUps: upcomingFollowUps.length,
        followUpDetails: upcomingFollowUps.map(p => ({
          id: p.id,
          doctorName: p.doctorName,
          diagnosis: p.diagnosis,
          followUpDate: p.followUpDate
        }))
      };
    } catch (error) {
      console.error('Error getting prescription stats:', error);
      throw new Error('Failed to get prescription statistics');
    }
  }

  /**
   * Get recent prescriptions (last 3 months)
   */
  async getRecentPrescriptions(userId, months = 3) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      return await this.getUserPrescriptions(userId, { startDate });
    } catch (error) {
      console.error('Error getting recent prescriptions:', error);
      throw error;
    }
  }
}

module.exports = new PrescriptionService();
