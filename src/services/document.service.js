const { HealthDocument } = require('../models');
const gptService = require('./gpt.service');
const OpenAI = require('openai');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');

class DocumentService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY
    });
    this.uploadDir = path.join(__dirname, '../../uploads');
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Extract text from document using GPT-4 Vision
   */
  async extractTextFromImage(imagePath) {
    try {
      // Read image as base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text from this medical document. Include doctor names, medications, dosages, dates, diagnoses, and any other text you can see. Return as structured JSON with fields: doctorName, clinicName, date, diagnosis, medications (array with name, dosage, frequency), instructions, and any other relevant information."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      const extractedText = response.choices[0].message.content;

      try {
        return JSON.parse(extractedText);
      } catch {
        return { rawText: extractedText };
      }
    } catch (error) {
      console.error('Error extracting text from image:', error);
      return { error: 'Failed to extract text from document' };
    }
  }

  /**
   * Generate AI summary of document
   */
  async generateSummary(extractedText, documentType) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a medical document summarizer. Summarize this ${documentType} in 2-3 sentences, highlighting the most important information.`
        },
        {
          role: 'user',
          content: JSON.stringify(extractedText)
        }
      ];

      return await gptService.generateResponse(messages);
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Summary not available';
    }
  }

  /**
   * Generate tags for document using AI
   */
  async generateTags(extractedText, documentType) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'Extract relevant medical tags from this document (e.g., conditions, symptoms, medications). Return as JSON array of strings, max 5 tags.'
        },
        {
          role: 'user',
          content: JSON.stringify(extractedText)
        }
      ];

      const response = await gptService.generateResponse(messages);
      try {
        return JSON.parse(response);
      } catch {
        return [documentType];
      }
    } catch (error) {
      console.error('Error generating tags:', error);
      return [documentType];
    }
  }

  /**
   * Upload and process document
   */
  async uploadDocument(userId, file, metadata) {
    try {
      await this.ensureUploadDir();

      const { documentType, title, description, documentDate } = metadata;

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${userId}_${timestamp}_${file.originalname}`;
      const filePath = path.join(this.uploadDir, fileName);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Extract text if it's an image
      let extractedText = null;
      let aiSummary = null;
      let tags = [documentType];

      if (this.isImage(file.mimetype)) {
        extractedText = await this.extractTextFromImage(filePath);
        aiSummary = await this.generateSummary(extractedText, documentType);
        tags = await this.generateTags(extractedText, documentType);
      }

      // Create document record
      const document = await HealthDocument.create({
        userId,
        documentType,
        title: title || file.originalname,
        description,
        fileName: file.originalname,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        extractedText,
        aiSummary,
        tags,
        documentDate: documentDate || new Date()
      });

      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error('Failed to upload document');
    }
  }

  /**
   * Get all documents for user
   */
  async getUserDocuments(userId, filters = {}) {
    try {
      const { documentType, startDate, endDate, tags } = filters;

      const where = { userId };

      if (documentType) {
        where.documentType = documentType;
      }

      if (startDate || endDate) {
        where.uploadDate = {};
        if (startDate) where.uploadDate[Op.gte] = new Date(startDate);
        if (endDate) where.uploadDate[Op.lte] = new Date(endDate);
      }

      const documents = await HealthDocument.findAll({
        where,
        order: [['uploadDate', 'DESC']]
      });

      // Filter by tags if provided
      if (tags && tags.length > 0) {
        return documents.filter(doc =>
          doc.tags.some(tag => tags.includes(tag))
        );
      }

      return documents;
    } catch (error) {
      console.error('Error getting documents:', error);
      throw new Error('Failed to retrieve documents');
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId, userId) {
    try {
      const document = await HealthDocument.findOne({
        where: { id: documentId, userId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      return document;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Get document file
   */
  async getDocumentFile(documentId, userId) {
    try {
      const document = await this.getDocumentById(documentId, userId);
      const fileBuffer = await fs.readFile(document.filePath);

      return {
        buffer: fileBuffer,
        mimeType: document.mimeType,
        fileName: document.fileName
      };
    } catch (error) {
      console.error('Error getting document file:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId, userId) {
    try {
      const document = await this.getDocumentById(documentId, userId);

      // Delete file from disk
      try {
        await fs.unlink(document.filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }

      // Delete from database
      await document.destroy();

      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(userId, searchTerm) {
    try {
      const { Op } = require('sequelize');

      const documents = await HealthDocument.findAll({
        where: {
          userId,
          [Op.or]: [
            { title: { [Op.like]: `%${searchTerm}%` } },
            { description: { [Op.like]: `%${searchTerm}%` } },
            { aiSummary: { [Op.like]: `%${searchTerm}%` } }
          ]
        },
        order: [['uploadDate', 'DESC']]
      });

      return documents;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }

  /**
   * Helper: Check if file is image
   */
  isImage(mimeType) {
    return mimeType.startsWith('image/');
  }

  /**
   * Helper: Get mime type from file path
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

const { Op } = require('sequelize');
module.exports = new DocumentService();
