import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateServiceRecommendations(vehicleData, textDescription, mediaFiles = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    
    // Build content parts array
    const contentParts = [];
    
    // Add text prompt
    const textPrompt = `
    Based on the following vehicle information and customer description, analyze any provided media files and recommend exactly 3 specific automotive services.
    
    Vehicle: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}
    Mileage: ${vehicleData.mileage} miles
    Customer Description: ${textDescription}
    
    Please provide exactly 3 service recommendations in this JSON format:
    {
      "services": [
        {
          "service": "Service Name (5-6 words max)",
          "description": "Short reason why needed (10-15 words max)",
          "confidence": "XX%"
        }
      ]
    }
    
    Focus on practical, common automotive services based on the vehicle age, mileage, customer description, and any visual/audio evidence provided.
    `;
    
    contentParts.push({ text: textPrompt });
    
    // Add media files if provided
    for (const mediaFile of mediaFiles) {
      if (mediaFile.data) {
        const mimeType = getMimeType(mediaFile.type);
        contentParts.push({
          inlineData: {
            data: mediaFile.data,
            mimeType: mimeType
          }
        });
      }
    }
    
    const result = await model.generateContent(contentParts);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    const recommendations = JSON.parse(text);
    return recommendations;
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    return getDefaultServices();
  }
}

function getMimeType(type) {
  switch (type) {
    case 'image':
      return 'image/jpeg';
    case 'audio':
      return 'audio/mpeg';
    case 'video':
      return 'video/mp4';
    default:
      return 'image/jpeg';
  }
}

function getDefaultServices() {
  return {
    services: [
      {
        service: "General Vehicle Inspection",
        description: "Comprehensive check of all systems",
        confidence: "90%"
      },
      {
        service: "Oil Change Service",
        description: "Regular maintenance for engine health",
        confidence: "85%"
      },
      {
        service: "Tire Pressure Check",
        description: "Ensure proper inflation and safety",
        confidence: "80%"
      }
    ]
  };
} 