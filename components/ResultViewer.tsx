import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { Icons } from './Icon';

interface ResultViewerProps {
  markdown: string;
  isEditable: boolean;
}

// Helper to get image dimensions
const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = `data:image/png;base64,${base64}`;
  });
};

export const ResultViewer: React.FC<ResultViewerProps> = ({ markdown, isEditable }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Store images keyed by placeholder ID (e.g. "img_1" -> base64 string)
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  
  // Track the "Active" placeholder (last clicked or first empty)
  const [activePlaceholderId, setActivePlaceholderId] = useState<string | null>(null);

  // Reset images when markdown changes (new file)
  useEffect(() => {
    setImageMap({});
    setActivePlaceholderId(null);
  }, [markdown]);

  // --- GLOBAL PASTE LISTENER ---
  // Cho phép người dùng nhấn Ctrl+V bất cứ khi nào một placeholder đang được chọn (Active)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // 1. Chỉ hoạt động khi đã mở khóa và có một ô ảnh đang được chọn
      if (!isEditable || !activePlaceholderId) return;

      // 2. Nếu đang ở chế độ xem code, không can thiệp (để người dùng paste text)
      if (viewMode === 'code') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // 3. Duyệt qua clipboard tìm hình ảnh
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault(); // Ngăn trình duyệt dán mặc định
          e.stopPropagation();

          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const result = ev.target?.result as string;
              const base64 = result.split(',')[1];
              setImageMap(prev => ({ ...prev, [activePlaceholderId]: base64 }));
            };
            reader.readAsDataURL(blob);
          }
          return; // Chỉ xử lý 1 ảnh đầu tiên tìm thấy
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
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
      const contentWithIds = markdown.replace(/\[\[IMAGE\]\]/g, () => {
        idCounter++;
        return `___IMG_MARKER_${idCounter}___`;
      });

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
               const maxWidth = 500; // Max width in Word (approx 16cm)
               let finalWidth = dims.width;
               let finalHeight = dims.height;

               // Scale down if too big
               if (finalWidth > maxWidth) {
                 const ratio = maxWidth / finalWidth;
                 finalWidth = maxWidth;
                 finalHeight = finalHeight * ratio;
               }

               docChildren.push(
                 new Paragraph({
                   children: [
                     new ImageRun({
                       data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
                       transformation: {
                         width: finalWidth,
                         height: finalHeight,
                       },
                     }),
                   ],
                   spacing: { after: 120 }
                 })
               );
            } else {
               docChildren.push(
                 new Paragraph({
                    children: [new TextRun({ text: "[Chưa có hình ảnh minh họa]", italics: true, color: "FF0000" })],
                    spacing: { after: 120 }
                 })
               );
            }
            const remainingText = part.replace(`___IMG_MARKER_${id}___`, '');
            if (remainingText.trim()) {
                 remainingText.split('\n').forEach(line => {
                   docChildren.push(
                      new Paragraph({
                        children: [new TextRun({ text: line, font: "Times New Roman", size: 24 })],
                        spacing: { after: 120 }
                      })
                   );
                 });
            }
          }
        } else {
          const lines = part.split('\n');
          lines.forEach(line => {
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    font: "Times New Roman",
                    size: 24,
                  }),
                ],
                spacing: { after: 120 }
              })
            );
          });
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docChildren,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DocuLatex_FullHinh_${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating Word document:", error);
      alert("Không thể tạo file Word. Vui lòng thử lại.");
    } finally {
      setIsDownloading(false);
    }
  };

  const processedMarkdown = useMemo(() => {
    let idCounter = 0;
    const withImages = markdown.replace(/\[\[IMAGE\]\]/g, () => {
      idCounter++;
      return `![DocImagePlaceholder](${idCounter})`;
    });
    return withImages.replace(/\$\{(.*?)\}\$/gs, '$$$1$$');
  }, [markdown]);

  const handleImageUpload = (id: string, file: File) => {
      if (!isEditable) return; // STRICT CHECK
      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64 = result.split(',')[1]; 
          setImageMap(prev => ({ ...prev, [id]: base64 }));
      };
      reader.readAsDataURL(file);
  };

  // Fallback handler for direct paste on container div (redundant but safe)
  const handleContainerPaste = (e: React.ClipboardEvent<HTMLDivElement>, id: string) => {
      if (!isEditable) return; 
      const items = e.clipboardData.items;
      for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
              e.preventDefault();
              e.stopPropagation();
              const blob = item.getAsFile();
              if (blob) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                      const result = ev.target?.result as string;
                      const base64 = result.split(',')[1];
                      setImageMap(prev => ({ ...prev, [id]: base64 }));
                  };
                  reader.readAsDataURL(blob);
              }
              return;
          }
      }
  };

  const handlePasteButtonClick = async (id: string, containerRef: HTMLDivElement | null) => {
    if (!isEditable) {
      alert("⛔ ỨNG DỤNG ĐANG KHÓA.\nVui lòng nhập mã kích hoạt để mở quyền chỉnh sửa.");
      return;
    }
    
    // Make this placeholder active immediately
    setActivePlaceholderId(id);

    try {
      // Try Clipboard API first
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.some(type => type.startsWith('image/'))) {
          const blob = await item.getType(item.types.find(type => type.startsWith('image/'))!);
          const reader = new FileReader();
          reader.onload = (e) => {
             const result = e.target?.result as string;
             const base64 = result.split(',')[1];
             setImageMap(prev => ({ ...prev, [id]: base64 }));
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      
      // If no image in API, ask user to paste manually
      if (containerRef) containerRef.focus();
      alert("Không tìm thấy hình ảnh trong bộ nhớ tạm.");
    } catch (err) {
      // Fallback: Focus and ask user to press Ctrl+V
      if (containerRef) {
          containerRef.focus();
          // We show a more friendly toast/alert here
          alert("Do trình duyệt bảo mật, vui lòng nhấn phím 'Ctrl + V' ngay bây giờ để dán ảnh.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header Toolbar - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur z-20 print:hidden">
        <div className="flex space-x-1 bg-slate-100/50 p-1 rounded-full self-start sm:self-auto">
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
              viewMode === 'code' 
                ? 'bg-white text-indigo-600 shadow-md shadow-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Icons.Code className="w-4 h-4" />
            <span>Mã nguồn</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
              viewMode === 'preview' 
                ? 'bg-white text-indigo-600 shadow-md shadow-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Icons.Eye className="w-4 h-4" />
            <span>Xem trước</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto mt-3 sm:mt-0">
          {!isEditable && (
             <div className="flex items-center space-x-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 animate-pulse">
               <Icons.Lock className="w-3 h-3" />
               <span>Chỉ xem (Locked)</span>
             </div>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center w-10 h-10 sm:w-auto sm:px-4 sm:py-2 text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 rounded-full transition-all active:scale-95"
            title="Sao chép nội dung"
          >
            {copied ? <Icons.Check className="w-4 h-4 text-green-500" /> : <Icons.Copy className="w-4 h-4" />}
            <span className="hidden sm:inline ml-2 text-sm font-medium">{copied ? 'Đã chép' : 'Sao chép'}</span>
          </button>
          
          <button
            onClick={handleDownloadWord}
            disabled={isDownloading}
            className="flex items-center space-x-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-full transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isDownloading ? <Icons.Loader className="w-4 h-4 animate-spin" /> : <Icons.Download className="w-4 h-4" />}
            <span>Tải Word</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-auto p-6 sm:p-10 bg-[#f8fafc] print:p-0 print:bg-white print:overflow-visible custom-scrollbar ${!isEditable ? 'bg-slate-50 cursor-not-allowed' : ''}`}>
        {viewMode === 'preview' ? (
          <article 
            id="printable-content"
            className="prose prose-lg prose-slate max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-100
            prose-headings:font-bold prose-headings:text-slate-800 prose-headings:tracking-tight
            prose-p:leading-8 prose-p:text-slate-600 
            prose-strong:text-slate-900 prose-strong:font-bold
            prose-pre:bg-slate-900 prose-pre:rounded-xl prose-pre:shadow-lg
            prose-img:rounded-xl prose-img:shadow-md
            print:shadow-none print:border-none print:p-0 print:max-w-none
          ">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                img: ({src, alt}) => {
                  if (alt === "DocImagePlaceholder" && src) {
                      const id = src;
                      const hasImage = !!imageMap[id];
                      const isActive = activePlaceholderId === id;
                      let containerRef: HTMLDivElement | null = null;
                      
                      return (
                          <div 
                              ref={el => containerRef = el}
                              tabIndex={isEditable ? 0 : -1}
                              onFocus={() => isEditable && setActivePlaceholderId(id)}
                              onMouseDown={() => isEditable && setActivePlaceholderId(id)}
                              onPaste={(e) => handleContainerPaste(e, id)}
                              className={`my-10 group relative rounded-2xl border-2 border-dashed p-1 flex flex-col items-center justify-center transition-all duration-300 outline-none scroll-mt-32 print:border-none print:p-0 print:my-4
                                ${!isEditable ? 'border-red-100 bg-red-50/30 grayscale opacity-80 pointer-events-none select-none' : ''}
                                ${hasImage 
                                    ? 'border-indigo-200 bg-indigo-50/10 print:bg-transparent' 
                                    : isActive && isEditable
                                        ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-indigo-50/50 scale-[1.02] shadow-xl'
                                        : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-white'
                                }`}
                          >
                             {!isEditable && (
                               <div className="absolute inset-0 z-20 flex items-center justify-center">
                                  <div className="flex items-center space-x-2 text-red-500 font-bold bg-white/90 px-4 py-2 rounded-full shadow-lg border border-red-100 backdrop-blur">
                                    <Icons.Lock className="w-4 h-4" />
                                    <span className="text-sm">ĐÃ KHÓA</span>
                                  </div>
                               </div>
                             )}

                             {hasImage ? (
                                 <div className="relative group/image w-full max-w-xl transition-transform duration-300 print:max-w-none rounded-xl overflow-hidden bg-white shadow-sm">
                                     <img src={`data:image/png;base64,${imageMap[id]}`} alt="Selected" className="max-w-full h-auto mx-auto print:shadow-none" />
                                     {/* Strictly hide delete button when locked */}
                                     {isEditable && (
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center print:hidden cursor-pointer">
                                         <button 
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               const newMap = {...imageMap};
                                               delete newMap[id];
                                               setImageMap(newMap);
                                           }}
                                           className="bg-white/90 backdrop-blur text-red-600 hover:bg-red-50 p-3 rounded-full shadow-xl transform hover:scale-110 transition-all border border-red-100"
                                           title="Xóa ảnh"
                                         >
                                             <Icons.Trash2 className="w-5 h-5" />
                                         </button>
                                       </div>
                                     )}
                                 </div>
                             ) : (
                                 <div className={`text-center w-full cursor-default py-8 print:hidden rounded-xl bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-50 ${!isEditable ? 'opacity-40 blur-[1px]' : ''}`}>
                                     <div className={`mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 transition-all duration-300 shadow-sm ${isActive && isEditable ? 'bg-indigo-600 text-white shadow-indigo-300 scale-110' : 'bg-white text-indigo-400 border border-indigo-100'}`}>
                                         {isActive && isEditable ? <Icons.ImagePlus className="w-7 h-7" /> : <Icons.Image className="w-7 h-7" />}
                                     </div>
                                     <h4 className="text-lg font-bold text-slate-800 mb-1">
                                        {isActive && isEditable ? "Vị trí này đang chọn" : `Vị trí Hình ảnh #${id}`}
                                     </h4>
                                     <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto font-medium">
                                        {isEditable 
                                            ? isActive ? "Nhấn Ctrl + V để dán ảnh ngay!" : "Click vào đây rồi dán ảnh (Ctrl+V)"
                                            : "Cần mở khóa để thêm hình ảnh."}
                                     </p>
                                     
                                     <div className={`flex flex-wrap gap-3 justify-center items-center ${!isEditable ? 'pointer-events-none' : ''}`}>
                                         <button 
                                            disabled={!isEditable}
                                            onClick={() => handlePasteButtonClick(id, containerRef)}
                                            className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                         >
                                             Dán (Ctrl+V)
                                         </button>
                                         <span className="text-slate-300 font-medium text-xs uppercase tracking-wider">hoặc</span>
                                         <label className={`px-5 py-2.5 bg-indigo-600 border border-transparent rounded-lg text-sm font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 cursor-pointer transition-all hover:-translate-y-0.5 ${!isEditable ? 'opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400 hover:transform-none shadow-none' : ''}`}>
                                             Tải ảnh lên
                                             <input 
                                                type="file" 
                                                className="hidden" 
                                                disabled={!isEditable}
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if(e.target.files?.[0]) handleImageUpload(id, e.target.files[0]);
                                                }} 
                                             />
                                         </label>
                                     </div>
                                 </div>
                             )}
                          </div>
                      );
                  }
                  return <div className="text-red-500 font-bold border border-red-300 p-2 rounded bg-red-50 print:hidden">Image Error: {alt}</div>;
                }
              }}
            >
              {processedMarkdown}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="max-w-4xl mx-auto h-full relative group">
            <textarea 
                readOnly={!isEditable}
                className={`w-full h-full min-h-[500px] resize-none font-mono text-sm text-slate-700 bg-white p-8 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 print:hidden leading-relaxed
                  ${!isEditable ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none' : 'border-slate-200'}`}
                value={markdown}
                onChange={() => {}} // No-op if locked
            />
             {!isEditable && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100/30 backdrop-blur-[2px] rounded-2xl">
                <div className="bg-white/90 border border-red-200 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-2">
                  <div className="p-3 bg-red-100 text-red-600 rounded-full mb-2">
                     <Icons.Lock className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-xl text-slate-800">MÃ NGUỒN ĐÃ BỊ KHÓA</h3>
                  <p className="text-slate-500 max-w-xs">Bạn cần nhập mã kích hoạt để chỉnh sửa code LaTeX trực tiếp.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};