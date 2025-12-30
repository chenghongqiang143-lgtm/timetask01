
import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, formatDate } from '../utils';
import { ChevronRight, ChevronLeft, Repeat, Check, X, Eraser, LayoutGrid, Target, Clock, TrendingUp } from 'lucide-react';
import { subDays, eachDayOfInterval } from 'date-fns';

interface TrackerViewProps {
  tasks: Task[];
  categoryOrder: string[];
  scheduleData: DayData;
  recordData: DayData;
  recurringData: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  allSchedules: Record<string, DayData>;
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
  allSchedules,
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
  const [sidebar, setSidebar] = useState<'none' | 'task'>('none');
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  const todayStats = useMemo(() => {
    const dKey = formatDate(currentDate);
    const recHours = allRecords[dKey]?.hours || {};
    
    return tasks.map(t => {
      let actual = 0;
      HOURS.forEach(h => {
        const actualRec = recHours[h] || [];
        if (actualRec.includes(t.id)) actual += (1 / actualRec.length);
      });
      
      const targetVal = t.targets?.value || 0;
      const progress = targetVal > 0 ? (actual / targetVal) * 100 : 0;
      
      return { ...t, actual, targetVal, progress };
    }).filter(t => t.actual > 0 || t.targetVal > 0).sort((a, b) => b.actual - a.actual);
  }, [currentDate, allRecords, tasks]);

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

  const handleScheduleClick = (hour: number) => {
    setActiveSlot({ hour, type: 'schedule' });
    setSidebar('task');
  };

  const handleRecordClick = (hour: number) => {
    setActiveSlot({ hour, type: 'record' });
    setSidebar('task');
  };

  const sortedCategories = useMemo(() => {
    const existingCats = new Set(tasks.map(t => t.category || '未分类'));
    const ordered = categoryOrder.filter(c => existingCats.has(c));
    const others = Array.from(existingCats).filter(c => !categoryOrder.includes(c));
    return [...ordered, ...others];
  }, [tasks, categoryOrder]);

  const StatsPanel = () => (
    <div className="flex flex-col h-full bg-stone-50/50 p-5 overflow-y-auto custom-scrollbar">
       <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="text-[11px] font-black text-stone-800 uppercase tracking-widest">今日看板</h3>
       </div>
       <div className="space-y-5">
          {todayStats.map(stat => (
            <div key={stat.id} className="bg-white p-3.5 rounded-2xl border border-stone-100 shadow-sm transition-transform hover:scale-[1.02]">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span className="text-[12px] font-bold text-stone-700">{stat.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-black text-stone-400">
                    {stat.actual.toFixed(1)}<span className="text-[9px] opacity-50 ml-0.5">h</span>
                  </span>
               </div>
               <div className="h-2 bg-stone-50 rounded-full overflow-hidden border border-stone-50">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${Math.min(stat.progress || (stat.actual/12)*100, 100)}%`, backgroundColor: stat.color }} 
                  />
               </div>
            </div>
          ))}
          {todayStats.length === 0 && (
             <div className="text-center py-16 flex flex-col items-center gap-3">
                <Clock size={24} className="text-stone-200" />
                <p className="text-[10px] font-bold text-stone-300 italic">今日尚未记录活动</p>
             </div>
          )}
       </div>
    </div>
  );

  const TaskPool = () => (
    <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-4 pt-4">
      {sortedCategories.map(cat => (
        <div key={cat} className="space-y-2">
          <div className="flex items-center gap-2 px-1 opacity-70">
            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{cat}</span>
            <div className="h-px flex-1 bg-stone-100" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {tasks.filter(t => (t.category || '未分类') === cat).map(task => {
              const list = activeSlot?.type === 'schedule' 
                ? (isRepeatMode ? (recurringData[activeSlot.hour] || []) : (scheduleData.hours[activeSlot.hour] || []))
                : (recordData.hours[activeSlot?.hour || 0] || []);
              const isSelected = list.includes(task.id);
              const progress = getTaskProgress(task);
              
              return (
                <div 
                  key={task.id} 
                  onClick={() => handleTaskToggle(task.id)}
                  className={cn(
                    "group p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col items-start justify-center min-h-[48px] select-none shadow-sm",
                    isSelected 
                        ? "bg-stone-900 border-stone-900 shadow-lg" 
                        : "bg-white border-stone-100 hover:border-stone-300"
                  )}
                >
                  {/* Integrated Progress Fill */}
                  {progress && !isSelected && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 opacity-10 transition-all duration-500 ease-out z-0"
                      style={{ 
                        width: `${progress.percentage}%`, 
                        backgroundColor: task.color 
                      }} 
                    />
                  )}

                  <div className="flex items-center gap-2 w-full relative z-10">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                    <span className={cn(
                        "text-[12px] font-bold leading-tight truncate flex-1",
                        isSelected ? "text-white" : "text-stone-700"
                    )}>{task.name}</span>
                    
                    {progress && (
                      <span className={cn(
                        "text-[8px] font-mono font-black shrink-0 ml-1 opacity-60",
                        isSelected ? "text-white/70" : "text-stone-400"
                      )}>
                        {Math.round(progress.percentage)}%
                      </span>
                    )}
                  </div>
                  {isSelected && <div className="absolute top-1 right-1 p-0.5 bg-white/20 rounded-full z-20"><Check size={8} className="text-white" /></div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full bg-white relative overflow-hidden">
      {/* 任务选择侧边栏 (移动端) */}
      <div className={cn(
        "absolute inset-y-0 left-0 w-[280px] bg-white border-r border-stone-200 z-50 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col shadow-2xl lg:shadow-none",
        sidebar === 'task' ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-stone-100 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
                <LayoutGrid size={16} className="text-stone-600" />
                <h3 className="text-sm font-black text-stone-800 tracking-tight uppercase">任务选择</h3>
            </div>
            <button onClick={() => setSidebar('none')} className="p-2 text-stone-300 hover:text-stone-600 transition-colors">
                <X size={20} />
            </button>
        </div>
        <div className="px-5 py-3 bg-stone-50/50 border-b border-stone-100 flex justify-between items-center">
            <span className="text-[11px] font-bold text-stone-800">{activeSlot?.hour}:00 {activeSlot?.type === 'schedule' ? '计划' : '记录'}</span>
            {activeSlot?.type === 'schedule' && (
                <button onClick={() => setIsRepeatMode(!isRepeatMode)} className={cn("text-[10px] font-black px-3 py-1.5 rounded-xl border", isRepeatMode ? "bg-primary text-white border-primary" : "bg-white text-stone-500 border-stone-200")}>
                    <Repeat size={12} className="inline mr-1" /> 循环设定
                </button>
            )}
        </div>
        <TaskPool />
      </div>

      {/* 时间轴 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 h-full pb-40 border-r border-stone-100">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-4 py-3.5 flex justify-between items-center border-b border-stone-100">
           <div className="flex-1 text-center text-[11px] font-black text-indigo-500 tracking-widest uppercase opacity-70">计划</div>
           <div className="w-14 flex-shrink-0 text-center text-[9px] font-black text-stone-300 tracking-[0.2em] uppercase">时间轴</div>
           <div className="flex-1 text-center text-[11px] font-black text-emerald-500 tracking-widest uppercase opacity-70">记录</div>
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

      {/* 侧边统计 (桌面端) */}
      <div className="hidden lg:flex lg:w-[320px] border-l border-stone-100 flex-col bg-stone-50/30">
        <StatsPanel />
      </div>

      <TaskEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} task={editingTask} onSave={onUpdateTask} onDelete={onDeleteTask} />
    </div>
  );
};
