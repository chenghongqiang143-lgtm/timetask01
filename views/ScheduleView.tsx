import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TaskBlock } from '../components/TaskBlock';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { TimelineRow } from '../components/TimelineRow';
import { cn } from '../utils';
import { Repeat } from 'lucide-react';

interface ScheduleViewProps {
  tasks: Task[];
  dayData: DayData;
  recurringData: Record<number, string[]>;
  onUpdateHour: (hour: number, taskIds: string[]) => void;
  onUpdateRecurring: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  tasks,
  dayData,
  recurringData,
  onUpdateHour,
  onUpdateRecurring,
  onUpdateTask,
  onDeleteTask
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Repeat Mode State
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  
  // Long press logic
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 180;
    }
  }, []);

  // Ensure selected task still exists
  useEffect(() => {
      if (selectedTaskId && !tasks.find(t => t.id === selectedTaskId)) {
          setSelectedTaskId(null);
      }
  }, [tasks, selectedTaskId]);

  // Group tasks by category
  const categories = Array.from(new Set(tasks.map(t => t.category || '未分类'))).sort();

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleSaveWrapper = (updated: Task) => {
      onUpdateTask(updated);
      setIsEditModalOpen(false);
      setEditingTask(null);
  };

  const handleTaskClick = (taskId: string) => {
      if (isLongPress.current) return;
      if (selectedTaskId === taskId) {
          setSelectedTaskId(null);
      } else {
          setSelectedTaskId(taskId);
      }
  };

  const handlePointerDown = (task: Task) => {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          openEditModal(task);
      }, 500); // 500ms for long press
  };

  const cancelLongPress = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const handleHourClick = (hour: number) => {
      if (!selectedTaskId) return;

      if (isRepeatMode) {
         // RECURRING LOGIC
         const currentRecurringTasks = recurringData[hour] || [];
         if (currentRecurringTasks.includes(selectedTaskId)) {
             // If already in recurring, remove it (Toggle)
             onUpdateRecurring(hour, currentRecurringTasks.filter(id => id !== selectedTaskId));
         } else {
             // Add to recurring
             if (currentRecurringTasks.length < 4) {
                 onUpdateRecurring(hour, [...currentRecurringTasks, selectedTaskId]);
             } else {
                 onUpdateRecurring(hour, [...currentRecurringTasks.slice(1), selectedTaskId]);
             }
         }
      } else {
         // NORMAL LOGIC (Specific Day)
         const currentTasks = dayData.hours[hour] || [];
         if (currentTasks.includes(selectedTaskId)) {
             onUpdateHour(hour, currentTasks.filter(id => id !== selectedTaskId));
         } else {
             if (currentTasks.length < 4) {
                 onUpdateHour(hour, [...currentTasks, selectedTaskId]);
             } else {
                onUpdateHour(hour, [...currentTasks.slice(1), selectedTaskId]);
             }
         }
      }
  };
  
  const handleTaskDrop = (hour: number, taskId: string) => {
       // Drag drop always affects the current view mode (conceptually)
       // But for safety, let's say drag drop only affects today unless we want to complicate drag logic.
       // Let's keep drag drop for "Today" only for now to avoid confusion, or follow mode.
       // Following mode is more consistent.
       
       if (isRepeatMode) {
           const currentRecurringTasks = recurringData[hour] || [];
           if (!currentRecurringTasks.includes(taskId)) {
                if (currentRecurringTasks.length < 4) {
                    onUpdateRecurring(hour, [...currentRecurringTasks, taskId]);
                } else {
                    onUpdateRecurring(hour, [...currentRecurringTasks.slice(1), taskId]);
                }
           }
       } else {
           const currentTasks = dayData.hours[hour] || [];
           if (!currentTasks.includes(taskId)) {
                if (currentTasks.length < 4) {
                    onUpdateHour(hour, [...currentTasks, taskId]);
                } else {
                    onUpdateHour(hour, [...currentTasks.slice(1), taskId]);
                }
           }
       }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left: Timeline */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative bg-white h-full pb-20 custom-scrollbar border-r border-stone-100"
      >
         <div className={cn(
             "sticky top-0 backdrop-blur-sm z-20 px-3 py-2.5 flex justify-between items-center border-b shadow-sm transition-colors",
             isRepeatMode ? "bg-purple-50/95 border-purple-100" : "bg-white/95 border-stone-50"
         )}>
             <span className={cn(
                 "text-[10px] font-bold tracking-wider uppercase transition-colors",
                 isRepeatMode ? "text-purple-600" : "text-primary"
             )}>
                 {isRepeatMode ? "重复日程 (每日生效)" : "今日计划"}
             </span>
             {selectedTaskId && (
                 <span className={cn(
                     "text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
                     isRepeatMode 
                        ? "text-purple-600 bg-purple-100 border-purple-200" 
                        : "text-primary bg-primary/5 border-primary/10"
                 )}>
                     {isRepeatMode ? "固定模式" : "选择模式"}
                 </span>
             )}
        </div>
        <div className="pt-1 pb-32">
          {HOURS.map(hour => (
            <TimelineRow
              key={hour}
              hour={hour}
              assignedTaskIds={dayData.hours[hour] || []}
              allTasks={tasks}
              onClick={handleHourClick}
              onTaskDrop={handleTaskDrop}
              showDuration={true}
            />
          ))}
        </div>
      </div>

      {/* Right: Task List */}
      <div className="w-[190px] bg-[#fafaf9] flex flex-col h-full shrink-0 transition-all duration-300">
        <div className="p-3 z-10 sticky top-0 bg-[#fafaf9]/95 backdrop-blur border-b border-stone-50 flex justify-between items-center">
          <h2 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">任务池</h2>
          
          {/* Repeat Mode Toggle */}
          <button
            onClick={() => setIsRepeatMode(!isRepeatMode)}
            className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all active:scale-95 border",
                isRepeatMode 
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 border-purple-600" 
                    : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50 hover:border-stone-300"
            )}
          >
              <Repeat size={12} strokeWidth={isRepeatMode ? 2.5 : 2} />
              <span className="text-[10px] font-bold">重复模式</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 pb-24 space-y-4 pt-3 custom-scrollbar">
          {/* Visual Indicator for Mode */}
          {isRepeatMode && (
              <div className="mx-1 mb-2 p-2 bg-purple-50 border border-purple-100 rounded-lg text-center animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-medium text-purple-700 leading-tight">
                      已开启固定模式<br/>
                      <span className="opacity-70 text-[9px]">点击任务后点击左侧时间轴，将应用到每一天</span>
                  </p>
              </div>
          )}

          {categories.map(cat => (
            <div key={cat}>
               <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                   <div className="w-0.5 h-0.5 rounded-full bg-stone-300"></div>
                   <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{cat}</h3>
               </div>
               <div className="grid grid-cols-2 gap-1.5">
                  {tasks.filter(t => (t.category || '未分类') === cat).map(task => (
                    <TaskBlock
                      key={task.id}
                      task={task}
                      selected={selectedTaskId === task.id}
                      onClick={() => handleTaskClick(task.id)}
                      onDoubleClick={() => openEditModal(task)}
                      onPointerDown={() => handlePointerDown(task)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      className="w-full"
                      showEditIcon={true}
                      draggable={true}
                    />
                  ))}
               </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-10 text-stone-300 text-[10px] px-2 leading-relaxed">
                点击右下角设置<br/>去添加任务
            </div>
          )}
        </div>
      </div>

      <TaskEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={editingTask}
        onSave={handleSaveWrapper}
        onDelete={onDeleteTask}
      />
    </div>
  );
};