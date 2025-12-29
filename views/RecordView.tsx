import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskBlock } from '../components/TaskBlock';
import { TaskEditorModal } from '../components/TaskEditorModal';

interface RecordViewProps {
  tasks: Task[];
  dayData: DayData;
  onUpdateHour: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const RecordView: React.FC<RecordViewProps> = ({
  tasks,
  dayData,
  onUpdateHour,
  onUpdateTask,
  onDeleteTask
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Long press logic
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const categories = Array.from(new Set(tasks.map(t => t.category || '未分类'))).sort();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) {
        // Scroll to 5 AM. Each row is h-9 (36px). 5 * 36 = 180.
        scrollRef.current.scrollTop = 180;
    }
  }, []);

  // Ensure selected task still exists
  useEffect(() => {
      if (selectedTaskId && !tasks.find(t => t.id === selectedTaskId)) {
          setSelectedTaskId(null);
      }
  }, [tasks, selectedTaskId]);

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleSaveWrapper = (updated: Task) => {
      onUpdateTask(updated);
      setIsEditModalOpen(false);
      setEditingTask(null);
  };

  const handleTaskClick = (task: Task) => {
    if (isLongPress.current) return;
    setSelectedTaskId(task.id === selectedTaskId ? null : task.id);
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
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left: Timeline */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative bg-white h-full pb-20 border-r border-stone-100 custom-scrollbar"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 px-3 py-2.5 flex justify-between items-center border-b border-stone-50 shadow-sm">
             <span className="text-[10px] font-bold text-secondary tracking-wider uppercase">真实记录</span>
             {selectedTaskId && <span className="text-[9px] text-secondary font-medium bg-secondary/5 px-1.5 py-0.5 rounded-full border border-secondary/10">记录模式</span>}
        </div>
        <div className="pt-1 pb-32">
          {HOURS.map(hour => (
            <TimelineRow
              key={hour}
              hour={hour}
              assignedTaskIds={dayData.hours[hour] || []}
              allTasks={tasks}
              onClick={handleHourClick}
              showDuration={true}
            />
          ))}
        </div>
      </div>

      {/* Right: Task List */}
      <div className="w-[190px] bg-[#fafaf9] flex flex-col h-full shrink-0 transition-all duration-300">
        <div className="p-3 z-10 sticky top-0 bg-[#fafaf9]/95 backdrop-blur border-b border-stone-50">
          <h2 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">任务选择</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-24 space-y-4 pt-3 custom-scrollbar">
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
                      onClick={() => handleTaskClick(task)}
                      onPointerDown={() => handlePointerDown(task)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      className="w-full"
                    />
                  ))}
               </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-10 text-stone-300 text-[10px]">
                暂无任务
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