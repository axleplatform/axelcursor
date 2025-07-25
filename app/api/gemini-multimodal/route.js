// Use Node.js runtime for better compatibility
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// File type configurations
const FILE_TYPES = {
  image: {
    accept: ['image/jpeg', 'image/jpg', 'image/png'],
    maxSize: 10 * 1024 * 1024, // 10MB
    process: async (buffer) => {
      // Optimize image for Gemini API
      return await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    }
  },
  audio: {
    accept: ['audio/mpeg', 'audio/mp3', 'audio/wav'],
    maxSize: 25 * 1024 * 1024, // 25MB
    process: async (buffer) => buffer // No processing needed for audio
  },
  video: {
    accept: ['video/mp4', 'video/quicktime'],
    maxSize: 50 * 1024 * 1024, // 50MB
    process: async (buffer) => buffer // No processing needed for video
  }
};

function getFileType(mimeType) {
  return Object.keys(FILE_TYPES).find(type => 
    FILE_TYPES[type].accept.includes(mimeType)
  );
}

function validateFile(file, mimeType) {
  const fileType = getFileType(mimeType);
  
  if (!fileType) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  
  if (file.size > FILE_TYPES[fileType].maxSize) {
    const maxSizeMB = FILE_TYPES[fileType].maxSize / (1024 * 1024);
    throw new Error(`File size exceeds maximum of ${maxSizeMB}MB`);
  }
  
  return fileType;
}

async function processFile(file, mimeType) {
  const fileType = validateFile(file, mimeType);
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Process file based on type
  const processedBuffer = await FILE_TYPES[fileType].process(buffer);
  
  return {
    type: fileType,
    data: processedBuffer.toString('base64'),
    mimeType: mimeType,
    name: file.name,
    size: file.size
  };
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Extract vehicle data
    const vehicleData = {
      year: parseInt(formData.get('year')),
      make: formData.get('make'),
      model: formData.get('model'),
      mileage: parseInt(formData.get('mileage'))
    };
    
    // Extract car running status
    const carRuns = formData.get('carRuns');
    const isCarRunning = carRuns === 'true';
    
    // Extract text description
    const textDescription = formData.get('description') || '';
    
    // Validate required fields
    if (!vehicleData.year || !vehicleData.make || !vehicleData.model || !vehicleData.mileage) {
      return NextResponse.json(
        { error: 'Missing required vehicle data (year, make, model, mileage)' },
        { status: 400 }
      );
    }
    
    // Process uploaded files
    const mediaFiles = [];
    const files = formData.getAll('files');
    
    for (const file of files) {
      if (file instanceof File) {
        try {
          const processedFile = await processFile(file, file.type);
          mediaFiles.push(processedFile);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return NextResponse.json(
            { error: `File processing error: ${error.message}` },
            { status: 400 }
          );
        }
      }
    }
    
    // Generate service recommendations using Gemini
    const recommendations = await generateServiceRecommendations(
      vehicleData,
      textDescription,
      mediaFiles,
      isCarRunning
    );
    
    return NextResponse.json({
      success: true,
      data: recommendations
    });
    
  } catch (error) {
    console.error('Gemini multimodal API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

async function generateServiceRecommendations(vehicleData, textDescription, mediaFiles, isCarRunning) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
        candidateCount: 1
      }
    });
    
    // Build content parts array
    const contentParts = [];
    
    // Add text prompt
    const textPrompt = `
    You are an expert automotive diagnostician. Analyze the following vehicle information, customer description, and any provided media files to recommend exactly 3 specific automotive services.
    
    VEHICLE INFORMATION:
    - Year: ${vehicleData.year}
    - Make: ${vehicleData.make}
    - Model: ${vehicleData.model}
    - Mileage: ${vehicleData.mileage} miles
    - Vehicle Status: ${isCarRunning ? 'Vehicle is currently running' : 'Vehicle is NOT running'}
    
    CUSTOMER DESCRIPTION:
    ${textDescription}
    
    MEDIA FILES: ${mediaFiles.length} file(s) provided for analysis
    
    VEHICLE OPERABILITY ANALYSIS:
    Based on the vehicle's current running condition, provide targeted recommendations:
    ${isCarRunning ? 
      'If RUNNING: Focus on maintenance, performance optimization, and preventive services. Consider routine maintenance, performance issues, and preventive care.' :
      'If NOT RUNNING: Prioritize diagnostic, electrical, starter, and battery services. Consider urgent repairs, towing needs, and critical system failures.'
    }
    
    INSTRUCTIONS:
    1. Analyze any images for visual issues (damage, wear, leaks, etc.)
    2. Listen to audio files for sound-based problems (noises, rattles, etc.)
    3. Review video files for motion/behavior issues (vibration, handling, etc.)
    4. Consider vehicle age, mileage, and common problems for this make/model
    5. Prioritize services based on vehicle running status
    6. Provide exactly 3 service recommendations
    
    RESPONSE FORMAT (JSON only):
    {
      "services": [
        {
          "service": "Service Name (5-6 words max)",
          "description": "Short reason why needed (10-15 words max)"
        }
      ]
    }
    
    Focus on practical, actionable services that address the specific issues identified and consider the vehicle's current operational status.
    `;
    
    contentParts.push({ text: textPrompt });
    
    // Add media files if provided
    for (const mediaFile of mediaFiles) {
      contentParts.push({
        inlineData: {
          data: mediaFile.data,
          mimeType: mediaFile.mimeType
        }
      });
    }
    
    const result = await model.generateContent(contentParts);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    let recommendations;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.log('Raw response:', text);
      return getDefaultServices(vehicleData);
    }
    
    // Validate response structure
    if (!recommendations.services || !Array.isArray(recommendations.services)) {
      return getDefaultServices(vehicleData);
    }
    
    // Ensure exactly 3 services
    if (recommendations.services.length > 3) {
      recommendations.services = recommendations.services.slice(0, 3);
    } else if (recommendations.services.length < 3) {
      const defaultServices = getDefaultServices(vehicleData, isCarRunning);
      while (recommendations.services.length < 3) {
        recommendations.services.push(defaultServices.services[recommendations.services.length]);
      }
    }
    
    return recommendations;
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    return getDefaultServices(vehicleData, isCarRunning);
  }
}

function getDefaultServices(vehicleData, isCarRunning) {
  if (isCarRunning) {
    // Default services for running vehicles - maintenance focused
    return {
      services: [
        {
          service: "General Vehicle Inspection",
          description: "Comprehensive check of all systems"
        },
        {
          service: "Oil Change Service",
          description: "Regular maintenance for engine health"
        },
        {
          service: "Brake System Inspection",
          description: "Ensure braking system safety and performance"
        }
      ]
    };
  } else {
    // Default services for non-running vehicles - diagnostic focused
    return {
      services: [
        {
          service: "Battery Test & Replacement",
          description: "Check battery condition and charge"
        },
        {
          service: "Starter Motor Inspection",
          description: "Diagnose starter system issues"
        },
        {
          service: "Electrical System Diagnostic",
          description: "Comprehensive electrical troubleshooting"
        }
      ]
    };
  }
}
