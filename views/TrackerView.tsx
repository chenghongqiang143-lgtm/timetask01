
import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, formatDate } from '../utils';
import { ChevronRight, ChevronLeft, Repeat, Check, X, Eraser } from 'lucide-react';
import { subDays, eachDayOfInterval } from 'date-fns';

interface TrackerViewProps {
  tasks: Task[];
  categoryOrder: string[];
  scheduleData: DayData;
  recordData: DayData;
  recurringData: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  onUpdateSchedule: (hour: number, taskIds: string[]) => void;
  onUpdateRecord: (hour: number, taskIds: string[]) => void;
  onUpdateRecurring: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  currentDate: Date;
}

export const TrackerView: React.FC<TrackerViewProps> = ({
  tasks,
  categoryOrder,
  scheduleData,
  recordData,
  recurringData,
  allRecords,
  onUpdateSchedule,
  onUpdateRecord,
  onUpdateRecurring,
  onUpdateTask,
  onDeleteTask,
  currentDate
}) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const [activeSlot, setActiveSlot] = useState<{ hour: number, type: 'schedule' | 'record' } | null>(null);
  const [sidebar, setSidebar] = useState<'none' | 'left' | 'right'>('none');
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  const getTaskProgress = (task: Task) => {
    if (!task.targets || !task.targets.value) return null;
    
    const freq = task.targets.frequency || 1;
    const mode = task.targets.mode || 'duration';
    const start = subDays(currentDate, freq - 1);
    const days = eachDayOfInterval({ start, end: currentDate });

    let total = 0;
    days.forEach(day => {
      const dKey = formatDate(day);
      const dayData = allRecords[dKey];
      if (dayData && dayData.hours) {
        HOURS.forEach(h => {
          const tIds = dayData.hours[h] || [];
          if (tIds.includes(task.id)) {
            total += (mode === 'count' ? 1 : (1 / Math.max(tIds.length, 1)));
          }
        });
      }
    });

    const percentage = Math.min((total / task.targets.value) * 100, 100);
    return { current: total, target: task.targets.value, percentage, unit: mode === 'count' ? '' : 'h' };
  };

  const handleTaskToggle = (taskId: string) => {
    if (!activeSlot) return;
    const { hour, type } = activeSlot;

    if (type === 'schedule') {
      if (isRepeatMode) {
        const current = recurringData[hour] || [];
        onUpdateRecurring(hour, current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId].slice(-4));
      } else {
        const current = scheduleData.hours[hour] || [];
        onUpdateSchedule(hour, current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId].slice(-4));
      }
    } else {
      const current = recordData.hours[hour] || [];
      onUpdateRecord(hour, current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId].slice(-4));
    }
  };

  const clearActiveSlot = () => {
    if (!activeSlot) return;
    const { hour, type } = activeSlot;
    if (type === 'schedule') {
        if (isRepeatMode) onUpdateRecurring(hour, []);
        else onUpdateSchedule(hour, []);
    } else {
        onUpdateRecord(hour, []);
    }
  };

  const handleScheduleClick = (hour: number) => {
    setActiveSlot({ hour, type: 'schedule' });
    setSidebar('right');
  };

  const handleRecordClick = (hour: number) => {
    setActiveSlot({ hour, type: 'record' });
    setSidebar('left');
  };

  const sortedCategories = useMemo(() => {
    const existingCats = new Set(tasks.map(t => t.category || '未分类'));
    const ordered = categoryOrder.filter(c => existingCats.has(c));
    const others = Array.from(existingCats).filter(c => !categoryOrder.includes(c));
    return [...ordered, ...others];
  }, [tasks, categoryOrder]);

  const isTaskInActiveSlot = (taskId: string) => {
    if (!activeSlot) return false;
    const { hour, type } = activeSlot;
    if (type === 'schedule') {
      const list = isRepeatMode ? (recurringData[hour] || []) : (scheduleData.hours[hour] || []);
      return list.includes(taskId);
    } else {
      const list = recordData.hours[hour] || [];
      return list.includes(taskId);
    }
  };

  const TaskPool = () => (
    <div className="flex-1 overflow-y-auto px-2 pb-32 space-y-3 pt-2">
      {sortedCategories.map(cat => (
        <div key={cat} className="space-y-1">
          <div className="flex items-center gap-1.5 px-1 opacity-70">
            <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">{cat}</span>
            <div className="h-px flex-1 bg-stone-100" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {tasks.filter(t => (t.category || '未分类') === cat).map(task => {
              const isSelected = isTaskInActiveSlot(task.id);
              const progress = getTaskProgress(task);
              
              return (
                <div 
                  key={task.id} 
                  onClick={() => handleTaskToggle(task.id)}
                  onDoubleClick={() => { setEditingTask(task); setIsEditModalOpen(true); }}
                  className={cn(
                    "group p-2 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex flex-col items-start justify-center min-h-[44px] select-none shadow-sm",
                    isSelected 
                        ? "bg-white border-primary ring-1 ring-primary/10" 
                        : "bg-white border-stone-100 hover:border-stone-200"
                  )}
                >
                  {progress && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out z-0 opacity-10"
                      style={{ 
                        width: `${progress.percentage}%`, 
                        backgroundColor: task.color 
                      }} 
                    />
                  )}

                  <div className="flex items-center gap-1.5 w-full relative z-10">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                    <span className={cn(
                        "text-[11px] font-bold leading-tight truncate flex-1",
                        isSelected ? "text-primary" : "text-stone-700"
                    )}>{task.name}</span>
                  </div>

                  <div className="flex items-center justify-between w-full relative z-10 pl-3 mt-0.5">
                    <div className="flex items-center gap-1">
                      {progress && (
                        <span className="text-[8px] font-mono font-black text-stone-300">
                          {progress.percentage === 100 ? '✓' : `${Math.round(progress.percentage)}%`}
                        </span>
                      )}
                    </div>
                    {isSelected && <div className="p-0.5 bg-primary rounded-full"><Check size={6} className="text-white" /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const closeSidebar = () => {
    setSidebar('none');
    setActiveSlot(null);
  };

  const SidebarHeader = ({ type }: { type: 'schedule' | 'record' }) => {
    const isSchedule = type === 'schedule';
    return (
      <div className="p-2.5 border-b border-stone-100 bg-white shrink-0 flex flex-col gap-2">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", isSchedule ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500")}>
                    {isSchedule ? <Repeat size={12} /> : <Check size={12} />}
                </div>
                <div>
                    <h3 className="text-[10px] font-black text-stone-800 tracking-tight leading-none">
                        {activeSlot ? `${activeSlot.hour}:00` : ''} {isSchedule ? '安排' : '记录'}
                    </h3>
                    <p className="text-[7px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                        {isSchedule ? (isRepeatMode ? '循环模式 ON' : '单日安排') : '实际执行'}
                    </p>
                </div>
            </div>
            <button onClick={closeSidebar} className="p-1 text-stone-300 hover:text-stone-500 transition-colors">
                <X size={16} />
            </button>
        </div>
        
        <div className="flex gap-1.5">
            <button 
                onClick={clearActiveSlot}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-stone-50 hover:bg-red-50 hover:text-red-500 rounded-lg text-[8px] font-bold text-stone-500 transition-all border border-stone-100 active:scale-95"
            >
                <Eraser size={10} /> 清空
            </button>
            {isSchedule && (
                <button 
                    onClick={() => setIsRepeatMode(!isRepeatMode)}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[8px] font-bold transition-all border active:scale-95",
                        isRepeatMode 
                            ? "bg-indigo-500 border-indigo-500 text-white" 
                            : "bg-white border-stone-100 text-stone-500 hover:border-indigo-100 hover:text-indigo-500"
                    )}
                >
                    <Repeat size={10} /> 循环模式
                </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-white relative overflow-hidden">
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-[240px] sm:w-[280px] bg-stone-50 border-r border-stone-200 z-30 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col",
        sidebar === 'left' ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarHeader type="record" />
        <TaskPool />
        <div className="p-3 bg-white border-t border-stone-100 shrink-0">
            <button onClick={closeSidebar} className="w-full py-2 bg-stone-900 text-white rounded-xl text-[10px] font-bold active:scale-95 transition-transform">完成记录</button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 h-full pb-40">
        <div className="sticky top-0 bg-white z-20 px-4 py-3 flex justify-between items-center border-b border-stone-100">
           <div className="flex-1 text-center text-[10px] font-black text-indigo-400 tracking-widest uppercase opacity-70">计划</div>
           <div className="w-14 flex-shrink-0 text-center text-[8px] font-black text-stone-300 tracking-[0.2em] uppercase">Timeline</div>
           <div className="flex-1 text-center text-[10px] font-black text-emerald-400 tracking-widest uppercase opacity-70">记录</div>
        </div>
        
        <div className="bg-white">
            {HOURS.map(hour => (
              <TimelineRow 
                key={hour} 
                hour={hour} 
                assignedScheduleIds={scheduleData.hours[hour] || []} 
                assignedRecordIds={recordData.hours[hour] || []} 
                allTasks={tasks} 
                onScheduleClick={handleScheduleClick}
                onRecordClick={handleRecordClick}
                activeSlot={activeSlot}
              />
            ))}
        </div>
      </div>

      <div className={cn(
        "absolute right-0 top-0 bottom-0 w-[240px] sm:w-[280px] bg-stone-50 border-l border-stone-200 z-30 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col",
        sidebar === 'right' ? "translate-x-0" : "translate-x-full"
      )}>
        <SidebarHeader type="schedule" />
        <TaskPool />
        <div className="p-3 bg-white border-t border-stone-100 shrink-0">
            <button onClick={closeSidebar} className="w-full py-2 bg-stone-900 text-white rounded-xl text-[10px] font-bold active:scale-95 transition-transform">确认安排</button>
        </div>
      </div>

      <TaskEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} task={editingTask} onSave={onUpdateTask} onDelete={onDeleteTask} />
    </div>
  );
};
