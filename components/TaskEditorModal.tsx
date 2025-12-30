
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
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#64748b', '#78716c', '#57534e', '#1e293b',
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
  const [targetMode, setTargetMode] = useState<TargetMode>('duration');
  const [targetValue, setTargetValue] = useState('');
  const [targetFrequency, setTargetFrequency] = useState('1');

  useEffect(() => {
    if (isOpen && task) {
      setName(task.name);
      setColor(task.color);
      setCategory(task.category);
      setShowDeleteConfirm(false);
      if (task.targets) {
          const val = (task.targets as any).duration !== undefined ? (task.targets as any).duration : task.targets.value;
          setTargetValue(val ? val.toString() : '');
          setTargetFrequency(task.targets.frequency.toString());
          setTargetMode(task.targets.mode || 'duration');
      } else {
          setTargetValue('');
          setTargetFrequency('1');
          setTargetMode('duration');
      }
    } else if (isOpen) {
      setName('');
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
    if (!name.trim()) return;
    let targets = undefined;
    const val = parseFloat(targetValue);
    const freq = parseInt(targetFrequency);
    if (!isNaN(val) && val > 0 && !isNaN(freq) && freq > 0) {
        targets = { mode: targetMode, value: val, frequency: freq };
    }
    onSave({ id: task ? task.id : '', name: name.trim(), color, category, targets });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (showDeleteConfirm && task) {
          onDelete(task.id);
          onClose();
      } else setShowDeleteConfirm(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4">
      <div className="bg-white rounded-[1.5rem] w-full max-w-sm overflow-hidden border border-stone-300 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 bg-stone-50 border-b border-stone-200 shrink-0">
          <h3 className="font-bold text-lg text-stone-800 tracking-tight">{task ? '编辑任务' : '创建新任务'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-white">
          <div className="space-y-4">
            <div className="relative">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  <Type size={18} />
               </div>
               <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-stone-400 transition-all font-bold text-stone-800"
                  placeholder="任务名称"
               />
            </div>
            <div className="relative">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  <Tag size={18} />
               </div>
               <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-stone-400 transition-all font-medium text-stone-700"
                  placeholder="分类标签"
                />
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200">
                  <Target size={14} className="text-primary" />
                  <span className="text-xs font-bold text-stone-500 uppercase">目标设定</span>
              </div>
              <div className="flex bg-stone-200 p-1 rounded-lg mb-4">
                  <button type="button" onClick={() => setTargetMode('duration')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${targetMode === 'duration' ? 'bg-white text-primary' : 'text-stone-400'}`}>计时</button>
                  <button type="button" onClick={() => setTargetMode('count')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${targetMode === 'count' ? 'bg-white text-primary' : 'text-stone-400'}`}>次数</button>
              </div>
              <div className="flex gap-4">
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-stone-400 mb-1 block">{targetMode === 'duration' ? '目标时长' : '目标次数'}</label>
                      <input type="number" step={targetMode === 'duration' ? "0.5" : "1"} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-bold" />
                  </div>
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-stone-400 mb-1 block">统计周期</label>
                      <input type="number" value={targetFrequency} onChange={(e) => setTargetFrequency(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-bold" />
                  </div>
              </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-3">颜色风格</label>
            <div className="grid grid-cols-6 gap-3">
              {PRESET_COLORS.map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)} className={`w-9 h-9 rounded-full border border-stone-100 flex items-center justify-center ${color === c ? 'ring-2 ring-stone-900 ring-offset-2' : ''}`} style={{ backgroundColor: c }}>
                    {color === c && <div className="w-2 h-2 bg-white rounded-full" />}
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t border-stone-100 flex gap-3">
             {task && (
                 <button type="button" onClick={handleDeleteClick} className={`p-3 rounded-xl transition-all ${showDeleteConfirm ? "bg-red-600 text-white w-full" : "bg-stone-100 text-stone-400 hover:text-red-500"}`}>
                     {showDeleteConfirm ? <span className="font-bold text-xs">确认删除?</span> : <Trash2 size={18} />}
                 </button>
             )}
             {!showDeleteConfirm && (
                 <>
                    <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white border border-stone-300 text-stone-600 font-bold text-sm">取消</button>
                    <button type="submit" className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center justify-center gap-2">确定</button>
                 </>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};
