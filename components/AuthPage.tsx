import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icon';

// Use static path for logo assuming it is served from root
const logoUrl = "/logo.png";

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email.trim() || !password.trim()) {
        setError("Vui lòng điền đầy đủ thông tin.");
        setLoading(false);
        return;
      }

      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) {
          setError("Vui lòng nhập họ tên.");
          setLoading(false);
          return;
        }
        if (!accessCode.trim()) {
          setError("Vui lòng nhập Mã kích hoạt.");
          setLoading(false);
          return;
        }
        await register(email, password, name, accessCode);
      }
    } catch (error: any) {
      setError(error.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-[100px] animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-200/30 blur-[100px] animate-blob animation-delay-2000" />
      
      <div className="w-full max-w-md p-8 z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl shadow-blue-500/10 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center mb-8">
            {/* BRAND LOGO IMAGE - Using logo.png */}
            <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-blue-600 rounded-full blur opacity-20 transform scale-110"></div>
                <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="relative w-24 h-24 rounded-full object-cover border-4 border-white shadow-2xl shadow-blue-900/20 transform hover:scale-105 transition-all duration-500"
                    onError={(e) => {
                        // Fallback
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
                <div className="hidden w-24 h-24 bg-[#003580] rounded-2xl shadow-lg shadow-blue-900/30 flex items-center justify-center transform rotate-3">
                    <Icons.FileText className="w-12 h-12 text-white" />
                </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Toán Thầy Mạnh - Hội An</h1>
            <p className="text-slate-500">Chuyển đổi tài liệu thông minh</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-start animate-in fade-in slide-in-from-top-2">
              <Icons.X className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Họ tên</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Icons.User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-blue-700 ml-1">Mã kích hoạt</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Icons.Lock className="h-5 w-5 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      required={!isLogin}
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-blue-50/50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none text-blue-900 placeholder-blue-300 font-bold tracking-wide"
                      placeholder="Nhập mã do Admin cung cấp"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1 italic">* Liên hệ admin để lấy mã này</p>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icons.Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 ml-1">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icons.Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400"
                  placeholder="********"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#003580] to-blue-600 hover:from-blue-800 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Icons.Loader className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                <span>{isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}</span>
              )}
            </button>
          </form>

          {/* Footer Toggle */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="ml-2 font-bold text-blue-700 hover:text-blue-800 hover:underline focus:outline-none transition-colors"
              >
                {isLogin ? "Đăng ký ngay" : "Đăng nhập ngay"}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};