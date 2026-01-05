
import React, { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { Task, DayData, HOURS, Objective, Todo } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, formatDate, generateId } from '../utils';
import { Clock, LayoutGrid, Check, X, ChevronLeft, ChevronRight, Repeat, CheckCircle2 } from 'lucide-react';

interface TrackerViewProps {
  tasks: Task[];
  objectives: Objective[];
  categoryOrder: string[];
  scheduleData: DayData;
  recordData: DayData;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  onUpdateRecord: (hour: number, taskIds: string[]) => void;
  onUpdateSchedule: (hour: number, taskIds: string[]) => void;
  onUpdateRecurring: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTodo: (todo: Todo) => void;
  currentDate: Date;
  onEditingStatusChange?: (status: string | null) => void;
}

export const TrackerView: React.FC<TrackerViewProps> = ({
  tasks,
  objectives,
  categoryOrder,
  scheduleData,
  recordData,
  recurringSchedule,
  onUpdateRecord,
  onUpdateSchedule,
  onUpdateRecurring,
  onUpdateTask,
  onDeleteTask,
  onAddTodo,
  currentDate,
  onEditingStatusChange
}) => {
  // 从 activeSlot 重构为多选状态
  const [activeSide, setActiveSide] = useState<'plan' | 'actual' | null>(null);
  const [selectedHours, setSelectedHours] = useState<Set<number>>(new Set<number>());
  
  const [isRecurringMode, setIsRecurringMode] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  // 同步状态到父组件
  useEffect(() => {
    if (onEditingStatusChange) {
      if (activeSide && selectedHours.size > 0) {
        const sortedHours = Array.from(selectedHours).sort((a: number, b: number) => a - b);
        const hoursText = sortedHours.length > 3 
            ? `${sortedHours.length}个时段` 
            : sortedHours.map(h => `${h}:00`).join(', ');
        onEditingStatusChange(`${hoursText} ${activeSide === 'plan' ? '安排' : '记录'}`);
      } else {
        onEditingStatusChange(null);
      }
    }
  }, [activeSide, selectedHours, onEditingStatusChange]);

  const taskProgress = useMemo(() => {
    const stats: Record<string, number> = {};
    tasks.forEach(t => stats[t.id] = 0);
    
    HOURS.forEach(h => {
      const ids = recordData.hours[h] || [];
      ids.forEach(tid => {
        const currentVal = stats[tid];
        if (typeof currentVal === 'number') {
          const task = tasks.find(t => t.id === tid);
          if (task?.targets?.mode === 'count') {
            stats[tid] = currentVal + 1;
          } else {
            stats[tid] = currentVal + (1 / Math.max(ids.length, 1));
          }
        }
      });
    });
    return stats;
  }, [tasks, recordData]);

  const sortedCategories = useMemo(() => {
    const existingCats = new Set(tasks.map(t => t.category || '未分类'));
    const ordered = categoryOrder.filter(c => existingCats.has(c));
    const others = Array.from(existingCats).filter(c => !categoryOrder.includes(c));
    return [...ordered, ...others];
  }, [tasks, categoryOrder]);

  const getObjectiveTitle = (id: string) => {
    if (id === '未分类') return '未分类';
    const obj = objectives.find(o => o.id === id);
    return obj ? obj.title : '未知分类';
  };

  const handleHourClick = (hour: number, side: 'plan' | 'actual') => {
    if (activeSide !== side) {
        // 切换侧边或首次选择：清空并选中当前
        setActiveSide(side);
        setSelectedHours(new Set([hour]));
    } else {
        // 同侧：切换选择状态
        const newSelection = new Set(selectedHours);
        if (newSelection.has(hour)) {
            newSelection.delete(hour);
            if (newSelection.size === 0) {
                setActiveSide(null);
            }
        } else {
            newSelection.add(hour);
        }
        setSelectedHours(newSelection);
    }
  };

  // 支持批量操作
  const handleToggleTaskInSlot = (taskId: string) => {
    if (!activeSide || selectedHours.size === 0) return;

    // 确定当前操作的数据源和更新函数
    const isRecurring = activeSide === 'plan' && isRecurringMode;
    const targetDataMap = activeSide === 'actual' 
        ? recordData.hours 
        : (isRecurring ? recurringSchedule : scheduleData.hours);
    const updateFn = activeSide === 'actual' 
        ? onUpdateRecord 
        : (isRecurring ? onUpdateRecurring : onUpdateSchedule);

    // 检查是否所有选中的小时都包含该任务
    const allHaveIt = Array.from(selectedHours).every((h: number) => (targetDataMap[h] || []).includes(taskId));

    selectedHours.forEach(hour => {
        const currentTasks = targetDataMap[hour] || [];
        let newTasks;

        if (allHaveIt) {
            // 如果所有选中的时间段都有这个任务，则全部移除
            newTasks = currentTasks.filter(id => id !== taskId);
        } else {
            // 否则，添加到没有该任务的时间段（保留已有，不超过4个）
            if (!currentTasks.includes(taskId)) {
                newTasks = [...currentTasks, taskId].slice(-4);
            } else {
                newTasks = currentTasks;
            }
        }

        // 只有当数据变化时才调用更新
        if (newTasks !== currentTasks) {
            updateFn(hour, newTasks);
        }
    });
  };

  // 只要所有选中时间段中都包含该任务，就认为“选中”了该任务（用于高亮显示）
  const isTaskInActiveSlot = (taskId: string) => {
      if (!activeSide || selectedHours.size === 0) return false;
      const isRecurring = activeSide === 'plan' && isRecurringMode;
      const targetDataMap = activeSide === 'actual' 
          ? recordData.hours 
          : (isRecurring ? recurringSchedule : scheduleData.hours);
      
      // 只要所有选中时段都包含该任务，返回 true
      return Array.from(selectedHours).every((h: number) => (targetDataMap[h] || []).includes(taskId));
  };

  const clearSelection = () => {
      setSelectedHours(new Set());
      setActiveSide(null);
  };

  const PoolContent = () => (
    <div className="flex flex-col h-full bg-white">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10 shrink-0">
            <div className="flex items-center gap-2">
                <h3 className="text-[9px] font-bold text-stone-900 uppercase tracking-widest flex items-center gap-1.5">
                    <LayoutGrid size={10} /> 行为模板库
                </h3>
                {selectedHours.size > 1 && (
                     <span className="px-1.5 py-0.5 rounded-md bg-stone-900 text-white text-[8px] font-bold">已选 {selectedHours.size}</span>
                )}
            </div>
            {activeSide === 'plan' && (
                <button 
                    onClick={() => setIsRecurringMode(!isRecurringMode)}
                    className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all flex items-center gap-1 border",
                        isRecurringMode ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-400 border-stone-100 hover:border-stone-300"
                    )}
                >
                    <Repeat size={10} /> {isRecurringMode ? '已开启循环' : '循环'}
                </button>
            )}
            <button onClick={clearSelection} className="p-1 hover:bg-stone-100 rounded-full text-stone-300 transition-colors">
                <X size={14} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar pb-32">
            {sortedCategories.map(cat => (
                <div key={cat} className="space-y-2">
                    <div className="px-1 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em] truncate">{getObjectiveTitle(cat)}</span>
                        <div className="h-px flex-1 bg-stone-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {tasks.filter(t => (t.category || '未分类') === cat).map(task => {
                            const isSelected = isTaskInActiveSlot(task.id);
                            const currentVal = taskProgress[task.id] || 0;
                            const target = task.targets;
                            const dailyTarget = target ? (target.value / target.frequency) : 0;
                            const progress = dailyTarget > 0 ? Math.min((currentVal / dailyTarget) * 100, 100) : 0;
                            const isCompleted = progress >= 100;

                            return (
                                <div 
                                    key={task.id}
                                    onClick={(e) => { e.stopPropagation(); handleToggleTaskInSlot(task.id); }}
                                    className={cn(
                                        "px-3 h-10 rounded-xl border transition-all cursor-pointer relative shadow-sm flex items-center overflow-hidden",
                                        isSelected 
                                            ? "bg-stone-900 border-stone-900 text-white z-10" 
                                            : "bg-white border-stone-100 hover:border-stone-300 text-stone-700"
                                    )}
                                >
                                    {!isSelected && (
                                        <div 
                                            className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0"
                                            style={{ 
                                                width: `${progress}%`, 
                                                backgroundColor: `${task.color}15`
                                            }}
                                        />
                                    )}

                                    <div className="relative z-10 flex items-center gap-2 w-full min-w-0">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            isCompleted && !isSelected ? "animate-pulse shadow-[0_0_4px_rgba(0,0,0,0.2)]" : ""
                                        )} style={{ backgroundColor: isSelected ? 'white' : task.color }} />
                                        
                                        <span className={cn(
                                            "text-[10px] font-bold leading-none truncate flex-1"
                                        )}>{task.name}</span>

                                        {!isSelected && isCompleted && (
                                          <Check size={8} className="text-emerald-500 shrink-0" />
                                        )}
                                        {!isSelected && !isCompleted && dailyTarget > 0 && (
                                          <span className="text-[7px] font-medium text-stone-300 tabular-nums shrink-0">
                                            {Math.round(progress)}%
                                          </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* 记录页 (Actual Side) 激活时从左侧弹出 */}
      <aside className={cn(
        "absolute left-0 top-0 bottom-0 w-[240px] bg-white border-r border-stone-200 z-[70] transition-transform duration-500 ease-out shadow-[10px_0_40px_rgba(0,0,0,0.08)]",
        activeSide === 'actual' ? "translate-x-0" : "-translate-x-full"
      )}>
        <PoolContent />
      </aside>

      {/* 安排页 (Plan Side) 激活时从右侧弹出 */}
      <aside className={cn(
        "absolute right-0 top-0 bottom-0 w-[240px] bg-white border-l border-stone-200 z-[70] transition-transform duration-500 ease-out shadow-[-10px_0_40px_rgba(0,0,0,0.08)]",
        activeSide === 'plan' ? "translate-x-0" : "translate-x-full"
      )}>
        <PoolContent />
      </aside>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative bg-white custom-scrollbar pb-32">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 px-5 py-3 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-6 w-full">
                <div className="flex-1 flex items-center justify-center gap-2 text-stone-300">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">安排 (Plan)</span>
                    <ChevronLeft size={12} />
                </div>
                <div className="w-14 flex items-center justify-center">
                    <Clock size={16} className="text-stone-200" />
                </div>
                <div className="flex-1 flex items-center justify-center gap-2 text-stone-300">
                    <ChevronRight size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">记录 (Actual)</span>
                </div>
            </div>
        </div>

        <div className="pt-1">
          {HOURS.map(hour => (
            <TimelineRow 
              key={hour} 
              hour={hour} 
              assignedScheduleIds={scheduleData.hours[hour] || []} 
              assignedRecordIds={recordData.hours[hour] || []} 
              allTasks={tasks} 
              onScheduleClick={(h) => handleHourClick(h, 'plan')}
              onRecordClick={(h) => handleHourClick(h, 'actual')}
              isScheduleSelected={activeSide === 'plan' && selectedHours.has(hour)}
              isRecordSelected={activeSide === 'actual' && selectedHours.has(hour)}
            />
          ))}
        </div>
      </div>

      <TaskEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} task={editingTask} onSave={onUpdateTask} onDelete={onDeleteTask} objectives={objectives} />
    </div>
  );
};
