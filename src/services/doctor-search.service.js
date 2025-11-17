const { Client } = require('@googlemaps/google-maps-services-js');
const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/config');
const gptService = require('./gpt.service');

class DoctorSearchService {
  constructor() {
    this.mapsClient = new Client({});
    this.googleApiKey = config.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Determine medical specialty based on symptoms using AI
   */
  async determineSpecialty(symptoms, userProfile) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a medical triage AI. Based on the symptoms provided, determine which medical specialist the patient should consult.
          Consider the user's profile: Age: ${userProfile.age}, Gender: ${userProfile.gender}, Medical conditions: ${userProfile.medical_conditions || 'None'}

          Return a JSON object with:
          {
            "specialty": "the medical specialty (e.g., Cardiologist, Dermatologist, etc.)",
            "reason": "brief explanation why this specialty",
            "urgency": "low|medium|high",
            "searchKeywords": ["keyword1", "keyword2"] // keywords to search for doctors
          }`
        },
        {
          role: 'user',
          content: `Symptoms: ${symptoms}`
        }
      ];

      const response = await gptService.generateResponse(messages);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error determining specialty:', error);
      return {
        specialty: 'General Physician',
        reason: 'Unable to determine specific specialty',
        urgency: 'medium',
        searchKeywords: ['General Physician', 'Family Doctor']
      };
    }
  }

  /**
   * Get user's location coordinates from city name
   */
  async getCoordinatesFromCity(cityName) {
    if (!this.googleApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await this.mapsClient.geocode({
        params: {
          address: `${cityName}, India`,
          key: this.googleApiKey
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: response.data.results[0].formatted_address
        };
      }

      throw new Error('Location not found');
    } catch (error) {
      console.error('Error geocoding location:', error);
      throw new Error('Unable to find location coordinates');
    }
  }

  /**
   * Search for nearby doctors using Google Places API
   */
  async searchDoctors(specialty, location, radius = 5000) {
    if (!this.googleApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      // Get coordinates if location is a city name
      let coordinates = location;
      if (typeof location === 'string') {
        const coords = await this.getCoordinatesFromCity(location);
        coordinates = { lat: coords.lat, lng: coords.lng };
      }

      // Search for doctors/clinics
      const response = await this.mapsClient.placesNearby({
        params: {
          location: coordinates,
          radius: radius,
          keyword: `${specialty} doctor clinic hospital`,
          type: 'doctor',
          key: this.googleApiKey
        }
      });

      if (!response.data.results || response.data.results.length === 0) {
        return [];
      }

      // Get detailed information for each place
      const doctors = await Promise.all(
        response.data.results.slice(0, 10).map(async (place) => {
          try {
            const details = await this.getPlaceDetails(place.place_id);
            return {
              placeId: place.place_id,
              name: place.name,
              address: place.vicinity,
              rating: place.rating || 'N/A',
              totalRatings: place.user_ratings_total || 0,
              location: place.geometry.location,
              isOpen: place.opening_hours?.open_now,
              types: place.types,
              ...details
            };
          } catch (error) {
            return {
              placeId: place.place_id,
              name: place.name,
              address: place.vicinity,
              rating: place.rating || 'N/A',
              totalRatings: place.user_ratings_total || 0,
              location: place.geometry.location,
              isOpen: place.opening_hours?.open_now,
              types: place.types
            };
          }
        })
      );

      return doctors.filter(d => d !== null);
    } catch (error) {
      console.error('Error searching doctors:', error);
      throw new Error('Unable to search for doctors');
    }
  }

  /**
   * Get detailed information about a place
   */
  async getPlaceDetails(placeId) {
    if (!this.googleApiKey) {
      return {};
    }

    try {
      const response = await this.mapsClient.placeDetails({
        params: {
          place_id: placeId,
          fields: ['formatted_phone_number', 'website', 'opening_hours', 'reviews'],
          key: this.googleApiKey
        }
      });

      const result = response.data.result;
      return {
        phone: result.formatted_phone_number,
        website: result.website,
        openingHours: result.opening_hours?.weekday_text,
        reviews: result.reviews?.slice(0, 3).map(r => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
          time: r.time
        }))
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      return {};
    }
  }

  /**
   * Check doctor availability on Practo (AI agent)
   */
  async checkPractoAvailability(doctorName, city, specialty) {
    try {
      // Search Practo URL
      const searchUrl = `https://www.practo.com/search/doctors?results_type=doctor&q=%5B%7B%22word%22%3A%22${encodeURIComponent(doctorName)}%22%7D%5D&city=${encodeURIComponent(city)}`;

      // Use AI to provide Practo search link and guidance
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant. Generate a friendly message guiding the user to check doctor availability on Practo.'
        },
        {
          role: 'user',
          content: `Doctor: ${doctorName}, Specialty: ${specialty}, City: ${city}`
        }
      ];

      const aiGuidance = await gptService.generateResponse(messages);

      return {
        available: 'unknown',
        message: aiGuidance,
        practoSearchUrl: searchUrl,
        suggestion: `Visit Practo to check real-time availability and book appointments with ${doctorName}`
      };
    } catch (error) {
      console.error('Error checking Practo:', error);
      return {
        available: 'unknown',
        practoSearchUrl: `https://www.practo.com/${city.toLowerCase()}`,
        suggestion: 'Visit Practo to search for doctors and book appointments'
      };
    }
  }

  /**
   * Main method: Search for doctors based on symptoms
   */
  async findDoctorForSymptoms(symptoms, userId) {
    try {
      const { User } = require('../models');
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Step 1: Determine specialty using AI
      const specialtyInfo = await this.determineSpecialty(symptoms, {
        age: user.age,
        gender: user.gender,
        medical_conditions: user.medical_conditions
      });

      // Step 2: Get user's location (use location from profile)
      const location = user.location || 'Mumbai'; // Default to Mumbai if no location

      // Step 3: Search for doctors using Google Places
      let doctors = [];
      try {
        doctors = await this.searchDoctors(specialtyInfo.specialty, location);
      } catch (error) {
        console.error('Google Maps search failed:', error);
        // Provide fallback response
        doctors = [];
      }

      // Step 4: Enhance results with Practo availability info
      const enhancedDoctors = await Promise.all(
        doctors.slice(0, 5).map(async (doctor) => {
          const practoInfo = await this.checkPractoAvailability(
            doctor.name,
            location,
            specialtyInfo.specialty
          );
          return {
            ...doctor,
            practoInfo
          };
        })
      );

      return {
        specialty: specialtyInfo.specialty,
        reason: specialtyInfo.reason,
        urgency: specialtyInfo.urgency,
        location: location,
        doctors: enhancedDoctors.length > 0 ? enhancedDoctors : doctors,
        totalResults: doctors.length,
        searchRadius: '5 km',
        additionalAdvice: specialtyInfo.urgency === 'high'
          ? 'This appears urgent. Consider visiting emergency services if symptoms worsen.'
          : 'Schedule an appointment with one of the doctors listed above.',
        practoSearchUrl: `https://www.practo.com/${location.toLowerCase()}/doctors/${specialtyInfo.specialty.toLowerCase().replace(/\s+/g, '-')}`
      };
    } catch (error) {
      console.error('Error in findDoctorForSymptoms:', error);
      throw error;
    }
  }

  /**
   * Get directions to doctor
   */
  async getDirections(userLocation, doctorLocation) {
    try {
      const response = await this.mapsClient.directions({
        params: {
          origin: userLocation,
          destination: doctorLocation,
          mode: 'driving',
          alternatives: true,
          key: this.googleApiKey
        }
      });

      if (response.data.routes && response.data.routes.length > 0) {
        return response.data.routes.map(route => ({
          distance: route.legs[0].distance.text,
          duration: route.legs[0].duration.text,
          steps: route.legs[0].steps.map(step => ({
            instruction: step.html_instructions,
            distance: step.distance.text,
            duration: step.duration.text
          }))
        }));
      }

      return [];
    } catch (error) {
      console.error('Error getting directions:', error);
      throw new Error('Unable to get directions');
    }
  }
}

module.exports = new DoctorSearchService();
