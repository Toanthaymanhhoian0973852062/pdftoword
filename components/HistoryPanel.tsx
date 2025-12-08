import React, { useEffect, useState } from 'react';
import { Icons } from './Icon';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, onSelect }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('doculatex_history');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Sort by newest first
          setHistory(parsed.sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
  }, [isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('doculatex_history', JSON.stringify(newHistory));
  };

  const handleClearAll = () => {
    if (window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử?")) {
      setHistory([]);
      localStorage.removeItem('doculatex_history');
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Icons.History className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Lịch sử chuyển đổi</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Icons.History className="w-12 h-12 mb-3 opacity-20" />
              <p>Chưa có lịch sử nào.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => onSelect(item)}
                className="group flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <h4 className="font-semibold text-slate-800 truncate mb-1">{item.fileName}</h4>
                  <div className="flex items-center text-xs text-slate-500 space-x-2">
                    <span>{formatDate(item.timestamp)}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{item.markdown.length} ký tự</span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Xóa mục này"
                >
                  <Icons.Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">
              {history.length} bản ghi
            </span>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Xóa tất cả
            </button>
          </div>
        )}
      </div>
    </div>
  );
};