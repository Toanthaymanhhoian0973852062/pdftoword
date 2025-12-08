import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icon';

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
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/30 blur-[100px] animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/30 blur-[100px] animate-blob animation-delay-2000" />
      
      <div className="w-full max-w-md p-8 z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl shadow-indigo-500/10 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-6 transform rotate-3">
              <Icons.FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">DocuLatex</h1>
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
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-800 placeholder-slate-400"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-indigo-700 ml-1">Mã kích hoạt</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Icons.Lock className="h-5 w-5 text-indigo-500" />
                    </div>
                    <input
                      type="text"
                      required={!isLogin}
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-indigo-50/50 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-none text-indigo-900 placeholder-indigo-300 font-bold tracking-wide"
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
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-800 placeholder-slate-400"
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
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-800 placeholder-slate-400"
                  placeholder="********"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
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
                className="ml-2 font-bold text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none transition-colors"
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