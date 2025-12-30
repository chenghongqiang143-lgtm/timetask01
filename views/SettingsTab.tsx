
import React, { useState, useRef, useMemo } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { Plus, Download, Upload, Smartphone, ChevronRight, Trash2, AlertTriangle, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';
import { subDays, eachDayOfInterval } from 'date-fns';
import { formatDate, cn } from '../utils';

interface SettingsTabProps {
  tasks: Task[];
  categoryOrder: string[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateCategoryOrder: (newOrder: string[]) => void;
  showInstallButton: boolean;
  onInstall: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onClearData: () => void;
  allSchedules: Record<string, DayData>;
  allRecords: Record<string, DayData>;
  currentDate: Date;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tasks,
  categoryOrder,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateCategoryOrder,
  showInstallButton,
  onInstall,
  onExportData,
  onImportData,
  onClearData,
  allSchedules,
  allRecords,
  currentDate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedCategories = useMemo(() => {
    const existingCats = Array.from(new Set(tasks.map(t => t.category || '未分类')));
    const ordered = categoryOrder.filter(c => existingCats.includes(c));
    const others = existingCats.filter(c => !categoryOrder.includes(c));
    return [...ordered, ...others];
  }, [tasks, categoryOrder]);

  const getTaskProgress = (task: Task) => {
      if (!task.targets || !task.targets.frequency) return 0;
      const freq = task.targets.frequency;
      const mode = task.targets.mode || 'duration';
      const start = subDays(currentDate, freq - 1);
      if (isNaN(start.getTime())) return 0;
      const days = eachDayOfInterval({ start, end: currentDate });
      let total = 0;
      days.forEach(day => {
          const dKey = formatDate(day);
          const dayData = allRecords[dKey];
          if (dayData && dayData.hours) {
              HOURS.forEach(h => {
                  const tIds = dayData.hours[h] || [];
                  if (tIds.includes(task.id)) {
                      total += (mode === 'count' ? 1 : (1 / tIds.length));
                  }
              });
          }
      });
      return total;
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleSave = (task: Task) => {
    if (editingTask) onUpdateTask(task);
    else onAddTask(task);
    setIsModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportData(file);
    if (e.target) e.target.value = '';
  };

  const handleClearClick = () => {
      if (showClearConfirm) {
          onClearData();
          setShowClearConfirm(false);
      } else {
          setShowClearConfirm(true);
      }
  };

  const getFrequencyLabel = (days: number) => {
      if (days === 1) return '今日';
      if (days === 7) return '本周';
      if (days === 30) return '本月';
      return `${days}天`;
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sortedCategories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    onUpdateCategoryOrder(newOrder);
  };

  return (
    <div className="h-full bg-white overflow-y-auto custom-scrollbar relative">
      <div className="relative z-10 px-5 pt-6 pb-2 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-stone-800 tracking-tight">任务与目标</h2>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowCategoryManager(!showCategoryManager)}
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 border",
                    showCategoryManager ? "bg-primary text-white border-primary" : "bg-white text-stone-400 border-stone-200"
                )}
                title="调整分类排序"
            >
                <ListOrdered size={16} />
            </button>
            <button 
                onClick={handleNew}
                className="bg-stone-900 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-800 transition-all active:scale-95 shadow-sm"
            >
                <Plus size={16} />
            </button>
        </div>
      </div>

      <div className="relative z-10 px-5 pb-24 space-y-6">
        
        {showCategoryManager && (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 px-1">调整分类排序</h3>
                <div className="space-y-2">
                    {sortedCategories.map((cat, idx) => (
                        <div key={cat} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-stone-200 shadow-sm">
                            <span className="text-xs font-bold text-stone-700">{cat}</span>
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => moveCategory(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1.5 text-stone-400 hover:text-primary disabled:opacity-20"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button 
                                    onClick={() => moveCategory(idx, 'down')}
                                    disabled={idx === sortedCategories.length - 1}
                                    className="p-1.5 text-stone-400 hover:text-primary disabled:opacity-20"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="space-y-4">
           {sortedCategories.map(cat => (
              <div key={cat}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{cat}</span>
                      <div className="h-px bg-stone-100 flex-1"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                      {tasks.filter(t => (t.category || '未分类') === cat).map(task => {
                          const targetVal = task.targets ? (task.targets.value || (task.targets as any).duration || 0) : 0;
                          const hasTarget = targetVal > 0;
                          const currentProgress = hasTarget ? getTaskProgress(task) : 0;
                          const freqLabel = hasTarget && task.targets ? getFrequencyLabel(task.targets.frequency) : '';
                          const mode = task.targets?.mode || 'duration';
                          const unit = mode === 'count' ? '' : 'h';
                          const progressPercent = hasTarget ? Math.min((currentProgress / targetVal) * 100, 100) : 0;

                          return (
                            <div 
                                key={task.id} 
                                onClick={() => handleEdit(task)}
                                className="group bg-white rounded-xl border border-stone-200 hover:border-stone-400 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center px-3 min-h-[52px] select-none"
                            >   
                                {hasTarget && (
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out"
                                        style={{ 
                                            width: `${progressPercent}%`, 
                                            backgroundColor: task.color,
                                            opacity: 0.1
                                        }} 
                                    />
                                )}
                                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: task.color }} />
                                <div className="relative z-10 flex justify-between items-center w-full">
                                    <span className="font-bold text-xs text-stone-700 truncate mr-2">{task.name}</span>
                                    {hasTarget ? (
                                       <div className="flex items-center gap-1.5 bg-stone-50 px-1.5 py-0.5 rounded-md border border-stone-100">
                                           <span className="text-[9px] font-bold text-stone-400">{freqLabel}</span>
                                           <span className="text-[10px] font-mono font-bold text-stone-600 leading-none">
                                                {mode === 'count' ? currentProgress : currentProgress.toFixed(1)}
                                                <span className="text-stone-300 mx-[1px]">/</span>
                                                {targetVal}{unit}
                                            </span>
                                       </div>
                                    ) : (
                                       <div className="flex items-center gap-1 opacity-40">
                                            <div className="w-1 h-1 rounded-full bg-stone-400"></div>
                                            <span className="text-[9px] font-medium text-stone-400">无目标</span>
                                       </div>
                                    )}
                                </div>
                            </div>
                          );
                      })}
                  </div>
              </div>
          ))}
        </div>

        <div>
            <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">数据与应用</h3>
            <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                {showInstallButton && (
                  <button onClick={onInstall} className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-stone-100 rounded-md text-stone-600 border border-stone-200"><Smartphone size={14} /></div>
                          <div>
                              <div className="text-xs font-bold text-stone-700">安装应用</div>
                              <div className="text-[9px] font-medium text-stone-400">添加到主屏幕</div>
                          </div>
                      </div>
                      <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                  </button>
                )}
                
                <button onClick={onExportData} className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors text-left group">
                     <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-stone-100 rounded-md text-stone-600 border border-stone-200"><Download size={14} /></div>
                          <div>
                              <div className="text-xs font-bold text-stone-700">备份数据</div>
                              <div className="text-[9px] font-medium text-stone-400">导出 JSON 文件</div>
                          </div>
                      </div>
                      <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                </button>

                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors text-left group">
                     <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-stone-100 rounded-md text-stone-600 border border-stone-200"><Upload size={14} /></div>
                          <div>
                              <div className="text-xs font-bold text-stone-700">恢复数据</div>
                              <div className="text-[9px] font-medium text-stone-400">从 JSON 恢复</div>
                          </div>
                      </div>
                      <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                </button>
                
                <input type="file" ref={fileInputRef} hidden accept=".json" onChange={handleFileChange} />

                <button onClick={handleClearClick} className={cn("w-full flex items-center justify-between p-3 transition-colors text-left group", showClearConfirm ? "bg-red-50 hover:bg-red-100" : "hover:bg-stone-50")}>
                     <div className="flex items-center gap-3">
                          <div className={cn("p-1.5 rounded-md transition-colors border", showClearConfirm ? "bg-red-500 text-white border-red-600" : "bg-stone-100 text-stone-600 border-stone-200")}>
                              {showClearConfirm ? <AlertTriangle size={14} strokeWidth={2.5} /> : <Trash2 size={14} />}
                          </div>
                          <div>
                              <div className={cn("text-xs font-bold transition-colors", showClearConfirm ? "text-red-600" : "text-stone-700")}>{showClearConfirm ? "确认清空所有数据？" : "清空数据"}</div>
                              <div className={cn("text-[9px] font-medium transition-colors", showClearConfirm ? "text-red-400" : "text-stone-400")}>{showClearConfirm ? "再次点击执行，数据将无法恢复" : "慎用：清除日程、记录与统计"}</div>
                          </div>
                      </div>
                      <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                </button>
            </div>
        </div>
      </div>

      <TaskEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={editingTask}
        onSave={handleSave}
        onDelete={onDeleteTask}
      />
    </div>
  );
};
