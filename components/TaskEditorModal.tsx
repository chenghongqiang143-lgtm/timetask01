import React, { useState, useEffect } from 'react';
import { Task, TargetMode } from '../types';
import { X, Target, Type, Hash, Timer, Check, Tag, Trash2, AlertTriangle } from 'lucide-react';

interface TaskEditorModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const PRESET_COLORS = [
  // Warm & Vibrant
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  // Nature & Fresh
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  // Ocean & Sky
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  // Purple & Pink
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  // Elegant Dark
  '#64748b', '#78716c', '#57534e', '#1e293b',
  // Soft Pastels
  '#fda4af', '#fdba74', '#86efac', '#7dd3fc', '#c4b5fd', '#f0abfc'
];

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [category, setCategory] = useState('无');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // New Target Logic
  const [targetMode, setTargetMode] = useState<TargetMode>('duration');
  const [targetValue, setTargetValue] = useState(''); // Stores hours or count
  const [targetFrequency, setTargetFrequency] = useState('1'); // Default to 1 day (Daily)

  useEffect(() => {
    if (isOpen && task) {
      setName(task.name);
      setColor(task.color);
      setCategory(task.category);
      setShowDeleteConfirm(false); // Reset delete state
      if (task.targets) {
          // Handle legacy data where 'duration' might exist instead of 'value'
          const val = (task.targets as any).duration !== undefined 
            ? (task.targets as any).duration 
            : task.targets.value;

          setTargetValue(val ? val.toString() : '');
          setTargetFrequency(task.targets.frequency.toString());
          setTargetMode(task.targets.mode || 'duration');
      } else {
          setTargetValue('');
          setTargetFrequency('1');
          setTargetMode('duration');
      }
    } else if (isOpen) {
      setName('无');
      setColor('#3b82f6');
      setCategory('无');
      setTargetValue('');
      setTargetFrequency('1');
      setTargetMode('duration');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Logic: Name required
    if (!name.trim()) {
        return;
    }

    let targets = undefined;
    const val = parseFloat(targetValue);
    const freq = parseInt(targetFrequency);

    if (!isNaN(val) && val > 0 && !isNaN(freq) && freq > 0) {
        targets = {
            mode: targetMode,
            value: val,
            frequency: freq
        };
    }

    onSave({
      id: task ? task.id : '',
      name: name.trim(),
      color,
      category,
      targets
    });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (showDeleteConfirm && task) {
          onDelete(task.id);
          onClose();
      } else {
          setShowDeleteConfirm(true);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/40 max-h-[90vh] flex flex-col ring-1 ring-black/5">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 bg-white border-b border-stone-50 shrink-0">
          <h3 className="font-bold text-lg text-stone-800 tracking-tight">{task ? '编辑任务' : '创建新任务'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* Basic Info Section */}
          <div className="space-y-4">
            <div className="relative group">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary transition-colors">
                  <Type size={18} />
               </div>
               <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-stone-50 border-2 border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-primary/20 focus:shadow-sm transition-all font-bold text-lg text-stone-800 placeholder:text-stone-300 placeholder:font-medium"
                  placeholder="任务名称"
               />
            </div>

            <div className="relative group">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary transition-colors">
                  <Tag size={18} />
               </div>
               <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border-2 border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-primary/20 focus:shadow-sm transition-all font-medium text-stone-700 placeholder:text-stone-300"
                  placeholder="分类标签 (如: 工作, 运动)"
                />
            </div>
          </div>

          {/* Target Setting Section */}
          <div className="bg-gradient-to-br from-stone-50 to-white rounded-2xl p-5 border border-stone-100 shadow-sm transition-all">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                        <Target size={14} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">目标设定 (可选)</span>
                  </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-stone-100 p-1 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setTargetMode('duration')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${targetMode === 'duration' ? 'bg-white shadow-sm text-primary' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                      <Timer size={14} /> 计时模式
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('count')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${targetMode === 'count' ? 'bg-white shadow-sm text-primary' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                      <Hash size={14} /> 次数模式
                  </button>
              </div>
              
              <div className="flex gap-4 mb-3">
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-stone-400 mb-1.5 block">
                          {targetMode === 'duration' ? '目标时长' : '目标次数'}
                      </label>
                      <div className="relative flex items-center">
                          <input 
                              type="number" 
                              min="0" 
                              step={targetMode === 'duration' ? "0.5" : "1"}
                              value={targetValue}
                              onChange={(e) => setTargetValue(e.target.value)}
                              className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-bold text-stone-700 placeholder:text-stone-300 shadow-sm"
                              placeholder="0"
                          />
                          <span className="absolute right-3 text-[10px] font-bold text-stone-400 pointer-events-none">
                              {targetMode === 'duration' ? '小时' : '次'}
                          </span>
                      </div>
                  </div>
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-stone-400 mb-1.5 block">统计周期</label>
                      <div className="relative flex items-center">
                           <input 
                              type="number" 
                              min="1" 
                              step="1"
                              value={targetFrequency}
                              onChange={(e) => setTargetFrequency(e.target.value)}
                              className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-bold text-stone-700 placeholder:text-stone-300 shadow-sm"
                              placeholder="1"
                          />
                          <span className="absolute right-3 text-[10px] font-bold text-stone-400 pointer-events-none">天</span>
                      </div>
                  </div>
              </div>
              
              <div className="bg-primary/5 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-primary/70 font-medium">
                    {targetFrequency === '1' ? '⚡️ 每日目标：每天都需要完成' : 
                     targetFrequency === '7' ? '📅 每周目标：7天内累计完成即可' :
                     targetFrequency === '30' ? '🗓 每月目标：30天内累计完成即可' :
                     targetFrequency ? `🔄 循环目标：每 ${targetFrequency} 天完成一次` : '设置目标以追踪进度'}
                </p>
              </div>
          </div>
          
          {/* Color Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 ml-1">颜色风格</label>
            <div className="grid grid-cols-6 gap-3 p-1">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-full shadow-sm transition-all hover:scale-110 flex items-center justify-center ${color === c ? 'ring-2 ring-offset-2 ring-stone-400 scale-110 shadow-md' : 'hover:shadow-md'}`}
                  style={{ backgroundColor: c }}
                >
                    {color === c && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                </button>
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="pt-4 border-t border-stone-100 flex gap-3 shrink-0">
             {task && (
                 <button
                    type="button"
                    onClick={handleDeleteClick}
                    className={`p-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        showDeleteConfirm 
                        ? "bg-red-500 text-white w-full sm:w-auto shadow-md shadow-red-200" 
                        : "bg-stone-100 text-stone-400 hover:bg-red-50 hover:text-red-500"
                    }`}
                 >
                     {showDeleteConfirm ? (
                         <>
                            <AlertTriangle size={18} />
                            <span className="font-bold text-xs whitespace-nowrap">确认删除?</span>
                         </>
                     ) : (
                         <Trash2 size={18} />
                     )}
                 </button>
             )}
             
             {!showDeleteConfirm && (
                 <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-xl bg-white border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-colors shadow-sm active:scale-95"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        className="flex-1 py-3.5 rounded-xl bg-stone-800 text-white font-bold text-sm hover:bg-stone-900 transition-all shadow-lg shadow-stone-900/20 flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Check size={18} strokeWidth={3} />
                        确定
                    </button>
                 </>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};