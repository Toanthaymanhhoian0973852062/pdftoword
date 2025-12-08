import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icon';

interface ImageCropperProps {
  imageUrl: string;
  onCropConfirm: (base64: string) => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageUrl, onCropConfirm }) => {
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

  // Execute Crop
  const handleCrop = () => {
    if (!selection || !imgRef.current || selection.w < 5 || selection.h < 5) {
        alert("Vui lòng quét chọn vùng ảnh cần cắt trước.");
        return;
    }

    const img = imgRef.current;
    
    // Calculate ratio between displayed size and natural size
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const canvas = document.createElement('canvas');
    canvas.width = selection.w * scaleX;
    canvas.height = selection.h * scaleY;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        img,
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
      onCropConfirm(base64);
      setSelection(null); // Reset selection after crop
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex space-x-2 bg-white/90 backdrop-blur shadow-lg px-4 py-2 rounded-full border border-slate-200 pointer-events-none">
         <span className="text-xs font-semibold text-slate-600 flex items-center">
            <Icons.MousePointer className="w-4 h-4 mr-2 text-brand-600" />
            Quét chuột để chọn hình ảnh
         </span>
         {selection && selection.w > 10 && (
            <span className="text-xs text-brand-600 font-bold ml-2 animate-pulse">
               Thả chuột để hiện nút cắt
            </span>
         )}
      </div>

      <div 
        ref={containerRef}
        className="relative select-none cursor-crosshair overflow-hidden rounded-lg shadow-inner bg-slate-100 flex items-start justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img 
          ref={imgRef}
          src={imageUrl} 
          alt="Source" 
          className="max-w-full pointer-events-none select-none"
          draggable={false}
        />
        
        {/* Selection Overlay */}
        {selection && (
          <div 
            className="absolute border-2 border-brand-500 bg-brand-500/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h
            }}
          >
             {/* Handles for visual cue */}
             <div className="absolute -top-1 -left-1 w-2 h-2 bg-brand-500 border border-white"></div>
             <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-500 border border-white"></div>
             <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-brand-500 border border-white"></div>
             <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-brand-500 border border-white"></div>
             
             {/* Center Action (Alternative to top bar) */}
             {!isSelecting && selection.w > 20 && (
                 <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-50">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleCrop(); }}
                        className="bg-brand-600 text-white px-4 py-2 rounded-lg shadow-xl font-bold hover:bg-brand-700 flex items-center whitespace-nowrap ring-2 ring-white transform transition-all hover:scale-105"
                    >
                        <Icons.Scissors className="w-4 h-4 mr-2" />
                        Cắt & Dán
                    </button>
                 </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};