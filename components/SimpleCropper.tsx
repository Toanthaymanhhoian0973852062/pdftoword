import React, { useState, useRef } from 'react';
import { Icons } from './Icon';

interface SimpleCropperProps {
  imageSrc: string;
  onCrop: (base64: string) => void;
  disabled?: boolean;
}

export const SimpleCropper: React.FC<SimpleCropperProps> = ({ imageSrc, onCrop, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPos({ x, y });
    setSelection({ x, y, w: 0, h: 0 });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(currentX, startPos.x);
    const y = Math.min(currentY, startPos.y);
    const w = Math.abs(currentX - startPos.x);
    const h = Math.abs(currentY - startPos.y);

    setSelection({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (isDragging && selection && selection.w > 10 && selection.h > 10) {
      performCrop();
    } else {
      setSelection(null);
    }
    setIsDragging(false);
  };

  const performCrop = () => {
    if (!imgRef.current || !selection) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = selection.w * scaleX;
    canvas.height = selection.h * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        imgRef.current,
        selection.x * scaleX,
        selection.y * scaleY,
        selection.w * scaleX,
        selection.h * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      onCrop(base64);
      setSelection(null); // Reset after crop
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block select-none ${disabled ? '' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img 
        ref={imgRef}
        src={imageSrc} 
        alt="Source Page" 
        className="block max-w-full h-auto pointer-events-none border border-slate-200 shadow-sm"
      />
      
      {selection && (
        <div 
          className="absolute border-2 border-indigo-500 bg-indigo-500/20 z-10 pointer-events-none"
          style={{
            left: selection.x,
            top: selection.y,
            width: selection.w,
            height: selection.h
          }}
        >
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded shadow">
             Thả để cắt
          </div>
        </div>
      )}
    </div>
  );
};