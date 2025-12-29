import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  initialContent: string;
  onSave: (content: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  date,
  initialContent,
  onSave
}) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '');
    }
  }, [isOpen, initialContent]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-black/5">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-stone-50">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-indigo-50 rounded-full text-indigo-500">
                <PenLine size={18} />
             </div>
             <div>
                 <h3 className="font-bold text-lg text-stone-800 leading-tight">每日复盘</h3>
                 <p className="text-[10px] font-medium text-stone-400">
                    {format(date, 'yyyy年M月d日 EEEE', { locale: zhCN })}
                 </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="记录今天的心得、反思或明天的计划..."
                className="w-full h-64 p-4 bg-stone-50 rounded-xl border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:outline-none transition-all text-stone-700 leading-relaxed resize-none custom-scrollbar placeholder:text-stone-300 text-sm font-medium"
                autoFocus
            />
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
             <button
                onClick={handleSave}
                className="px-6 py-3 rounded-xl bg-stone-800 text-white font-bold text-sm hover:bg-stone-900 transition-all shadow-lg shadow-stone-900/20 flex items-center gap-2 active:scale-95"
             >
                 <Save size={18} />
                 保存记录
             </button>
        </div>
      </div>
    </div>
  );
};