import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icon';

interface ImageCropperProps {
  imageUrl: string;
  onCropConfirm: (base64: string) => void;
  className?: string;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageUrl, onCropConfirm, className }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset selection when image source changes (e.g., page turn)
  useEffect(() => {
    setSelection(null);
    setStartPos(null);
    setIsSelecting(false);
  }, [imageUrl]);

  // Handle Mouse Down (Start Selection)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPos({ x, y });
    setSelection({ x, y, w: 0, h: 0 });
  };

  // Handle Mouse Move (Update Selection)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !startPos || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const x = Math.min(currentX, startPos.x);
    const y = Math.min(currentY, startPos.y);

    setSelection({ x, y, w: width, h: height });
  };

  // Handle Mouse Up (End Selection)
  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCrop = () => {
    if (!selection || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = selection.w;
    canvas.height = selection.h;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Calculate the ratio between natural image size and displayed size
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      ctx.drawImage(
        imgRef.current,
        selection.x * scaleX,
        selection.y * scaleY,
        selection.w * scaleX,
        selection.h * scaleY,
        0,
        0,
        selection.w,
        selection.h
      );

      const base64 = canvas.toDataURL('image/png').split(',')[1];
      onCropConfirm(base64);
      setSelection(null);
    }
  };

  return (
    <div className="relative inline-block">
      <div 
        ref={containerRef}
        className="relative cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img 
          ref={imgRef}
          src={imageUrl} 
          alt="Crop Source" 
          className={`block ${className || 'max-w-full'} pointer-events-none`}
          draggable={false}
        />
        
        {/* Selection Overlay */}
        {selection && (selection.w > 0 || selection.h > 0) && (
          <div 
            className="absolute border-2 border-indigo-500 bg-indigo-500/10 z-10"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h
            }}
          >
             {/* Confirm Button attached to selection */}
             <button
               onClick={(e) => {
                 e.stopPropagation(); // Prevent drag start
                 handleCrop();
               }}
               className="absolute -bottom-10 right-0 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-1"
             >
               <Icons.Scissors className="w-4 h-4" />
               Cắt
             </button>
          </div>
        )}
      </div>
    </div>
  );
};