import React, { useCallback, useRef, useState } from 'react';
import { Icons } from './Icon';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      validateAndPass(filesArray);
    }
  }, [disabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      validateAndPass(filesArray);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const validateAndPass = (files: File[]) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const validFiles = files.filter(file => validTypes.includes(file.type));
    if (validFiles.length > 0) onFilesSelected(validFiles);
    if (validFiles.length < files.length) alert("Chỉ hỗ trợ file PDF và Ảnh.");
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-[2.5rem] transition-all duration-500 ease-out cursor-pointer h-64 flex items-center justify-center
        ${isDragging 
          ? 'bg-indigo-50/50 scale-[1.02] shadow-2xl shadow-indigo-500/20' 
          : 'bg-white hover:bg-slate-50/50 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      {/* Animated Dashed Border */}
      <div className={`absolute inset-0 rounded-[2.5rem] border-[3px] border-dashed transition-colors duration-300 pointer-events-none ${isDragging ? 'border-indigo-500' : 'border-slate-200 group-hover:border-indigo-300'}`}></div>

      <input type="file" ref={inputRef} className="hidden" accept="application/pdf,image/*" multiple onChange={handleInputChange} disabled={disabled} />
      
      <div className="relative z-10 flex flex-col items-center justify-center p-6 w-full transition-transform duration-300 group-hover:scale-105">
        <div className={`
          mb-6 p-5 rounded-3xl transition-all duration-500 shadow-sm
          ${isDragging 
             ? 'bg-indigo-600 text-white rotate-12 scale-110 shadow-indigo-500/40' 
             : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 group-hover:shadow-indigo-500/30'}
        `}>
          <Icons.UploadCloud className="w-12 h-12" strokeWidth={1.5} />
        </div>
        
        <div className="space-y-2 text-center">
          <h3 className="text-2xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors tracking-tight">
            Tải tài liệu lên
          </h3>
          <p className="text-slate-500 font-medium max-w-xs mx-auto">
            Kéo thả hoặc chọn <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">PDF/Ảnh</span>
          </p>
        </div>
      </div>

      {/* Decorative Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors duration-700"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-purple-500/10 transition-colors duration-700"></div>
    </div>
  );
};