'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';

interface ProfileUploaderProps {
  onUploadComplete: (linkedinText: string) => void;
}

export function ProfileUploader({ onUploadComplete }: ProfileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      uploadFile(file);
    } else {
      setError('Please upload a valid .zip file from LinkedIn');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(true);
      onUploadComplete(data.linkedinText);
      setTimeout(() => setSuccess(false), 3000); // fade out success
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred parsing the ZIP');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-purple-200/70 mb-2 uppercase tracking-wide">
        Auto-Import LinkedIn Export
      </h3>
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer border border-dashed rounded-xl p-6 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center
          ${isDragging 
            ? 'border-purple-400 bg-purple-500/10' 
            : 'border-white/10 hover:border-purple-400/50 hover:bg-white/5 bg-black/20'
          } ${success ? 'border-emerald-500/50 bg-emerald-500/10' : ''}
          ${isUploading ? 'opacity-75 cursor-wait' : ''}
        `}
      >
        <input 
          type="file" 
          accept=".zip" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange} 
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center text-purple-300">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm font-medium">Extracting & AI Summarizing...</span>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-emerald-400">
            <CheckCircle2 className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Profile Imported!</span>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UploadCloud className={`w-6 h-6 ${isDragging ? 'text-purple-400' : 'text-zinc-400 group-hover:text-purple-300'}`} />
            </div>
            <div>
              <p className="text-zinc-300 font-medium">Click to upload or drag and drop</p>
              <p className="text-zinc-500 text-sm mt-1">LinkedIn Data Export (.zip)</p>
            </div>
          </>
        )}

        {error && (
          <div className="mt-3 text-rose-400 text-sm font-medium bg-rose-500/10 px-3 py-1.5 rounded-md border border-rose-500/20 w-full">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
