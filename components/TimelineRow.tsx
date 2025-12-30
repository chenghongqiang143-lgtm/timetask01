
import React from 'react';
import { Task } from '../types';
import { getContrastColor, cn } from '../utils';

interface TimelineRowProps {
  hour: number;
  assignedScheduleIds: string[];
  assignedRecordIds: string[];
  allTasks: Task[];
  onScheduleClick: (hour: number) => void;
  onRecordClick: (hour: number) => void;
  activeSlot?: { hour: number; type: 'schedule' | 'record' } | null;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  hour,
  assignedScheduleIds,
  assignedRecordIds,
  allTasks,
  onScheduleClick,
  onRecordClick,
  activeSlot
}) => {
  const getTasksFromIds = (ids: string[]) => 
    ids.map(id => allTasks.find(t => t.id === id)).filter((t): t is Task => !!t);

  const scheduleTasks = getTasksFromIds(assignedScheduleIds);
  const recordTasks = getTasksFromIds(assignedRecordIds);

  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  const renderTasks = (tasks: Task[]) => {
    if (tasks.length === 0) return null;
    return (
      <div className="flex gap-0.5 w-full h-full overflow-hidden">
        {tasks.map((task, idx) => (
          <div
            key={`${task.id}-${idx}`}
            className="flex-1 h-full rounded-md flex items-center justify-center text-[9px] font-bold tracking-tight truncate px-1 leading-none transition-all animate-in fade-in slide-in-from-bottom-1 duration-500 border border-black/5"
            style={{ 
              backgroundColor: task.color, 
              color: getContrastColor(task.color),
              textShadow: '0 0 1px rgba(0,0,0,0.05)'
            }}
          >
            {tasks.length <= 3 ? task.name : ''}
          </div>
        ))}
      </div>
    );
  };

  const isScheduleActive = activeSlot?.hour === hour && activeSlot?.type === 'schedule';
  const isRecordActive = activeSlot?.hour === hour && activeSlot?.type === 'record';

  return (
    <div className="flex h-11 border-b border-stone-50 group transition-colors">
      <div 
        className={cn(
          "flex-1 flex p-1 cursor-pointer transition-all duration-300",
          isScheduleActive 
            ? "bg-indigo-50 border border-indigo-200" 
            : "hover:bg-indigo-50/50"
        )}
        onClick={() => onScheduleClick(hour)}
      >
        {renderTasks(scheduleTasks)}
      </div>

      <div className={cn(
        "w-14 flex-shrink-0 flex items-center justify-center text-[10px] font-mono transition-all duration-300 select-none z-10 border-x border-stone-50",
        (isScheduleActive || isRecordActive) 
            ? "bg-stone-900 text-white font-bold scale-110 rounded-sm" 
            : "text-stone-300 group-hover:text-stone-500 group-hover:bg-stone-50 bg-white"
      )}>
        {formatHour(hour)}
      </div>

      <div 
        className={cn(
          "flex-1 flex p-1 cursor-pointer transition-all duration-300",
          isRecordActive 
            ? "bg-emerald-50 border border-emerald-200" 
            : "hover:bg-emerald-50/50"
        )}
        onClick={() => onRecordClick(hour)}
      >
        {renderTasks(recordTasks)}
      </div>
    </div>
  );
};
