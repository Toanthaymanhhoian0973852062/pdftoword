import React, { useState } from 'react';
import { Icons } from './Icon';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const ACTIVATION_CODE = "toanthaymanh0973852062";

export const ActivationModal: React.FC<ActivationModalProps> = ({ isOpen, onClose, onActivate }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (code.trim() === ACTIVATION_CODE) {
      onActivate();
      onClose();
      alert("Chúc mừng! Bạn đã kích hoạt bản quyền thành công.");
    } else {
      setError("Mã kích hoạt không chính xác. Vui lòng thử lại.");
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-white/50">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
            <Icons.X className="w-5 h-5" />
        </button>
        
        <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                <Icons.Crown className="w-10 h-10" />
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Kích Hoạt Bản Quyền</h3>
            <p className="text-slate-500 text-sm mb-6">
                Bạn đã sử dụng hết <strong>3 lượt dùng thử miễn phí</strong>.
                <br/>
                Vui lòng nhập mã kích hoạt để mở khóa tính năng không giới hạn.
            </p>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-bold text-blue-800 uppercase mb-2">Liên hệ tác giả để nhận mã:</p>
                <div className="flex items-center space-x-3 text-blue-700 mb-1">
                    <Icons.User className="w-4 h-4 shrink-0" />
                    <span className="font-bold">Toán Thầy Mạnh</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-700 mb-1">
                    <Icons.Facebook className="w-4 h-4 shrink-0" />
                    <a href="https://www.facebook.com/toanthaymanh.hoian.0973852062" target="_blank" rel="noreferrer" className="hover:underline font-medium">Facebook Toán Thầy Mạnh</a>
                </div>
                 <div className="flex items-center space-x-3 text-blue-700">
                    <Icons.Phone className="w-4 h-4 shrink-0" />
                    <span className="font-bold">SĐT/Zalo: 0973 852 062</span>
                </div>
            </div>

            <div className="relative mb-2">
                <input 
                    type="text" 
                    className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-4 focus:ring-amber-500/20 outline-none text-slate-900 font-bold text-center tracking-widest text-lg transition-colors ${error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-amber-500'}`}
                    placeholder="Nhập mã kích hoạt..."
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value);
                        setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
            </div>
            {error && <p className="text-red-500 text-xs font-bold mb-4 animate-pulse">{error}</p>}
            
            <button 
                onClick={handleSubmit} 
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white py-3.5 rounded-xl font-bold hover:from-amber-600 hover:to-yellow-600 shadow-lg shadow-amber-500/30 transition-all active:scale-[0.98] mt-2 flex items-center justify-center space-x-2"
            >
                <Icons.Unlock className="w-5 h-5" />
                <span>Mở Khóa Ngay</span>
            </button>
        </div>
      </div>
    </div>
  );
};