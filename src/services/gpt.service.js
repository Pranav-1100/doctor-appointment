const OpenAI = require('openai');
const config = require('../config/config');

class GPTService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY
    });
  }

  // Base method for GPT interactions
  async generateResponse(messages) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.7,
        max_tokens: 500
      });
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('GPT API Error:', error);
      throw new Error('Failed to generate response');
    }
  }

  // Health-specific response generation
  async generateHealthResponse(userInput, userContext, category) {
    const systemPrompts = {
      symptom_check: `As a medical advisor, analyze these symptoms for a ${userContext.age}-year-old ${userContext.gender} 
        with medical conditions: ${userContext.medical_conditions || 'none'}. 
        Provide a preliminary assessment and recommend next steps.`,
      
      medication_advice: `Consider this medication query for a person with:
        Age: ${userContext.age}
        Allergies: ${userContext.allergies || 'none'}
        Medical Conditions: ${userContext.medical_conditions || 'none'}
        Provide medication-related guidance while emphasizing the importance of consulting healthcare providers.`,
      
      diet_recommendation: `Provide dietary advice considering:
        Weight: ${userContext.weight}kg
        Height: ${userContext.height}cm
        Medical Conditions: ${userContext.medical_conditions || 'none'}
        Allergies: ${userContext.allergies || 'none'}`,
      
      general: `Provide health guidance while considering the user's profile:
        Age: ${userContext.age}
        Gender: ${userContext.gender}
        Medical History: ${userContext.medical_conditions || 'none'}`
    };

    const messages = [
      { 
        role: "system", 
        content: systemPrompts[category] || systemPrompts.general 
      },
      { 
        role: "user", 
        content: userInput 
      }
    ];

    return this.generateResponse(messages);
  }

  // Profile update detection
  async detectProfileUpdates(message, currentProfile) {
    const messages = [
      {
        role: "system",
        content: `You are a profile update detector. Current profile:
          ${JSON.stringify(currentProfile)}
          If the message contains a request to update profile information,
          return a JSON object with 'shouldUpdate: true' and an 'updates' object
          containing only the fields to update. Otherwise, return {'shouldUpdate': false}`
      },
      {
        role: "user",
        content: message
      }
    ];

    const response = await this.generateResponse(messages);
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing GPT response:', error);
      return { shouldUpdate: false };
    }
  }

  // Symptom extraction from chat
  async extractSymptoms(message) {
    const messages = [
      {
        role: "system",
        content: "Extract mentioned symptoms from the health-related message. Return as JSON array."
      },
      {
        role: "user",
        content: message
      }
    ];

    const response = await this.generateResponse(messages);
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing symptoms:', error);
      return [];
    }
  }

  // Health analysis for trends
  async analyzeHealthTrends(chatHistory, userProfile) {
    const messages = [
      {
        role: "system",
        content: `Analyze health patterns from chat history for a user with:
          Age: ${userProfile.age}
          Gender: ${userProfile.gender}
          Medical Conditions: ${userProfile.medical_conditions || 'none'}
          Provide insights on patterns, concerns, and improvements.`
      },
      {
        role: "user",
        content: JSON.stringify(chatHistory)
      }
    ];

    return this.generateResponse(messages);
  }
}

// Export as singleton
module.exports = new GPTService();