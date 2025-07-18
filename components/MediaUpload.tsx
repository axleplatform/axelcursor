"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaFile {
  type: string;
  data: string; // base64 data
  name: string;
  size: number;
  mimeType?: string;
}

interface MediaUploadProps {
  onChange?: (files: MediaFile[]) => void;
  className?: string;
  maxFiles?: number;
}

const MediaUpload: React.FC<MediaUploadProps> = ({ onChange, className, maxFiles = 5 }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileTypes = {
    image: {
      accept: '.jpg,.jpeg,.png',
      maxSize: 10 * 1024 * 1024, // 10MB
      icon: '📷',
      label: 'Images'
    },
    audio: {
      accept: '.mp3,.wav',
      maxSize: 25 * 1024 * 1024, // 25MB
      icon: '🎵',
      label: 'Audio'
    },
    video: {
      accept: '.mp4,.mov',
      maxSize: 50 * 1024 * 1024, // 50MB
      icon: '🎥',
      label: 'Video'
    }
  };

  const validateFile = (file: File): string[] => {
    const errors: string[] = [];
    
    // Check file type
    const fileType = Object.keys(fileTypes).find(type => 
      fileTypes[type as keyof typeof fileTypes].accept.includes(file.type) || 
      fileTypes[type as keyof typeof fileTypes].accept.includes('.' + file.name.split('.').pop())
    );
    
    if (!fileType) {
      errors.push(`${file.name} is not a supported file type`);
      return errors;
    }

    // Check file size
    if (file.size > fileTypes[fileType as keyof typeof fileTypes].maxSize) {
      const maxSizeMB = fileTypes[fileType as keyof typeof fileTypes].maxSize / (1024 * 1024);
      errors.push(`${file.name} exceeds maximum size of ${maxSizeMB}MB`);
    }

    return errors;
  };

  const processFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length + files.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
    } else {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      setErrors(newErrors);
      
      // Convert files to base64 and emit onChange
      const processFilesAsync = async () => {
        const processedFiles = await Promise.all(
          updatedFiles.map(async (file) => {
            const base64 = await fileToBase64(file);
            const fileType = Object.keys(fileTypes).find(type => 
              fileTypes[type as keyof typeof fileTypes].accept.includes(file.type) || 
              fileTypes[type as keyof typeof fileTypes].accept.includes('.' + file.name.split('.').pop())
            );
            return {
              type: fileType || 'unknown',
              data: base64,
              name: file.name,
              size: file.size,
              mimeType: file.type
            };
          })
        );
        onChange?.(processedFiles);
      };
      processFilesAsync();
    }

    setErrors(newErrors);
  }, [files, maxFiles, onChange]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data URL prefix
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    processFiles(droppedFiles);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      processFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    
    // Re-process files for onChange
    const processFilesAsync = async () => {
      const processedFiles = await Promise.all(
        updatedFiles.map(async (file) => {
          const base64 = await fileToBase64(file);
          const fileType = Object.keys(fileTypes).find(type => 
            fileTypes[type as keyof typeof fileTypes].accept.includes(file.type) || 
            fileTypes[type as keyof typeof fileTypes].accept.includes('.' + file.name.split('.').pop())
          );
          return {
            type: fileType || 'unknown',
            data: base64,
            name: file.name,
            size: file.size,
            mimeType: file.type
          };
        })
      );
      onChange?.(processedFiles);
    };
    processFilesAsync();
  };

  const renderFilePreview = (file: File, index: number) => {
    const fileType = Object.keys(fileTypes).find(type => 
      fileTypes[type as keyof typeof fileTypes].accept.includes(file.type) || 
      fileTypes[type as keyof typeof fileTypes].accept.includes('.' + file.name.split('.').pop())
    );

    return (
      <div key={index} className="relative group">
        <Card className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              {fileType === 'image' ? (
                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">{fileTypes[fileType as keyof typeof fileTypes]?.icon || '📄'}</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center space-x-6">
              {Object.entries(fileTypes).map(([type, config]) => (
                <div key={type} className="text-center">
                  <div className="text-3xl mb-2">{config.icon}</div>
                  <p className="text-sm font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {config.accept.replace(/\./g, '').toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max: Images 10MB, Audio 25MB, Video 50MB • Up to {maxFiles} files
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4"
            >
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.values(fileTypes).map(t => t.accept).join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files ({files.length}/{maxFiles})</h4>
          <div className="grid gap-2">
            {files.map((file, index) => renderFilePreview(file, index))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
