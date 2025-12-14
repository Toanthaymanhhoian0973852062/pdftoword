import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultViewer } from './components/ResultViewer';
import { Icons } from './components/Icon';
import { convertFileToMarkdown, GeminiInput, getApiKey } from './services/geminiService'; // Import getApiKey
import { ProcessingStatus, FileData, HistoryItem } from './types';
import { HistoryPanel } from './components/HistoryPanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ActivationModal } from './components/ActivationModal'; 
import * as pdfjsLib from 'pdfjs-dist';

// CẤU HÌNH HÌNH ẢNH
const logoUrl = "/logo.png";
const avatarUrl = "/avatar.png"; 
const qrUrl = "https://img.vietqr.io/image/MB-0973852062-compact.png?amount=&addInfo=Ung%20ho%20Toan%20Thay%20Manh&accountName=LE%20DUC%20MANH";

// Set worker source globally for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

// MÃ KÍCH HOẠT ĐỂ MỞ KHÓA CHỈNH SỬA (ADMIN CODE)
const EDIT_ACCESS_CODE = "toanthaymanh0973852062";

// --- WEB WORKER CODE ---
const IMAGE_WORKER_CODE = `
  self.onmessage = async (e) => {
    const { file, id, maxWidth, quality } = e.data;
    try {
      const bitmap = await createImageBitmap(file);
      let width = bitmap.width;
      let height = bitmap.height;
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d', { alpha: false }); 
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality });
      const reader = new FileReader();
      reader.onloadend = () => {
        self.postMessage({ id, success: true, base64: reader.result, width, height });
      };
      reader.onerror = (err) => self.postMessage({ id, success: false, error: err.message });
      reader.readAsDataURL(blob);
    } catch (error) {
      self.postMessage({ id, success: false, error: error.message });
    }
  };
`;

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  
  // Modals state
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false); 
  const [hasApiKey, setHasApiKey] = useState(false);

  // Trial & Activation State
  const [trialCount, setTrialCount] = useState(0);
  const [isVIP, setIsVIP] = useState(false);

  const [optimizationStatus, setOptimizationStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showUnlockEditModal, setShowUnlockEditModal] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker, Check Key, and Check Trial Status
  useEffect(() => {
    const blob = new Blob([IMAGE_WORKER_CODE], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    // Check API Key bằng hàm chung để đảm bảo tính nhất quán (phải có AIza)
    const currentKey = getApiKey();
    if (currentKey) {
       setHasApiKey(true);
    } else {
       setHasApiKey(false);
       setShowApiKeyModal(true); // Mở Modal ngay nếu không có key hợp lệ
    }

    // Check Trial/VIP Status
    const storedTrial = localStorage.getItem('doculatex_trial_count');
    const storedVIP = localStorage.getItem('doculatex_is_vip');
    
    if (storedVIP === 'true') {
        setIsVIP(true);
    } else {
        setTrialCount(storedTrial ? parseInt(storedTrial) : 0);
    }

    return () => worker.terminate();
  }, []);

  // Timer & Artificial Progress
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval>;
    if (status === ProcessingStatus.PROCESSING) {
      timerInterval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
      if (!optimizationStatus.includes("trang") && !optimizationStatus.includes("Đọc")) {
         if (!progressIntervalRef.current) {
            progressIntervalRef.current = setInterval(() => {
              setProgress(prev => Math.min(prev + (prev < 50 ? 2 : prev < 80 ? 0.5 : 0.1), 95));
            }, 200);
         }
      }
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
    return () => {
      clearInterval(timerInterval);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [status, optimizationStatus]);

  // Unlock Edit Function
  const handleUnlockEdit = (code: string) => {
    if (code === EDIT_ACCESS_CODE) {
      setIsEditable(true);
      setShowUnlockEditModal(false);
      alert("🔓 ĐÃ MỞ KHÓA CHỈNH SỬA!");
    } else {
      alert("⛔ Mã không đúng. Vui lòng liên hệ Admin.");
    }
  };

  const handleActivateApp = () => {
      setIsVIP(true);
      localStorage.setItem('doculatex_is_vip', 'true');
  };

  const toggleEditMode = () => isEditable ? setIsEditable(false) : setShowUnlockEditModal(true);

  // Save History
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
      localStorage.setItem('doculatex_history', JSON.stringify([newItem, ...history].slice(50)));
    } catch (e) { console.error("Failed to save history", e); }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.markdown);
    setFileData({
      file: new File([""], item.fileName, { type: "text/plain" }),
      previewUrl: "", base64: "", mimeType: "history/restored", pages: [] 
    });
    setPendingFiles([]);
    setStatus(ProcessingStatus.SUCCESS);
    setShowHistory(false);
    setIsEditable(false);
  };

  // Image Worker Processing
  const processImageWithWorker = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject(new Error("Worker not initialized"));
      const id = Math.random().toString(36).substring(7);
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          workerRef.current?.removeEventListener('message', handleMessage);
          e.data.success ? resolve(e.data.base64) : reject(new Error(e.data.error));
        }
      };
      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ file, id, maxWidth: 1280, quality: 0.6 });
    });
  };

  const processSingleFile = async (file: File): Promise<{ inputs: GeminiInput[], pages: string[] }> => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pagesToProcess = Math.min(pdf.numPages, 30);
      const results: { index: number, data: string }[] = [];
      const BATCH_SIZE = 6; 

      for (let i = 1; i <= pagesToProcess; i += BATCH_SIZE) {
         setOptimizationStatus(`Đang đọc ${file.name} (Trang ${i}-${Math.min(i + BATCH_SIZE - 1, pagesToProcess)}/${pagesToProcess})...`);
         const batchPromises = [];
         for (let j = 0; j < BATCH_SIZE && (i + j) <= pagesToProcess; j++) {
            const pageNum = i + j;
            batchPromises.push((async () => {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.3 }); 
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false }); 
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                    context.fillStyle = "#FFFFFF"; 
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({ canvasContext: context, viewport }).promise;
                    return { index: pageNum, data: canvas.toDataURL('image/jpeg', 0.6) }; 
                }
                return null;
            })());
         }
         (await Promise.all(batchPromises)).forEach(res => res && results.push(res));
         await new Promise(r => setTimeout(r, 0)); 
      }
      results.sort((a, b) => a.index - b.index);
      return { 
        inputs: results.map(r => ({ mimeType: 'image/jpeg', data: r.data.split(',')[1] })), 
        pages: results.map(r => r.data) 
      };
    }
    if (file.type.startsWith('image/')) {
        setOptimizationStatus(`Đang xử lý ${file.name}...`);
        const optimizedDataUrl = await processImageWithWorker(file);
        return { inputs: [{ mimeType: 'image/jpeg', data: optimizedDataUrl.split(',')[1] }], pages: [optimizedDataUrl] };
    }
    throw new Error(`FILE_ERROR: Định dạng file ${file.name} không hỗ trợ`);
  };

  const handleFilesSelected = (files: File[]) => {
    setPendingFiles(prev => [...prev, ...files]);
    setError('');
  };
  const removePendingFile = (index: number) => setPendingFiles(prev => prev.filter((_, i) => i !== index));

  const handleStartConversion = async () => {
    if (pendingFiles.length === 0) return;
    
    // 1. Check API Key first using Shared Logic (Local OR Env)
    // Đảm bảo lấy key mới nhất vừa nhập, kiểm tra định dạng AIza
    const currentApiKey = getApiKey();
    if (!currentApiKey) {
        setHasApiKey(false);
        setShowApiKeyModal(true);
        setError("Vui lòng nhập API Key để tiếp tục.");
        return;
    } else {
        // Đồng bộ trạng thái UI nếu key hợp lệ
        setHasApiKey(true);
    }

    // 2. Check Trial / VIP Status
    if (!isVIP) {
        if (trialCount >= 3) {
            setShowActivationModal(true);
            return;
        }
        // Increment trial count
        const newCount = trialCount + 1;
        setTrialCount(newCount);
        localStorage.setItem('doculatex_trial_count', newCount.toString());
    }

    try {
      setStatus(ProcessingStatus.PROCESSING);
      setError(''); setResult(''); setIsEditable(false); setProgress(0); setElapsedTime(0);
      const allInputs: GeminiInput[] = [];
      const allPages: string[] = [];

      setOptimizationStatus('Đang xử lý đồng thời các tệp tin...');
      
      const filePromises = pendingFiles.map(async (file, index) => {
         const result = await processSingleFile(file);
         setProgress(prev => Math.min(prev + (40 / pendingFiles.length), 40));
         return result;
      });

      const results = await Promise.all(filePromises);

      results.forEach(({ inputs, pages }) => {
        allInputs.push(...inputs);
        allPages.push(...pages);
      });

      setOptimizationStatus('Đang gửi dữ liệu lên AI (Gemini Pro)...');
      setProgress(45);
      if (allInputs.length === 0) throw new Error("Không có dữ liệu hợp lệ.");

      setFileData({
        file: pendingFiles[0],
        previewUrl: `data:image/jpeg;base64,${allInputs[0].data}`,
        base64: allInputs[0].data,
        mimeType: allInputs[0].mimeType,
        pages: allPages
      });

      const response = await convertFileToMarkdown(allInputs);
      setProgress(100);
      setResult(response.markdown);
      setStatus(ProcessingStatus.SUCCESS);
      saveToHistory(pendingFiles.length > 1 ? `Gộp ${pendingFiles.length} file...` : pendingFiles[0].name, response.markdown);
      setPendingFiles([]);
    } catch (err: any) {
      console.error(err);
      setProgress(0);
      setError(err.message || "Đã xảy ra lỗi không mong muốn.");
      setStatus(ProcessingStatus.ERROR);
    } finally { setOptimizationStatus(''); }
  };

  const handleReset = () => {
    setFileData(null); setResult(''); setStatus(ProcessingStatus.IDLE);
    setError(''); setIsEditable(false); setPendingFiles([]); setProgress(0); setElapsedTime(0);
  };

  // Paste Handler
  useEffect(() => {
    const handleGlobalPasteUpload = (e: ClipboardEvent) => {
      if (status !== ProcessingStatus.IDLE) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const newFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) newFiles.push(new File([blob], `pasted_image_${Date.now()}.png`, { type: blob.type }));
        }
      }
      if (newFiles.length > 0) handleFilesSelected(newFiles);
    };
    window.addEventListener('paste', handleGlobalPasteUpload);
    return () => window.removeEventListener('paste', handleGlobalPasteUpload);
  }, [status]);

  return (
    <div className="relative min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50/50 selection:bg-blue-500 selection:text-white overflow-hidden">
      
      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30 bg-noise z-0 mix-blend-soft-light"></div>

      {/* Modern Background Blurs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-r from-blue-300/20 to-sky-300/20 blur-[120px] animate-blob" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-r from-cyan-300/20 to-teal-300/20 blur-[120px] animate-blob animation-delay-2000" />
      </div>

      {/* Floating Modern Header */}
      <header className="sticky top-4 z-50 px-4 md:px-6">
        <div className="max-w-7xl mx-auto bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/20 rounded-full px-6 py-3 flex items-center justify-between transition-all duration-300">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleReset}>
            <div className="relative">
                <div className="absolute inset-0 bg-blue-600 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="relative w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg shadow-blue-900/20 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
                <div className="hidden w-12 h-12 bg-[#003580] rounded-full flex items-center justify-center text-white shadow-lg">
                    <Icons.FileText className="w-6 h-6" />
                </div>
            </div>

            <div className="flex flex-col">
              <h1 className="text-sm sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-blue-700 tracking-tight group-hover:from-blue-700 group-hover:to-cyan-600 transition-all">
                Toán Thầy Mạnh - Hội An
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
             {/* Trial / VIP Badge */}
             <div 
               className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-sm ${isVIP ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
               onClick={() => !isVIP && setShowActivationModal(true)}
               title={isVIP ? "Bản quyền VIP" : "Nhấp để kích hoạt"}
             >
                {isVIP ? <Icons.Crown className="w-4 h-4 fill-amber-500 text-amber-600" /> : <Icons.ShieldCheck className="w-4 h-4" />}
                <span className="hidden sm:inline">{isVIP ? 'VIP PRO' : `Dùng thử ${trialCount}/3`}</span>
             </div>

             <button
               onClick={toggleEditMode}
               className={`hidden lg:flex items-center space-x-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm active:scale-95
                 ${isEditable 
                   ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                   : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                 }`}
             >
               {isEditable ? <Icons.Check className="w-3.5 h-3.5" /> : <Icons.Lock className="w-3.5 h-3.5" />}
               <span>{isEditable ? 'ĐÃ MỞ KHÓA' : 'ĐÃ KHÓA'}</span>
             </button>

             {/* API Key Button */}
             <button 
                onClick={() => setShowApiKeyModal(true)}
                className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all ${hasApiKey ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 animate-pulse'}`}
                title="Cài đặt API Key"
             >
                <Icons.Key className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Key</span>
             </button>

             {/* Author Button */}
             <button 
                onClick={() => setShowAuthorModal(true)}
                className="flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                title="Thông tin tác giả"
             >
                <Icons.User className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Tác giả</span>
             </button>

             {/* Donate Button */}
             <button 
                onClick={() => setShowDonateModal(true)}
                className="flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-105 transition-all"
                title="Ủng hộ tác giả"
             >
                <Icons.Heart className="w-4 h-4 fill-current" />
                <span className="text-xs font-bold hidden sm:inline">Donate</span>
             </button>

             <button 
                onClick={() => setShowHistory(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all hover:shadow-md"
                title="Lịch sử"
             >
                <Icons.History className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* Panels */}
      <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} onSelect={loadHistoryItem} />
      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => {
            // Nếu bắt buộc (chưa có key), chỉ đóng khi đã có key hợp lệ
            // Gọi getApiKey để check lại xem key vừa lưu có chuẩn không
            const key = getApiKey();
            if (hasApiKey || key) {
                setShowApiKeyModal(false);
            }
        }}
        forceRequired={!hasApiKey}
        onSuccess={() => {
            const key = getApiKey();
            setHasApiKey(!!key);
        }}
      />
      
      {/* Activation Modal */}
      <ActivationModal 
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        onActivate={handleActivateApp}
      />
      
      {showUnlockEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/50 relative">
             <button onClick={() => setShowUnlockEditModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"><Icons.X className="w-5 h-5" /></button>
            <div className="p-8 text-center">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Icons.Lock className="w-8 h-8" /></div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Mở khóa Chỉnh sửa</h3>
               <p className="text-slate-500 text-sm mb-6">Nhập mã Admin để mở tính năng Edit trực tiếp.</p>
               <div className="flex gap-2">
                   <input type="password" id="editCodeInput" className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-center tracking-widest text-lg" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUnlockEdit((e.target as HTMLInputElement).value)} />
                   <button onClick={() => handleUnlockEdit((document.getElementById('editCodeInput') as HTMLInputElement).value)} className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"><Icons.ArrowRight className="w-5 h-5" /></button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Author Info Modal */}
      {showAuthorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-white/50">
              <button onClick={() => setShowAuthorModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><Icons.X className="w-5 h-5" /></button>
              
              <div className="p-8 text-center">
                 <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 scale-110"></div>
                        <img 
                          src={avatarUrl} 
                          alt="Avatar Tác Giả" 
                          className="relative w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
                          onError={(e) => {
                             e.currentTarget.src = logoUrl;
                          }}
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Toán Thầy Mạnh - Hội An</h2>
                    <p className="text-slate-500 text-sm mb-6 max-w-xs">Chuyên luyện thi Toán THPT Quốc Gia - Uy tín & Tận tâm</p>
                    
                    <a 
                       href="https://www.facebook.com/toanthaymanh.hoian.0973852062" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="inline-flex items-center px-6 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 w-full justify-center"
                    >
                       <Icons.Facebook className="w-5 h-5 mr-2" />
                       Theo dõi Facebook
                    </a>
                 </div>
                 
                 <div className="text-xs text-slate-400 border-t border-slate-100 pt-4 mt-4">
                    Liên hệ trực tiếp: <span className="font-bold text-slate-600">0973 852 062</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Donate Info Modal */}
      {showDonateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-white/50">
              <button onClick={() => setShowDonateModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><Icons.X className="w-5 h-5" /></button>
              
              <div className="p-8 pb-4 text-center">
                 <div className="flex flex-col items-center">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center">
                        <Icons.Heart className="w-6 h-6 mr-2 text-rose-500 fill-rose-500" />
                        Ủng hộ tác giả (Donate)
                    </h3>
                    <p className="text-slate-500 text-sm mb-4">Cảm ơn bạn đã sử dụng và ủng hộ ứng dụng! ❤️</p>
                    
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-4 transition-transform hover:scale-[1.02]">
                        <img 
                          src={qrUrl} 
                          alt="QR Code Donate" 
                          className="w-full h-auto rounded-lg"
                          onError={(e) => {
                             (e.target as HTMLImageElement).style.display = 'none';
                             (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }} 
                        />
                        <div className="hidden p-4 text-sm text-red-500 bg-red-50 rounded-lg">
                           Không thể tải mã QR. Vui lòng kiểm tra kết nối mạng.
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4 w-full border border-slate-100 shadow-inner">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Thông tin chuyển khoản</p>
                        <div className="bg-white border border-slate-200 rounded-lg p-2 mb-2 flex items-center justify-between group cursor-pointer hover:border-blue-300 transition-colors" onClick={() => { navigator.clipboard.writeText("0973852062"); alert("Đã sao chép số tài khoản!"); }}>
                           <p className="text-slate-900 font-bold text-lg font-mono tracking-tight pl-2">0973 852 062</p>
                           <Icons.Copy className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <p className="text-slate-700 font-bold text-sm uppercase">LE DUC MANH</p>
                        <div className="flex justify-center gap-2 mt-2">
                             <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">MB Bank</span>
                             <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded">Napas247</span>
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Main Layout */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 z-10">
        
        {/* IDLE STATE */}
        {status === ProcessingStatus.IDLE && (
          <div className="mt-12 sm:mt-20 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-blue-100 rounded-full px-4 py-1.5 text-xs font-bold text-blue-600 shadow-sm animate-in fade-in zoom-in duration-500">
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                 <span>CÔNG CỤ AI</span>
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                Chuyển đổi <span className="text-blue-700 relative inline-block">
                    PDF/Ảnh
                    <svg className="absolute w-full h-2 -bottom-1 left-0 text-blue-200/60 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
                </span> sang <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Word</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
                Nhận diện công thức Toán học, giữ nguyên định dạng.
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Upload Area */}
                <div className="transform transition-all duration-300 hover:scale-[1.01] hover:-translate-y-1">
                  <FileUpload onFilesSelected={handleFilesSelected} />
                </div>

                {/* Staging Area (Pending Files) */}
                {pendingFiles.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between mb-4 px-2">
                          <h3 className="font-bold text-slate-700 text-lg">Danh sách chờ ({pendingFiles.length})</h3>
                          <div className="space-x-4">
                              <button onClick={() => setPendingFiles([])} className="text-sm text-slate-400 hover:text-red-500 transition-colors">Xóa tất cả</button>
                          </div>
                      </div>
                      
                      {/* Grid Layout for Files */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                          {pendingFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group relative overflow-hidden">
                                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                      {file.type.includes('pdf') ? <Icons.FileText className="w-6 h-6" /> : <Icons.Image className="w-6 h-6" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                                      <p className="text-xs text-slate-400 font-medium">{(file.size / 1024).toFixed(0)} KB</p>
                                  </div>
                                  <button onClick={() => removePendingFile(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                                      <Icons.X className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                      </div>

                      <div className="text-center">
                          <button 
                              onClick={handleStartConversion}
                              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-gradient-to-r from-[#003580] to-blue-600 rounded-full hover:from-blue-800 hover:to-blue-600 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 active:scale-95 overflow-hidden"
                          >
                              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                              <Icons.Check className="w-5 h-5 mr-2" />
                              <span className="text-lg">Bắt đầu chuyển đổi ngay</span>
                          </button>
                      </div>
                  </div>
                )}

                {/* Feature Cards */}
                {pendingFiles.length === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 opacity-80 hover:opacity-100 transition-opacity">
                        {[
                            { title: "Toán học LaTeX", desc: "Nhận diện công thức chuẩn xác", icon: Icons.Code, color: "text-blue-500", bg: "bg-blue-50" },
                            { title: "Hỗ trợ Đa file", desc: "Gộp nhiều ảnh thành 1 file", icon: Icons.Image, color: "text-cyan-500", bg: "bg-cyan-50" },
                            { title: "Xuất Word", desc: "Giữ nguyên format để in ấn", icon: Icons.Download, color: "text-sky-500", bg: "bg-sky-50" },
                        ].map((f, i) => (
                            <div key={i} className="bg-white/60 backdrop-blur border border-slate-100 p-5 rounded-3xl flex items-center space-x-4 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 hover:scale-105 transition-all duration-300">
                                <div className={`w-12 h-12 rounded-2xl ${f.bg} ${f.color} flex items-center justify-center shrink-0`}>
                                    <f.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{f.title}</h4>
                                    <p className="text-xs text-slate-500">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        )}

        {/* PROCESSING STATE */}
        {status === ProcessingStatus.PROCESSING && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
             <div className="relative mb-10 group cursor-default">
               <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
               <div className="w-40 h-40 relative">
                  <svg className="animate-spin w-full h-full text-blue-100" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-slate-800 tracking-tighter">{Math.round(progress)}%</span>
                  </div>
               </div>
             </div>
             
             <div className="w-full max-w-md bg-slate-100 rounded-full h-3 mb-8 overflow-hidden border border-slate-200 p-0.5">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }}></div>
             </div>

             <h3 className="text-2xl font-bold text-slate-900 mb-2">Đang xử lý tài liệu</h3>
             <p className="text-blue-600 font-medium animate-pulse mb-6 bg-blue-50 px-4 py-1 rounded-full text-sm border border-blue-100">
               {optimizationStatus || "Đang phân tích dữ liệu..."}
             </p>
           </div>
        )}

        {/* SUCCESS / ERROR STATE */}
        {(status === ProcessingStatus.SUCCESS || status === ProcessingStatus.ERROR) && (
          <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Minimal Status Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white/90 backdrop-blur border border-white/50 shadow-xl shadow-slate-200/20 rounded-3xl p-3 px-5 sticky top-24 z-30 transition-all max-w-5xl mx-auto w-full">
               <div className="flex items-center space-x-3 w-full sm:w-auto overflow-hidden">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${status === ProcessingStatus.SUCCESS ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                       {status === ProcessingStatus.SUCCESS ? <Icons.Check className="w-5 h-5" /> : <Icons.X className="w-5 h-5" />}
                   </div>
                   <div className="min-w-0">
                       <h3 className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{fileData?.file.name}</h3>
                       <p className="text-xs text-slate-500">{status === ProcessingStatus.SUCCESS ? 'Hoàn tất' : 'Thất bại'} • {fileData?.pages.length} trang</p>
                   </div>
               </div>
               
               <div className="flex items-center space-x-2 mt-3 sm:mt-0 w-full sm:w-auto justify-end">
                   <button onClick={handleReset} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-colors">
                       Làm mới
                   </button>
               </div>
            </div>

            {/* Error View */}
            {status === ProcessingStatus.ERROR && (
               <div className="bg-white border border-red-100 rounded-3xl p-12 text-center shadow-xl shadow-red-500/5 max-w-2xl mx-auto mt-10">
                 <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Icons.X className="w-10 h-10" /></div>
                 <h3 className="text-2xl font-bold text-slate-900 mb-2">Đã xảy ra lỗi</h3>
                 <p className="text-slate-500 mb-8">{error}</p>
                 <button onClick={handleReset} className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-transform hover:-translate-y-1">Thử lại</button>
               </div>
            )}

            {/* Success Workspace */}
            {status === ProcessingStatus.SUCCESS && (
              <div className="max-w-[1400px] mx-auto w-full h-full pb-10">
                 <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden ring-1 ring-slate-900/5">
                   <ResultViewer markdown={result} isEditable={isEditable} onMarkdownChange={setResult} fileData={fileData} />
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