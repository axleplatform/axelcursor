"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaFile {
  type: string;
  url: string;
  name: string;
  size: number;
  mimeType?: string;
}

interface AIService {
  service: string;
  description: string;
}

interface AIAnalysisResults {
  services: AIService[];
  analyzed_at?: string;
}

interface MultimodalInputDisplayProps {
  issueDescription?: string;
  mediaFiles?: MediaFile[];
  aiAnalysisResults?: AIAnalysisResults | null;
  className?: string;
}

const MultimodalInputDisplay: React.FC<MultimodalInputDisplayProps> = ({ 
  issueDescription, 
  mediaFiles = [], 
  aiAnalysisResults = null,
  className 
}) => {
  const [expandedMedia, setExpandedMedia] = useState<Record<number, boolean>>({});

  const toggleMediaExpansion = (index: number) => {
    setExpandedMedia(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return '📷';
      case 'audio': return '🎵';
      case 'video': return '🎥';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Customer Description */}
      {issueDescription && (
        <div className="mb-4">
          <h4 className="font-semibold text-white mb-2">Issue Description:</h4>
          <p className="text-white">
            "{issueDescription}"
          </p>
        </div>
      )}

      {/* Media Files */}
      {mediaFiles && mediaFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📎</span>
              Media Files ({mediaFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {mediaFiles.map((file, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{getMediaIcon(file.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {file.type.toUpperCase()} • {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMediaExpansion(index)}
                    >
                      {expandedMedia[index] ? 'Hide' : 'View'}
                    </Button>
                  </div>
                  
                  {expandedMedia[index] && (
                    <div className="mt-3 pt-3 border-t">
                      {file.type === 'image' ? (
                        <div className="flex justify-center">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="max-w-full max-h-64 rounded-lg shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const nextSibling = target.nextSibling as HTMLElement;
                              if (nextSibling) {
                                nextSibling.style.display = 'block';
                              }
                            }}
                          />
                          <div className="hidden text-center text-gray-500">
                            <p>Image failed to load</p>
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Open in new tab
                            </a>
                          </div>
                        </div>
                      ) : file.type === 'audio' ? (
                        <div className="flex justify-center">
                          <audio controls className="w-full max-w-md">
                            <source src={file.url} type={file.mimeType} />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      ) : file.type === 'video' ? (
                        <div className="flex justify-center">
                          <video controls className="w-full max-w-md rounded-lg">
                            <source src={file.url} type={file.mimeType} />
                            Your browser does not support the video element.
                          </video>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          <p>Unsupported file type</p>
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Download file
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}



      {/* No Content State */}
      {!issueDescription && (!mediaFiles || mediaFiles.length === 0) && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <p>No customer input available</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultimodalInputDisplay;
