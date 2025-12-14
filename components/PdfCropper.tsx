import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Icons } from './Icon';
import { ImageCropper } from './ImageCropper';

// Set worker source (required for pdfjs)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface PdfCropperProps {
  file: File;
  onCropConfirm: (base64: string) => void;
}

export const PdfCropper: React.FC<PdfCropperProps> = ({ file, onCropConfirm }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1.5); // Default zoom scale

  // Load PDF Document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setPageNum(1);
      } catch (error) {
        console.error("Error loading PDF:", error);
        alert("Không thể tải file PDF. File có thể bị lỗi hoặc được bảo vệ.");
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [file]);

  // Render Page to Image
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc) return;
      
      try {
        setLoading(true);
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale }); 
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          setPageImage(canvas.toDataURL('image/png'));
        }
      } catch (error) {
        console.error("Error rendering page:", error);
      } finally {
        setLoading(false);
      }
    };
    
    renderPage();
  }, [pdfDoc, pageNum, scale]);

  const changePage = (delta: number) => {
    const newPage = pageNum + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      setPageNum(newPage);
    }
  };

  const handleZoom = (delta: number) => {
      setScale(prev => {
          const newScale = prev + delta;
          return Math.max(0.5, Math.min(newScale, 4.0)); // Limit scale between 0.5x and 4.0x
      });
  };

  if (loading && !pageImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-50/50">
        <Icons.Loader className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p className="font-medium animate-pulse">Đang xử lý PDF...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative group">
      {/* Cropper Area */}
      <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-100/50 scroll-smooth custom-scrollbar">
        {pageImage && (
          <div className="bg-white shadow-2xl shadow-slate-300/50 rounded-xl overflow-hidden border border-slate-200">
             <ImageCropper 
                imageUrl={pageImage} 
                onCropConfirm={onCropConfirm} 
                className="max-w-none" // Allow image to overflow container for zooming
             />
          </div>
        )}
      </div>

      {/* Floating Controls Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
         <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-full border border-slate-200 shadow-xl shadow-slate-300/40 transition-all hover:scale-105">
            {/* Page Navigation */}
            <button
              onClick={() => changePage(-1)}
              disabled={pageNum <= 1}
              className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Trang trước"
            >
              <Icons.ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="font-bold text-slate-700 text-sm min-w-[70px] text-center font-mono select-none">
              {pageNum}/{totalPages}
            </span>

            <button
              onClick={() => changePage(1)}
              disabled={pageNum >= totalPages}
              className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-r border-slate-200 mr-2"
              title="Trang sau"
            >
              <Icons.ChevronRight className="w-5 h-5" />
            </button>

            {/* Zoom Controls */}
            <button
              onClick={() => handleZoom(-0.25)}
              className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Thu nhỏ"
            >
              <Icons.ZoomOut className="w-5 h-5" />
            </button>
            
            <span className="font-bold text-slate-600 text-xs min-w-[40px] text-center select-none">
                {Math.round(scale * 100)}%
            </span>

            <button
              onClick={() => handleZoom(0.25)}
              className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Phóng to"
            >
              <Icons.ZoomIn className="w-5 h-5" />
            </button>
         </div>
      </div>
    </div>
  );
};