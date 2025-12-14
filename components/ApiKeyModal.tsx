import React, { useState, useEffect } from 'react';
import { Icons } from './Icon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceRequired?: boolean;
  onSuccess?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, forceRequired = false, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('user_gemini_api_key') || '';
      setApiKey(storedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    const cleanedKey = apiKey.trim();

    if (cleanedKey) {
      // Validate format
      if (!cleanedKey.startsWith('AIza')) {
          alert("API Key không hợp lệ. Mã Key chuẩn của Google phải bắt đầu bằng 'AIza'.");
          return;
      }

      localStorage.setItem('user_gemini_api_key', cleanedKey);
      if (onSuccess) onSuccess();
      onClose();
    } else {
      if (forceRequired) {
        alert("Vui lòng nhập API Key để tiếp tục sử dụng ứng dụng.");
        return;
      }
      localStorage.removeItem('user_gemini_api_key');
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-white/50">
        {!forceRequired && (
          <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
              <Icons.X className="w-5 h-5" />
          </button>
        )}
        
        <div className="p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm ${forceRequired ? 'bg-red-50 text-red-500 border-red-100' : 'bg-amber-50 text-amber-500 border-amber-100'}`}>
                {forceRequired ? <Icons.Lock className="w-8 h-8" /> : <Icons.Key className="w-8 h-8" />}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {forceRequired ? 'Yêu cầu kích hoạt' : 'Cấu hình Gemini API Key'}
            </h3>
            <p className="text-slate-500 text-sm mb-6">
                {forceRequired 
                  ? "Bạn cần nhập API Key của Google Gemini để bắt đầu sử dụng ứng dụng này." 
                  : "Nhập mã API Key của Google Gemini để sử dụng ứng dụng không giới hạn."}
                <br/>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Lấy API Key tại đây</a>
            </p>
            
            <div className="relative mb-6">
                <input 
                    type={isVisible ? "text" : "password"} 
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700 font-mono text-sm pr-12 transition-colors ${forceRequired && !apiKey ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
                    placeholder="Nhập API Key (AIza...)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button 
                    onClick={() => setIsVisible(!isVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    {isVisible ? <Icons.Eye className="w-4 h-4" /> : <Icons.Lock className="w-4 h-4" />}
                </button>
            </div>
            
            <button 
                onClick={handleSave} 
                className={`w-full text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] ${forceRequired ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}
            >
                {forceRequired ? 'Xác nhận & Bắt đầu' : 'Lưu cài đặt'}
            </button>
            
            <p className="text-[10px] text-slate-400 mt-4 italic">
                * Key được lưu trực tiếp trên trình duyệt của bạn.
            </p>
        </div>
      </div>
    </div>
  );
};