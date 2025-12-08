import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultViewer } from './components/ResultViewer';
import { Icons } from './components/Icon';
import { convertFileToMarkdown } from './services/geminiService';
import { ProcessingStatus, FileData, HistoryItem } from './types';
import { HistoryPanel } from './components/HistoryPanel';

// MÃ KÍCH HOẠT DO ADMIN CUNG CẤP
const ADMIN_ACCESS_CODE = "toanthaymanh0973852062";
const MAX_TRIAL_USES = 10;

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Trạng thái dùng thử & Kích hoạt
  const [usageCount, setUsageCount] = useState(0);
  const [isAppActivated, setIsAppActivated] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);

  // Mặc định luôn là FALSE (Khóa) - Chế độ Chỉ xem
  const [isEditable, setIsEditable] = useState(false);

  // Khởi tạo dữ liệu từ LocalStorage
  useEffect(() => {
    // 1. Load Activation Status
    const storedActivation = localStorage.getItem('doculatex_activated');
    if (storedActivation === 'true') {
      setIsAppActivated(true);
    }

    // 2. Load Usage Count
    const storedCount = localStorage.getItem('doculatex_usage_count');
    if (storedCount) {
      setUsageCount(parseInt(storedCount, 10));
    }
  }, []);

  // Xử lý kích hoạt ứng dụng (Mở khóa vĩnh viễn)
  const handleActivateApp = (code: string) => {
    if (code === ADMIN_ACCESS_CODE) {
      setIsAppActivated(true);
      localStorage.setItem('doculatex_activated', 'true');
      setShowActivationModal(false);
      setIsEditable(true); // Tự động mở khóa edit luôn khi kích hoạt
      alert("🎉 KÍCH HOẠT THÀNH CÔNG!\nCảm ơn bạn đã ủng hộ tác giả Lê Đức Mạnh.");
      return true;
    } else {
      alert("⛔ Mã kích hoạt không đúng.\nVui lòng kiểm tra lại hoặc liên hệ tác giả.");
      return false;
    }
  };

  // Handle Edit/Lock toggle
  const toggleEditMode = () => {
    if (isEditable) {
      // Nếu đang mở, bấm vào để KHÓA lại ngay lập tức
      setIsEditable(false);
    } else {
      // Nếu đang khóa, mở modal nhập mã
      if (isAppActivated) {
          setIsEditable(true); // Nếu đã kích hoạt VIP rồi thì mở luôn
      } else {
          setShowActivationModal(true); // Nếu chưa VIP thì mở bảng nhập mã
      }
    }
  };

  // Save successful conversion to history
  const saveToHistory = (fileName: string, markdown: string) => {
    try {
      const newItem: HistoryItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        fileName,
        timestamp: Date.now(),
        markdown
      };

      const stored = localStorage.getItem('doculatex_history');
      const history = stored ? JSON.parse(stored) : [];
      
      // Keep only last 50 items to prevent storage overflow
      const newHistory = [newItem, ...history].slice(0, 50);
      
      localStorage.setItem('doculatex_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.markdown);
    setFileData({
      file: new File([""], item.fileName, { type: "text/plain" }),
      previewUrl: "", // History items don't strictly retain the original file blob
      base64: "",
      mimeType: "history/restored"
    });
    setStatus(ProcessingStatus.SUCCESS);
    setShowHistory(false);
    setIsEditable(false); // LUÔN KHÓA KHI TẢI LỊCH SỬ
  };

  // Helper to optimize and read file
  const processFile = (file: File): Promise<{ base64: string; preview: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      // 1. If it's a PDF, we can't easily compress client-side without heavy libs, so send as is.
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve({ base64, preview: result, mimeType: file.type });
        };
        reader.onerror = () => reject(new Error("FILE_ERROR: Failed to read PDF file"));
        reader.readAsDataURL(file);
        return;
      }

      // 2. If it's an Image, optimize it (Resize + Compress)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          
          img.onload = () => {
             // Create canvas for resizing
             const canvas = document.createElement('canvas');
             const MAX_WIDTH = 1600; // Optimal width for OCR speed vs accuracy
             const scale = MAX_WIDTH / img.width;
             
             let finalWidth = img.width;
             let finalHeight = img.height;

             // Only scale down if image is larger than limit
             if (scale < 1) {
                finalWidth = MAX_WIDTH;
                finalHeight = img.height * scale;
             }

             canvas.width = finalWidth;
             canvas.height = finalHeight;

             const ctx = canvas.getContext('2d');
             if (ctx) {
                 ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
                 
                 // Compress to JPEG with 0.7 quality (Good balance)
                 // This reduces 5MB PNG -> ~300KB JPEG
                 const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                 const optimizedBase64 = optimizedDataUrl.split(',')[1];
                 
                 resolve({ 
                     base64: optimizedBase64, 
                     preview: optimizedDataUrl,
                     mimeType: 'image/jpeg' // Always convert to jpeg for consistency
                 });
             } else {
                 reject(new Error("FILE_ERROR: Canvas context failed"));
             }
          };
          img.onerror = () => reject(new Error("FILE_ERROR: Invalid image data"));
        };
        reader.onerror = () => reject(new Error("FILE_ERROR: Failed to read image file"));
        return;
      }

      reject(new Error("FILE_ERROR: Unsupported file type"));
    });
  };

  const handleFileSelect = async (file: File) => {
    // --- KIỂM TRA GIỚI HẠN DÙNG THỬ ---
    if (!isAppActivated && usageCount >= MAX_TRIAL_USES) {
      setShowActivationModal(true);
      return;
    }
    // ----------------------------------

    try {
      setStatus(ProcessingStatus.PROCESSING);
      setError(null);
      setResult('');
      setIsEditable(false); // LUÔN KHÓA KHI BẮT ĐẦU FILE MỚI

      let processedData;
      try {
        processedData = await processFile(file);
      } catch (readErr) {
        throw new Error("FILE_ERROR: Could not process the uploaded file. It might be corrupted.");
      }
      
      const { base64, preview, mimeType } = processedData;
      
      setFileData({
        file,
        previewUrl: preview,
        base64,
        mimeType: mimeType
      });

      try {
        const response = await convertFileToMarkdown(base64, mimeType);
        setResult(response.markdown);
        setStatus(ProcessingStatus.SUCCESS);
        saveToHistory(file.name, response.markdown);

        // --- TĂNG BỘ ĐẾM DÙNG THỬ ---
        if (!isAppActivated) {
          const newCount = usageCount + 1;
          setUsageCount(newCount);
          localStorage.setItem('doculatex_usage_count', newCount.toString());
        }
        // -----------------------------

      } catch (apiErr: any) {
        throw apiErr;
      }

    } catch (err: any) {
      console.error("Processing Logic Error:", err);
      
      const rawMessage = err.message || "Unknown error";
      let displayMessage = "Đã xảy ra lỗi không mong muốn.";

      if (rawMessage.startsWith("FILE_ERROR")) {
        displayMessage = "Lỗi File: Không thể đọc file. Vui lòng thử file khác.";
      } else if (rawMessage.startsWith("AUTH_ERROR")) {
        displayMessage = "Lỗi xác thực: Thiếu hoặc sai API Key.";
      } else if (rawMessage.startsWith("QUOTA_ERROR")) {
        displayMessage = "Hệ thống bận: Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau một lát.";
      } else if (rawMessage.startsWith("SERVER_ERROR")) {
        displayMessage = "Lỗi máy chủ: Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau.";
      } else if (rawMessage.startsWith("SAFETY_ERROR")) {
        displayMessage = "Chính sách nội dung: Tài liệu bị bộ lọc an toàn chặn và không thể xử lý.";
      } else if (rawMessage.startsWith("API_ERROR")) {
        displayMessage = "Lỗi xử lý AI: " + rawMessage.replace("API_ERROR:", "").trim();
      } else {
        displayMessage = rawMessage;
      }

      setError(displayMessage);
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleReset = () => {
    setFileData(null);
    setResult('');
    setStatus(ProcessingStatus.IDLE);
    setError(null);
    setIsEditable(false); // LUÔN KHÓA KHI RESET
  };

  // --- GLOBAL PASTE HANDLER FOR UPLOAD (IDLE STATE) ---
  useEffect(() => {
    const handleGlobalPasteUpload = (e: ClipboardEvent) => {
      // Chỉ hoạt động khi đang ở màn hình chính (chưa có kết quả)
      if (status !== ProcessingStatus.IDLE) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            // Tạo tên file giả lập
            const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: blob.type });
            handleFileSelect(file);
          }
          return;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPasteUpload);
    return () => {
      window.removeEventListener('paste', handleGlobalPasteUpload);
    };
  }, [status, usageCount, isAppActivated]); // Re-bind if status changes


  return (
    <div className="relative min-h-screen flex flex-col font-sans text-slate-900 bg-[#FAFAFA] selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Modern Dynamic Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-indigo-200/40 to-purple-200/40 blur-[100px] animate-blob" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-blue-200/40 to-cyan-200/40 blur-[100px] animate-blob animation-delay-2000" />
         <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-pink-200/30 blur-[100px] animate-blob animation-delay-4000" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Floating Header */}
      <header className="sticky top-4 z-50 px-4 md:px-0 mb-4">
        <div className="max-w-4xl mx-auto bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-slate-200/20 rounded-full px-6 py-3 flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:bg-white/80">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleReset}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Icons.FileText className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight group-hover:from-indigo-700 group-hover:to-violet-700 transition-all">
                DocuLatex
              </h1>
              {/* STATUS BADGE */}
              {isAppActivated ? (
                <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 uppercase tracking-wider">
                  ★ Phiên bản VIP
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Dùng thử: {usageCount}/{MAX_TRIAL_USES}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
             {/* Edit/Lock Button */}
             <button
               onClick={toggleEditMode}
               className={`hidden sm:flex items-center space-x-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm
                 ${isEditable 
                   ? 'bg-green-500 text-white border-green-600 hover:bg-green-600 shadow-green-500/30' 
                   : 'bg-red-500 text-white border-red-600 hover:bg-red-600 shadow-red-500/30'
                 }`}
               title={isEditable ? "Nhấn để khóa lại" : "Nhấn để nhập mã mở khóa"}
             >
               {isEditable ? <Icons.Check className="w-3 h-3" /> : <Icons.Lock className="w-3 h-3" />}
               <span>{isEditable ? 'ĐÃ MỞ KHÓA' : 'ĐÃ KHÓA'}</span>
             </button>

             {/* History Button */}
             <button 
                onClick={() => setShowHistory(true)}
                className="p-2 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                title="Lịch sử chuyển đổi"
             >
                <Icons.History className="w-5 h-5" />
             </button>

             <div className="hidden sm:flex items-center space-x-2 text-xs font-bold px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100/50 shadow-sm">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
               <span>Gemini 3 Pro</span>
             </div>
          </div>
        </div>
      </header>

      {/* Activation Notification Banner (Only if NOT Activated) */}
      {!isAppActivated && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4 animate-in slide-in-from-bottom-full duration-700">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl flex items-center justify-between border border-slate-700/50 hover:scale-105 transition-transform duration-300">
            <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center animate-pulse">
                 <Icons.Lock className="w-4 h-4 text-white" />
               </div>
               <div className="flex flex-col text-sm">
                  <span className="font-bold text-amber-400">Dùng thử miễn phí</span>
                  <span className="text-slate-300 text-[10px]">Còn {MAX_TRIAL_USES - usageCount} lượt. Mở khóa ngay!</span>
               </div>
            </div>
            <button
              onClick={() => setShowActivationModal(true)}
              className="px-4 py-1.5 bg-white text-slate-900 font-bold rounded-full text-xs hover:bg-amber-400 hover:text-white transition-colors shadow-lg"
            >
              Nhập mã
            </button>
          </div>
        </div>
      )}

      {/* History Panel */}
      <HistoryPanel 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        onSelect={loadHistoryItem}
      />

      {/* Activation Modal */}
      {showActivationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-100">
             <button 
               onClick={() => setShowActivationModal(false)}
               className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full transition-colors z-10"
             >
                <Icons.X className="w-5 h-5" />
             </button>

            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white text-center">
               <Icons.Lock className="w-12 h-12 mx-auto mb-3 opacity-90" />
               <h3 className="text-2xl font-bold">KÍCH HOẠT BẢN QUYỀN</h3>
               <p className="opacity-90 text-sm mt-1">
                 {usageCount >= MAX_TRIAL_USES 
                   ? `Bạn đã hết ${MAX_TRIAL_USES} lần dùng thử.` 
                   : `Bạn đang ở lượt thứ ${usageCount}/${MAX_TRIAL_USES}.`}
               </p>
            </div>
            
            <div className="p-8 space-y-6">
               <div className="text-center space-y-2">
                 <p className="text-slate-600">Để mở khóa toàn bộ tính năng và sử dụng trọn đời, vui lòng liên hệ tác giả để nhận <b>Mã kích hoạt</b>.</p>
                 
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                    <p className="font-bold text-slate-800 text-lg">Tác giả: LÊ ĐỨC MẠNH</p>
                    <p className="text-indigo-600 font-bold text-xl mt-1 flex items-center justify-center gap-2">
                       <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">Zalo</span> 
                       0973852062
                    </p>
                 </div>
               </div>

               <div className="pt-2">
                 <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Nhập mã kích hoạt:</label>
                 <div className="flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Nhập mã tại đây..."
                     className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-slate-800 tracking-widest placeholder:font-normal placeholder:tracking-normal"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         handleActivateApp((e.target as HTMLInputElement).value);
                       }
                     }}
                     id="activationCodeInput"
                   />
                   <button 
                     onClick={() => {
                        const input = document.getElementById('activationCodeInput') as HTMLInputElement;
                        handleActivateApp(input.value);
                     }}
                     className="bg-indigo-600 text-white px-6 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                   >
                     MỞ
                   </button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        
        {/* IDLE STATE: Hero & Upload */}
        {status === ProcessingStatus.IDLE && (
          <div className="max-w-4xl mx-auto mt-12 sm:mt-20 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center space-x-2 bg-white/60 backdrop-blur border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm mb-2">
                 <span className="text-amber-500">✨</span>
                 <span>Xin chào! Bắt đầu chuyển đổi ngay.</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                Chuyển đổi <span className="text-red-500">PDF</span> sang <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">Word & LaTeX</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
                Giữ nguyên định dạng công thức toán học <span className="font-mono text-sm bg-slate-100 px-1 py-0.5 rounded text-indigo-600">$E=mc^2$</span>. <br/>
                Hỗ trợ điền hình ảnh vào đúng vị trí trong văn bản.
              </p>
            </div>
            
            <div className="transform transition-all duration-500 hover:scale-[1.01]">
              <FileUpload onFileSelect={handleFileSelect} />
              
              {!isAppActivated && (
                <div className="text-center mt-4">
                  <p className="text-sm font-medium text-slate-400">
                    Bạn còn <span className="text-indigo-600 font-bold text-base">{MAX_TRIAL_USES - usageCount}</span> lượt dùng thử miễn phí.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              {[
                { icon: Icons.Code, color: "text-emerald-600", bg: "bg-emerald-50", label: "Toán học chuẩn LaTeX", desc: "Tự động nhận diện công thức" },
                { icon: Icons.Image, color: "text-violet-600", bg: "bg-violet-50", label: "Hỗ trợ Hình ảnh", desc: "Upload hoặc dán hình minh họa" },
                { icon: Icons.FileText, color: "text-blue-600", bg: "bg-blue-50", label: "Xuất file Word", desc: "Bố cục chuẩn, sẵn sàng in ấn" }
              ].map((item, idx) => (
                <div key={idx} className="group flex flex-col items-center text-center p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-slate-800 text-lg mb-1">{item.label}</span>
                  <span className="text-sm text-slate-500">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROCESSING STATE */}
        {status === ProcessingStatus.PROCESSING && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
             <div className="relative mb-10">
               {/* Custom Spinner */}
               <div className="w-32 h-32 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                  <div className="absolute inset-4 rounded-full border-4 border-purple-100"></div>
                  <div className="absolute inset-4 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin animation-delay-500"></div>
               </div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Icons.Loader className="w-8 h-8 text-indigo-600 animate-pulse" />
               </div>
             </div>
             <h3 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Đang phân tích tài liệu</h3>
             <p className="text-slate-500 text-lg max-w-md text-center">
               AI đang đọc công thức toán và định vị các hình vẽ...
             </p>
           </div>
        )}

        {/* SUCCESS / ERROR STATE */}
        {(status === ProcessingStatus.SUCCESS || status === ProcessingStatus.ERROR) && (
          <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Status Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/60 shadow-lg shadow-slate-200/30 sticky top-20 z-40 transition-all max-w-5xl mx-auto w-full">
              <div className="flex items-center space-x-4 w-full sm:w-auto overflow-hidden">
                <div className="relative group shrink-0">
                  {fileData?.mimeType.includes('image') ? (
                    <img src={fileData.previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-slate-200 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100 shadow-sm">
                      <Icons.FileText className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 truncate text-sm sm:text-base">{fileData?.file.name}</h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border
                      ${status === ProcessingStatus.SUCCESS 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {status === ProcessingStatus.SUCCESS ? 'Thành công' : 'Thất bại'}
                    </span>
                    {!isEditable && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border bg-red-100 text-red-700 border-red-200 animate-pulse">
                        <Icons.Lock className="w-3 h-3 mr-1" />
                        ĐÃ KHÓA
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                  {/* Mobile Edit Button */}
                 <button
                   onClick={toggleEditMode}
                   className={`sm:hidden flex items-center justify-center w-10 h-10 rounded-full border transition-all shadow-md
                     ${isEditable 
                       ? 'bg-green-500 text-white border-green-600' 
                       : 'bg-red-500 text-white border-red-600'
                     }`}
                 >
                   {isEditable ? <Icons.Check className="w-4 h-4" /> : <Icons.Lock className="w-4 h-4" />}
                 </button>

                 <button 
                  onClick={handleReset}
                  className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 rounded-full transition-all shadow-sm active:scale-95 flex items-center"
                >
                  <Icons.UploadCloud className="w-4 h-4 mr-2" />
                  Làm file khác
                </button>
              </div>
            </div>

            {/* Error Message */}
            {status === ProcessingStatus.ERROR && (
               <div className="bg-white border border-red-100 rounded-3xl p-10 text-center shadow-2xl shadow-red-500/5 max-w-2xl mx-auto mt-10">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <Icons.X className="w-10 h-10" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 mb-2">Không thể xử lý file này</h3>
                 <p className="text-slate-500 max-w-md mx-auto mb-8">{error}</p>
                 <button onClick={handleReset} className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 hover:bg-red-700 hover:shadow-red-600/30 transition-all transform hover:-translate-y-1">
                   Thử lại ngay
                 </button>
               </div>
            )}

            {/* Success Workspace */}
            {status === ProcessingStatus.SUCCESS && (
              <div className="max-w-5xl mx-auto w-full h-full">
                <div className="flex flex-col h-full rounded-3xl shadow-2xl shadow-slate-200/50 bg-white border border-slate-100 overflow-hidden">
                  <ResultViewer 
                      markdown={result} 
                      isEditable={isEditable}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;