
import React, { useState, useMemo, useRef } from 'react';
import { Task, DayData, Objective, HOURS } from '../types';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { ObjectiveEditorModal } from '../components/ObjectiveEditorModal';
import { Plus, ArrowUp, ArrowDown, Edit2, Check, Download, Upload, Trash2, Database, X, AlertCircle } from 'lucide-react';
import { cn, formatDate } from '../utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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
  objectives?: Objective[];
  onAddObjective?: (obj: Objective) => void;
  onUpdateObjective?: (obj: Objective) => void;
  onDeleteObjective?: (id: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tasks,
  categoryOrder,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateCategoryOrder,
  objectives = [],
  onAddObjective,
  onUpdateObjective,
  onDeleteObjective,
  allRecords,
  currentDate,
  onExportData,
  onImportData,
  onClearData
}) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [isDataOverlayOpen, setIsDataOverlayOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const taskProgress = useMemo(() => {
    const dKey = formatDate(currentDate);
    const todayRecord = allRecords[dKey] || { hours: {} };
    const stats: Record<string, number> = {};
    tasks.forEach(t => stats[t.id] = 0);
    
    HOURS.forEach(h => {
      const ids = todayRecord.hours[h] || [];
      ids.forEach(tid => {
        if (stats[tid] !== undefined) {
          const task = tasks.find(t => t.id === tid);
          if (task?.targets?.mode === 'count') {
            stats[tid] += 1;
          } else {
            stats[tid] += (1 / (ids.length || 1));
          }
        }
      });
    });
    return stats;
  }, [tasks, allRecords, currentDate]);

  const sortedObjectives = useMemo(() => {
    return [...objectives].sort((a, b) => {
        const idxA = categoryOrder.indexOf(a.id);
        const idxB = categoryOrder.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [objectives, categoryOrder]);

  const moveObjective = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sortedObjectives.map(o => o.id)];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    onUpdateCategoryOrder(newOrder);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
      setIsDataOverlayOpen(false);
    }
  };

  const blockClass = "bg-white h-10 px-4 rounded-xl border border-stone-100 flex items-center justify-between group hover:border-stone-200 transition-all cursor-pointer shadow-sm active:scale-[0.98] relative overflow-hidden";
  const titleClass = "font-medium text-stone-700 text-[11px] truncate leading-none";

  return (
    <div className="h-full bg-stone-50 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-12 pb-32">
        
        <section className="space-y-4">
           <div className="flex justify-between items-end px-1">
             <div>
                <h3 className="text-sm font-medium text-stone-900 tracking-tight">领域分类</h3>
                <p className="text-[9px] text-stone-400 font-medium uppercase tracking-widest">组织你的行为边界</p>
             </div>
             <button onClick={() => { setEditingObjective(null); setIsObjModalOpen(true); }} className="p-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-md">
                <Plus size={16} />
             </button>
           </div>

           <div className="grid grid-cols-2 gap-2">
              {sortedObjectives.map((obj, idx) => (
                <div 
                    key={obj.id} 
                    className={blockClass}
                    onClick={() => { setEditingObjective(obj); setIsObjModalOpen(true); }}
                >
                   <div className="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: obj.color }} />
                      <h4 className={titleClass}>{obj.title}</h4>
                   </div>
                   
                   <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all relative z-10 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); moveObjective(idx, 'up'); }} className="p-1 text-stone-300 hover:text-stone-800 hover:bg-stone-50 rounded">
                        <ArrowUp size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveObjective(idx, 'down'); }} className="p-1 text-stone-300 hover:text-stone-800 hover:bg-stone-50 rounded">
                        <ArrowDown size={12} />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </section>

        <section className="space-y-6">
           <div className="flex justify-between items-end px-1">
             <div>
                <h3 className="text-sm font-medium text-stone-900 tracking-tight">行为模板</h3>
                <p className="text-[9px] text-stone-400 font-medium uppercase tracking-widest">设定目标与监控进度</p>
             </div>
             <button onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }} className="p-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-md">
                <Plus size={16} />
             </button>
           </div>

           <div className="space-y-8">
              {sortedObjectives.map(obj => {
                const filteredTasks = tasks.filter(t => t.category === obj.id);
                if (filteredTasks.length === 0) return null;
                return (
                  <div key={obj.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-medium uppercase tracking-widest text-stone-300">{obj.title}</span>
                        <div className="h-px flex-1 bg-stone-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {filteredTasks.map(task => {
                            const currentVal = taskProgress[task.id] || 0;
                            const target = task.targets;
                            const dailyTarget = target ? (target.value / target.frequency) : 0;
                            const progress = dailyTarget > 0 ? Math.min((currentVal / dailyTarget) * 100, 100) : 0;
                            const isCompleted = progress >= 100;

                            return (
                                <div 
                                    key={task.id} 
                                    onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} 
                                    className={blockClass}
                                >
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0"
                                        style={{ 
                                            width: `${progress}%`, 
                                            backgroundColor: `${task.color}12`
                                        }}
                                    />

                                    <div className="flex items-center gap-2 truncate relative z-10 flex-1 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                                        <span className={titleClass}>{task.name}</span>
                                    </div>
                                    <div className="relative z-10 flex items-center gap-1 shrink-0 ml-1">
                                        {isCompleted ? (
                                            <Check size={10} className="text-emerald-500" />
                                        ) : dailyTarget > 0 && (
                                            <span className="text-[8px] font-medium text-stone-300 tabular-nums">
                                                {Math.round(progress)}%
                                            </span>
                                        )}
                                        <Edit2 size={10} className="text-stone-200 group-hover:text-stone-900 transition-colors ml-1" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                );
              })}
           </div>
        </section>

        <section className="bg-white px-5 py-4 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between mt-auto">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 text-stone-600 rounded-lg">
                    <Database size={16} />
                </div>
                <div>
                    <h3 className="font-medium text-stone-900 text-[13px]">数据与系统</h3>
                    <p className="text-[9px] font-medium text-stone-400 uppercase tracking-widest">
                        版本 v1.0 • {format(currentDate, 'yyyy.MM.dd')}
                    </p>
                </div>
            </div>

            <button 
                onClick={() => setIsDataOverlayOpen(true)}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-[10px] font-medium uppercase tracking-widest shadow-sm active:scale-95 transition-all"
            >
                管理数据
            </button>
        </section>
      </div>

      {isDataOverlayOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-sm overflow-hidden border border-stone-200 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 py-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database size={16} className="text-stone-900" />
                        <h3 className="font-medium text-stone-900 text-sm">数据管理</h3>
                    </div>
                    <button onClick={() => { setIsDataOverlayOpen(false); setShowClearConfirm(false); }} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={onExportData}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-100 transition-all group"
                        >
                            <Download size={20} className="text-stone-400 group-hover:text-stone-900" />
                            <span className="text-[10px] font-medium text-stone-600">备份数据</span>
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-100 transition-all group"
                        >
                            <Upload size={20} className="text-stone-400 group-hover:text-stone-900" />
                            <span className="text-[10px] font-medium text-stone-600">恢复数据</span>
                            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                        </button>
                    </div>

                    <div className="pt-2">
                        <button 
                            onClick={() => {
                                if (showClearConfirm) {
                                    onClearData();
                                } else {
                                    setShowClearConfirm(true);
                                }
                            }}
                            className={cn(
                                "w-full py-3.5 rounded-xl font-medium text-[11px] transition-all flex items-center justify-center gap-2",
                                showClearConfirm 
                                    ? "bg-rose-500 text-white shadow-lg" 
                                    : "bg-white border border-rose-100 text-rose-500 hover:bg-rose-50"
                            )}
                        >
                            {showClearConfirm ? (
                                <><AlertCircle size={14} /> 确认清除？此操作不可逆</>
                            ) : (
                                <><Trash2 size={14} /> 清除全部数据</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="px-5 py-3 bg-stone-50 border-t border-stone-100">
                    <p className="text-[8px] text-stone-300 font-medium leading-relaxed text-center uppercase tracking-wider">
                        系统预设将在清除后重新加载
                    </p>
                </div>
            </div>
        </div>
      )}

      <ObjectiveEditorModal isOpen={isObjModalOpen} onClose={() => setIsObjModalOpen(false)} objective={editingObjective} onSave={(obj) => obj.id ? onUpdateObjective?.(obj) : onAddObjective?.(obj)} onDelete={onDeleteObjective} />
      <TaskEditorModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        task={editingTask} 
        onSave={(t) => t.id ? onUpdateTask(t) : onAddTask(t)} 
        onDelete={onDeleteTask} 
        objectives={objectives} 
        simplified={false}
      />
    </div>
  );
};
