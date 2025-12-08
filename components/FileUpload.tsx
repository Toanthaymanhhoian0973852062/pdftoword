import React, { useCallback, useRef, useState } from 'react';
import { Icons } from './Icon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
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
      const file = e.dataTransfer.files[0];
      validateAndPass(file);
    }
  }, [disabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (validTypes.includes(file.type)) {
      onFileSelect(file);
    } else {
      alert("Chỉ hỗ trợ các định dạng file PDF, JPG, PNG và WEBP.");
    }
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-300 ease-out cursor-pointer h-64 flex items-center justify-center
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-50/30 scale-[1.02] shadow-2xl shadow-indigo-500/10' 
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        disabled={disabled}
      />
      
      <div className="relative z-10 flex flex-col items-center justify-center p-6 w-full">
        <div className={`
          mb-6 p-6 rounded-2xl transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-6
          ${isDragging ? 'bg-indigo-100 text-indigo-600 rotate-6 scale-110' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 shadow-sm'}
        `}>
          <Icons.UploadCloud className="w-12 h-12" strokeWidth={1.5} />
        </div>
        
        <div className="space-y-3 text-center">
          <h3 className="text-2xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors tracking-tight">
            Tải lên tài liệu
          </h3>
          <p className="text-base text-slate-500 max-w-xs mx-auto font-medium">
            Kéo thả, <span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">Dán (Ctrl+V)</span> hoặc duyệt file
          </p>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide pt-2">
            Hỗ trợ PDF, JPG, PNG (Max 10MB)
          </p>
        </div>
      </div>

      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/0 to-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:translate-y-0 transition-transform duration-700"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/0 to-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:translate-y-0 transition-transform duration-700"></div>
    </div>
  );
};