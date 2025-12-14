import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { Icons } from './Icon';
import { FileData } from '../types';
import { SimpleCropper } from './SimpleCropper';

interface ResultViewerProps {
  markdown: string;
  isEditable: boolean;
  onMarkdownChange?: (newMarkdown: string) => void;
  fileData?: FileData | null;
}

// Helper to get image dimensions
const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = `data:image/png;base64,${base64}`;
  });
};

export const ResultViewer: React.FC<ResultViewerProps> = ({ markdown, isEditable, onMarkdownChange, fileData }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('code');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [activePlaceholderId, setActivePlaceholderId] = useState<string | null>(null);

  useEffect(() => { setImageMap({}); setActivePlaceholderId(null); }, [markdown]);

  useEffect(() => {
     if (!activePlaceholderId && isEditable) {
        let idCounter = 0;
        const ids: string[] = [];
        markdown.replace(/\[\[IMAGE\]\]/g, () => { ids.push((++idCounter).toString()); return ""; });
        for (const id of ids) { if (!imageMap[id]) { setActivePlaceholderId(id); break; } }
     }
  }, [markdown, imageMap, isEditable, activePlaceholderId]);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!isEditable || !activePlaceholderId || viewMode === 'code') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault(); e.stopPropagation();
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => setImageMap(prev => ({ ...prev, [activePlaceholderId]: (ev.target?.result as string).split(',')[1] }));
            reader.readAsDataURL(blob);
          }
          return;
        }
      }
    };
    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [isEditable, activePlaceholderId, viewMode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadWord = async () => {
    try {
      setIsDownloading(true);
      let idCounter = 0;
      const contentWithIds = markdown.replace(/\[\[IMAGE\]\]/g, () => `___IMG_MARKER_${++idCounter}___`);
      const parts = contentWithIds.split(/(?=(?:___IMG_MARKER_\d+___))/g);
      const docChildren = [];

      for (const part of parts) {
        if (part.startsWith('___IMG_MARKER_')) {
          const match = part.match(/___IMG_MARKER_(\d+)___/);
          if (match) {
            const id = match[1];
            const base64Data = imageMap[id];
            if (base64Data) {
               const dims = await getImageDimensions(base64Data);
               const maxWidth = 500;
               let { width: finalWidth, height: finalHeight } = dims;
               if (finalWidth > maxWidth) {
                 const ratio = maxWidth / finalWidth;
                 finalWidth = maxWidth;
                 finalHeight = finalHeight * ratio;
               }
               docChildren.push(new Paragraph({
                   children: [new ImageRun({ data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)), transformation: { width: finalWidth, height: finalHeight } })],
                   spacing: { after: 120 }
               }));
            } else {
               docChildren.push(new Paragraph({ children: [new TextRun({ text: "[Chưa có hình ảnh]", italics: true, color: "FF0000" })], spacing: { after: 120 } }));
            }
            const remainingText = part.replace(`___IMG_MARKER_${id}___`, '');
            if (remainingText.trim()) remainingText.split('\n').forEach(line => line.trim() && docChildren.push(new Paragraph({ children: [new TextRun({ text: line, font: "Times New Roman", size: 24 })], spacing: { after: 120 } })));
          }
        } else {
          part.split('\n').forEach(line => line.trim() && docChildren.push(new Paragraph({ children: [new TextRun({ text: line, font: "Times New Roman", size: 24 })], spacing: { after: 120 } })));
        }
      }
      const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DocuLatex_${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) { console.error(error); alert("Lỗi tạo file Word."); } finally { setIsDownloading(false); }
  };

  const processedMarkdown = useMemo(() => {
    let counter = 0;
    // 1. Xử lý ảnh (đổi placeholder thành ảnh markdown)
    let processed = markdown.replace(/\[\[IMAGE\]\]/g, () => `![DocImagePlaceholder](${++counter})`);
    
    // 2. Xử lý hiển thị công thức trong chế độ Preview:
    // Vì KaTeX/Remark-Math thường chỉ hiểu $...$, ta chuyển ${...}$ về $...$ chỉ để hiển thị
    // Regex tìm ${nội_dung}$ và chuyển thành $nội_dung$
    processed = processed.replace(/\$\{([\s\S]+?)\}\$/g, '$$$1$$');
    
    return processed;
  }, [markdown]);

  const handleImageUpload = (id: string, file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => setImageMap(prev => ({ ...prev, [id]: (e.target?.result as string).split(',')[1] }));
      reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Floating Modern Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center bg-slate-900/90 backdrop-blur-md text-white px-2 py-1.5 rounded-full shadow-2xl transition-all hover:scale-105 print:hidden border border-white/10">
        <div className="flex bg-slate-800 rounded-full p-1 mr-3">
            <button onClick={() => setViewMode('code')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}>Mã nguồn</button>
            <button onClick={() => setViewMode('preview')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}>Xem trước</button>
        </div>
        
        <div className="h-6 w-px bg-slate-700 mx-1"></div>

        {fileData?.pages && fileData.pages.length > 0 && (
             <button onClick={() => setShowSourcePanel(!showSourcePanel)} className={`p-2 rounded-full hover:bg-slate-700 transition-colors ${showSourcePanel ? 'text-blue-400' : 'text-slate-300'}`} title="Bật/Tắt file gốc">
                <Icons.PanelLeft className="w-5 h-5" />
             </button>
        )}
        
        <button onClick={handleCopy} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition-colors ml-1" title="Sao chép">
           {copied ? <Icons.Check className="w-5 h-5 text-green-400" /> : <Icons.Copy className="w-5 h-5" />}
        </button>

        <button onClick={handleDownloadWord} className="ml-2 flex items-center space-x-2 px-4 py-1.5 bg-[#003580] hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-blue-900/50">
            {isDownloading ? <Icons.Loader className="w-3 h-3 animate-spin" /> : <Icons.Download className="w-3 h-3" />}
            <span>Word</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex relative pt-0">
          {showSourcePanel && fileData?.pages && (
              <div className="w-2/5 min-w-[320px] border-r border-slate-100 bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col items-center p-6 space-y-6 pt-20">
                 {fileData.pages.map((pageData, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-xl shadow-md border border-slate-200 w-full group transition-transform hover:scale-[1.01]">
                       <div className="mb-2 flex justify-between items-center px-2">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trang {idx + 1}</span>
                       </div>
                       <SimpleCropper imageSrc={`data:image/jpeg;base64,${pageData}`} onCrop={(b64) => { if (activePlaceholderId && isEditable) { setImageMap(prev => ({ ...prev, [activePlaceholderId]: b64 })); const nextId = (parseInt(activePlaceholderId) + 1).toString(); setActivePlaceholderId(nextId); }}} disabled={!isEditable} />
                    </div>
                 ))}
              </div>
          )}

          <div className="flex-1 overflow-auto bg-white p-8 sm:p-12 custom-scrollbar flex justify-center pt-24 print:pt-0 print:p-0">
            {viewMode === 'preview' ? (
              <article className="w-full max-w-4xl prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-img:rounded-xl prose-img:shadow-lg">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                    img: ({src, alt}) => {
                      if (alt === "DocImagePlaceholder" && src) {
                          const id = src; const hasImage = !!imageMap[id]; const isActive = activePlaceholderId === id;
                          return (
                              <div tabIndex={isEditable ? 0 : -1} onFocus={() => isEditable && setActivePlaceholderId(id)} onClick={(e) => { e.stopPropagation(); if(isEditable) { setActivePlaceholderId(id); if(fileData?.pages?.length && !showSourcePanel) setShowSourcePanel(true); }}} onPaste={(e) => { /* logic in global listener */ }}
                                  className={`my-8 group relative rounded-2xl border-2 border-dashed p-1 flex flex-col items-center justify-center transition-all duration-300 outline-none print:border-none print:p-0 ${!isEditable ? 'border-slate-100 bg-slate-50' : ''} ${hasImage ? 'border-transparent' : isActive && isEditable ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-slate-200 bg-slate-50 hover:border-blue-300'}`}>
                                {hasImage ? (
                                    <div className="relative group/image w-full rounded-xl overflow-hidden shadow-sm">
                                        <img src={`data:image/png;base64,${imageMap[id]}`} alt="Content" className="max-w-full h-auto mx-auto" />
                                        {isEditable && <button onClick={(e) => { e.stopPropagation(); const n = {...imageMap}; delete n[id]; setImageMap(n); }} className="absolute top-3 right-3 bg-white/90 text-red-500 p-2 rounded-full shadow-md opacity-0 group-hover/image:opacity-100 transition-all hover:scale-110"><Icons.Trash2 className="w-4 h-4" /></button>}
                                    </div>
                                ) : (
                                    <div className={`text-center py-10 ${!isEditable ? 'opacity-40' : ''}`}>
                                        <div className={`mb-3 inline-flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${isActive && isEditable ? 'bg-blue-100 text-blue-600 rotate-12' : 'bg-slate-200 text-slate-400'}`}>
                                            {isActive && isEditable ? <Icons.ImagePlus className="w-6 h-6" /> : <Icons.Image className="w-6 h-6" />}
                                        </div>
                                        <p className="text-sm font-bold text-slate-500">Khu vực ảnh #{id}</p>
                                        {isActive && isEditable && <div className="flex gap-2 justify-center mt-4"><span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500">Ctrl + V</span><label className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-blue-700">Upload<input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(id, e.target.files[0])} /></label></div>}
                                    </div>
                                )}
                              </div>
                          );
                      }
                      return <span className="text-red-500 font-bold">Image Error</span>;
                    }
                  }}>{processedMarkdown}</ReactMarkdown>
              </article>
            ) : (
              <div className="w-full max-w-5xl mx-auto h-full pb-10">
                <textarea readOnly={!isEditable} className={`w-full h-full min-h-[600px] resize-none font-mono text-sm leading-7 text-slate-800 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow ${!isEditable ? 'bg-slate-50 text-slate-500' : ''}`} value={markdown} onChange={(e) => onMarkdownChange?.(e.target.value)} spellCheck={false} placeholder="Nội dung sẽ hiển thị ở đây..." />
              </div>
            )}
          </div>
      </div>
    </div>
  );
};